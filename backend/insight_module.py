import json
import re
import pandas as pd
import sqlite3
import google.generativeai as genai
from io import BytesIO
import os
import dotenv
import base64
import logging
from datetime import datetime
import pytz
from gtts import gTTS

logging.basicConfig(level=logging.INFO)
dotenv.load_dotenv()
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))

MODEL_PLANNER = "gemini-2.0-flash-lite"
MODEL_INSIGHT = "gemini-2.0-flash"

USER_SALES_TABLE_NAME = 'sales'

DATABASE_SCHEMA = f"""
Table Name: {USER_SALES_TABLE_NAME}

Columns:
- item (TEXT): The name of the product.
- price (REAL): The price of a single item.
- quantity_in_stock (INTEGER): The current quantity of the item available in stock.
- quantity_sold (INTEGER): The number of units of the item sold in a transaction.
- sale_date (TEXT, format YYYY-MM-DD): The date when the sale occurred.
"""

def generate_data_planner_prompt(question: str, db_schema: str) -> str:
    """
    Generates the prompt for the Gemini LLM to act as a data planner,
    identifying necessary data parameters for a given question.
    """
    return f"""
    You are a highly skilled data analyst assistant. Your task is to analyze a user's question and the provided database schema, then identify the precise data required from the database to answer that question.

    Your output must be a single JSON object. Do NOT include any other text, explanations, or conversational phrases outside this JSON block.

    The JSON object should have a key named "data_parameters" with the following structure. Only include parameters that are relevant and necessary to fetch the data for the question. If no specific aggregation or filter is implied, omit those keys.

    {{
      "data_parameters": {{
        "x_axis": "column_name_for_x_axis", // Required if aggregation or specific grouping is needed
        "y_axis": "column_name_for_y_axis", // Required if aggregation is needed (e.g., 'quantity_sold', 'price')
        "aggregation": "sum" | "count" | "average" | "none", // 'none' for fetching raw rows
        "filter_column": "column_name_to_filter",
        "filter_value": "value_to_filter_by",
        "sort_by": "column_name_to_sort",
        "sort_order": "asc" | "desc",
        "limit": 5,
        "time_period": "this_month" | "last_month" | "this_quarter" | "last_quarter" | "ytd" | "all_time" | "YYYY-MM-DD to YYYY-MM-DD" // Infer from question
      }}
    }}

    If the question cannot be answered with a specific data retrieval, provide an empty "data_parameters" object or set relevant keys to 'none' if explicitly required.

    Database Schema:
    {db_schema}

    User Question: {question}
    """

def generate_answer_generator_prompt(question: str, specific_data_json: str) -> str:
    """
    Generates the prompt for the Gemini LLM to provide insights and chart instructions,
    using the specifically fetched data.
    """
    return f"""
    You are a world-class data analyst and business consultant for small retail shops in Nepal.
    Analyze the provided specific sales data and the user's question.
    Based on the question, generate both an executive-level insight and a JSON object that describes a relevant visualization to answer the question.

    If the question is asked in Nepali lingo, reply likewise for the "insight" field. Always keep the Nepali context and small business challenges in mind.

    The JSON object should have the following structure. Do NOT include any other text outside the JSON block unless explicitly asked:
    {{
      "insight": "Your executive-level textual insight here.",
      "chart": {{
        "type": "none" | "bar_chart" | "line_chart" | "pie_chart", # Added pie_chart
        "data_parameters": {{
          "x_axis": "column_name_for_x_axis", # For pie_chart, this is the category (e.g., 'item')
          "y_axis": "column_name_for_y_axis", # For pie_chart, this is the value (e.g., 'total_sales', 'quantity_sold')
          "aggregation": "sum" | "count" | "average" | "none",
          "filter_column": "column_name_to_filter",
          "filter_value": "value_to_filter_by",
          "sort_by": "column_name_to_sort",
          "sort_order": "asc" | "desc",
          "limit": 5,
          "time_period": "this_month" | "last_month" | "this_quarter" | "last_quarter" | "ytd" | "all_time" | "YYYY-MM-DD to YYYY-MM-DD"
        }}
      }}
    }}

    If a visualization is not directly applicable or data is insufficient, set "chart.type" to "none".
    Only provide parameters that are relevant to the chart type and question. For example, if no filtering is needed, omit "filter_column" and "filter_value".

    Here is the specific sales data relevant to the question:
    {specific_data_json}

    Question: {question}
    """


def get_nepal_current_date() -> pd.Timestamp:
    """
    Returns the current date in Nepal Standard Time (NPT) as a pandas Timestamp.
    """
    nepal_tz = pytz.timezone('Asia/Kathmandu')
    return pd.Timestamp(datetime.now(nepal_tz).date())

