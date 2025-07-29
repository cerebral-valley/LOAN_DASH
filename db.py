from __future__ import annotations

import os
from datetime import date
from typing import Any
from urllib.parse import quote_plus

import pandas as pd
from sqlalchemy import create_engine, text, func, DateTime, DECIMAL, INT, VARCHAR, Date
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
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
class Base(DeclarativeBase):
    pass


# ---------- Models ----------
# Updated Loan model to precisely match the loan_table schema from your screenshot,
# with 'css_name' removed as it was reported as an unknown column.
class Loan(Base):
    __tablename__ = "loan_table"

    loan_number: Mapped[int] = mapped_column(INT, primary_key=True)
    customer_type: Mapped[str] = mapped_column(VARCHAR(50))
    customer_name: Mapped[str] = mapped_column(VARCHAR(255))
    customer_id: Mapped[str] = mapped_column(VARCHAR(50))
    # css_name: Mapped[str] = mapped_column(VARCHAR(255)) # Removed due to "Unknown column" error
    item_list: Mapped[str] = mapped_column(VARCHAR(255))
    gross_wt: Mapped[float] = mapped_column(DECIMAL(10,2))
    net_wt: Mapped[float] = mapped_column(DECIMAL(10,2))
    gold_rate: Mapped[float] = mapped_column(DECIMAL(10,2))
    purity: Mapped[float] = mapped_column(DECIMAL(5,2))
    valuation: Mapped[float] = mapped_column(DECIMAL(10,2))
    loan_amount: Mapped[float] = mapped_column(DECIMAL(10,2))
    ltv_given: Mapped[float] = mapped_column(DECIMAL(6,2))
    date_of_disbursement: Mapped[date] = mapped_column(DateTime) # Use DateTime for date_of_disbursement
    mode_of_disbursement: Mapped[str] = mapped_column(VARCHAR(100))
    date_of_release: Mapped[date] = mapped_column(Date) # Use Date for date_of_release
    released: Mapped[str] = mapped_column(VARCHAR(10))
    expiry: Mapped[date] = mapped_column(Date)
    interest_rate: Mapped[float] = mapped_column(DECIMAL(5,2))
    interest_amount: Mapped[float] = mapped_column(DECIMAL(10,2))
    transfer_mode: Mapped[str] = mapped_column(VARCHAR(100))
    scheme: Mapped[str] = mapped_column(VARCHAR(100))
    last_intr_pay: Mapped[date] = mapped_column(Date)
    data_entry: Mapped[str] = mapped_column(VARCHAR(255))
    pending_loan_amount: Mapped[float] = mapped_column(DECIMAL(10,2))
    interest_deposited_till_date: Mapped[float] = mapped_column(DECIMAL(10,2))
    last_date_of_interest_deposit: Mapped[date] = mapped_column(Date)
    comments: Mapped[str] = mapped_column(VARCHAR(500))
    last_partial_principal_pay: Mapped[float] = mapped_column(DECIMAL(10,2))
    receipt_pending: Mapped[str] = mapped_column(VARCHAR(10))
    form_printing: Mapped[str] = mapped_column(VARCHAR(10))


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
                "gross_wt": float(loan.gross_wt) if loan.gross_wt is not None else 0.0,
                "net_wt": float(loan.net_wt) if loan.net_wt is not None else 0.0,
                "gold_rate": float(loan.gold_rate) if loan.gold_rate is not None else 0.0,
                "purity": float(loan.purity) if loan.purity is not None else 0.0,
                "valuation": float(loan.valuation) if loan.valuation is not None else 0.0,
                "loan_amount": float(loan.loan_amount) if loan.loan_amount is not None else 0.0,
                "ltv_given": float(loan.ltv_given) if loan.ltv_given is not None else 0.0,
                "date_of_disbursement": loan.date_of_disbursement,
                "mode_of_disbursement": loan.mode_of_disbursement,
                "date_of_release": loan.date_of_release,
                "released": loan.released,
                "expiry": loan.expiry,
                "interest_rate": float(loan.interest_rate) if loan.interest_rate is not None else 0.0,
                "interest_amount": float(loan.interest_amount) if loan.interest_amount is not None else 0.0,
                "transfer_mode": loan.transfer_mode,
                "scheme": loan.scheme,
                "last_intr_pay": loan.last_intr_pay,
                "data_entry": loan.data_entry,
                "pending_loan_amount": float(loan.pending_loan_amount) if loan.pending_loan_amount is not None else 0.0,
                "interest_deposited_till_date": float(loan.interest_deposited_till_date) if loan.interest_deposited_till_date is not None else 0.0,
                "last_date_of_interest_deposit": loan.last_date_of_interest_deposit,
                "comments": loan.comments,
                "last_partial_principal_pay": float(loan.last_partial_principal_pay) if loan.last_partial_principal_pay is not None else 0.0,
                "receipt_pending": loan.receipt_pending,
                "form_printing": loan.form_printing,
            }
            for loan in loans
        ]
        return pd.DataFrame(loan_data)

