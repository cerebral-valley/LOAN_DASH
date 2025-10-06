# make parent folder importable
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import db
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
import calendar
from datetime import datetime

st.set_page_config(page_title="Expense Tracker", layout="wide")
st.title("💰 Expense Tracker Dashboard")

# ---- sidebar: info message and data refresh ----
with st.sidebar:
    st.info("ℹ️ This dashboard provides comprehensive expense tracking and analysis.\n\n"
            "**Filter by ledger, user, payment mode, date range, and search by ID or invoice number**")
    
    # Data refresh section
    st.markdown("---")
    st.markdown("### 🔄 Data Management")
    
    if 'expense_data_loaded_at' in st.session_state:
        st.success(f"✅ Data cached at: {st.session_state.expense_data_loaded_at.strftime('%H:%M:%S')}")
    
    if st.button("🔄 Refresh Data", use_container_width=True):
        # Clear session state to force reload
        for key in ['expense_data', 'expense_data_loaded_at', 'expense_data_loaded']:
            if key in st.session_state:
                del st.session_state[key]
        st.rerun()

# ---- SESSION STATE DATA LOADING (IMPLEMENTING TANSTACK QUERY PATTERN!) ----
def load_expense_data_with_cache():
    """
    Load expense data once and cache in session state.
    This implements the TanStack Query pattern for Streamlit:
    - Check if data exists in session state
    - If not, load from database and cache
    - If yes, use cached data (instant load!)
    """
    if 'expense_data_loaded' not in st.session_state:
        with st.spinner('🔄 Loading expense data for the first time... (will be cached for instant access)'):
            # Load data from database
            expense_df = db.get_all_expenses()
            
            if expense_df.empty:
                st.error("❌ No expense data found in the database!")
                st.stop()
            
            # Preprocessing
            expense_df["date"] = pd.to_datetime(expense_df["date"], errors='coerce')
            
            # Normalize data
            expense_df['payment_mode'] = expense_df['payment_mode'].str.title()
            expense_df['receipt'] = expense_df['receipt'].str.title()
            
            # Store in session state
            st.session_state.expense_data = expense_df
            st.session_state.expense_data_loaded = True
            st.session_state.expense_data_loaded_at = datetime.now()
            
            st.success("✅ Expense data loaded and cached successfully!")
    
    return st.session_state.expense_data

