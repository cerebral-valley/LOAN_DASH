"""
Insert Gold and Silver Rates from Excel to MySQL
=================================================
Loads gold_silver_rates_eod_CORRECTED.xlsx and inserts data into MySQL.
Run once to populate the gold_silver_rates table.
"""

import sys
import pandas as pd
from sqlalchemy import create_engine, text
from pathlib import Path
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database connection
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASS = os.getenv("MYSQL_PASS")
MYSQL_DB = os.getenv("MYSQL_DB", "loan_app")

# Create connection URL
URL = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASS}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
engine = create_engine(URL)

def create_table():
    """Create gold_silver_rates table if it doesn't exist"""
    schema_path = Path(__file__).parent / "db" / "gold_silver_rates_schema.sql"
    
    with open(schema_path, 'r') as f:
        schema_sql = f.read()
    
    with engine.connect() as conn:
        conn.execute(text(schema_sql))
        conn.commit()
    
    print("✅ Table 'gold_silver_rates' created/verified")


def load_and_insert_data():
    """Load Excel data and insert into MySQL"""
    excel_path = Path(__file__).parent / "gold_silver_rates_eod_CORRECTED.xlsx"
    
    print(f"📂 Loading data from {excel_path.name}...")
    df = pd.read_excel(excel_path)
    
    print(f"📊 Loaded {len(df)} rows")
    print(f"📅 Date range: {df['Date'].min()} to {df['Date'].max()}")
    
    # Prepare data for insertion
    df_insert = df.copy()
    df_insert.columns = [
        'rate_date', 'rate_time', 
        'ngp_hazir_gold', 'ngp_hazir_silver',
        'ngp_gst_gold', 'ngp_gst_silver',
        'usd_inr', 'cmx_gold_usd', 'cmx_silver_usd'
    ]
    
    # Convert date and time
    df_insert['rate_date'] = pd.to_datetime(df_insert['rate_date']).dt.date
    
    print("💾 Inserting data into MySQL...")
    
    # Insert with replace to handle duplicates
    with engine.connect() as conn:
        for idx, row in df_insert.iterrows():
            sql = text("""
                INSERT INTO gold_silver_rates 
                (rate_date, rate_time, ngp_hazir_gold, ngp_hazir_silver, 
                 ngp_gst_gold, ngp_gst_silver, usd_inr, cmx_gold_usd, cmx_silver_usd)
                VALUES 
                (:rate_date, :rate_time, :ngp_hazir_gold, :ngp_hazir_silver,
                 :ngp_gst_gold, :ngp_gst_silver, :usd_inr, :cmx_gold_usd, :cmx_silver_usd)
                ON DUPLICATE KEY UPDATE
                    rate_time = VALUES(rate_time),
                    ngp_hazir_gold = VALUES(ngp_hazir_gold),
                    ngp_hazir_silver = VALUES(ngp_hazir_silver),
                    ngp_gst_gold = VALUES(ngp_gst_gold),
                    ngp_gst_silver = VALUES(ngp_gst_silver),
                    usd_inr = VALUES(usd_inr),
                    cmx_gold_usd = VALUES(cmx_gold_usd),
                    cmx_silver_usd = VALUES(cmx_silver_usd)
            """)
            
            conn.execute(sql, row.to_dict())
            
            if (idx + 1) % 100 == 0:
                print(f"  Inserted {idx + 1}/{len(df_insert)} rows...")
        
        conn.commit()
    
    print(f"✅ Successfully inserted {len(df_insert)} rows")


def verify_data():
    """Verify inserted data"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) as count FROM gold_silver_rates"))
        count = result.fetchone()[0]
        
        result = conn.execute(text("""
            SELECT MIN(rate_date) as min_date, MAX(rate_date) as max_date 
            FROM gold_silver_rates
        """))
        dates = result.fetchone()
        
        result = conn.execute(text("""
            SELECT rate_date, ngp_hazir_gold, ngp_hazir_silver 
            FROM gold_silver_rates 
            ORDER BY rate_date DESC 
            LIMIT 5
        """))
        latest = result.fetchall()
    
    print(f"\n📊 Verification:")
    print(f"  Total rows: {count}")
    print(f"  Date range: {dates[0]} to {dates[1]}")
    print(f"\n  Latest 5 entries:")
    for row in latest:
        print(f"    {row[0]}: Gold ₹{row[1]:,}, Silver ₹{row[2]:,}")


if __name__ == "__main__":
    try:
        print("🚀 Starting Gold/Silver Rates Data Import\n")
        
        print("⚠️  NOTE: Please create the table manually first using:")
        print("    db/gold_silver_rates_schema.sql\n")
        print("Proceeding with data insert...\n")
        
        # create_table()  # Skip - requires admin privileges
        load_and_insert_data()
        verify_data()
        
        print("\n✅ Import completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
