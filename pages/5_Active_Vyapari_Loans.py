# make parent folder importable
import sys, pathlib
# This ensures that 'db.py' from the parent directory can be imported
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import pandas as pd
import db  # Import the updated db.py from parent directory

# Load necessary data
@st.cache_data
def load_customer_data():
    """Load distinct customer names from loan_table for Vyapari customers"""
    query = "SELECT DISTINCT customer_name FROM loan_table WHERE UPPER(customer_type) = 'VYAPARI' ORDER BY customer_name"
    return pd.read_sql(query, db.engine)

@st.cache_data
def load_loan_data(customer_name):
    """Load loan data for a specific customer"""
    query = """
    SELECT loan_number, customer_name, customer_type, loan_amount, 
           date_of_disbursement, date_of_release, released, interest_rate,
           pending_loan_amount, interest_amount
    FROM loan_table 
    WHERE customer_name = %s AND UPPER(customer_type) = 'VYAPARI'
    ORDER BY date_of_disbursement DESC
    """
    return pd.read_sql(query, db.engine, params=(customer_name,))

# Streamlit app
st.set_page_config(page_title="Active Vyapari Loans", layout="wide")
st.title("🏪 Active Vyapari Loans")

try:
    # Text box to search customer name
    customer_names = load_customer_data()
    
    if customer_names.empty:
        st.warning("No Vyapari customers found in the database.")
        st.stop()
    
    search_term = st.text_input("🔍 Search Customer Name", "")

    if search_term:
        # Filter customer names based on search term
        filtered_names = customer_names[
            customer_names['customer_name'].str.contains(search_term, case=False, na=False)
        ]
        
        if not filtered_names.empty:
            selected_name = st.selectbox("Select Customer Name", filtered_names['customer_name'])

            if selected_name:
                loan_data = load_loan_data(selected_name)

                if not loan_data.empty:
                    # Separate dataframes based on 'released' column
                    # Handle case-insensitive comparison for inconsistent data
                    released_loans = loan_data[loan_data['released'].str.upper() == 'TRUE']
                    active_loans = loan_data[loan_data['released'].str.upper() == 'FALSE']

                    # Display summary metrics
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("Total Loans", len(loan_data))
                    with col2:
                        st.metric("Active Loans", len(active_loans))
                    with col3:
                        st.metric("Released Loans", len(released_loans))

                    st.markdown("---")

                    # Display Active Loans (Released = FALSE)
                    st.subheader("🔴 Active Loans (Outstanding)")
                    if not active_loans.empty:
                        st.dataframe(active_loans, use_container_width=True)
                        st.info(f"**Total Outstanding Amount: ₹{active_loans['pending_loan_amount'].sum():,.2f}**")
                    else:
                        st.success("No active loans for this customer.")

                    st.markdown("---")

                    # Display Released Loans (Released = TRUE)
                    st.subheader("✅ Released Loans (Completed)")
                    if not released_loans.empty:
                        st.dataframe(released_loans, use_container_width=True)
                        st.info(f"**Total Released Amount: ₹{released_loans['loan_amount'].sum():,.2f}**")
                    else:
                        st.info("No completed loans for this customer.")
                        
                else:
                    st.warning(f"No loan data found for customer: {selected_name}")
        else:
            st.warning(f"No customers found matching: '{search_term}'")
    else:
        st.info("👆 Enter a customer name to search and view their loan details.")
        
        # Show some sample customer names
        st.subheader("Sample Vyapari Customers:")
        sample_customers = customer_names.head(10)
        st.dataframe(sample_customers, use_container_width=True)

except Exception as e:
    st.error(f"An error occurred: {e}")
    st.error("Please check your database connection and ensure the loan_table exists.")