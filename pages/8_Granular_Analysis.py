# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import db # Import the updated db.py
import data_cache # Import shared caching module
import utils
import pandas as pd
import numpy as np
import calendar
from datetime import datetime

st.set_page_config(page_title="Granular Analysis", layout="wide")
st.title("🔍 Granular Analysis Dashboard")

# ---- sidebar: info message and data refresh ----
with st.sidebar:
    st.info("ℹ️ This dashboard provides granular loan analysis with detailed filtering.\n\n"
            "**Filter by client, type, date range, and toggle between consolidated and granular views**")
    
    # Show cache status and refresh button
    data_cache.show_cache_status_sidebar()

# ---- Load data with caching ----
try:
    loan_df = data_cache.load_loan_data_with_cache()
    
    # Preprocessing for this page
    num_cols = ["loan_amount", "interest_amount", "pending_loan_amount"]
    for col in num_cols:
        if col in loan_df.columns:
            loan_df[col] = pd.to_numeric(loan_df[col], errors="coerce").fillna(0)
    
    loan_df["date_of_disbursement"] = pd.to_datetime(loan_df["date_of_disbursement"], errors='coerce')
    loan_df["date_of_release"] = pd.to_datetime(loan_df["date_of_release"], errors='coerce')
    
    # Normalize data
    loan_df = utils.normalize_customer_data(loan_df)
    
    # ---- FILTER SECTION ----
    st.subheader("🎯 Filter Options")
    
    col1, col2, col3, col4, col5, col6 = st.columns(6)
    
    with col1:
        # Client filter
        vyapari_customers = sorted(loan_df[loan_df['customer_type'] == 'Vyapari']['customer_name'].unique())
        client_options = ['--ALL--', 'Private'] + vyapari_customers
        selected_client = st.selectbox('👤 Client', client_options)
    
    with col2:
        # Type filter
        type_options = ['Both', 'Disbursement', 'Release']
        selected_type = st.selectbox('📋 Type', type_options)
    
    with col3:
        # Released/Open filter
        status_options = ['--All--', 'Released', 'Open']
        selected_status = st.selectbox('🔓 Status', status_options)
    
    with col4:
        # Year filter
        disbursement_years = sorted(loan_df['date_of_disbursement'].dt.year.dropna().unique())
        release_years = sorted(loan_df['date_of_release'].dt.year.dropna().unique())
        all_years = sorted(set(disbursement_years) | set(release_years))
        year_options = ['--All--'] + [str(year) for year in all_years]
        selected_year = st.selectbox('📅 Year', year_options)
    
    with col5:
        # Month filter
        month_options = ['--All--'] + [calendar.month_name[i] for i in range(1, 13)]
        selected_month = st.selectbox('📆 Month', month_options)
    
    with col6:
        # Date filter
        date_options = ['--All--'] + [str(i) for i in range(1, 32)]
        selected_date = st.selectbox('📍 Date', date_options)
    
    # View mode toggle
    st.markdown("---")
    view_mode = st.radio(
        "📊 View Mode",
        ['Consolidated (Monthly Summary)', 'Granular (Daily Breakdown)'],
        horizontal=True
    )
    
    is_granular = view_mode.startswith('Granular')
    
    # ---- APPLY FILTERS ----
    filtered_df = loan_df.copy()
    
    # Client filter
    if selected_client != '--ALL--':
        if selected_client == 'Private':
            filtered_df = filtered_df[filtered_df['customer_type'] == 'Private']
        else:
            filtered_df = filtered_df[filtered_df['customer_name'] == selected_client]
    
    # Released/Open status filter
    if selected_status != '--All--':
        if selected_status == 'Released':
            filtered_df = filtered_df[filtered_df['released'].str.upper() == 'TRUE']
        elif selected_status == 'Open':
            filtered_df = filtered_df[filtered_df['released'].str.upper() == 'FALSE']
    
    # Determine which date column to use based on type
    if selected_type == 'Release':
        date_col = 'date_of_release'
        # For release type, only show released loans (unless specifically filtered to Open)
        if selected_status == '--All--':
            filtered_df = filtered_df[filtered_df['released'].str.upper() == 'TRUE']
    else:
        date_col = 'date_of_disbursement'
    
    # Remove rows with null dates for the selected type
    filtered_df = filtered_df.dropna(subset=[date_col])
    
    # Extract date components
    filtered_df = utils.add_date_columns(filtered_df, date_col)
    
    # Year filter
    if selected_year != '--All--':
        filtered_df = filtered_df[filtered_df['year'] == int(selected_year)]
    
    # Month filter
    if selected_month != '--All--':
        month_num = list(calendar.month_name).index(selected_month)
        filtered_df = filtered_df[filtered_df['month'] == month_num]
    
    # Date filter
    if selected_date != '--All--':
        filtered_df = filtered_df[filtered_df['day'] == int(selected_date)]
    
    if filtered_df.empty:
        st.warning("⚠️ No data found matching the selected filters. Please adjust your filters.")
        st.stop()
    
    st.success(f"✅ Filtered to {len(filtered_df):,} loan records")
    
    # ---- DISPLAY SECTION ----
    st.markdown("---")
    
    if not is_granular:
        # ---- CONSOLIDATED VIEW ----
        st.subheader("📊 Consolidated Monthly Analysis")
        
        # Create pivot tables for Amount
        amount_pivot = utils.create_monthly_pivot(filtered_df, 'loan_amount', date_col=date_col, agg_func='sum')
        
        # Calculate YoY change
        amount_yoy = utils.calculate_yoy_change(amount_pivot)
        
        # Calculate MoM change (excluding Total row)
        amount_mom = utils.calculate_mom_change(amount_pivot)
        
        # Create pivot tables for Quantity
        quantity_pivot = utils.create_monthly_pivot(filtered_df, 'loan_number', date_col=date_col, agg_func='count')
        
        # Calculate YoY change for quantity
        quantity_yoy = utils.calculate_yoy_change(quantity_pivot)
        
        # Calculate MoM change for quantity
        quantity_mom = utils.calculate_mom_change(quantity_pivot)
        
        # Display Amount tables
        st.markdown("### 💰 Loan Amount Analysis")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**Amount (₹)**")
            styled_amount = utils.style_currency_table(amount_pivot, currency_cols=amount_pivot.columns.tolist())
            st.dataframe(styled_amount, use_container_width=True, height=550)
        
        with col2:
            st.markdown("**YoY Change (%)**")
            st.dataframe(
                amount_yoy.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: green' if isinstance(x, (int, float)) and x > 0 else ('color: red' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        with col3:
            st.markdown("**MoM Change (%)**")
            st.dataframe(
                amount_mom.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: green' if isinstance(x, (int, float)) and x > 0 else ('color: red' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        st.markdown("---")
        
        # Display Quantity tables
        st.markdown("### 🔢 Loan Quantity Analysis")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**Quantity (Count)**")
            styled_quantity = utils.style_mixed_table(quantity_pivot, int_cols=quantity_pivot.columns.tolist())
            st.dataframe(styled_quantity, use_container_width=True, height=550)
        
        with col2:
            st.markdown("**YoY Change (%)**")
            st.dataframe(
                quantity_yoy.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: green' if isinstance(x, (int, float)) and x > 0 else ('color: red' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        with col3:
            st.markdown("**MoM Change (%)**")
            st.dataframe(
                quantity_mom.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: green' if isinstance(x, (int, float)) and x > 0 else ('color: red' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        # Visualization
        st.markdown("---")
        st.markdown("### 📈 Trend Visualization")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Prepare data for line chart
            amount_for_chart = amount_pivot.iloc[:-1].reset_index()  # Exclude Total row
            amount_melted = amount_for_chart.melt(id_vars='month_name', var_name='Year', value_name='Amount')
            
            fig_amount = px.line(
                amount_melted,
                x='month_name',
                y='Amount',
                color='Year',
                title='Monthly Loan Amount Trend',
                markers=True
            )
            fig_amount.update_layout(
                xaxis_title="Month",
                yaxis_title="Amount (₹)",
                yaxis=dict(tickformat=',')
            )
            st.plotly_chart(fig_amount, use_container_width=True)
        
        with col2:
            quantity_for_chart = quantity_pivot.iloc[:-1].reset_index()
            quantity_melted = quantity_for_chart.melt(id_vars='month_name', var_name='Year', value_name='Quantity')
            
            fig_quantity = px.line(
                quantity_melted,
                x='month_name',
                y='Quantity',
                color='Year',
                title='Monthly Loan Quantity Trend',
                markers=True
            )
            fig_quantity.update_layout(
                xaxis_title="Month",
                yaxis_title="Quantity (Count)"
            )
            st.plotly_chart(fig_quantity, use_container_width=True)
    
    else:
        # ---- GRANULAR VIEW (DAILY BREAKDOWN) ----
        st.subheader("🔍 Granular Daily Breakdown")
        
        # Create daily pivot tables
        daily_amount_pivot = filtered_df.pivot_table(
            index='day',
            columns=['year', 'month_name'],
            values='loan_amount',
            aggfunc='sum',
            fill_value=0
        )
        
        daily_quantity_pivot = filtered_df.pivot_table(
            index='day',
            columns=['year', 'month_name'],
            values='loan_number',
            aggfunc='count',
            fill_value=0
        )
        
        # Reindex to show all days 1-31
        daily_amount_pivot = daily_amount_pivot.reindex(range(1, 32), fill_value=0)
        daily_quantity_pivot = daily_quantity_pivot.reindex(range(1, 32), fill_value=0)
        
        # Add Total row
        daily_amount_pivot.loc['Total'] = daily_amount_pivot.sum(axis=0)
        daily_quantity_pivot.loc['Total'] = daily_quantity_pivot.sum(axis=0)
        
        # Convert index to string to fix PyArrow mixed type error
        daily_amount_pivot.index = daily_amount_pivot.index.astype(str)
        daily_quantity_pivot.index = daily_quantity_pivot.index.astype(str)
        
        st.markdown("### 💰 Daily Loan Amount")
        st.dataframe(
            daily_amount_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )
        
        st.markdown("### 🔢 Daily Loan Quantity")
        st.dataframe(
            daily_quantity_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )
        
        # Show individual loan details in expanders by year-month
        st.markdown("---")
        st.markdown("### 📋 Detailed Loan Records")
        
        for year in sorted(filtered_df['year'].unique()):
            year_data = filtered_df[filtered_df['year'] == year]
            
            with st.expander(f"📅 Year {year} - {len(year_data)} loans"):
                for month in sorted(year_data['month'].unique()):
                    month_name = calendar.month_name[month]
                    month_data = year_data[year_data['month'] == month]
                    
                    st.markdown(f"**{month_name} {year}** - {len(month_data)} loans")
                    
                    # Display relevant columns
                    display_cols = [
                        'loan_number', 'customer_name', 'loan_amount', 
                        date_col, 'released', 'pending_loan_amount'
                    ]
                    display_cols = [col for col in display_cols if col in month_data.columns]
                    
                    st.dataframe(
                        month_data[display_cols].style
                        .format({
                            'loan_amount': '{:,.0f}',
                            'pending_loan_amount': '{:,.0f}',
                            date_col: lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else ''
                        })
                        .set_properties(subset=None, **{"text-align": "right"})
                        .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                        use_container_width=True
                    )
    
    # ---- SUMMARY METRICS ----
    st.markdown("---")
    st.subheader("📊 Summary Metrics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_amount = filtered_df['loan_amount'].sum()
        st.metric("Total Amount", f"₹{total_amount:,.0f}")
    
    with col2:
        total_quantity = len(filtered_df)
        st.metric("Total Quantity", f"{total_quantity:,}")
    
    with col3:
        avg_loan_size = filtered_df['loan_amount'].mean()
        st.metric("Average Loan Size", f"₹{avg_loan_size:,.0f}")
    
    with col4:
        if selected_type != 'Release':
            outstanding_amount = filtered_df[filtered_df['released'].str.upper() == 'FALSE']['pending_loan_amount'].sum()
            st.metric("Outstanding Amount", f"₹{outstanding_amount:,.0f}")
        else:
            interest_received = filtered_df['interest_amount'].sum()
            st.metric("Interest Received", f"₹{interest_received:,.0f}")

except Exception as exc:
    st.error(f"An error occurred while loading or processing data: {exc}")
    st.exception(exc)
