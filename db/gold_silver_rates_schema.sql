-- Gold and Silver Rates Table Schema
-- Stores daily spot and GST rates for gold and silver from Nagpur market
-- Plus COMEX international prices and USD/INR exchange rate

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
