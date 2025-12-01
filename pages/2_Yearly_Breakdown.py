# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import db
import data_cache # Import the updated db.py
import pandas as pd
import calendar as calendar
import numpy as np # Import numpy for inf and NaN handling

st.set_page_config(page_title="Yearly Breakdown", layout="wide")
st.title("📊 Yearly Breakdown Dashboard")

# ---- sidebar: info message ----
with st.sidebar:
    st.info("ℹ️ This dashboard shows yearly breakdown of loan metrics.\n\n"
            "**Data is organized by year (rows) and months (columns)**")
    
    # Show cache status and refresh button
    data_cache.show_cache_status_sidebar()

# ---- load loan data ----
try:
    # Fetch all raw loan data from the single loan_table (with caching!)
    loan_df = data_cache.load_loan_data_with_cache()

    if loan_df.empty:
        st.warning("No loan data found in 'loan_table'. Please ensure data is present and the 'Loan' model in db.py matches your table schema.")
        st.stop()

    # Ensure numeric cols are floats and handle dates
    num_cols = [
        "loan_amount",
        "interest_amount",
    ]

    # Ensure these columns exist in loan_df before applying operations
    for col in num_cols:
        if col not in loan_df.columns:
            st.error(f"Missing expected numeric column in loan_table: '{col}'. Please check your database schema and db.py Loan model.")
            st.stop()

    loan_df[num_cols] = loan_df[num_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    loan_df["date_of_disbursement"] = pd.to_datetime(loan_df["date_of_disbursement"])
    loan_df["date_of_release"] = pd.to_datetime(loan_df["date_of_release"], errors='coerce')

    st.success("Loan data loaded successfully.")

    # ---- 1. DISBURSED LOANS BREAKDOWN ----
    st.subheader("💰 Disbursed Loans Breakdown")
    
    # Prepare disbursed data
    disbursed_df = loan_df.dropna(subset=['date_of_disbursement']).copy()
    disbursed_df['year'] = disbursed_df['date_of_disbursement'].dt.year
    disbursed_df['month'] = disbursed_df['date_of_disbursement'].dt.month
    disbursed_df['month_name'] = disbursed_df['month'].map(lambda m: calendar.month_abbr[m])

    # Disbursed Amount Table (Transpose: months as rows, years as columns)
    disbursed_amount_pivot = disbursed_df.pivot_table(
        index='month_name',
        columns='year',
        values='loan_amount',
        aggfunc='sum',
        fill_value=0
    )
    # Reorder rows to calendar order
    month_order = [calendar.month_abbr[i] for i in range(1, 13)]
    disbursed_amount_pivot = disbursed_amount_pivot.reindex(index=month_order, fill_value=0)
    # Add Total row
    disbursed_amount_pivot.loc['Total'] = disbursed_amount_pivot.sum(axis=0)

    # Calculate YoY change for disbursed amount (now months as rows)
    disbursed_amount_yoy = disbursed_amount_pivot.T.pct_change().T * 100
    disbursed_amount_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)

    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("**Disbursed Amount (₹)**")
        st.dataframe(
            disbursed_amount_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    with col2:
        st.markdown("**Disbursed Amount % YoY Change**")
        st.dataframe(
            disbursed_amount_yoy.style.format("{:+.1f}%", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    # Disbursed Quantity Table (Transpose: months as rows, years as columns)
    disbursed_qty_pivot = disbursed_df.pivot_table(
        index='month_name',
        columns='year',
        values='loan_number',
        aggfunc='count',
        fill_value=0
    )
    # Reorder rows to calendar order
    disbursed_qty_pivot = disbursed_qty_pivot.reindex(index=month_order, fill_value=0)
    # Add Total row
    disbursed_qty_pivot.loc['Total'] = disbursed_qty_pivot.sum(axis=0)

    # Calculate YoY change for disbursed quantity (now months as rows)
    disbursed_qty_yoy = disbursed_qty_pivot.T.pct_change().T * 100
    disbursed_qty_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)

    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("**Disbursed Quantity**")
        st.dataframe(
            disbursed_qty_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    with col2:
        st.markdown("**Disbursed Quantity % YoY Change**")
        st.dataframe(
            disbursed_qty_yoy.style.format("{:+.1f}%", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    st.markdown("---")

    # ---- 2. RELEASED LOANS BREAKDOWN ----
    st.subheader("🔓 Released Loans Breakdown")
    
    # Prepare released data
    released_df = loan_df.dropna(subset=['date_of_release']).copy()
    released_df['year'] = released_df['date_of_release'].dt.year
    released_df['month'] = released_df['date_of_release'].dt.month
    released_df['month_name'] = released_df['month'].map(lambda m: calendar.month_abbr[m])

    # Released Amount Table (Transpose: months as rows, years as columns)
    released_amount_pivot = released_df.pivot_table(
        index='month_name',
        columns='year',
        values='loan_amount',
        aggfunc='sum',
        fill_value=0
    )
    # Reorder rows to calendar order
    released_amount_pivot = released_amount_pivot.reindex(index=month_order, fill_value=0)
    # Add Total row
    released_amount_pivot.loc['Total'] = released_amount_pivot.sum(axis=0)

    # Calculate YoY change for released amount (now months as rows)
    released_amount_yoy = released_amount_pivot.T.pct_change().T * 100
    released_amount_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)

    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("**Released Amount (₹)**")
        st.dataframe(
            released_amount_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    with col2:
        st.markdown("**Released Amount % YoY Change**")
        st.dataframe(
            released_amount_yoy.style.format("{:+.1f}%", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    # Released Quantity Table (Transpose: months as rows, years as columns)
    released_qty_pivot = released_df.pivot_table(
        index='month_name',
        columns='year',
        values='loan_number',
        aggfunc='count',
        fill_value=0
    )
    # Reorder rows to calendar order
    released_qty_pivot = released_qty_pivot.reindex(index=month_order, fill_value=0)
    # Add Total row
    released_qty_pivot.loc['Total'] = released_qty_pivot.sum(axis=0)

    # Calculate YoY change for released quantity (now months as rows)
    released_qty_yoy = released_qty_pivot.T.pct_change().T * 100
    released_qty_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)

    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("**Released Quantity**")
        st.dataframe(
            released_qty_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    with col2:
        st.markdown("**Released Quantity % YoY Change**")
        st.dataframe(
            released_qty_yoy.style.format("{:+.1f}%", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    st.markdown("---")

    # ---- 3. INTEREST RECEIVED BREAKDOWN ----
    st.subheader("💸 Interest Received Breakdown")
    
    # Prepare interest data based on date_of_release
    interest_df = loan_df.dropna(subset=['date_of_release']).copy()
    interest_df['year'] = interest_df['date_of_release'].dt.year
    interest_df['month'] = interest_df['date_of_release'].dt.month
    interest_df['month_name'] = interest_df['month'].map(lambda m: calendar.month_abbr[m])

    # Interest Amount Table (Transpose: months as rows, years as columns)
    interest_amount_pivot = interest_df.pivot_table(
        index='month_name',
        columns='year',
        values='interest_amount',
        aggfunc='sum',
        fill_value=0
    )
    # Reorder rows to calendar order
    interest_amount_pivot = interest_amount_pivot.reindex(index=month_order, fill_value=0)
    # Add Total row
    interest_amount_pivot.loc['Total'] = interest_amount_pivot.sum(axis=0)

    # Calculate YoY change for interest amount (now months as rows)
    interest_amount_yoy = interest_amount_pivot.T.pct_change().T * 100
    interest_amount_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)

    col1, col2 = st.columns(2, gap="large")
    
    with col1:
        st.markdown("**Interest Received (₹)**")
        st.dataframe(
            interest_amount_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    with col2:
        st.markdown("**Interest Received % YoY Change**")
        st.dataframe(
            interest_amount_yoy.style.format("{:+.1f}%", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )

    # ---- SUMMARY METRICS ----
    st.markdown("---")
    st.subheader("📈 Summary Metrics")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        total_disbursed = disbursed_df['loan_amount'].sum()
        total_disbursed_qty = disbursed_df['loan_number'].count()
        st.metric("Total Disbursed (₹)", f"{total_disbursed:,.0f}")
        st.metric("Total Disbursed Quantity", f"{total_disbursed_qty:,.0f}")
    
    with col2:
        total_released = released_df['loan_amount'].sum()
        total_released_qty = released_df['loan_number'].count()
        st.metric("Total Released (₹)", f"{total_released:,.0f}")
        st.metric("Total Released Quantity", f"{total_released_qty:,.0f}")
    
    with col3:
        total_interest = interest_df['interest_amount'].sum()

        # Outstanding Amount (₹): Sum of pending_loan_amount for active loans (released == 'FALSE')
        outstanding_amount = loan_df[loan_df['released'].str.upper() == 'FALSE']['pending_loan_amount'].sum()
        st.metric("Total Interest Received (₹)", f"{total_interest:,.0f}")
        st.metric("Outstanding Amount (₹)", f"{outstanding_amount:,.0f}")

except Exception as exc:
    st.error(f"An error occurred while loading data or computing metrics: {exc}")
    st.exception(exc)
