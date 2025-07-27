import os
import sqlite3
import pandas as pd
from flask_cors import CORS
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import logging
from io import StringIO # Import StringIO for reading CSV string

# Import functions and constants from your insight_module
from insight_module import ( # Corrected module name to insight_module
    get_ai_insights_and_chart_data,
    fetch_dynamic_chart_data,
    USER_SALES_TABLE_NAME,
    DATABASE_SCHEMA
)

# Import the OCR Blueprint from ocr_module.py
from ocr_module import ocr_bp # Make sure ocr_module.py is in the same directory or accessible via PYTHONPATH

# Import new functions from recent_sales_module and dashboard_data_module
from recent_sales_module import fetch_recent_sales_for_table
from dashboard_data_module import get_dashboard_summary, get_sales_trend_data, get_inventory_distribution_data

# Configure logging for the app
logging.basicConfig(level=logging.INFO) # Keep INFO for general app logs

# Initialize db globally, will be bound to app in create_app
db = SQLAlchemy()

# Master DB setup
MASTER_DB_PATH = "master_sales.db"

def create_master_db():
    """Ensures the master sales database and table exist."""
    if not os.path.exists(MASTER_DB_PATH):
        conn = sqlite3.connect(MASTER_DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT,
                item TEXT,
                price REAL,
                quantity_in_stock INTEGER,
                quantity_sold INTEGER,
                sale_date TEXT
            )
        ''')
        conn.commit()
        conn.close()
        logging.info(f"Master database created at {MASTER_DB_PATH}")

def sync_to_master(phone_number, item, price, quantity_in_stock, quantity_sold, sale_date):
    """Syncs a single sale record to the master sales database."""
    conn = sqlite3.connect(MASTER_DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO sales_data (phone_number, item, price, quantity_in_stock, quantity_sold, sale_date)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (phone_number, item, price, quantity_in_stock, quantity_sold, sale_date))
    conn.commit()
    conn.close()
    logging.info(f"Sale synced to master DB for {phone_number}")

# Create per-user sales DB
def create_user_sales_db(phone_number):
    """Ensures the SQLite database and table for a specific user exist."""
    db_folder = "user_data"
    os.makedirs(db_folder, exist_ok=True) # Ensure user_data directory exists
    db_path = os.path.join(db_folder, f"sales_{phone_number}.db")

    if not os.path.exists(db_path):
        logging.info(f"Database not found at {db_path}. Creating a new one with the specified schema.")
        conn = None # Initialize conn to None
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            # Correctly use USER_SALES_TABLE_NAME for the table name
            cursor.execute(f'''
                CREATE TABLE IF NOT EXISTS {USER_SALES_TABLE_NAME} (
                    "id" INTEGER PRIMARY KEY AUTOINCREMENT,
                    "item" TEXT NOT NULL,
                    "price" REAL NOT NULL,
                    "quantity_in_stock" INTEGER,
                    "quantity_sold" INTEGER,
                    "sale_date" TEXT
                );
            ''')
            conn.commit()
            logging.info(f"Empty '{db_path}' created with the specified schema.")
        except Exception as e:
            logging.exception(f"Could not create database for {phone_number}:")
            raise # Re-raise to ensure calling function knows about the failure
        finally:
            if conn:
                conn.close()


def create_app():
    app = Flask(__name__)
    CORS(app, supports_credentials=True)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy with the app instance
    db.init_app(app)

    # User model for SQLAlchemy (must be defined after db.init_app(app))
    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(100), nullable=False)
        business_name = db.Column(db.String(100), nullable=True)
        phone_number = db.Column(db.String(15), unique=True, nullable=False)
        password = db.Column(db.String(200), nullable=False)
        business_type = db.Column(db.String(50))
        address = db.Column(db.Text)
        website = db.Column(db.String(255))
        gst_no = db.Column(db.String(20))

    # Register the OCR Blueprint
    app.register_blueprint(ocr_bp, url_prefix='/ocr') # The url_prefix ensures routes like /extract become /ocr/extract

    @app.before_request
    def setup_databases():
        """Ensures all necessary databases and tables are created before the first request."""
        with app.app_context(): # Ensure app context for db.create_all()
            db.create_all()
        create_master_db()

    @app.route('/register', methods=['POST'])
    def register():
        data = request.get_json()
        app.logger.info(f"Received registration data: {data}")

        phone_number = data.get('phone_number')
        username = data.get('username')
        business_name = data.get('businessName')
        password = data.get('password')
        business_type = data.get('business_type')
        address = data.get('address')
        website = data.get('website')
        gst_no = data.get('gst_no')

        if not all([phone_number, username, password, business_type, address]):
            return jsonify({"error": "Missing required fields"}), 400

        # Access User model within the app context
        with app.app_context():
            existing_user = User.query.filter(
                (User.phone_number == phone_number) | (User.username == username)
            ).first()

        if existing_user:
            return jsonify({"error": "User with this phone number or username already exists"}), 400

        hashed_password = generate_password_hash(password)

        new_user = User(
            phone_number=phone_number,
            username=username,
            business_name=business_name,
            password=hashed_password,
            business_type=business_type,
            address=address,
            website=website,
            gst_no=gst_no
        )

        try:
            with app.app_context():
                db.session.add(new_user)
                db.session.commit()
            create_user_sales_db(phone_number) # Create sales DB for new user
        except Exception as e:
            app.logger.error(f"Error saving user or creating user DB: {e}")
            with app.app_context():
                db.session.rollback()
            return jsonify({"error": "Server error. Please try again later."}), 500

        return jsonify({"message": "User registered successfully"}), 201


    @app.route('/login', methods=['POST'])
    def login():
        try:
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Invalid JSON payload'}), 400

            phone_number = data.get('phone_number')
            password = data.get('password')

            if not phone_number or not password:
                return jsonify({'error': 'Phone number and password are required'}), 400

            with app.app_context():
                user = User.query.filter_by(phone_number=phone_number).first()
            if not user or not check_password_hash(user.password, password):
                return jsonify({'error': 'Invalid phone number or password'}), 401

            create_user_sales_db(phone_number) # Ensure user's sales DB exists

            return jsonify({'message': f'Welcome, {user.username}!', 'phone_number': user.phone_number}), 200

        except Exception as e:
            app.logger.error(f"Login error: {e}")
            return jsonify({'error': 'Internal server error'}), 500


    @app.route('/add_sale', methods=['POST'])
    def add_sale():
        data = request.get_json()

        phone_number = data.get('phone_number')
        item = data.get('item')
        price = data.get('price')
        quantity_in_stock = data.get('quantity_in_stock')
        quantity_sold = data.get('quantity_sold')
        sale_date = data.get('sale_date')

        if not all([phone_number, item, price, quantity_in_stock, quantity_sold, sale_date]):
            return jsonify({'error': 'Missing sale data'}), 400

        create_user_sales_db(phone_number) # Redundant but safe check

        user_db_path = os.path.join("user_data", f"sales_{phone_number}.db")
        conn = sqlite3.connect(user_db_path)
        cursor = conn.cursor()

        # Insert the sale into the user's specific database using USER_SALES_TABLE_NAME
        cursor.execute(f'''
            INSERT INTO {USER_SALES_TABLE_NAME} (item, price, quantity_in_stock, quantity_sold, sale_date)
            VALUES (?, ?, ?, ?, ?)
        ''', (item, price, quantity_in_stock, quantity_sold, sale_date))

        conn.commit()
        conn.close()

        sync_to_master(phone_number, item, price, quantity_in_stock, quantity_sold, sale_date)

        return jsonify({'message': 'Sale data added and synced to master'}), 201


    @app.route('/upload_icr_csv', methods=['POST'])
    def upload_icr_csv():
        phone_number = request.form.get('phone_number')
        if not phone_number:
            return jsonify({'error': 'Phone number is required'}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'CSV file is required'}), 400

        csv_file = request.files['file']

        try:
            df = pd.read_csv(csv_file, parse_dates=['date'])
            df['date'] = pd.to_datetime(df['date'])

            df_cleaned = pd.DataFrame()
            df_cleaned['item'] = df['product_name']
            df_cleaned['price'] = df['price']
            df_cleaned['quantity_in_stock'] = df['stock'].fillna(0)
            df_cleaned['quantity_sold'] = df['units_sold']
            df_cleaned['sale_date'] = df['date'].dt.strftime('%Y-%m-%d')

            DB_FOLDER = "user_data"
            DB_PATH = os.path.join(DB_FOLDER, f"sales_{phone_number}.db")
            
            create_user_sales_db(phone_number)

            conn = sqlite3.connect(DB_PATH)
            # Use USER_SALES_TABLE_NAME for the table name when uploading CSV
            df_cleaned.to_sql(USER_SALES_TABLE_NAME, conn, if_exists='append', index=False)
            conn.commit()
            conn.close()

            for _, row in df_cleaned.iterrows():
                sync_to_master(
                    phone_number=phone_number,
                    item=row['item'],
                    price=row['price'],
                    quantity_in_stock=row['quantity_in_stock'],
                    quantity_sold=row['quantity_sold'],
                    sale_date=row['sale_date']
                )

            logging.info(f"Successfully uploaded {len(df_cleaned)} OCR records to DB for {phone_number}.")
            return jsonify({"status": "success", "message": f"{len(df_cleaned)} records uploaded successfully."}), 200

        except Exception as e:
            logging.exception("Error during CSV upload:")
            return jsonify({'error': str(e)}), 500
        
    @app.route('/insights', methods=['POST'])
    def insights():
        data = request.get_json()
        phone_number = data.get("phone_number")
        
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        
        question = data.get("question", "Provide me with key sales insights and a relevant chart for my business in Nepal.")

        try:
            insights_data = get_ai_insights_and_chart_data(question, phone_number)
            
            if "error" in insights_data:
                return jsonify(insights_data), 500
                
            return jsonify(insights_data)
        except Exception as e:
            logging.exception("Error processing insights request:")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dynamic-chart-data", methods=["POST"])
    def get_dynamic_chart_data():
        request_data = request.json
        chart_params = request_data.get("chart_parameters", {})
        phone_number = request_data.get("phone_number")

        if not phone_number:
            return jsonify({"error": "Phone number is required for chart data"}), 400

        sales_df = fetch_dynamic_chart_data(chart_params, phone_number)
        
        if sales_df is None or sales_df.empty:
            logging.error(f"No data available for charts for user {phone_number} based on the provided parameters.")
            return jsonify({"error": "No data available for charts."}), 500

        df_columns = sales_df.columns.tolist()
        sort_by_param = chart_params.get("sort_by")
        sort_by = None
        if sort_by_param:
            for col in df_columns:
                if col.lower() == sort_by_param.lower():
                    sort_by = col
                    break
            
        if not sort_by and chart_params.get("y_axis"):
            y_axis_param = chart_params.get("y_axis")
            for col in df_columns:
                if col.lower() == y_axis_param.lower():
                    sort_by = col
                    break
            if y_axis_param.lower() == 'price' and chart_params.get('aggregation') == 'sum' and 'total_sales' in df_columns:
                sort_by = 'total_sales'

        sort_order = True if chart_params.get("sort_order", "desc") == "asc" else False
        limit = chart_params.get("limit")

        if sort_by and sort_by in sales_df.columns:
            sales_df = sales_df.sort_values(by=sort_by, ascending=sort_order)
        else:
            logging.warning(f"Sort by column '{sort_by_param}' not found in fetched data or not applicable. Skipping sort.")

        if limit is not None:
            try:
                limit_int = int(limit)
                if limit_int >= 0:
                    sales_df = sales_df.head(limit_int)
            except ValueError:
                logging.warning(f"Invalid limit value '{limit}'. Ignoring limit for chart data.")

        return jsonify(sales_df.to_dict(orient='records'))

    @app.route("/api/upload-ocr-data", methods=["POST"])
    def upload_ocr_data_to_db():
        data = request.get_json()
        phone_number = data.get("phone_number")
        csv_data = data.get("csv_data")

        if not phone_number:
            return jsonify({"status": "error", "error": "Phone number is required."}), 400
        if not csv_data:
            return jsonify({"status": "error", "error": "CSV data is required."}), 400

        try:
            from io import StringIO
            # Read the CSV data directly. With the new prompt, headers should match.
            df = pd.read_csv(StringIO(csv_data))

            # --- Simplified Data Cleaning and Validation ---
            # Ensure column names are lowercase (if not already from Gemini's output)
            df.columns = [col.lower() for col in df.columns]

            # Rename columns if Gemini still outputs slight variations, but ideally it won't
            # This is a fallback, less extensive than before.
            df.rename(columns={
                'product_name': 'item', # In case Gemini defaults to this
                'date': 'sale_date'     # In case Gemini defaults to this
            }, inplace=True)

            # Ensure all required columns are present, fill missing with None/NaN
            # This is still a good safety net
            required_db_cols = ['item', 'price', 'quantity_in_stock', 'quantity_sold', 'sale_date']
            for col in required_db_cols:
                if col not in df.columns:
                    df[col] = None # Add missing columns

            # Select only the columns relevant to your database schema in the correct order
            df_cleaned = df[required_db_cols].copy()

            # Type conversion and handling missing values
            df_cleaned['item'] = df_cleaned['item'].astype(str)
            df_cleaned['price'] = pd.to_numeric(df_cleaned['price'], errors='coerce').fillna(0)
            df_cleaned['quantity_in_stock'] = pd.to_numeric(df_cleaned['quantity_in_stock'], errors='coerce').fillna(0).astype(int)
            df_cleaned['quantity_sold'] = pd.to_numeric(df_cleaned['quantity_sold'], errors='coerce').fillna(0).astype(int)
            
            # Convert sale_date to YYYY-MM-DD format, handle errors
            df_cleaned['sale_date'] = pd.to_datetime(df_cleaned['sale_date'], errors='coerce').dt.strftime('%Y-%m-%d')
            
            # Drop rows where essential data (item or sale_date) is missing after cleaning
            initial_rows = len(df_cleaned)
            df_cleaned.dropna(subset=['item', 'sale_date'], inplace=True)
            if len(df_cleaned) < initial_rows:
                logging.warning(f"Dropped {initial_rows - len(df_cleaned)} rows due to missing essential 'item' or 'sale_date' after cleaning.")

            if df_cleaned.empty:
                return jsonify({"status": "error", "error": "No valid data rows found after processing OCR CSV. Please ensure the CSV contains 'item' and 'sale_date' data."}), 400

            # Ensure user's sales DB exists
            create_user_sales_db(phone_number)

            user_db_path = os.path.join("user_data", f"sales_{phone_number}.db")
            conn = sqlite3.connect(user_db_path)
            
            # Insert data into the user's specific database
            df_cleaned.to_sql(USER_SALES_TABLE_NAME, conn, if_exists='append', index=False)
            conn.commit()
            conn.close()

            # Also sync to master DB
            for _, row in df_cleaned.iterrows():
                sync_to_master(
                    phone_number=phone_number,
                    item=row['item'],
                    price=row['price'],
                    quantity_in_stock=row['quantity_in_stock'],
                    quantity_sold=row['quantity_sold'],
                    sale_date=row['sale_date']
                )

            logging.info(f"Successfully uploaded {len(df_cleaned)} OCR records to DB for {phone_number}.")
            return jsonify({"status": "success", "message": f"{len(df_cleaned)} records uploaded successfully."}), 200

        except Exception as e:
            logging.exception("Error processing OCR data upload to DB:")
            return jsonify({"status": "error", "error": f"Failed to upload data: {str(e)}"}), 500

    @app.route("/api/recent-sales", methods=["POST"])
    def get_recent_sales():
        data = request.json
        phone_number = data.get('phone_number')

        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400

        try:
            df = fetch_recent_sales_for_table(phone_number)
            if df is None or df.empty:
                logging.info(f"No recent sales data found for user {phone_number}.")
                return jsonify({"message": "No recent sales data available"}), 200
            return jsonify(df.to_dict(orient='records')), 200
        except Exception as e:
            logging.exception(f"Error fetching recent sales data for user {phone_number}:")
            return jsonify({"error": str(e)}), 500

    # New API endpoints for Dashboard data
    @app.route("/api/dashboard-summary", methods=["POST"])
    def dashboard_summary():
        data = request.json
        phone_number = data.get('phone_number')
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        try:
            summary_data = get_dashboard_summary(phone_number)
            return jsonify(summary_data), 200
        except Exception as e:
            logging.exception(f"Error fetching dashboard summary for {phone_number}:")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dashboard-sales-trend", methods=["POST"])
    def dashboard_sales_trend():
        data = request.json
        phone_number = data.get('phone_number')
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        try:
            trend_data = get_sales_trend_data(phone_number)
            return jsonify(trend_data), 200
        except Exception as e:
            logging.exception(f"Error fetching sales trend for {phone_number}:")
            return jsonify({"error": str(e)}), 500

    @app.route("/api/dashboard-inventory-distribution", methods=["POST"])
    def dashboard_inventory_distribution():
        data = request.json
        phone_number = data.get('phone_number')
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        try:
            inventory_data = get_inventory_distribution_data(phone_number)
            return jsonify(inventory_data), 200
        except Exception as e:
            logging.exception(f"Error fetching inventory distribution for {phone_number}:")
            return jsonify({"error": str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
