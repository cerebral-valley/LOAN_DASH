"""
Update gold_silver_rates table to allow NULL values in all rate columns.
This is needed because WhatsApp chat entries don't always have all rates.
"""

import mysql.connector
import getpass

# Database credentials
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'database': 'loan_app'
}

def update_table_schema(password: str):
    """Modify table to allow NULL values."""
    
    print("🔧 Connecting to database...")
    
    conn = mysql.connector.connect(
        **DB_CONFIG,
        password=password
    )
    cursor = conn.cursor()
    
    print("📝 Updating table schema to allow NULL values...")
    
    # Modify columns to allow NULL
    alter_queries = [
        "ALTER TABLE gold_silver_rates MODIFY COLUMN ngp_hazir_gold DECIMAL(10, 2) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN ngp_hazir_silver DECIMAL(10, 2) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN ngp_gst_gold DECIMAL(10, 2) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN ngp_gst_silver DECIMAL(10, 2) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN usd_inr DECIMAL(10, 5) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN cmx_gold_usd DECIMAL(10, 2) NULL",
        "ALTER TABLE gold_silver_rates MODIFY COLUMN cmx_silver_usd DECIMAL(10, 2) NULL"
    ]
    
    for query in alter_queries:
        print(f"  {query[:60]}...")
        cursor.execute(query)
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print("✅ Table schema updated successfully!")
    print("   All rate columns now allow NULL values.")

def main():
    print("=" * 80)
    print("🔄 Update Gold/Silver Rates Table Schema")
    print("=" * 80)
    
    password = getpass.getpass("Enter MySQL root password: ")
    
    update_table_schema(password)
    
    print("=" * 80)
    print("✅ COMPLETE!")
    print("=" * 80)

if __name__ == "__main__":
    main()
