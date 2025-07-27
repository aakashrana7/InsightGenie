import pandas as pd
import sqlite3
import os
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)

USER_SALES_TABLE_NAME = 'sales'
USER_DATA_DIR = 'user_data'

def get_dashboard_summary(phone_number: str) -> dict:
    """
    Fetches summary statistics for the dashboard.
    """
    db_path = os.path.join(USER_DATA_DIR, f'sales_{phone_number}.db')
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} for dashboard summary.")
        return {
            "totalSales": 0,
            "totalOrders": 0,
            "inventoryValue": 0,
            "lowStockItems": 0,
            "customerGrowth": 0, # Placeholder, as customer data is not in sales table
            "topSelling": "N/A"
        }

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        # Total Sales
        total_sales_query = f'SELECT SUM(price * quantity_sold) FROM {USER_SALES_TABLE_NAME}'
        total_sales = conn.execute(total_sales_query).fetchone()[0] or 0.0

        # Total Orders (assuming each row is an order or distinct sale_date for simplicity)
        # More accurately, you'd need an 'order_id' column for distinct orders.
        # For now, let's count distinct sale_dates as a proxy for 'orders' or just total sales records.
        total_orders_query = f'SELECT COUNT(DISTINCT sale_date) FROM {USER_SALES_TABLE_NAME}'
        total_orders = conn.execute(total_orders_query).fetchone()[0] or 0

        # Inventory Value (sum of price * quantity_in_stock)
        inventory_value_query = f'SELECT SUM(price * quantity_in_stock) FROM {USER_SALES_TABLE_NAME}'
        inventory_value = conn.execute(inventory_value_query).fetchone()[0] or 0.0

        # Low Stock Items (assuming a reorder level of 5 for demonstration)
        # In a real scenario, 'reorder_level' would be a column in the table or configurable.
        low_stock_query = f'SELECT COUNT(DISTINCT item) FROM {USER_SALES_TABLE_NAME} WHERE quantity_in_stock <= 5'
        low_stock_items = conn.execute(low_stock_query).fetchone()[0] or 0

        # Top Selling Item (by total sales value)
        top_selling_query = f"""
            SELECT item, SUM(price * quantity_sold) AS total_item_sales
            FROM {USER_SALES_TABLE_NAME}
            GROUP BY item
            ORDER BY total_item_sales DESC
            LIMIT 1
        """
        top_selling_result = conn.execute(top_selling_query).fetchone()
        top_selling_item = top_selling_result[0] if top_selling_result else "N/A"

        # Customer Growth: This data is not available in the sales table.
        # It would require a 'customers' table or similar. Returning 0 for now.
        customer_growth = 0.0 

        return {
            "totalSales": total_sales,
            "totalOrders": total_orders,
            "inventoryValue": inventory_value,
            "lowStockItems": low_stock_items,
            "customerGrowth": customer_growth,
            "topSelling": top_selling_item
        }

    except sqlite3.Error as e:
        logging.error(f"SQLite error fetching dashboard summary for {phone_number}: {e}")
        return {} # Return empty dict on error
    except Exception as e:
        logging.exception(f"An unexpected error occurred fetching dashboard summary for {phone_number}:")
        return {} # Return empty dict on error
    finally:
        if conn:
            conn.close()

def get_sales_trend_data(phone_number: str) -> list:
    """
    Fetches monthly sales trend data for the last 7 months.
    """
    db_path = os.path.join(USER_DATA_DIR, f'sales_{phone_number}.db')
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} for sales trend.")
        return []

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        # Get current date and calculate start date for the last 7 months
        today = datetime.now()
        start_date = (today - timedelta(days=7 * 30)).strftime('%Y-%m-01') # Approx 7 months ago

        query = f"""
            SELECT
                strftime('%Y-%m', sale_date) AS month,
                SUM(price * quantity_sold) AS total_sales
            FROM {USER_SALES_TABLE_NAME}
            WHERE sale_date >= '{start_date}'
            GROUP BY month
            ORDER BY month ASC;
        """
        df = pd.read_sql_query(query, conn)
        
        # Fill in missing months with 0 sales for a complete trend line
        all_months = []
        for i in range(7): # Last 7 months
            month_date = today - timedelta(days=i*30)
            all_months.append(month_date.strftime('%Y-%m'))
        all_months.reverse() # Order from oldest to newest

        # Create a DataFrame with all months
        full_df = pd.DataFrame({'month': all_months})
        df['month'] = pd.to_datetime(df['month']).dt.strftime('%Y-%m') # Ensure consistent format
        
        # Merge with fetched data, filling NaN sales with 0
        merged_df = pd.merge(full_df, df, on='month', how='left').fillna(0)
        
        # Format for Recharts: { name: 'Jan', sales: 40000, target: 35000 }
        # We don't have 'target' data, so we'll omit it or use a placeholder.
        # Let's just return 'month' as 'name' and 'total_sales' as 'sales'.
        formatted_data = []
        for index, row in merged_df.iterrows():
            # Convert month string to short month name (e.g., '2023-01' to 'Jan')
            month_name = datetime.strptime(row['month'], '%Y-%m').strftime('%b')
            formatted_data.append({
                "name": month_name,
                "sales": row['total_sales'],
                "target": row['total_sales'] * 1.1 # Simple placeholder target (10% higher than actual sales)
            })

        return formatted_data

    except sqlite3.Error as e:
        logging.error(f"SQLite error fetching sales trend for {phone_number}: {e}")
        return []
    except Exception as e:
        logging.exception(f"An unexpected error occurred fetching sales trend for {phone_number}:")
        return []
    finally:
        if conn:
            conn.close()

def get_inventory_distribution_data(phone_number: str) -> list:
    """
    Fetches inventory distribution data by item.
    """
    db_path = os.path.join(USER_DATA_DIR, f'sales_{phone_number}.db')
    if not os.path.exists(db_path):
        logging.error(f"User database not found at {db_path} for inventory distribution.")
        return []

    conn = None
    try:
        conn = sqlite3.connect(db_path)
        
        query = f"""
            SELECT item, SUM(quantity_in_stock) AS total_stock
            FROM {USER_SALES_TABLE_NAME}
            GROUP BY item
            ORDER BY total_stock DESC
            LIMIT 5; -- Get top 5 items by stock
        """
        df = pd.read_sql_query(query, conn)
        
        # Format for Recharts PieChart: { name: 'Electronics', value: 400 }
        formatted_data = df.rename(columns={'item': 'name', 'total_stock': 'value'}).to_dict(orient='records')
        
        return formatted_data

    except sqlite3.Error as e:
        logging.error(f"SQLite error fetching inventory distribution for {phone_number}: {e}")
        return []
    except Exception as e:
        logging.exception(f"An unexpected error occurred fetching inventory distribution for {phone_number}:")
        return []
    finally:
        if conn:
            conn.close()

