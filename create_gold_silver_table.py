"""
Create Gold Silver Rates Table in MySQL
=========================================
Uses Python mysql.connector to create table with admin privileges.
"""

import mysql.connector
import os
import getpass
from dotenv import load_dotenv

load_dotenv()

def create_table_with_root():
    """Create table using root/admin credentials"""
    
    # Get root password
    root_password = getpass.getpass("Enter MySQL root password: ")
    
    # Connect as root
    conn = mysql.connector.connect(
        host=os.getenv('MYSQL_HOST', 'localhost'),
        port=int(os.getenv('MYSQL_PORT', '3306')),
        user='root',
        password=root_password,
        database=os.getenv('MYSQL_DB', 'loan_app')
    )
    
    cursor = conn.cursor()
    
    print("🔧 Creating gold_silver_rates table...")
    
    # Create table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS gold_silver_rates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rate_date DATE NOT NULL UNIQUE,
        rate_time TIME NOT NULL,
        
        -- Nagpur Market Rates (INR)
        ngp_hazir_gold INT NOT NULL COMMENT 'Nagpur spot gold rate per 10g in INR',
        ngp_hazir_silver INT NOT NULL COMMENT 'Nagpur spot silver rate per kg in INR',
        ngp_gst_gold INT NOT NULL COMMENT 'Nagpur gold rate with GST per 10g in INR',
        ngp_gst_silver INT NOT NULL COMMENT 'Nagpur silver rate with GST per kg in INR',
        
        -- International Rates
        usd_inr DECIMAL(10, 4) NOT NULL COMMENT 'USD to INR exchange rate',
        cmx_gold_usd DECIMAL(10, 2) NOT NULL COMMENT 'COMEX gold price per oz in USD',
        cmx_silver_usd DECIMAL(10, 2) NOT NULL COMMENT 'COMEX silver price per oz in USD',
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_rate_date (rate_date),
        INDEX idx_ngp_hazir_gold (ngp_hazir_gold),
        INDEX idx_ngp_hazir_silver (ngp_hazir_silver)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daily gold and silver rates from 2021 onwards'
    """
    
    cursor.execute(create_table_sql)
    print("✅ Table created successfully!")
    
    # Grant permissions to loan_dash_ro user
    print("🔐 Granting permissions to loan_dash_ro...")
    grant_sql = "GRANT SELECT, INSERT, UPDATE ON loan_app.gold_silver_rates TO 'loan_dash_ro'@'localhost'"
    cursor.execute(grant_sql)
    cursor.execute("FLUSH PRIVILEGES")
    print("✅ Permissions granted!")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("\n🎉 Setup complete! Now run: python insert_gold_silver_rates.py")

if __name__ == "__main__":
    try:
        create_table_with_root()
    except mysql.connector.Error as e:
        print(f"\n❌ MySQL Error: {e}")
        print("\nTroubleshooting:")
        print("  - Make sure MySQL is running")
        print("  - Verify root password is correct")
        print("  - Check if database 'loan_app' exists")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
