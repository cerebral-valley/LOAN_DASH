-- Create database if not exists
CREATE DATABASE IF NOT EXISTS annual_data;
USE annual_data;

-- Table for account metadata
CREATE TABLE IF NOT EXISTS accounts (
    account_code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    head ENUM('asset', 'liability', 'income', 'expense') NOT NULL,
    description TEXT
);

-- Table for monthly totals
CREATE TABLE IF NOT EXISTS monthly_totals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(10) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    opening_balance DECIMAL(18,2) NOT NULL,
    opening_type ENUM('Cr', 'Dr') NOT NULL,
    debit DECIMAL(18,2) NOT NULL,
    credit DECIMAL(18,2) NOT NULL,
    closing_balance DECIMAL(18,2) NOT NULL,
    closing_type ENUM('Cr', 'Dr') NOT NULL,
    FOREIGN KEY(account_code) REFERENCES accounts(account_code)
);

-- Table for change log
CREATE TABLE IF NOT EXISTS change_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_code VARCHAR(10) NOT NULL,
    year INT NOT NULL,
    month INT NOT NULL,
    field VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    FOREIGN KEY(account_code) REFERENCES accounts(account_code)
);
