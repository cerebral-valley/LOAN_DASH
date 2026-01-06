-- Performance Optimization: Add indexes on frequently queried columns
-- This migration adds indexes to improve query performance on WHERE clauses

-- Index on customer_type for filtering by customer type
CREATE INDEX idx_customer_type ON loan_table(customer_type);

-- Index on released status for active/released loan filtering
CREATE INDEX idx_released ON loan_table(released);

-- Index on customer_name for customer-specific queries
CREATE INDEX idx_customer_name ON loan_table(customer_name);

-- Index on date_of_disbursement for date-based queries and sorting
CREATE INDEX idx_date_of_disbursement ON loan_table(date_of_disbursement);

-- Composite index for active loans query (most common query pattern)
CREATE INDEX idx_released_date ON loan_table(released, date_of_disbursement);

-- Index on pending_loan_amount for aggregation queries
CREATE INDEX idx_pending_loan_amount ON loan_table(pending_loan_amount);
