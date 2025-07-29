# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import db # Import the updated db.py
import pandas as pd
import numpy as np # Import numpy for inf and NaN handling
import numpy as np

st.set_page_config(page_title="Vyapari-wise Analysis", layout="wide")

st.title("🏢 Vyapari Customer Detailed Analysis")

try:
    # Fetch all loan data to get customer information
    st.subheader("Step 1: Fetching All Loan Data")
    
    loan_df = db.get_all_loans()
    
    if loan_df.empty:
        st.warning("No loan data found. Please check your database.")
        st.stop()
    
    # Step 1: Get all unique Vyapari customers from loan data
    st.subheader("Step 2: Identifying Vyapari Customers")
    
    # Normalize customer_type and get unique Vyapari customers
    loan_df['customer_type_normalized'] = loan_df['customer_type'].str.upper().str.strip()
    
    vyapari_customers = loan_df[loan_df['customer_type_normalized'] == 'VYAPARI'][['customer_id', 'customer_name', 'customer_type']].drop_duplicates()
    
    if vyapari_customers.empty:
        st.warning("No Vyapari customers found in loan data.")
        st.stop()
    
    st.success(f"Found {len(vyapari_customers)} unique Vyapari customers")

    
    # Get list of Vyapari customer IDs
    vyapari_customer_ids = vyapari_customers['customer_id'].tolist()
    
    # Step 3: Filter loans for Vyapari customers only
    st.subheader("Step 3: Filtering Loans for Vyapari Customers")
    
    # Filter loans for Vyapari customers only
    vyapari_loans = loan_df[
        (loan_df['customer_id'].isin(vyapari_customer_ids)) & 
        (loan_df['customer_type_normalized'] == 'VYAPARI')
    ].copy()
    
    if vyapari_loans.empty:
        st.warning("No loans found for Vyapari customers.")
        st.stop()
    
    # Ensure proper data types
    vyapari_loans["loan_amount"] = pd.to_numeric(vyapari_loans["loan_amount"], errors="coerce").fillna(0)
    vyapari_loans["date_of_disbursement"] = pd.to_datetime(vyapari_loans["date_of_disbursement"])
    vyapari_loans['year'] = vyapari_loans['date_of_disbursement'].dt.year
    
    # Normalize released column
    vyapari_loans['released'] = vyapari_loans['released'].apply(
        lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
    )
    
    # Normalize released column
    vyapari_loans['released'] = vyapari_loans['released'].apply(
        lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
    )
    
    st.success(f"Found {len(vyapari_loans)} loans for Vyapari customers from {vyapari_loans['year'].min()} to {vyapari_loans['year'].max()}")
    
    
    # Step 4: Create analysis tables
    st.subheader("Step 4: Individual Customer Analysis Tables")
    
    # ---- TABLE 1: LOAN AMOUNT DISBURSED BY YEAR ----
    st.markdown("### 💰 Loan Amount Disbursed by Year")
    
    # Create pivot table for loan amounts
    amount_pivot = vyapari_loans.groupby(['customer_name', 'year'])['loan_amount'].sum().unstack(fill_value=0)
    
    # Display loan amount table
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Annual Loan Amount Disbursed (₹)**")
        st.dataframe(
            amount_pivot.style
            .format("{:,.0f}")
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=400
        )
    
    with col2:
        st.markdown("**Loan Amount YoY Change (%)**")
        amount_yoy = amount_pivot.pct_change(axis=1) * 100
        amount_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        st.dataframe(
            amount_yoy.style
            .format("{:+.1f}%", na_rep="")
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
            .apply(lambda x: ['background-color: lightgreen' if v > 0 else 'background-color: lightcoral' if v < 0 else '' for v in x], axis=0),
            use_container_width=True,
            height=400
        )
    
    # ---- TABLE 2: LOAN QUANTITY (COUNT) BY YEAR ----
    st.markdown("### 📊 Loan Quantity Disbursed by Year")
    
    # Create pivot table for loan quantities
    quantity_pivot = vyapari_loans.groupby(['customer_name', 'year'])['loan_number'].count().unstack(fill_value=0)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**Annual Loan Quantity Disbursed**")
        st.dataframe(
            quantity_pivot.style
            .format("{:,.0f}")
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
            use_container_width=True,
            height=400
        )
    
    with col2:
        st.markdown("**Loan Quantity YoY Change (%)**")
        quantity_yoy = quantity_pivot.pct_change(axis=1) * 100
        quantity_yoy.replace([np.inf, -np.inf], np.nan, inplace=True)
        
        st.dataframe(
            quantity_yoy.style
            .format("{:+.1f}%", na_rep="")
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}])
            .apply(lambda x: ['background-color: lightgreen' if v > 0 else 'background-color: lightcoral' if v < 0 else '' for v in x], axis=0),
            use_container_width=True,
            height=400
        )
    
    # ---- TABLE 3: OUTSTANDING LOANS (RELEASED = FALSE) ----
    st.markdown("### 🔄 Outstanding Loans Analysis (Released = FALSE)")
    
    # Filter for outstanding loans only
    outstanding_loans = vyapari_loans[vyapari_loans['released'].str.upper() == 'FALSE'].copy()
    
    if not outstanding_loans.empty:
        # Outstanding loan amounts by year
        outstanding_amount_pivot = outstanding_loans.groupby(['customer_name', 'year'])['loan_amount'].sum().unstack(fill_value=0)
        
        # Outstanding loan quantities by year  
        outstanding_quantity_pivot = outstanding_loans.groupby(['customer_name', 'year'])['loan_number'].count().unstack(fill_value=0)
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("**Outstanding Loan Amount by Year (₹)**")
            st.dataframe(
                outstanding_amount_pivot.style
                .format("{:,.0f}")
                .set_properties(**{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=400
            )
        
        with col2:
            st.markdown("**Outstanding Loan Quantity by Year**")
            st.dataframe(
                outstanding_quantity_pivot.style
                .format("{:,.0f}")
                .set_properties(**{"text-align": "right"})
                .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
                use_container_width=True,
                height=400
            )
        
        # Summary metrics for outstanding loans
        st.markdown("### 📈 Outstanding Loans Summary")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_outstanding_amount = outstanding_loans['loan_amount'].sum()
            st.metric("Total Outstanding Amount", f"₹{total_outstanding_amount:,.0f}")
        
        with col2:
            total_outstanding_quantity = outstanding_loans['loan_number'].count()
            st.metric("Total Outstanding Quantity", f"{total_outstanding_quantity:,}")
        
        with col3:
            customers_with_outstanding = outstanding_loans['customer_name'].nunique()
            st.metric("Customers with Outstanding", f"{customers_with_outstanding:,}")
        
        with col4:
            avg_outstanding_per_customer = total_outstanding_amount / customers_with_outstanding if customers_with_outstanding > 0 else 0
            st.metric("Avg Outstanding per Customer", f"₹{avg_outstanding_per_customer:,.0f}")
            
    else:
        st.info("No outstanding loans found (all loans are released).")
    
    # ---- SUMMARY STATISTICS ----
    st.markdown("---")
    st.subheader("📊 Overall Vyapari Analysis Summary")
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        total_disbursed = vyapari_loans['loan_amount'].sum()
        st.metric("Total Disbursed Amount", f"₹{total_disbursed:,.0f}")
    
    with col2:
        total_loans = len(vyapari_loans)
        st.metric("Total Loans Count", f"{total_loans:,}")
    
    with col3:
        unique_customers = vyapari_loans['customer_name'].nunique()
        st.metric("Unique Vyapari Customers", f"{unique_customers:,}")
    
    with col4:
        avg_loan_amount = vyapari_loans['loan_amount'].mean()
        st.metric("Average Loan Amount", f"₹{avg_loan_amount:,.0f}")
    
    # ---- VISUALIZATION: TOP CUSTOMERS ----
    st.markdown("### 🏆 Top 10 Vyapari Customers by Total Amount")
    
    top_customers = vyapari_loans.groupby('customer_name')['loan_amount'].sum().sort_values(ascending=False).head(10)
    
    fig_top_customers = px.bar(
        x=top_customers.values,
        y=top_customers.index,
        orientation='h',
        title='Top 10 Vyapari Customers by Total Loan Amount',
        labels={'x': 'Total Loan Amount (₹)', 'y': 'Customer Name'},
        text=top_customers.values
    )
    
    fig_top_customers.update_traces(
        texttemplate='₹%{text:,.0f}',
        textposition='outside'
    )
    
    fig_top_customers.update_layout(
        height=500,
        yaxis={'categoryorder': 'total ascending'}
    )
    
    st.plotly_chart(fig_top_customers, use_container_width=True)
    
    # ---- YEARLY TREND ANALYSIS ----
    st.markdown("### 📈 Yearly Disbursement Trends")
    
    yearly_summary = vyapari_loans.groupby('year').agg({
        'loan_amount': ['sum', 'count', 'mean'],
        'customer_name': 'nunique'
    }).round(0)
    
    yearly_summary.columns = ['Total Amount', 'Total Count', 'Average Amount', 'Unique Customers']
    yearly_summary = yearly_summary.reset_index()
    
    col1, col2 = st.columns(2)
    
    with col1:
        fig_yearly_amount = px.line(
            yearly_summary,
            x='year',
            y='Total Amount',
            title='Yearly Total Disbursement Amount',
            markers=True
        )
        fig_yearly_amount.update_layout(
            xaxis_title="Year",
            yaxis_title="Total Amount (₹)",
            yaxis=dict(tickformat=',')
        )
        st.plotly_chart(fig_yearly_amount, use_container_width=True)
    
    with col2:
        fig_yearly_count = px.line(
            yearly_summary,
            x='year',
            y='Total Count',
            title='Yearly Loan Count',
            markers=True
        )
        fig_yearly_count.update_layout(
            xaxis_title="Year",
            yaxis_title="Number of Loans"
        )
        st.plotly_chart(fig_yearly_count, use_container_width=True)
    
    # Display yearly summary table
    st.markdown("**Yearly Summary Table**")
    st.dataframe(
        yearly_summary.style
        .format({
            'Total Amount': '₹{:,.0f}',
            'Total Count': '{:,.0f}',
            'Average Amount': '₹{:,.0f}',
            'Unique Customers': '{:,.0f}'
        })
        .set_properties(**{"text-align": "right"})
        .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
        use_container_width=True
    )

except Exception as exc:
    st.error(f"An error occurred: {str(exc)}")
    st.error("Please check your database connection and ensure the required tables exist.")