def get_valid_db_column_name(col_name: str | None, phone_number: str) -> str | None:
    """
    Validates if a column name exists in the database table (case-insensitive)
    and returns its exact casing from the DB schema if found.
    It now takes phone_number to connect to the correct user's database.
    """
    if not col_name:
        return None
    
    # Dynamically build the db_path using the provided phone_number
    db_path = f"user_data/sales_{phone_number}.db"
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} when validating column '{col_name}'.")
        return None # Cannot validate if database doesn't exist

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({USER_SALES_TABLE_NAME});")
        db_columns_info = cursor.fetchall()
        conn.close()

        for col_info in db_columns_info:
            db_col_name = col_info[1]
            if db_col_name.lower() == col_name.lower():
                return db_col_name # Return the exact casing from the DB
        logging.warning(f"Invalid column '{col_name}' suggested. Not found in DB schema for {phone_number}.")
        return None
    except sqlite3.Error as e:
        logging.error(f"SQLite error querying database schema for {phone_number}: {e}")
        return None
    except Exception as e:
        logging.exception(f"An unexpected error occurred while validating column name '{col_name}' for {phone_number}:")
        return None
    finally:
        if conn:
            conn.close()

def fetch_specific_data_for_llm_analysis(params: dict, phone_number: str) -> pd.DataFrame | None:
    """
    Fetches specific, filtered, and aggregated data from SQLite based on LLM-provided parameters.
    Returns a Pandas DataFrame.
    """
    db_path = f"user_data/sales_{phone_number}.db"
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path}.")
        return None

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        x_axis = get_valid_db_column_name(params.get("x_axis"), phone_number)
        y_axis = get_valid_db_column_name(params.get("y_axis"), phone_number)
        filter_column = get_valid_db_column_name(params.get("filter_column"), phone_number)
        sort_by = get_valid_db_column_name(params.get("sort_by"), phone_number)

        aggregation = params.get("aggregation", "none").lower()
        filter_value = params.get("filter_value")
        time_period = params.get("time_period")
        sort_order = params.get("sort_order", "desc").upper()
        limit = params.get("limit")

        select_parts = []
        group_by_clause = ""
        order_by_clause = ""
        where_clauses = []
        sql_params = []

        effective_y_axis = y_axis

        # Construct SELECT and GROUP BY clauses
        if y_axis and (y_axis.lower() == 'total_sales' or (y_axis.lower() == 'price' and aggregation == 'sum')):
            if x_axis:
                select_parts.append(f'"{x_axis}"')
            select_parts.append(f'SUM("price" * "quantity_sold") AS "total_sales"')
            if x_axis:
                group_by_clause = f'GROUP BY "{x_axis}"'
            effective_y_axis = "total_sales"
        elif aggregation != "none" and x_axis and y_axis:
            select_parts.append(f'"{x_axis}"')
            if aggregation == "sum":
                select_parts.append(f'SUM("{y_axis}") AS "{y_axis}"')
            elif aggregation == "count":
                select_parts.append(f'COUNT("{y_axis}") AS "{y_axis}"')
            elif aggregation == "average":
                select_parts.append(f'AVG("{y_axis}") AS "{y_axis}"')
            group_by_clause = f'GROUP BY "{x_axis}"'
            effective_y_axis = y_axis
        elif x_axis and y_axis:
            select_parts.append(f'"{x_axis}"')
            select_parts.append(f'"{y_axis}"')
            effective_y_axis = y_axis
        else:
            select_parts.append("*")
            effective_y_axis = None

        select_clause = f"SELECT {', '.join(select_parts)}"

        # Construct WHERE clauses
        if time_period:
            current_date_nepal = get_nepal_current_date()

            if time_period == "this_month":
                where_clauses.append(f'"sale_date" BETWEEN ? AND ?')
                sql_params.extend([current_date_nepal.strftime('%Y-%m-01'), (current_date_nepal + pd.DateOffset(months=1, days=-1)).strftime('%Y-%m-%d')])
            elif time_period == "last_month":
                last_month_start = (current_date_nepal - pd.DateOffset(months=1)).strftime('%Y-%m-01')
                last_month_end = (current_date_nepal.replace(day=1) - pd.DateOffset(days=1)).strftime('%Y-%m-%d')
                where_clauses.append(f'"sale_date" BETWEEN ? AND ?')
                sql_params.extend([last_month_start, last_month_end])
            elif time_period == "this_quarter":
                q = current_date_nepal.quarter
                y = current_date_nepal.year
                start_q_month = (q - 1) * 3 + 1
                end_q_month = q * 3
                start_q = pd.Timestamp(year=y, month=start_q_month, day=1).strftime('%Y-%m-%d')
                end_q = pd.Timestamp(year=y, month=end_q_month, day=pd.Timestamp(year=y, month=end_q_month, day=1).days_in_month).strftime('%Y-%m-%d')
                where_clauses.append(f'"sale_date" BETWEEN ? AND ?')
                sql_params.extend([start_q, end_q])
            elif time_period == "last_quarter":
                last_q_date = current_date_nepal - pd.DateOffset(months=3)
                q = last_q_date.quarter
                y = last_q_date.year
                start_q_month = (q - 1) * 3 + 1
                end_q_month = q * 3
                start_q = pd.Timestamp(year=y, month=start_q_month, day=1).strftime('%Y-%m-%d')
                end_q = pd.Timestamp(year=y, month=end_q_month, day=pd.Timestamp(year=y, month=end_q_month, day=1).days_in_month).strftime('%Y-%m-%d')
                where_clauses.append(f'"sale_date" BETWEEN ? AND ?')
                sql_params.extend([start_q, end_q])
            elif time_period == "ytd":
                where_clauses.append(f'STRFTIME("%Y", "sale_date") = ?')
                sql_params.append(str(current_date_nepal.year))
            elif " to " in time_period:
                try:
                    start_date_str, end_date_str = time_period.split(" to ")
                    pd.to_datetime(start_date_str, errors='raise')
                    pd.to_datetime(end_date_str, errors='raise')
                    where_clauses.append(f'"sale_date" BETWEEN ? AND ?')
                    sql_params.extend([start_date_str, end_date_str])
                except ValueError:
                    logging.warning(f"Invalid date range format '{time_period}'. Ignoring time filter.")
            elif time_period == "all_time":
                pass
            else:
                logging.warning(f"Unsupported time_period '{time_period}'. Ignoring time filter.")

        if filter_column and filter_value is not None:
            where_clauses.append(f'"{filter_column}" = ?')
            sql_params.append(filter_value)

        where_clause_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        # Construct ORDER BY clause
        if sort_by:
            if effective_y_axis and sort_by.lower() == y_axis.lower():
                order_by_clause = f'ORDER BY "{effective_y_axis}" {sort_order}'
            else:
                order_by_clause = f'ORDER BY "{sort_by}" {sort_order}'

        # Construct LIMIT clause
        limit_clause = f"LIMIT {int(limit)}" if limit is not None and int(limit) >= 0 else ""

        query = f"{select_clause} FROM {USER_SALES_TABLE_NAME} {where_clause_str} {group_by_clause} {order_by_clause} {limit_clause}".strip()

        logging.info(f"Executing SQL Query: {query} for {phone_number} with params: {sql_params}")

        df = pd.read_sql_query(query, conn, params=sql_params)

        if 'sale_date' in df.columns:
            df['sale_date'] = pd.to_datetime(df['sale_date'], errors='coerce').dt.strftime('%Y-%m-%d')
            
        return df

    except sqlite3.Error as e:
        logging.error(f"SQLite error during specific data fetch for {phone_number}: {e}")
        return None
    except Exception as e:
        logging.exception(f"An unexpected error occurred during specific data fetch for {phone_number}: {e}")
        return None
    finally:
        if conn:
            conn.close()


