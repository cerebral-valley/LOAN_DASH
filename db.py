from __future__ import annotations

import os
from datetime import date
from typing import Any
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, text, func, DateTime, DECIMAL, INT, VARCHAR, Date, Column
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv


# 🔧 Load environment variables
load_dotenv(".env")
# Safely encode special characters in the password for the URL
PWD = quote_plus(os.getenv("MYSQL_PASS", "")) # Added default empty string for safety

# ---------- Engine ----------
URL = (
    "mysql+mysqlconnector://"
    f"{os.getenv('MYSQL_USER')}:{os.getenv('MYSQL_PASS')}"
    f"@{os.getenv('MYSQL_HOST')}:{os.getenv('MYSQL_PORT')}/{os.getenv('MYSQL_DB')}"
)
engine = create_engine(URL, pool_pre_ping=True)

# Create a SessionLocal class for database interactions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ---------- Base ----------
Base = declarative_base()


# ---------- Models ----------
# Updated Loan model to precisely match the loan_table schema from your screenshot,
# with 'css_name' removed as it was reported as an unknown column.
class Loan(Base):
    __tablename__ = "loan_table"

    loan_number = Column(INT, primary_key=True)
    customer_type = Column(VARCHAR(50))
    customer_name = Column(VARCHAR(255))
    customer_id = Column(VARCHAR(50))
    # css_name = Column(VARCHAR(255)) # Removed due to "Unknown column" error
    item_list = Column(VARCHAR(255))
    gross_wt = Column(DECIMAL(10,2))
    net_wt = Column(DECIMAL(10,2))
    gold_rate = Column(DECIMAL(10,2))
    purity = Column(DECIMAL(5,2))
    valuation = Column(DECIMAL(10,2))
    loan_amount = Column(DECIMAL(10,2))
    ltv_given = Column(DECIMAL(6,2))
    date_of_disbursement = Column(DateTime) # Use DateTime for date_of_disbursement
    mode_of_disbursement = Column(VARCHAR(100))
    date_of_release = Column(Date) # Use Date for date_of_release
    released = Column(VARCHAR(10))
    expiry = Column(Date)
    interest_rate = Column(DECIMAL(5,2))
    interest_amount = Column(DECIMAL(10,2))
    transfer_mode = Column(VARCHAR(100))
    scheme = Column(VARCHAR(100))
    last_intr_pay = Column(Date)
    data_entry = Column(VARCHAR(255))
    pending_loan_amount = Column(DECIMAL(10,2))
    interest_deposited_till_date = Column(DECIMAL(10,2))
    last_date_of_interest_deposit = Column(Date)
    comments = Column(VARCHAR(500))
    last_partial_principal_pay = Column(DECIMAL(10,2))
    receipt_pending = Column(VARCHAR(10))
    form_printing = Column(VARCHAR(10))


class ExpenseTracker(Base):
    __tablename__ = "expense_tracker"

    id = Column(INT, primary_key=True)
    date = Column(Date)
    item = Column(VARCHAR(255))
    amount = Column(DECIMAL(10,2))
    payment_mode = Column(VARCHAR(10))  # 'cash' or 'bank'
    bank = Column(VARCHAR(255))
    ledger = Column(VARCHAR(255))
    invoice_no = Column(VARCHAR(255))
    receipt = Column(VARCHAR(10))  # 'yes' or 'no'
    user = Column(VARCHAR(255))


# ---------- Read-only helper functions ----------
def get_all_loans() -> pd.DataFrame:
    """
    Fetches all loan data from the 'loan_table' using SQLAlchemy ORM
    and returns it as a Pandas DataFrame.
    """
    with SessionLocal() as session:
        # Query all columns from the Loan model
        loans = session.query(Loan).all()
        # Convert list of Loan objects to a list of dictionaries
        # Handle NoneType values for float conversions
        loan_data = [
            {
                "loan_number": loan.loan_number,
                "customer_type": loan.customer_type,
                "customer_name": loan.customer_name,
                "customer_id": loan.customer_id,
                "item_list": loan.item_list,
                "gross_wt": float(loan.gross_wt) if loan.gross_wt is not None else 0.0,  # type: ignore
                "net_wt": float(loan.net_wt) if loan.net_wt is not None else 0.0,  # type: ignore
                "gold_rate": float(loan.gold_rate) if loan.gold_rate is not None else 0.0,  # type: ignore
                "purity": float(loan.purity) if loan.purity is not None else 0.0,  # type: ignore
                "valuation": float(loan.valuation) if loan.valuation is not None else 0.0,  # type: ignore  # type: ignore
                "loan_amount": float(loan.loan_amount) if loan.loan_amount is not None else 0.0,  # type: ignore
                "ltv_given": float(loan.ltv_given) if loan.ltv_given is not None else 0.0,  # type: ignore
                "date_of_disbursement": loan.date_of_disbursement,
                "mode_of_disbursement": loan.mode_of_disbursement,
                "date_of_release": loan.date_of_release,
                "released": loan.released,
                "expiry": loan.expiry,
                "interest_rate": float(loan.interest_rate) if loan.interest_rate is not None else 0.0,  # type: ignore
                "interest_amount": float(loan.interest_amount) if loan.interest_amount is not None else 0.0,  # type: ignore
                "transfer_mode": loan.transfer_mode,
                "scheme": loan.scheme,
                "last_intr_pay": loan.last_intr_pay,
                "data_entry": loan.data_entry,
                "pending_loan_amount": float(loan.pending_loan_amount) if loan.pending_loan_amount is not None else 0.0,  # type: ignore
                "interest_deposited_till_date": float(loan.interest_deposited_till_date) if loan.interest_deposited_till_date is not None else 0.0,  # type: ignore
                "last_date_of_interest_deposit": loan.last_date_of_interest_deposit,
                "comments": loan.comments,
                "last_partial_principal_pay": float(loan.last_partial_principal_pay) if loan.last_partial_principal_pay is not None else 0.0,  # type: ignore
                "receipt_pending": loan.receipt_pending,
                "form_printing": loan.form_printing,
            }
            for loan in loans
        ]
        return pd.DataFrame(loan_data)


