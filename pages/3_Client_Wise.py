# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import db # Import the updated db.py
import pandas as pd
import numpy as np

st.set_page_config(page_title="Client-wise Analysis", layout="wide")
st.title("👥 Client-wise Analysis Dashboard")

# ---- sidebar: info message ----
with st.sidebar:
    st.info("ℹ️ This dashboard shows client-wise loan analysis.\n\n"
            "**Analysis by customer type (Private vs Vyapari)**")

# ---- load loan data ----
try:
    # Fetch all raw loan data from the single loan_table
    loan_df = db.get_all_loans()

    if loan_df.empty:
        st.warning("No loan data found in 'loan_table'. Please ensure data is present and the 'Loan' model in db.py matches your table schema.")
        st.stop()

    # Ensure numeric cols are floats and handle dates
    num_cols = [
        "loan_amount",
    ]

    # Ensure these columns exist in loan_df before applying operations
    for col in num_cols:
        if col not in loan_df.columns:
            st.error(f"Missing expected numeric column in loan_table: '{col}'. Please check your database schema and db.py Loan model.")
            st.stop()

    loan_df[num_cols] = loan_df[num_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
    loan_df["date_of_disbursement"] = pd.to_datetime(loan_df["date_of_disbursement"])
    
    # Normalize customer_type values
    loan_df['customer_type'] = loan_df['customer_type'].str.title()
    
    # Normalize released column
    loan_df['released'] = loan_df['released'].apply(
        lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
    )

    st.success("Loan data loaded successfully.")
    
    # Debug: Check the date extraction
    loan_df['year'] = loan_df['date_of_disbursement'].dt.year
    



    # ---- 1. CLUSTERED COLUMN CHART: Total Loans by Customer Type per Year ----
    st.subheader("📊 Yearly Loan Amount Distribution by Customer Type")
    
    # Prepare yearly data by customer type
    yearly_customer_data = loan_df.groupby(['year', 'customer_type'])['loan_amount'].sum().reset_index()
    
    # Create clustered column chart
    fig_yearly = px.bar(
        yearly_customer_data,
        x='year',
        y='loan_amount',
        color='customer_type',
        title='Total Loan Amount by Customer Type (Yearly)',
        labels={'loan_amount': 'Loan Amount (₹)', 'year': 'Year', 'customer_type': 'Customer Type'},
        text='loan_amount'
    )
    
    fig_yearly.update_traces(
        texttemplate='%{text:,.0f}',
        textposition='outside'
    )
    
    fig_yearly.update_layout(
        xaxis_title="Year",
        yaxis_title="Loan Amount (₹)",
        xaxis=dict(tickmode='linear'),
        yaxis=dict(tickformat=','),
        height=500
    )
    
    st.plotly_chart(fig_yearly, use_container_width=True)

    # ---- 2. PIE CHARTS: Customer Type Distribution ----
    st.subheader("🥧 Customer Type Distribution")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Overall Loan Amount Distribution**")
        
        # Overall distribution
        overall_distribution = loan_df.groupby('customer_type')['loan_amount'].sum().reset_index()
        
        fig_pie_overall = px.pie(
            overall_distribution,
            values='loan_amount',
            names='customer_type',
            title='Overall Loan Amount by Customer Type',
            hole=0.3
        )
        
        fig_pie_overall.update_traces(
            textposition='inside',
            textinfo='percent+label'
        )
        
        st.plotly_chart(fig_pie_overall, use_container_width=True)
        
        # Display values
        st.dataframe(
            overall_distribution.style.format({'loan_amount': '{:,.0f}'})
            .set_properties(**{"text-align": "right"}),
            use_container_width=True
        )
    
    with col2:
        st.markdown("**Outstanding Loans Distribution (Released = FALSE)**")
        
        # Outstanding loans distribution
        outstanding_loans = loan_df[loan_df['released'].str.upper() == 'FALSE']
        outstanding_distribution = outstanding_loans.groupby('customer_type')['loan_amount'].sum().reset_index()
        
        if not outstanding_distribution.empty:
            fig_pie_outstanding = px.pie(
                outstanding_distribution,
                values='loan_amount',
                names='customer_type',
                title='Outstanding Loan Amount by Customer Type',
                hole=0.3
            )
            
            fig_pie_outstanding.update_traces(
                textposition='inside',
                textinfo='percent+label'
            )
            
            st.plotly_chart(fig_pie_outstanding, use_container_width=True)
            
            # Display values
            st.dataframe(
                outstanding_distribution.style.format({'loan_amount': '{:,.0f}'})
                .set_properties(**{"text-align": "right"}),
                use_container_width=True
            )
        else:
            st.info("No outstanding loans found.")
    col1, col2 = st.columns(2)
    with col1:
        st.write("Year distribution:")
        year_summary = loan_df.groupby('year').agg(
            count=('year', 'size'),
            total_loan_amount=('loan_amount', 'sum')
        ).reset_index()
        year_summary.columns = ['Year', 'Count', 'Total Loan Amount (₹)']
        
        st.dataframe(
            year_summary.style
            .format({'Count': '{:,}', 'Total Loan Amount (₹)': '{:,.0f}'})
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True
        )
    with col2:
        st.write("Customer type distribution:")
        st.write(loan_df['customer_type'].value_counts().sort_index())
    with col2:
        st.write("Released status distribution:")
        st.write(loan_df['released'].value_counts().sort_index())
    st.markdown("---")

    # ---- 3. PRIVATE CUSTOMER ANALYSIS ----
    st.subheader("🏠 Private Customer Analysis")
    
    # Filter for private customers only
    private_loans = loan_df[loan_df['customer_type'] == 'Private'].copy()
    
    if private_loans.empty:
        st.warning("No private customer loans found.")
    else:
        # Prepare yearly data for private customers
        private_yearly = private_loans.groupby('year').agg(
            disbursed_amount=('loan_amount', 'sum'),
            disbursed_quantity=('loan_number', 'count')
        ).reset_index()
        
        # Calculate year-over-year changes
        private_yearly['amount_change'] = private_yearly['disbursed_amount'].pct_change() * 100
        private_yearly['quantity_change'] = private_yearly['disbursed_quantity'].pct_change() * 100
        
        # Replace infinite values with NaN
        private_yearly.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Private Customer - Disbursed Amount & YoY Change**")
            
            # Create a table for amount
            amount_table = private_yearly[['year', 'disbursed_amount', 'amount_change']].copy()
            amount_table.columns = ['Year', 'Disbursed Amount (₹)', 'YoY Change (%)']
            
            st.dataframe(
                amount_table.style
                .format({
                    'Disbursed Amount (₹)': '{:,.0f}',
                    'YoY Change (%)': '{:+.1f}%'
                }, na_rep="")
                .set_properties(**{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=400
            )
        
        with col2:
            st.markdown("**Private Customer - Disbursed Quantity & YoY Change**")
            
            # Create a table for quantity
            quantity_table = private_yearly[['year', 'disbursed_quantity', 'quantity_change']].copy()
            quantity_table.columns = ['Year', 'Disbursed Quantity', 'YoY Change (%)']
            
            st.dataframe(
                quantity_table.style
                .format({
                    'Disbursed Quantity': '{:,.0f}',
                    'YoY Change (%)': '{:+.1f}%'
                }, na_rep="")
                .set_properties(**{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=400
            )

        # Line charts for private customer trends
        st.markdown("**Private Customer Trends**")
        
        col1, col2 = st.columns(2)
        
        with col1:
            # Amount trend chart
            fig_amount_trend = px.line(
                private_yearly,
                x='year',
                y='disbursed_amount',
                title='Private Customer - Disbursed Amount Trend',
                markers=True
            )
            
            fig_amount_trend.update_layout(
                xaxis_title="Year",
                yaxis_title="Disbursed Amount (₹)",
                yaxis=dict(tickformat=',')
            )
            
            st.plotly_chart(fig_amount_trend, use_container_width=True)
        
        with col2:
            # Quantity trend chart
            fig_quantity_trend = px.line(
                private_yearly,
                x='year',
                y='disbursed_quantity',
                title='Private Customer - Disbursed Quantity Trend',
                markers=True
            )
            
            fig_quantity_trend.update_layout(
                xaxis_title="Year",
                yaxis_title="Disbursed Quantity"
            )
            
            st.plotly_chart(fig_quantity_trend, use_container_width=True)

        # Summary metrics for private customers
        st.markdown("**Private Customer Summary**")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_private_amount = private_loans['loan_amount'].sum()
            st.metric("Total Disbursed (₹)", f"{total_private_amount:,.0f}")
        
        with col2:
            total_private_quantity = private_loans['loan_number'].count()
            st.metric("Total Quantity", f"{total_private_quantity:,.0f}")
        
        with col3:
            outstanding_private = private_loans[private_loans['released'].str.upper() == 'FALSE']['loan_amount'].sum()
            st.metric("Outstanding (₹)", f"{outstanding_private:,.0f}")
        
        with col4:
            avg_loan_size = private_loans['loan_amount'].mean()
            st.metric("Average Loan Size (₹)", f"{avg_loan_size:,.0f}")


    # ---- VYAPARI CUSTOMER DETAILED ANALYSIS ----
    st.markdown("---")
    st.subheader("🏢 Vyapari Customer Detailed Analysis")
    
    # Filter for vyapari customers
    vyapari_loans = loan_df[loan_df['customer_type'] == 'Vyapari'].copy()
    
    if not vyapari_loans.empty:
        # Debug: Check the data first
        st.write(f"Total Vyapari loans: {len(vyapari_loans)} | Years in data: {', '.join(map(str, sorted(vyapari_loans['year'].unique())))}")
        
        # Check if customer_name column exists, if not create a mapping using customer_id
        if 'customer_name' in vyapari_loans.columns:
            customer_names_map = vyapari_loans[['customer_id', 'customer_name']].drop_duplicates().set_index('customer_id')['customer_name'].to_dict()
        else:
            # If customer_name doesn't exist, use customer_id as name
            customer_names_map = {cid: cid for cid in vyapari_loans['customer_id'].unique()}
        
        st.write(vyapari_loans['year'].value_counts().sort_index())
        
        # Individual vyapari customer analysis - base data
        vyapari_base_data = vyapari_loans.groupby(['customer_id', 'year']).agg(
            total_quantity=('loan_number', 'count'),
            total_amount=('loan_amount', 'sum')
        ).reset_index()
                
       
        vyapari_loans = loan_df[loan_df['customer_type'] == 'Vyapari'].copy()

        # Ensure date_of_disbursement is datetime
        vyapari_loans['date_of_disbursement'] = pd.to_datetime(vyapari_loans['date_of_disbursement'], errors='coerce')

        # Extract year from date_of_disbursement
        vyapari_loans['year'] = vyapari_loans['date_of_disbursement'].dt.year

        # Now group by customer_id and year
        vyapari_base_data = vyapari_loans.groupby(['customer_id', 'year']).agg(
            total_quantity=('loan_number', 'count'),
            total_amount=('loan_amount', 'sum')
        ).reset_index()

        # 1. Total Quantity Pivot Table
        quantity_pivot = vyapari_base_data.pivot(index='customer_id', columns='year', values='total_quantity').fillna(0)
        # Map customer IDs to names
        # Ensure customer_names_map is used correctly
        #      
        quantity_pivot.index = quantity_pivot.index.map(customer_names_map)
        
        # Calculate YoY changes for quantity
        quantity_change = quantity_pivot.pct_change(axis=1) * 100
        quantity_change.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        col1, col2 = st.columns(2)
        
       
        # 2. Total Amount Pivot Table
        amount_pivot = vyapari_base_data.pivot(index='customer_id', columns='year', values='total_amount').fillna(0)
        amount_pivot.index = amount_pivot.index.map(lambda x: customer_names_map.get(x, x))
        
        # Calculate YoY changes for amount
        amount_change = amount_pivot.pct_change(axis=1) * 100
        amount_change.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        
        # 3. Outstanding Analysis
        outstanding_data = loan_df[loan_df['released'].str.upper() == 'FALSE'].groupby('customer_id').agg(
            outstanding_quantity=('loan_number', 'count'),
            outstanding_amount=('loan_amount', 'sum')
        ).reset_index()

        
        # Active Vyapari Customers Analysis
        st.markdown("**Active Vyapari Customers**")
        
        # Calculate date 365 days ago
        from datetime import datetime, timedelta
        cutoff_date = datetime.now() - timedelta(days=365)
        
        # Find active vyapari customers
        active_vyapari = vyapari_loans[
            (vyapari_loans['released'].str.upper() == 'FALSE') &
            (vyapari_loans['date_of_disbursement'] >= cutoff_date)
        ].groupby('customer_id').agg(
            outstanding_count=('loan_number', 'count'),
            outstanding_amount=('loan_amount', lambda x: f"{int(x.sum()):,}"),
        ).reset_index()
        
        active_vyapari_qualified = active_vyapari[active_vyapari['outstanding_count'] >= 10]
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.metric(
                "Total Unique Vyapari Customers",
                f"{vyapari_loans['customer_id'].nunique():,}"
            )
            
        with col2:
            st.metric(
                "Active Vyapari Customers (≥10 outstanding loans, last 365 days)",
                f"{len(active_vyapari_qualified):,}"
            )
        
        if not active_vyapari_qualified.empty:
            # Add customer names to active vyapari
            active_vyapari_qualified['customer_name'] = active_vyapari_qualified['customer_id'].map(customer_names_map)
            active_display = active_vyapari_qualified[['customer_name', 'outstanding_count', 'outstanding_amount']].copy()
            active_display.columns = ['Customer Name', 'Outstanding Count', 'Outstanding Amount (₹)']

            st.dataframe(
                active_display.style
                .format({
                    'Outstanding Count': '{:,.0f}',
                    'Last Disbursement': lambda x: x.strftime('%Y-%m-%d') if pd.notna(x) else ""
                })
                .set_properties(**{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True
            )
        
        # Top 10 Vyapari Analysis
        st.markdown("**Top 10 Vyapari Customers Analysis**")
        
        # Calculate overall metrics for each vyapari customer
        vyapari_overall = vyapari_loans.groupby('customer_id').agg(
            total_quantity=('loan_number', 'count'),
            total_amount=('loan_amount', 'sum')
        ).reset_index()
        
        # Add customer names to vyapari_overall
        vyapari_overall['customer_name'] = vyapari_overall['customer_id'].map(customer_names_map)
        
        # Add outstanding data
        vyapari_overall = vyapari_overall.merge(outstanding_data, on='customer_id', how='left')
        vyapari_overall['outstanding_quantity'] = vyapari_overall['outstanding_quantity'].fillna(0)
        vyapari_overall['outstanding_amount'] = vyapari_overall['outstanding_amount'].fillna(0)
        
        # Get top 10 by outstanding amount
        top_10_vyapari = vyapari_overall.nlargest(10, 'outstanding_amount')
        
        # Create display table with proper column selection
        if 'customer_name' in top_10_vyapari.columns:
            top_10_display = top_10_vyapari[['customer_name', 'total_quantity', 'total_amount', 'outstanding_quantity', 'outstanding_amount']].copy()
            top_10_display.columns = ['Customer Name', 'Total Quantity', 'Total Amount (₹)', 'Outstanding Quantity', 'Outstanding Amount (₹)']
        else:
            # Fallback if customer_name is still not available
            top_10_display = top_10_vyapari[['customer_id', 'total_quantity', 'total_amount', 'outstanding_quantity', 'outstanding_amount']].copy()
            top_10_display.columns = ['Customer ID', 'Total Quantity', 'Total Amount (₹)', 'Outstanding Quantity', 'Outstanding Amount (₹)']
        
        st.dataframe(
            top_10_display.style
            .format({
                'Total Quantity': '{:,.0f}',
                'Total Amount (₹)': '{:,.0f}',
                'Outstanding Quantity': '{:,.0f}',
                'Outstanding Amount (₹)': '{:,.0f}'
            })
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True
        )
        
        # Calculate ratios of top 10 to all vyapari
        total_vyapari_amount = vyapari_overall['total_amount'].sum()
        total_vyapari_quantity = vyapari_overall['total_quantity'].sum()
        total_vyapari_outstanding_amount = vyapari_overall['outstanding_amount'].sum()
        total_vyapari_outstanding_quantity = vyapari_overall['outstanding_quantity'].sum()
        
        top_10_amount = top_10_vyapari['total_amount'].sum()
        top_10_quantity = top_10_vyapari['total_quantity'].sum()
        top_10_outstanding_amount = top_10_vyapari['outstanding_amount'].sum()
        top_10_outstanding_quantity = top_10_vyapari['outstanding_quantity'].sum()
        
        # Ratios
        amount_ratio = (top_10_amount / total_vyapari_amount * 100) if total_vyapari_amount > 0 else 0
        quantity_ratio = (top_10_quantity / total_vyapari_quantity * 100) if total_vyapari_quantity > 0 else 0
        outstanding_amount_ratio = (top_10_outstanding_amount / total_vyapari_outstanding_amount * 100) if total_vyapari_outstanding_amount > 0 else 0
        outstanding_quantity_ratio = (top_10_outstanding_quantity / total_vyapari_outstanding_quantity * 100) if total_vyapari_outstanding_quantity > 0 else 0
        
        st.markdown("**Top 10 Vyapari vs All Vyapari Comparison**")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Top 10 Share of Total Amount",
                f"{amount_ratio:.1f}%",
                f"₹{top_10_amount:,.0f} / ₹{total_vyapari_amount:,.0f}"
            )
        
        with col2:
            st.metric(
                "Top 10 Share of Total Quantity",
                f"{quantity_ratio:.1f}%",
                f"{top_10_quantity:,} / {total_vyapari_quantity:,}"
            )
        
        with col3:
            st.metric(
                "Top 10 Share of Outstanding Amount",
                f"{outstanding_amount_ratio:.1f}%",
                f"₹{top_10_outstanding_amount:,.0f} / ₹{total_vyapari_outstanding_amount:,.0f}"
            )
        
        with col4:
            st.metric(
                "Top 10 Share of Outstanding Quantity",
                f"{outstanding_quantity_ratio:.1f}%",
                f"{top_10_outstanding_quantity:,} / {total_vyapari_outstanding_quantity:,}"
            )
        
        # Visualization of top 10 vyapari
        col1, col2 = st.columns(2)
        
        # Determine which field to use for x-axis
        name_field = 'customer_name' if 'customer_name' in top_10_vyapari.columns else 'customer_id'
        name_label = 'Customer Name' if 'customer_name' in top_10_vyapari.columns else 'Customer ID'
        
        with col1:
            fig_top10_amount = px.bar(
                top_10_vyapari.head(10),
                x=name_field,
                y='outstanding_amount',
                title='Top 10 Vyapari by Outstanding Amount',
                labels={'outstanding_amount': 'Outstanding Amount (₹)', name_field: name_label}
            )
            fig_top10_amount.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_top10_amount, use_container_width=True)
        
        with col2:
            fig_top10_quantity = px.bar(
                top_10_vyapari.head(10),
                x=name_field,
                y='outstanding_quantity',
                title='Top 10 Vyapari by Outstanding Quantity',
                labels={'outstanding_quantity': 'Outstanding Quantity', name_field: name_label}
            )
            fig_top10_quantity.update_layout(xaxis_tickangle=-45)
            st.plotly_chart(fig_top10_quantity, use_container_width=True)
    
    else:
        st.info("No Vyapari customer data found.")

    # ---- OVERALL SUMMARY METRICS ----
    st.markdown("---")
    st.subheader("📈 Overall Summary by Customer Type")
    
    summary_data = loan_df.groupby('customer_type').agg(
        total_amount=('loan_amount', 'sum'),
        total_quantity=('loan_number', 'count'),
        avg_loan_size=('loan_amount', 'mean')
    ).reset_index()
    
    # Add outstanding amounts
    outstanding_summary = outstanding_loans.groupby('customer_type')['loan_amount'].sum().reset_index()
    outstanding_summary.columns = ['customer_type', 'outstanding_amount']
    
    summary_data = summary_data.merge(outstanding_summary, on='customer_type', how='left')
    summary_data['outstanding_amount'].fillna(0, inplace=True)
    
    st.dataframe(
        summary_data.style
        .format({
            'total_amount': '{:,.0f}',
            'total_quantity': '{:,.0f}',
            'avg_loan_size': '{:,.0f}',
            'outstanding_amount': '{:,.0f}'
        })
        .set_properties(**{"text-align": "right"})
        .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
        use_container_width=True
    )

except Exception as exc:
    st.error(f"An error occurred while loading data or computing metrics: {exc}")
    st.exception(exc)
