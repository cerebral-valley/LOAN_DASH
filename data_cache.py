"""
Data caching utility for Loan Dashboard
Implements session state caching pattern for instant page navigation
"""

import streamlit as st
from datetime import datetime
import db


@st.cache_data(ttl=300)  # Cache for 5 minutes (300 seconds)
def _fetch_loan_data_from_db():
    """
    Internal function to fetch loan data from database.
    Cached using Streamlit's @st.cache_data decorator.
    This cache persists across sessions and page refreshes!
    
    Returns:
        pd.DataFrame: Loan data from database
    """
    return db.get_all_loans()


@st.cache_data(ttl=300)  # Cache for 5 minutes (300 seconds)
def _fetch_expense_data_from_db():
    """
    Internal function to fetch expense data from database.
    Cached using Streamlit's @st.cache_data decorator.
    This cache persists across sessions and page refreshes!
    
    Returns:
        pd.DataFrame: Expense data from database
    """
    return db.get_all_expenses()


def load_loan_data_with_cache():
    """
    Load loan data with dual-layer caching:
    1. Streamlit cache (@st.cache_data) - persists across sessions for 5 minutes
    2. Session state cache - instant access within same session
    
    This dramatically reduces load times:
    - First user after 5 min: ~10s (database query)
    - Other users within 5 min: ~0.1s (from Streamlit cache)
    - Same user navigation: ~0.01s (from session state)
    
    Returns:
        pd.DataFrame: Cached or freshly loaded loan data
    """
    if 'loan_data_loaded' not in st.session_state:
        # Load from Streamlit cache (may still hit database if cache expired)
        loan_df = _fetch_loan_data_from_db()
        
        if loan_df.empty:
            st.error("No loan data found in database.")
            st.stop()
        
        # Store in session state for instant access
        st.session_state.loan_data = loan_df
        st.session_state.loan_data_loaded = True
        st.session_state.loan_data_loaded_at = datetime.now()
    
    return st.session_state.loan_data


def load_expense_data_with_cache():
    """
    Load expense data with dual-layer caching:
    1. Streamlit cache (@st.cache_data) - persists across sessions for 5 minutes
    2. Session state cache - instant access within same session
    
    Returns:
        pd.DataFrame: Cached or freshly loaded expense data
    """
    if 'expense_data_loaded' not in st.session_state:
        # Load from Streamlit cache (may still hit database if cache expired)
        expense_df = _fetch_expense_data_from_db()
        
        if expense_df.empty:
            st.warning("No expense data found in database.")
            # Don't stop, just return empty dataframe
            st.session_state.expense_data = expense_df
            st.session_state.expense_data_loaded = True
            st.session_state.expense_data_loaded_at = datetime.now()
            return expense_df
        
        # Store in session state for instant access
        st.session_state.expense_data = expense_df
        st.session_state.expense_data_loaded = True
        st.session_state.expense_data_loaded_at = datetime.now()
    
    return st.session_state.expense_data


def clear_all_cache():
    """
    Clear all cached data from session state AND Streamlit cache.
    Forces a fresh reload on next data access.
    """
    # Clear Streamlit cache
    _fetch_loan_data_from_db.clear()
    _fetch_expense_data_from_db.clear()
    
    # Clear loan data cache from session state
    for key in ['loan_data', 'loan_data_loaded', 'loan_data_loaded_at']:
        if key in st.session_state:
            del st.session_state[key]
    
    # Clear expense data cache from session state
    for key in ['expense_data', 'expense_data_loaded', 'expense_data_loaded_at']:
        if key in st.session_state:
            del st.session_state[key]


def show_cache_status_sidebar():
    """
    Display cache status and refresh button in sidebar.
    Call this in the sidebar of each page.
    """
    st.markdown("---")
    st.markdown("### 🔄 Data Management")
    
    # Show cache status
    if 'loan_data_loaded_at' in st.session_state:
        st.success(f"✅ Data cached at: {st.session_state.loan_data_loaded_at.strftime('%H:%M:%S')}")
    else:
        st.info("ℹ️ Data will be loaded on first access")
    
    # Refresh button
    if st.button("🔄 Refresh Data", use_container_width=True, key="sidebar_refresh"):
        clear_all_cache()
        st.rerun()
