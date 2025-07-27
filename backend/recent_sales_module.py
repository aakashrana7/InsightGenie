import pandas as pd
import sqlite3
import os
import logging

logging.basicConfig(level=logging.INFO)

USER_SALES_TABLE_NAME = 'sales'
USER_DATA_DIR = 'user_data'

def fetch_recent_sales_for_table(phone_number: str) -> pd.DataFrame:
    """
    Fetches the 10 most recently added sales data for a specific user.
    This is designed for displaying in a dashboard table.
    """
    db_path = os.path.join(USER_DATA_DIR, f'sales_{phone_number}.db')
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} for recent sales data.")
        return pd.DataFrame() # Return empty DataFrame if DB not found

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        # Assuming 'sale_date' is the column to determine "recently added"
        # If you have a different column for creation timestamp, use that instead.
        query = f"""
            SELECT item, price, quantity_in_stock, quantity_sold, sale_date
            FROM {USER_SALES_TABLE_NAME}
            ORDER BY sale_date DESC
            LIMIT 10;
        """
        logging.info(f"Executing recent sales SQL Query: {query} for {phone_number}")
        
        df = pd.read_sql_query(query, conn)
        
        # Ensure sale_date is in YYYY-MM-DD format for consistency
        if 'sale_date' in df.columns:
            df['sale_date'] = pd.to_datetime(df['sale_date'], errors='coerce').dt.strftime('%Y-%m-%d')

        return df

    except sqlite3.Error as e:
        logging.error(f"SQLite error during recent sales data fetch for {phone_number}: {e}")
        return pd.DataFrame() # Return empty DataFrame on error
    except Exception as e:
        logging.exception(f"An unexpected error occurred during recent sales data fetch for {phone_number}:")
        return pd.DataFrame() # Return empty DataFrame on error
    finally:
        if conn:
            conn.close()