# Load data (from cache if available!)
try:
    expense_df = load_expense_data_with_cache()
    
    # ---- SEARCH SECTION ----
    st.subheader("🔍 Search & Filter Options")
    
    # Search by ID and Invoice Number
    col_search1, col_search2 = st.columns(2)
    
    with col_search1:
        search_id = st.text_input("🆔 Search by ID", placeholder="Enter expense ID...")
    
    with col_search2:
        search_invoice = st.text_input("📄 Search by Invoice Number", placeholder="Enter invoice number...")
    
    # Apply search filters first
    search_filtered_df = expense_df.copy()
    
    if search_id:
        try:
            search_filtered_df = search_filtered_df[search_filtered_df['id'] == int(search_id)]
        except ValueError:
            st.warning("⚠️ Please enter a valid numeric ID")
    
    if search_invoice:
        search_filtered_df = search_filtered_df[
            search_filtered_df['invoice_no'].str.contains(search_invoice, case=False, na=False)
        ]
    
    # Show search results if any search is active
    if search_id or search_invoice:
        st.markdown("### 🔍 Search Results")
        if not search_filtered_df.empty:
            st.success(f"✅ Found {len(search_filtered_df)} matching record(s)")
            st.dataframe(
                search_filtered_df.style.format({
                    'amount': '₹{:,.2f}',
                    'date': lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else ''
                }),
                use_container_width=True
            )
        else:
            st.warning("⚠️ No records found matching your search criteria")
        
        # Option to clear search
        if st.button("🔄 Clear Search", use_container_width=False):
            st.rerun()
        
        st.markdown("---")
    
    # ---- FILTER SECTION ----
    st.subheader("🎯 Advanced Filters")
    
    col1, col2, col3, col4, col5, col6 = st.columns(6)
    
    with col1:
        # Ledger filter
        unique_ledgers = sorted(expense_df['ledger'].dropna().unique())
        ledger_options = ['--All--'] + unique_ledgers
        selected_ledger = st.selectbox('📊 Ledger', ledger_options)
    
    with col2:
        # User filter
        unique_users = sorted(expense_df['user'].dropna().unique())
        user_options = ['--All--'] + unique_users
        selected_user = st.selectbox('👤 User', user_options)
    
    with col3:
        # Payment Mode filter
        payment_mode_options = ['--All--', 'Cash', 'Bank']
        selected_payment_mode = st.selectbox('💳 Payment Mode', payment_mode_options)
    
    with col4:
        # Year filter
        expense_years = sorted(expense_df['date'].dt.year.dropna().unique())
        year_options = ['--All--'] + [str(year) for year in expense_years]
        selected_year = st.selectbox('📅 Year', year_options)
    
    with col5:
        # Month filter
        month_options = ['--All--'] + [calendar.month_name[i] for i in range(1, 13)]
        selected_month = st.selectbox('📆 Month', month_options)
    
    with col6:
        # Receipt Status filter
        receipt_options = ['--All--', 'Yes', 'No']
        selected_receipt = st.selectbox('🧾 Receipt', receipt_options)
    
    # View mode toggle
    st.markdown("---")
    view_mode = st.radio(
        "📊 View Mode",
        ['Consolidated (Monthly Summary)', 'Granular (Daily Breakdown)'],
        horizontal=True
    )
    
    is_granular = view_mode.startswith('Granular')
    
    # ---- APPLY FILTERS ----
    filtered_df = expense_df.copy()
    
    # Only apply advanced filters if no specific search is active
    if not (search_id or search_invoice):
        # Ledger filter
        if selected_ledger != '--All--':
            filtered_df = filtered_df[filtered_df['ledger'] == selected_ledger]
        
        # User filter
        if selected_user != '--All--':
            filtered_df = filtered_df[filtered_df['user'] == selected_user]
        
        # Payment Mode filter
        if selected_payment_mode != '--All--':
            filtered_df = filtered_df[filtered_df['payment_mode'].str.upper() == selected_payment_mode.upper()]
        
        # Receipt filter
        if selected_receipt != '--All--':
            filtered_df = filtered_df[filtered_df['receipt'].str.upper() == selected_receipt.upper()]
        
        # Extract date components
        filtered_df['year'] = filtered_df['date'].dt.year
        filtered_df['month'] = filtered_df['date'].dt.month
        filtered_df['month_name'] = filtered_df['month'].map(lambda m: calendar.month_abbr[m])
        filtered_df['day'] = filtered_df['date'].dt.day
        
        # Year filter
        if selected_year != '--All--':
            filtered_df = filtered_df[filtered_df['year'] == int(selected_year)]
        
        # Month filter
        if selected_month != '--All--':
            month_num = list(calendar.month_name).index(selected_month)
            filtered_df = filtered_df[filtered_df['month'] == month_num]
    else:
        # Use search results for further analysis
        filtered_df = search_filtered_df.copy()
        if not filtered_df.empty:
            filtered_df['year'] = filtered_df['date'].dt.year
            filtered_df['month'] = filtered_df['date'].dt.month
            filtered_df['month_name'] = filtered_df['month'].map(lambda m: calendar.month_abbr[m] if m <= 12 else '')
            filtered_df['day'] = filtered_df['date'].dt.day
    
    if filtered_df.empty:
        st.warning("⚠️ No data found matching the selected filters. Please adjust your filters.")
        st.stop()
    
    st.success(f"✅ Filtered to {len(filtered_df):,} expense records | Total Amount: ₹{filtered_df['amount'].sum():,.2f}")
    
    # ---- DISPLAY SECTION ----
    st.markdown("---")
    
    if not is_granular:
        # ---- CONSOLIDATED VIEW ----
        st.subheader("📊 Consolidated Monthly Analysis")
        
        # Create pivot tables for Amount by Month
        amount_pivot = filtered_df.pivot_table(
            index='month_name',
            columns='year',
            values='amount',
            aggfunc='sum',
            fill_value=0
        )
        
        # Reorder months
        month_order = [calendar.month_abbr[i] for i in range(1, 13)]
        amount_pivot = amount_pivot.reindex(index=month_order, fill_value=0)
        
        # Add Total row
        amount_pivot.loc['Total'] = amount_pivot.sum(axis=0)
        
        # Calculate YoY change (year-over-year across columns)
        amount_yoy = (amount_pivot / amount_pivot.shift(1, axis=1) - 1) * 100
        amount_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        # Calculate MoM change (month-over-month across rows, excluding Total row)
        amount_mom_data = (amount_pivot.iloc[:-1] / amount_pivot.iloc[:-1].shift(1, axis=0) - 1) * 100
        amount_mom_data.replace([np.inf, -np.inf], np.nan, inplace=True)
        # Add back empty Total row for alignment  
        amount_mom = pd.concat([amount_mom_data, pd.DataFrame(index=['Total'], columns=amount_pivot.columns).fillna(np.nan)])
        amount_mom.replace([np.inf, -np.inf], np.nan, inplace=True)
        # Add back empty Total row for alignment
        amount_mom.loc['Total'] = np.nan
        
        # Create pivot tables for Quantity
        quantity_pivot = filtered_df.pivot_table(
            index='month_name',
            columns='year',
            values='id',
            aggfunc='count',
            fill_value=0
        )
        
        quantity_pivot = quantity_pivot.reindex(index=month_order, fill_value=0)
        quantity_pivot.loc['Total'] = quantity_pivot.sum(axis=0)
        
        # Calculate YoY change for quantity (year-over-year across columns)
        quantity_yoy = (quantity_pivot / quantity_pivot.shift(1, axis=1) - 1) * 100
        quantity_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        # Calculate MoM change for quantity (month-over-month across rows, excluding Total row)
        quantity_mom_data = (quantity_pivot.iloc[:-1] / quantity_pivot.iloc[:-1].shift(1, axis=0) - 1) * 100
        quantity_mom_data.replace([np.inf, -np.inf], np.nan, inplace=True)
        # Add back empty Total row for alignment
        quantity_mom = pd.concat([quantity_mom_data, pd.DataFrame(index=['Total'], columns=quantity_pivot.columns).fillna(np.nan)])
        quantity_mom.replace([np.inf, -np.inf], np.nan, inplace=True)
        quantity_mom.loc['Total'] = np.nan
        
        # Display Amount tables
        st.markdown("### 💰 Expense Amount Analysis")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**Amount (₹)**")
            st.dataframe(
                amount_pivot.style.format("₹{:,.2f}", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=550
            )
        
        with col2:
            st.markdown("**YoY Change (%)**")
            st.dataframe(
                amount_yoy.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: red' if isinstance(x, (int, float)) and x > 0 else ('color: green' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        with col3:
            st.markdown("**MoM Change (%)**")
            st.dataframe(
                amount_mom.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: red' if isinstance(x, (int, float)) and x > 0 else ('color: green' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        st.markdown("---")
        
        # Display Quantity tables
        st.markdown("### 🔢 Expense Count Analysis")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown("**Count**")
            st.dataframe(
                quantity_pivot.style.format("{:,.0f}", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=550
            )
        
        with col2:
            st.markdown("**YoY Change (%)**")
            st.dataframe(
                quantity_yoy.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: red' if isinstance(x, (int, float)) and x > 0 else ('color: green' if isinstance(x, (int, float)) and x < 0 else '')),
                use_container_width=True,
                height=550
            )
        
        with col3:
            st.markdown("**MoM Change (%)**")
            st.dataframe(
                quantity_mom.style.format("{:+.1f}%", na_rep="")
                .set_properties(subset=None, **{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
                .map(lambda x: 'color: red' if isinstance(x, (int, float)) and x > 0 else ('color: green' if isinstance(x, (int, float)) and x < 0 else '')),
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
                title='Monthly Expense Amount Trend',
                markers=True
            )
            fig_amount.update_layout(
                xaxis_title="Month",
                yaxis_title="Amount (₹)",
                yaxis=dict(tickformat='₹,')
            )
            st.plotly_chart(fig_amount, use_container_width=True)
        
        with col2:
            quantity_for_chart = quantity_pivot.iloc[:-1].reset_index()
            quantity_melted = quantity_for_chart.melt(id_vars='month_name', var_name='Year', value_name='Count')
            
            fig_quantity = px.line(
                quantity_melted,
                x='month_name',
                y='Count',
                color='Year',
                title='Monthly Expense Count Trend',
                markers=True
            )
            fig_quantity.update_layout(
                xaxis_title="Month",
                yaxis_title="Count"
            )
            st.plotly_chart(fig_quantity, use_container_width=True)
        
        # Ledger Analysis
        st.markdown("---")
        st.markdown("### 📊 Ledger-wise Analysis")
        
        ledger_summary = filtered_df.groupby('ledger').agg({
            'amount': ['sum', 'count', 'mean'],
            'id': 'nunique'
        }).round(2)
        
        ledger_summary.columns = ['Total Amount', 'Count', 'Average Amount', 'Unique Records']
        ledger_summary = ledger_summary.sort_values('Total Amount', ascending=False)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Ledger Summary**")
            st.dataframe(
                ledger_summary.style.format({
                    'Total Amount': '₹{:,.2f}',
                    'Count': '{:,.0f}',
                    'Average Amount': '₹{:,.2f}',
                    'Unique Records': '{:,.0f}'
                }),
                use_container_width=True
            )
        
        with col2:
            # Pie chart for ledger distribution
            fig_pie = px.pie(
                values=ledger_summary['Total Amount'],
                names=ledger_summary.index,
                title='Expense Distribution by Ledger'
            )
            st.plotly_chart(fig_pie, use_container_width=True)
    
    else:
        # ---- GRANULAR VIEW (DAILY BREAKDOWN) ----
        st.subheader("🔍 Granular Daily Breakdown")
        
        # Create daily pivot tables
        daily_amount_pivot = filtered_df.pivot_table(
            index='day',
            columns=['year', 'month_name'],
            values='amount',
            aggfunc='sum',
            fill_value=0
        )
        
        daily_quantity_pivot = filtered_df.pivot_table(
            index='day',
            columns=['year', 'month_name'],
            values='id',
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
        
        st.markdown("### 💰 Daily Expense Amount")
        st.dataframe(
            daily_amount_pivot.style.format("₹{:,.2f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )
        
        st.markdown("### 🔢 Daily Expense Count")
        st.dataframe(
            daily_quantity_pivot.style.format("{:,.0f}", na_rep="")
            .set_properties(subset=None, **{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=600
        )
        
        # Show individual expense details in expanders by year-month
        st.markdown("---")
        st.markdown("### 📋 Detailed Expense Records")
        
        for year in sorted(filtered_df['year'].unique()):
            year_data = filtered_df[filtered_df['year'] == year]
            
            with st.expander(f"📅 Year {year} - {len(year_data)} expenses | Total: ₹{year_data['amount'].sum():,.2f}"):
                for month in sorted(year_data['month'].unique()):
                    month_data = year_data[year_data['month'] == month]
                    month_name = calendar.month_name[int(month)]
                    
                    st.markdown(f"**{month_name} {year}** - {len(month_data)} expenses | ₹{month_data['amount'].sum():,.2f}")
                    
                    # Display detailed records
                    display_cols = ['date', 'item', 'amount', 'ledger', 'payment_mode', 'invoice_no', 'user']
                    st.dataframe(
                        month_data[display_cols].style.format({
                            'amount': '₹{:,.2f}',
                            'date': lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else ''
                        }),
                        use_container_width=True
                    )
    
    # ---- SUMMARY METRICS ----
    st.markdown("---")
    st.subheader("📊 Summary Metrics")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_amount = filtered_df['amount'].sum()
        st.metric("Total Amount", f"₹{total_amount:,.2f}")
    
    with col2:
        total_count = len(filtered_df)
        st.metric("Total Count", f"{total_count:,}")
    
    with col3:
        avg_expense = filtered_df['amount'].mean()
        st.metric("Average Expense", f"₹{avg_expense:,.2f}")
    
    with col4:
        unique_ledgers = filtered_df['ledger'].nunique()
        st.metric("Unique Ledgers", f"{unique_ledgers}")
    
    # Additional Insights
    st.markdown("---")
    st.subheader("💡 Additional Insights")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Top 5 Expenses
        st.markdown("**🔥 Top 5 Largest Expenses**")
        top_expenses = filtered_df.nlargest(5, 'amount')[['date', 'item', 'amount', 'ledger', 'user']]
        st.dataframe(
            top_expenses.style.format({
                'amount': '₹{:,.2f}',
                'date': lambda x: x.strftime('%Y-%m-%d') if pd.notnull(x) else ''
            }),
            use_container_width=True
        )
    
    with col2:
        # Payment Mode Distribution
        st.markdown("**💳 Payment Mode Distribution**")
        payment_mode_summary = filtered_df.groupby('payment_mode')['amount'].agg(['sum', 'count']).round(2)
        payment_mode_summary.columns = ['Total Amount', 'Count']
        st.dataframe(
            payment_mode_summary.style.format({
                'Total Amount': '₹{:,.2f}',
                'Count': '{:,.0f}'
            }),
            use_container_width=True
        )

except Exception as exc:
    st.error(f"An error occurred while loading or processing expense data: {exc}")
    st.exception(exc)