# Gold Silver Rates Setup Instructions

## Step 1: Create Table (Run as DB Admin)

The table needs to be created with admin/write privileges. Run the SQL file:

```sql
-- File: db/gold_silver_rates_schema.sql
-- Run this with MySQL admin user
```

Or copy-paste this SQL:

```sql
USE loan_app;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Daily gold and silver rates from 2021 onwards';

-- Grant permissions to read-only user
GRANT SELECT, INSERT, UPDATE ON loan_app.gold_silver_rates TO 'loan_dash_ro'@'localhost';
FLUSH PRIVILEGES;
```

## Step 2: Insert Data

After table is created, run:

```bash
cd Z:\Loan_Dash
.\.venv\Scripts\python.exe insert_gold_silver_rates.py
```

This will insert 1220 rows of data from 2021-09-29 to 2025-10-13.

## Step 3: Verify

Check the data:

```sql
SELECT COUNT(*) FROM gold_silver_rates;
SELECT * FROM gold_silver_rates ORDER BY rate_date DESC LIMIT 10;
```

Expected: 1220 rows
