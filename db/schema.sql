-- 3️⃣ schema.sql – run once on your MySQL server
-- ----------  ❰ DAILY KPI ❱  ----------
CREATE TABLE IF NOT EXISTS loan_kpi_daily (
    kpi_date           DATE PRIMARY KEY,
    total_disbursed_amt   DECIMAL(14,2),
    total_disbursed_qty   INT,
    interest_income_td    DECIMAL(14,2),
    avg_loan_amt          DECIMAL(14,2),
    avg_int_amt           DECIMAL(14,2),
    avg_tenor_mo          DECIMAL(5,2),
    median_loan_amt       DECIMAL(14,2),
    median_int_amt        DECIMAL(14,2),
    median_tenor_mo       DECIMAL(5,2),
    latest_loan_no        INT,
    os_amt                DECIMAL(14,2),
    os_qty                INT,
    private_amt           DECIMAL(14,2),
    private_qty           INT,
    vyapari_amt           DECIMAL(14,2),
    vyapari_qty           INT,
    w_avg_int_rate        DECIMAL(5,2),      -- weighted by loan_amount
    pct_over_90_days      DECIMAL(5,2),
    redeem_ratio_30d      DECIMAL(5,2)
);

-- ----------  ❰ MONTHLY KPI ❱  ----------
CREATE TABLE IF NOT EXISTS loan_kpi_monthly (
    kpi_year          INT,
    kpi_month         TINYINT,
    PRIMARY KEY (kpi_year, kpi_month),
    disbursed_amt     DECIMAL(14,2),
    disbursed_qty     INT,
    interest_amt      DECIMAL(14,2),
    interest_qty      INT,
    os_amt            DECIMAL(14,2),
    os_qty            INT,
    yoy_delta_amt     DECIMAL(14,2),
    mom_delta_amt     DECIMAL(14,2)
);

-- ----------  ❰ YEARLY KPI ❱  ----------
CREATE TABLE IF NOT EXISTS loan_kpi_yearly (
    kpi_year         INT PRIMARY KEY,
    private_amt      DECIMAL(14,2),
    private_qty      INT,
    vyapari_amt      DECIMAL(14,2),
    vyapari_qty      INT,
    top10_conc_pct   DECIMAL(5,2)
);

-- ----------  ❰ SIZE BUCKET KPI ❱ ----------
CREATE TABLE IF NOT EXISTS loan_size_bucket_daily (
    kpi_date       DATE,
    bucket_id      TINYINT,
    bucket_label   VARCHAR(30),
    amt            DECIMAL(14,2),
    qty            INT,
    PRIMARY KEY (kpi_date, bucket_id)
);

-- ----------  ❰ CLIENT SNAPSHOT ❱ ----------
CREATE TABLE IF NOT EXISTS client_snapshot (
    snapshot_date     DATE,
    customer_id       VARCHAR(50),
    os_amt            DECIMAL(14,2),
    os_qty            INT,
    total_loans_ytd   INT,
    total_interest_ytd DECIMAL(14,2),
    days_since_last_txn INT,
    current_ltv       DECIMAL(6,2),
    PRIMARY KEY (snapshot_date, customer_id)
);

-- ----------  ❰ REFRESH PROC ❱ ----------
DELIMITER //
CREATE PROCEDURE sp_refresh_kpis()
BEGIN
  START TRANSACTION;

  -- 1. Clear today’s rows to allow idempotent re-run
  DELETE FROM loan_kpi_daily WHERE kpi_date = CURDATE();
  DELETE FROM loan_size_bucket_daily WHERE kpi_date = CURDATE();
  -- (similar DELETEs for other tables' current period if needed)

  -- 2. Re-insert DAILY KPI (simplified; replace … with real aggregates)
  INSERT INTO loan_kpi_daily (kpi_date, total_disbursed_amt, ...)
  SELECT
    CURDATE(),
    SUM(loan_amount),              -- total_disbursed_amt
    COUNT(*),                      -- total_disbursed_qty
    SUM(interest_amount),          -- interest_income_td
    AVG(loan_amount),              -- avg_loan_amt
    AVG(interest_amount),          -- avg_int_amt
    AVG(TIMESTAMPDIFF(MONTH, date_of_disbursement, IFNULL(date_of_release, CURDATE()))),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY loan_amount),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY interest_amount),
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY TIMESTAMPDIFF(MONTH, date_of_disbursement, IFNULL(date_of_release, CURDATE()))),
    MAX(loan_number),
    SUM(CASE WHEN released = 'NO' THEN loan_amount ELSE 0 END),   -- os_amt
    SUM(CASE WHEN released = 'NO' THEN 1 ELSE 0 END),             -- os_qty
    SUM(CASE WHEN customer_type='Private' THEN loan_amount ELSE 0 END),
    SUM(CASE WHEN customer_type='Private' THEN 1 ELSE 0 END),
    SUM(CASE WHEN customer_type='Vyapari' THEN loan_amount ELSE 0 END),
    SUM(CASE WHEN customer_type='Vyapari' THEN 1 ELSE 0 END),
    SUM(loan_amount*interest_rate)/SUM(loan_amount),              -- w_avg_int_rate
    SUM(CASE WHEN DATEDIFF(CURDATE(), date_of_disbursement) > 90 THEN 1 ELSE 0 END)*100/COUNT(*),  -- pct_over_90_days
    NULL  -- redeem_ratio_30d (fill with sub-query)
  FROM loan_data;

  -- 3. (RE)build MONTHLY, YEARLY, SIZE_BUCKET, CLIENT tables …
  --    — omitted here for brevity —

  COMMIT;
END //
DELIMITER ;

-- ----------  ❰ NIGHTLY EVENT ❱ ----------
CREATE EVENT IF NOT EXISTS ev_nightly_refresh
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE(), '02:00:00') + INTERVAL 1 DAY)
DO CALL sp_refresh_kpis();
