-- Simple queries to explore your loan_app database
-- Execute these one by one in your SQL session

-- 1. Show all tables in the database
SHOW TABLES;

-- 2. Count total loans
SELECT COUNT(*) as total_loans FROM loan_table;

-- 3. Show first 5 loans
SELECT loan_number, customer_name, loan_amount, date_of_disbursement, released 
FROM loan_table 
LIMIT 5;

-- 4. Count active vs released loans
SELECT released, COUNT(*) as count 
FROM loan_table 
GROUP BY released;

-- 5. Total loan amounts by status
SELECT released, SUM(loan_amount) as total_amount 
FROM loan_table 
GROUP BY released;

-- 6. Customer types breakdown
SELECT customer_type, COUNT(*) as count 
FROM loan_table 
GROUP BY customer_type;

-- 7. Recent loans (last 10)
SELECT loan_number, customer_name, loan_amount, date_of_disbursement 
FROM loan_table 
ORDER BY date_of_disbursement DESC 
LIMIT 10;

-- 8. Largest loans (top 5)
SELECT loan_number, customer_name, loan_amount, customer_type 
FROM loan_table 
ORDER BY loan_amount DESC 
LIMIT 5;

-- 9. Monthly summary for current year
SELECT 
    YEAR(date_of_disbursement) as year,
    MONTH(date_of_disbursement) as month,
    COUNT(*) as loan_count,
    SUM(loan_amount) as total_amount
FROM loan_table 
WHERE YEAR(date_of_disbursement) = YEAR(CURDATE())
GROUP BY YEAR(date_of_disbursement), MONTH(date_of_disbursement)
ORDER BY month DESC;

-- 10. Check loan_metric_daily table structure
DESCRIBE loan_metric_daily;

-- 11. Sample data from loan_metric_daily
SELECT * FROM loan_metric_daily 
ORDER BY date DESC 
LIMIT 5;

-- 12. Check customer_data table
SELECT COUNT(*) as total_customers FROM customer_data;

-- 13. Sample from customer_data
SELECT * FROM customer_data LIMIT 5;