def get_all_expenses() -> pd.DataFrame:
    """
    Fetches all expense data from the 'expense_tracker' table using SQLAlchemy ORM
    and returns it as a Pandas DataFrame.
    """
    with SessionLocal() as session:
        # Query all columns from the ExpenseTracker model
        expenses = session.query(ExpenseTracker).all()
        # Convert list of ExpenseTracker objects to a list of dictionaries
        expense_data = [
            {
                "id": expense.id,
                "date": expense.date,
                "item": expense.item,
                "amount": float(expense.amount) if expense.amount is not None else 0.0,  # type: ignore
                "payment_mode": expense.payment_mode,
                "bank": expense.bank or "",
                "ledger": expense.ledger or "",
                "invoice_no": expense.invoice_no or "",
                "receipt": expense.receipt or "",
                "user": expense.user or "",
            }
            for expense in expenses
        ]
        return pd.DataFrame(expense_data)


def calculate_realized_interest(df):
    """
    Calculate realized interest using the correct formula:
    - Primary: Use interest_deposited_till_date (actual PAID interest)
    - Fallback: For released loans where deposited is 0/NULL, use interest_amount (charged)
    
    This provides a cash-basis view of interest with graceful handling of legacy data.
    
    Args:
        df: DataFrame with columns: interest_deposited_till_date, interest_amount, released
        
    Returns:
        pandas.Series: realized_interest for each loan
    """
    # Initialize with interest_deposited_till_date (actual paid)
    realized = df['interest_deposited_till_date'].copy()
    
    # For released loans with missing/zero deposited interest, use interest_amount (fallback)
    legacy_mask = (df['released'] == 'TRUE') & (
        df['interest_deposited_till_date'].isna() | 
        (df['interest_deposited_till_date'] <= 0)
    )
    
    realized.loc[legacy_mask] = df.loc[legacy_mask, 'interest_amount']
    
    return realized


def calculate_correct_ltv(df):
    """
    Calculate correct LTV (Loan-to-Value) ratio:
    LTV = (loan_amount / (net_wt * gold_rate * purity)) * 100
    
    Where:
        - loan_amount: Amount disbursed to customer
        - net_wt: Net weight of gold in grams
        - gold_rate: Gold rate per gram
        - purity: Purity percentage (e.g., 91.60 for 22K)
        
    Args:
        df: DataFrame with columns: loan_amount, net_wt, gold_rate, purity
        
    Returns:
        pandas.Series: LTV percentage for each loan
    """
    # Calculate collateral value: net_wt * gold_rate * (purity/100)
    collateral_value = df['net_wt'] * df['gold_rate'] * (df['purity'] / 100)
    
    # Calculate LTV: (loan_amount / collateral_value) * 100
    # Handle division by zero safely
    ltv = pd.Series(0.0, index=df.index)
    valid_mask = collateral_value > 0
    ltv.loc[valid_mask] = (df.loc[valid_mask, 'loan_amount'] / collateral_value[valid_mask]) * 100
    
    return ltv


def get_gold_silver_rates():
    """
    Fetch all gold and silver rates from the database.
    No caching - loads fresh data each time page opens.
    
    Returns:
        pandas.DataFrame: Gold/silver rates with columns:
            - rate_date, rate_time
            - ngp_hazir_gold, ngp_hazir_silver (Nagpur spot rates)
            - ngp_gst_gold, ngp_gst_silver (rates with GST)
            - usd_inr, cmx_gold_usd, cmx_silver_usd (international)
    """
    query = text("""
        SELECT 
            rate_date,
            rate_time,
            ngp_hazir_gold,
            ngp_hazir_silver,
            ngp_gst_gold,
            ngp_gst_silver,
            usd_inr,
            cmx_gold_usd,
            cmx_silver_usd
        FROM gold_silver_rates
        ORDER BY rate_date DESC
    """)
    
    with engine.connect() as conn:
        df = pd.read_sql(query, conn)
    
    # Ensure proper data types
    df['rate_date'] = pd.to_datetime(df['rate_date'])
    
    return df