def get_ai_insights_and_chart_data(question: str, phone_number: str) -> dict:
    """
    Centralized function to get AI insights, audio, and chart data for a given question.
    This encapsulates the two-step LLM process (data planning and answer generation).
    """
    user_db_path = f"user_data/sales_{phone_number}.db"

    if not os.path.exists(user_db_path):
        error_msg = "User sales data not found. Please ensure you have added sales data for this phone number."
        logging.warning(error_msg)
        return {
            "full_answer": error_msg,
            "chart_data": {"type": "none"},
            "audio_base64": text_to_audio_base64(error_msg)
        }
    
    data_planner_prompt = generate_data_planner_prompt(question, DATABASE_SCHEMA)
    data_planner_text = ""
    try:
        data_planner_response = genai.GenerativeModel(MODEL_PLANNER).generate_content(
            contents=data_planner_prompt
        )
        data_planner_text = data_planner_response.text.strip()
        logging.info(f"Data Planner LLM Raw Response: {data_planner_text}")

        json_match = re.search(r'\{.*\}', data_planner_text, re.DOTALL)
        if not json_match:
            logging.error("Data Planner LLM did not return valid JSON. Fallback to general error.")
            return {"full_answer": "AI could not plan data retrieval. Please rephrase.", "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64("AI could not plan data retrieval. Please rephrase.")}

        parsed_data_planner_response = json.loads(json_match.group(0))
        data_params_for_fetch = parsed_data_planner_response.get("data_parameters", {})

        specific_data_json_str = ""
        if not data_params_for_fetch:
            logging.info("Data Planner LLM returned empty data_parameters. Proceeding with limited data.")
            specific_data_json_str = json.dumps({"status": "no_params", "message": "No specific data parameters identified for this query."})
        else:
            specific_data_df = fetch_specific_data_for_llm_analysis(data_params_for_fetch, phone_number)

            if specific_data_df is None or specific_data_df.empty:
                logging.warning("Failed to retrieve specific sales data or data is empty.")
                specific_data_json_str = json.dumps({"status": "no_data_found", "message": "No relevant sales data found for your query based on current data."})
            else:
                specific_data_json_str = specific_data_df.to_json(orient='records', date_format='iso')

    except json.JSONDecodeError as e:
        logging.error(f"JSON parsing error from Data Planner LLM: {e}")
        error_msg = f"AI response parsing error. Raw LLM response: {data_planner_text[:200]}..."
        return {"full_answer": error_msg, "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64(error_msg)}
    except genai.types.APIError as e:
        logging.error(f"Gemini API error during Data Planner call: {e}")
        error_msg = f"AI service error during data planning: {e.args[0] if e.args else 'Unknown API Error'}"
        return {"full_answer": error_msg, "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64(error_msg)}
    except Exception as e:
        logging.exception("An unexpected error occurred during data planning/fetching:")
        error_msg = f"An unexpected error occurred: {str(e)}"
        return {"full_answer": error_msg, "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64(error_msg)}

    answer_generator_prompt = generate_answer_generator_prompt(question, specific_data_json_str)
    full_llm_response_text = ""
    try:
        answer_generator_response = genai.GenerativeModel(MODEL_INSIGHT).generate_content(
            contents=answer_generator_prompt
        )
        full_llm_response_text = answer_generator_response.text.strip()
        logging.info(f"Answer Generator LLM Raw Response: {full_llm_response_text}")

        parsed_response = {}
        chart_data_for_frontend = {"type": "none"}

        json_match = re.search(r'\{.*\}', full_llm_response_text, re.DOTALL)
        if json_match:
            json_string = json_match.group(0)
            parsed_response = json.loads(json_string)
            full_answer = parsed_response.get("insight", "No insight provided.")
            chart_data_for_frontend = parsed_response.get("chart", {"type": "none"})
        else:
            full_answer = full_llm_response_text
            logging.warning("Answer Generator LLM response did not contain a valid JSON block. Using full text as answer.")

        audio_base64 = ""
        try:
            lang = "ne" if "नेपाली" in question.lower() or "nepali" in question.lower() else "en"
            tts = gTTS(text=full_answer, lang=lang, slow=False)
            audio_bytes = BytesIO()
            tts.write_to_fp(audio_bytes)
            audio_bytes.seek(0)
            audio_base64 = base64.b64encode(audio_bytes.read()).decode("utf-8")
        except ImportError:
            logging.warning("gTTS not installed. Skipping audio generation.")
        except Exception as tts_e:
            logging.error(f"Error generating TTS audio: {tts_e}")

        return {
            "full_answer": full_answer,
            "audio_base64": audio_base64,
            "chart_data": chart_data_for_frontend
        }

    except genai.types.APIError as e:
        logging.error(f"Gemini API error during Answer Generator call: {e}")
        error_msg = f"AI service error during insight generation: {e.args[0] if e.args else 'Unknown API Error'}"
        return {"full_answer": error_msg, "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64(error_msg)}
    except Exception as e:
        logging.exception("Error during LLM processing or TTS:")
        error_msg = f"An unexpected error occurred: {str(e)}"
        return {"full_answer": error_msg, "chart_data": {"type": "none"}, "audio_base64": text_to_audio_base64(error_msg)}

def text_to_audio_base64(text: str) -> str:
    """
    Converts text to speech and returns a base64 encoded audio string.
    """
    try:
        tts = gTTS(text=text, lang='en', slow=False)
        audio_bytes = BytesIO()
        tts.write_to_fp(audio_bytes)
        audio_bytes.seek(0)
        return base64.b64encode(audio_bytes.read()).decode("utf-8")
    except Exception as e:
        logging.error(f"Error in text_to_audio_base64: {e}")
        return ""

def initialize_database(phone_number: str):
    """
    Ensures the SQLite database and table for a specific user exist.
    """
    user_db_dir = "user_data"
    os.makedirs(user_db_dir, exist_ok=True)
    user_db_path = os.path.join(user_db_dir, f"sales_{phone_number}.db")

    if not os.path.exists(user_db_path):
        logging.info(f"Database not found at {user_db_path}. Creating a new one with the specified schema.")
        try:
            conn = sqlite3.connect(user_db_path)
            cursor = conn.cursor()
            cursor.execute(f"""
                CREATE TABLE {USER_SALES_TABLE_NAME} (
                    "item" TEXT,
                    "price" REAL,
                    "quantity_in_stock" INTEGER,
                    "quantity_sold" INTEGER,
                    "sale_date" TEXT
                );
            """)
            conn.commit()
            conn.close()
            logging.info(f"Empty '{user_db_path}' created with the specified schema.")
        except Exception as e:
            logging.exception(f"Could not create database for {phone_number}:")
            raise


def fetch_dynamic_chart_data(chart_parameters: dict, phone_number: str) -> pd.DataFrame:
    """
    Fetches raw data for dynamic chart generation based on direct parameters from frontend.
    This is designed for the /api/dynamic-chart-data endpoint.
    """
    db_path = f"user_data/sales_{phone_number}.db"
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} for chart data.")
        return pd.DataFrame()

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        # Get raw parameters from LLM suggestion
        raw_x_axis = chart_parameters.get("x_axis")
        raw_y_axis = chart_parameters.get("y_axis")
        aggregation = chart_parameters.get("aggregation", "none").lower()
        
        # Validate x_axis against DB schema (it should be a physical column for grouping)
        x_axis_col = get_valid_db_column_name(raw_x_axis, phone_number)
        
        # Determine the actual y-axis column name in the query result
        # This can be a physical column or a derived alias like 'total_sales'
        y_axis_col_in_query = None
        if raw_y_axis and (raw_y_axis.lower() == 'total_sales' or (raw_y_axis.lower() == 'price' and aggregation == 'sum')):
            y_axis_col_in_query = "total_sales"
        else:
            # If not 'total_sales' or 'price' with sum, validate it as a regular column
            y_axis_col_in_query = get_valid_db_column_name(raw_y_axis, phone_number)

        # Ensure we have valid columns to proceed
        # If x_axis_col or y_axis_col_in_query is None, we cannot build a meaningful query
        if not x_axis_col or not y_axis_col_in_query:
            logging.warning(f"Insufficient valid columns for dynamic chart data. x_axis_col: {x_axis_col}, y_axis_col_in_query: {y_axis_col_in_query}")
            return pd.DataFrame()

        select_parts = []
        group_by_clause = ""
        
        # Always select the x_axis column
        select_parts.append(f'"{x_axis_col}"')

        # Determine how to select the y-axis, handling aggregation and aliases
        if y_axis_col_in_query == "total_sales":
            select_parts.append(f'SUM("price" * "quantity_sold") AS "total_sales"')
        elif aggregation == "sum":
            select_parts.append(f'SUM("{y_axis_col_in_query}") AS "{y_axis_col_in_query}"')
        elif aggregation == "count":
            select_parts.append(f'COUNT("{y_axis_col_in_query}") AS "{y_axis_col_in_query}"')
        elif aggregation == "average":
            select_parts.append(f'AVG("{y_axis_col_in_query}") AS "{y_axis_col_in_query}"')
        else: # No aggregation, direct selection of the y_axis column
            select_parts.append(f'"{y_axis_col_in_query}"')

        # Group by the x_axis column for aggregated queries
        group_by_clause = f'GROUP BY "{x_axis_col}"'

        # Order by the actual y-axis column name in the query result
        order_by_clause = f'ORDER BY "{y_axis_col_in_query}" DESC LIMIT 10'

        query = f"SELECT {', '.join(select_parts)} FROM {USER_SALES_TABLE_NAME} {group_by_clause} {order_by_clause}".strip()

        logging.info(f"Executing dynamic chart SQL Query: {query} for {phone_number}")
        
        df = pd.read_sql_query(query, conn)
        
        # Ensure sale_date is in YYYY-MM-DD format if it's an x_axis
        if x_axis_col and x_axis_col.lower() == 'sale_date' and 'sale_date' in df.columns:
            df['sale_date'] = pd.to_datetime(df['sale_date'], errors='coerce').dt.strftime('%Y-%m-%d')

        return df

    except sqlite3.Error as e:
        logging.error(f"SQLite error during dynamic chart data fetch for {phone_number}: {e}")
        return pd.DataFrame()
    except Exception as e:
        logging.exception(f"An unexpected error occurred during dynamic chart data fetch for {phone_number}:")
        return pd.DataFrame()
    finally:
        if conn:
            conn.close()

