-- Performance Optimization: Add covering indexes to avoid table lookups
-- Covering indexes include both WHERE and SELECT columns for optimal performance

-- Covering index for stats query (includes all aggregation columns)
CREATE INDEX idx_stats_covering ON loan_table(
  released, 
  loan_amount, 
  pending_loan_amount, 
  interest_deposited_till_date
);

-- Covering index for customer queries (includes commonly selected columns)
CREATE INDEX idx_customer_covering ON loan_table(
  customer_name,
  loan_number,
  released,
  loan_amount,
  pending_loan_amount,
  date_of_disbursement,
  interest_rate
);

-- Covering index for customer type queries
CREATE INDEX idx_customer_type_covering ON loan_table(
  customer_type,
  loan_number,
  released,
  date_of_disbursement
);

-- Covering index for active loans with common display fields
CREATE INDEX idx_active_loans_covering ON loan_table(
  released,
  loan_number,
  customer_name,
  loan_amount,
  pending_loan_amount,
  date_of_disbursement,
  interest_rate
);

-- Add index on expense_tracker for common queries
CREATE INDEX idx_expense_date ON expense_tracker(date);
CREATE INDEX idx_expense_payment_mode ON expense_tracker(payment_mode);

-- Covering index for expense stats query
CREATE INDEX idx_expense_stats_covering ON expense_tracker(
  payment_mode,
  amount
);
