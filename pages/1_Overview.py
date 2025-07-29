# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import db # Import the updated db.py
import pandas as pd
import calendar as calendar
import numpy as np # Import numpy for inf and NaN handling
import time

def clamp_df(df: pd.DataFrame, lower: int, upper: int) -> pd.DataFrame:
    """Clip extreme values so colour scale isn’t dominated by outliers."""
    return df.clip(lower=lower, upper=upper)

st.set_page_config(page_title="Dashboard", layout="wide")
st.title("👋 Hello, Loan_Dash!")

# ---- sidebar: info message ----
with st.sidebar:
    st.info("ℹ️ KPI refresh is now handled directly in MySQL.\n\n"
            "Run stored procedures manually to update metrics.\n\n"
            "**This dashboard shows the latest data available in the database.**")

# ---- load loan data and compute KPIs ----
try:
    # Fetch all raw loan data from the single loan_table
    loan_df = db.get_all_loans()

    if loan_df.empty:
        st.warning("No loan data found in 'loan_table'. Please ensure data is present and the 'Loan' model in db.py matches your table schema.")
        st.stop()

    # Ensure numeric cols are floats and handle dates
    num_cols = [
        "loan_amount",          # Corresponds to disbursed_amount
        "pending_loan_amount",  # Corresponds to outstanding_amount (used for overall total)
        "interest_amount",      # Used for cumulative interest graph
        "gross_wt",
        "net_wt",
        "gold_rate",
        "purity",
        "valuation",
        "ltv_given",
        "interest_rate",
        "interest_deposited_till_date", # Used for overall interest received
        "last_partial_principal_pay"
    ]

    # Ensure these columns exist in loan_df before applying operations
    for col in num_cols:
        if col not in loan_df.columns:
            st.error(f"Missing expected numeric column in loan_table: '{col}'. Please check your database schema and db.py Loan model.")
            st.stop()

    loan_df[num_cols] = loan_df[num_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    loan_df["date_of_disbursement"] = pd.to_datetime(loan_df["date_of_disbursement"])
    loan_df["date_of_release"] = pd.to_datetime(loan_df["date_of_release"], errors='coerce') # Coerce errors will turn invalid dates into NaT

    # Normalize released column for consistent comparisons
    loan_df['released'] = loan_df['released'].apply(
        lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
    )

    all_dates = pd.date_range(
        start=loan_df['date_of_disbursement'].min(),
        end=loan_df['date_of_disbursement'].max(),
        freq='D'
    )

    # Cumulative disbursed
    daily_disbursed = loan_df.groupby('date_of_disbursement')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_disbursed = daily_disbursed.cumsum()

    # Cumulative released (only where released == 'yes')
    released_loans = loan_df[loan_df['released'].str.upper() == 'TRUE']
    daily_released = released_loans.groupby('date_of_release')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_released = daily_released.cumsum()

    # Outstanding = Disbursed - Released
    gross_outstanding = cumulative_disbursed - cumulative_released

    gross_outstanding_df = pd.DataFrame({
        'date': all_dates,
        'gross_outstanding_amt': gross_outstanding.values
    })


    # --- Calculate Overall "Till Date" Metrics ---
    # These are sums/counts over the entire dataset, representing cumulative totals
    total_disbursed_amt_overall = loan_df['loan_amount'].sum()


    # Total Outstanding (₹): Sum of pending_loan_amount for active loans (released == 'FALSE')
    total_outstanding_amt_overall = loan_df[
        loan_df['released'].str.upper() == 'FALSE'
    ]['pending_loan_amount'].sum()

    total_disbursed_qty_overall = loan_df['loan_number'].count()

    # Total Outstanding Qty: Count of loan_number for active loans (released == 'false')
    total_outstanding_qty_overall = loan_df[
        loan_df['released'].str.upper() == 'FALSE'
    ]['loan_number'].count()

    # Total Interest Received (₹): Sum of interest_amount across all loans
    total_interest_received_overall = loan_df['interest_amount'].sum()


    # --- Daily Aggregation for Time-Series Charts ---

    # Define the fixed start date
    min_date = pd.to_datetime('2020-03-04')
    # Determine the maximum date for the range (latest of disbursement or release)
    max_date_disbursement = loan_df['date_of_disbursement'].max()
    max_date_release = loan_df['date_of_release'].max()
    
    # Handle cases where date_of_release might be all NaT
    if pd.isna(max_date_release):
        max_date = max_date_disbursement
    else:
        max_date = max(max_date_disbursement, max_date_release)

    all_dates = pd.date_range(start=min_date, end=max_date, freq='D')
    
    # Prepare daily disbursed amounts
    daily_disbursed_amounts = loan_df.groupby('date_of_disbursement')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_disbursed_amounts = daily_disbursed_amounts.cumsum()

    # Prepare daily released amounts
    # Only consider loans that have a valid release date for this calculation
    released_loans = loan_df.dropna(subset=['date_of_release'])
    daily_released_amounts = released_loans.groupby('date_of_release')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_released_amounts = daily_released_amounts.cumsum()

    # Calculate Gross Outstanding Loan Amount for Each Day
    # outstanding = cumulative disbursed - cumulative released
    gross_outstanding_daily_series = cumulative_disbursed_amounts - cumulative_released_amounts
    gross_outstanding_daily_df = pd.DataFrame({
        'date': gross_outstanding_daily_series.index,
        'gross_outstanding_amt': gross_outstanding_daily_series.values
    })


    # 2. Cumulative Loan Disbursed Over Time (for the graph)
    cumulative_disbursed_df = pd.DataFrame({
        'date': cumulative_disbursed_amounts.index,
        'cumulative_disbursed_amt': cumulative_disbursed_amounts.values
    })


    # 3. Cumulative Interest Income till date based on released date
    # Aggregate daily interest amount based on date_of_release
    # Reindex to all_dates to ensure a continuous time series from day 1
    daily_interest_amounts = loan_df.groupby('date_of_release')['interest_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_interest_income_series = daily_interest_amounts.cumsum()

    daily_interest_agg_df = pd.DataFrame({
        'date': cumulative_interest_income_series.index,
        'cumulative_interest_income': cumulative_interest_income_series.values
    })


    st.success("Loan data loaded and KPIs computed successfully.")

    # ---- Display Overall "Till Date" Metrics ----
    st.subheader("Overall Totals (Till Date)")
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total Disbursed (₹)", f"{total_disbursed_amt_overall:,.0f}")
        st.metric("Total Disbursed Qty", f"{total_disbursed_qty_overall:,.0f}")
    with col2:
        st.metric("Total Outstanding (₹)", f"{total_outstanding_amt_overall:,.0f}")
        st.metric("Total Outstanding Qty", f"{total_outstanding_qty_overall:,.0f}")
        
    with col3:
        st.metric("Total Interest Received (₹)", f"{total_interest_received_overall:,.0f}")
    released_loans = loan_df[(loan_df['released'] == 'TRUE') & (loan_df['date_of_release'].notna())]
    daily_released_amounts = released_loans.groupby('date_of_release')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_released_amounts = daily_released_amounts.cumsum()

    # ---- Graph 1: Gross Outstanding Loan Amount Over Time ----
    col1, col2 = st.columns(2)
    with col1:
        fig_outstanding = px.line(
            gross_outstanding_daily_df, # Use the new df for gross outstanding
            x="date",
            y="gross_outstanding_amt",
            title="Gross Outstanding Loan Amount Over Time",
            text="gross_outstanding_amt",
        )

        fig_outstanding.update_traces(
            mode="lines+markers",
            line=dict(width=3),
            marker=dict(size=5),
            texttemplate="%{text:,.0f}",
            textposition="top center",
        )

        fig_outstanding.update_layout(
            xaxis_title=dict(text="Date",  font=dict(size=20)),
            yaxis_title=dict(text="Gross Outstanding (₹)", font=dict(size=20)),
        )

        fig_outstanding.update_yaxes(tickformat=",d")
        st.plotly_chart(fig_outstanding, use_container_width=True)

    with col2:
        # Sort for running calculation
        loan_df = loan_df.sort_values(['date_of_disbursement', 'loan_number'])

        # Calculate running outstanding after each loan disbursement
        loan_df['released_loan_amount'] = loan_df.apply(
            lambda row: row['loan_amount'] if row['released'] == 'TRUE' else 0, axis=1
        )
        loan_df['gross_outstanding_amt'] = loan_df['loan_amount'].cumsum() - loan_df['released_loan_amount'].cumsum()

        # Now plot
        fig_outstanding = px.line(
            loan_df,
            x="loan_number",
            y="gross_outstanding_amt",
            title="Gross Outstanding Loan Amount by Loan Number",
            text="gross_outstanding_amt",
        )

        fig_outstanding.update_traces(
            mode="lines+markers",
            line=dict(width=3),
            marker=dict(size=5),
            texttemplate="%{text:,.0f}",
            textposition="top center",
        )

        fig_outstanding.update_layout(
            xaxis_title=dict(text="Loan Number", font=dict(size=20)),
            yaxis_title=dict(text="Gross Outstanding (₹)", font=dict(size=20)),
        )

        fig_outstanding.update_yaxes(tickformat=",d")
        st.plotly_chart(fig_outstanding, use_container_width=True)

    col1, col2 = st.columns(2)
    with col1:
        # ---- Graph 2: Cumulative Loan Disbursed Over Time ----
        fig_disbursed = px.line(
            cumulative_disbursed_df, # Use the new df for cumulative disbursed
            x="date",
            y="cumulative_disbursed_amt",
            title="Cumulative Loan Disbursed Over Time",
            text="cumulative_disbursed_amt",
        )

        fig_disbursed.update_traces(
            mode="lines+markers",
            line=dict(width=3, dash="dash"),
            marker=dict(size=5),
            texttemplate="%{text:,.0f}",
            textposition="top center",
        )

        fig_disbursed.update_layout(
            xaxis_title=dict(text="Date", font=dict(size=20)),
            yaxis_title=dict(text="Cumulative Disbursed (₹)", font=dict(size=20)),
        )

        fig_disbursed.update_yaxes(tickformat=",d")
        st.plotly_chart(fig_disbursed, use_container_width=True)
    with col2:
        # ---- Graph 3: Cumulative Interest Income till date (Line Chart) ----
        if not daily_interest_agg_df.empty:
            fig_interest = px.line( # Changed to px.line
                daily_interest_agg_df,
                x="date", # Changed to 'date' column from the reindexed DataFrame
                y="cumulative_interest_income",
                text="cumulative_interest_income",
                title="Cumulative Interest Income Over Time", # Updated title
            )
            fig_interest.update_traces(
                mode="lines+markers", # Added for line chart
                line=dict(width=3), # Added for line chart
                marker=dict(size=5), # Added for line chart
                texttemplate="%{text:,.0f}",
                textposition="top center",
            )
            fig_interest.update_yaxes(tickformat=",d")
            fig_interest.update_layout(xaxis_title="Date", yaxis_title="Cumulative Interest (₹)") # Updated x-axis title
            st.plotly_chart(fig_interest, use_container_width=True)
        else:
            st.warning("No released loan data with interest income available to plot cumulative interest.")
    st.markdown("---")

except Exception as e:
    st.error(f"An error occurred: {e}")