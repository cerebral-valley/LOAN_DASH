"""
Utility Functions for Loan Dashboard
=====================================
Centralized helper functions for data processing, calculations, and UI components.
Reduces code duplication and ensures consistency across all dashboard pages.

Author: Loan Dashboard Team
Last Updated: December 2025
"""

import streamlit as st
import pandas as pd
import numpy as np
import calendar
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go

# Optional imports (may not be available in all environments)
try:
    from scipy import stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


# ============================================================================
# 1. DATA LOADING & CACHING
# ============================================================================

def load_with_session_cache(cache_key, loader_func, *args, **kwargs):
    """
    Universal session state caching wrapper for any data loading function.
    Provides instant subsequent loads after first fetch.
    
    Args:
        cache_key (str): Unique key for this data in session state
        loader_func (callable): Function that loads the data
        *args, **kwargs: Arguments to pass to loader_func
    
    Returns:
        Data from loader_func (typically pd.DataFrame)
    
    Example:
        loan_df = load_with_session_cache('loan_data', db.get_all_loans)
        expense_df = load_with_session_cache('expense_data', db.get_all_expenses)
    """
    cache_loaded_key = f'{cache_key}_loaded'
    cache_timestamp_key = f'{cache_key}_loaded_at'
    
    if cache_loaded_key not in st.session_state:
        with st.spinner(f'🔄 Loading {cache_key}...'):
            data = loader_func(*args, **kwargs)
            st.session_state[cache_key] = data
            st.session_state[cache_loaded_key] = True
            st.session_state[cache_timestamp_key] = datetime.now()
    
    return st.session_state[cache_key]


def invalidate_cache(cache_keys):
    """
    Clear specified cache keys from session state.
    
    Args:
        cache_keys (list): List of cache key prefixes to clear
    
    Example:
        invalidate_cache(['loan_data', 'expense_data'])
    """
    for cache_key in cache_keys:
        for suffix in ['', '_loaded', '_loaded_at']:
            full_key = f'{cache_key}{suffix}'
            if full_key in st.session_state:
                del st.session_state[full_key]


# ============================================================================
# 2. DATA TRANSFORMATIONS
# ============================================================================

def add_date_columns(df, date_col='date_of_disbursement', prefix=''):
    """
    Add year, month, month_name, and day columns from a date column.
    Modifies DataFrame in-place.
    
    Args:
        df (pd.DataFrame): DataFrame to modify
        date_col (str): Name of the date column to extract from
        prefix (str): Optional prefix for new columns (e.g., 'disbursement_')
    
    Returns:
        pd.DataFrame: Modified DataFrame with new date columns
    
    Example:
        add_date_columns(loan_df, 'date_of_disbursement')
        add_date_columns(loan_df, 'date_of_release', prefix='release_')
    """
    # Ensure datetime type
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    
    # Extract components
    df[f'{prefix}year'] = df[date_col].dt.year
    df[f'{prefix}month'] = df[date_col].dt.month
    df[f'{prefix}month_name'] = df[f'{prefix}month'].map(
        lambda m: calendar.month_abbr[int(m)] if pd.notna(m) else None
    )
    df[f'{prefix}day'] = df[date_col].dt.day
    
    return df


def normalize_customer_data(df):
    """
    Normalize customer-related columns to consistent formats.
    Modifies DataFrame in-place.
    
    Args:
        df (pd.DataFrame): DataFrame with customer columns
    
    Returns:
        pd.DataFrame: Modified DataFrame with normalized data
    
    Example:
        normalize_customer_data(loan_df)
    """
    if 'customer_type' in df.columns:
        df['customer_type'] = df['customer_type'].str.title()
    
    if 'released' in df.columns:
        df['released'] = df['released'].apply(
            lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
        )
    
    return df


def calculate_holding_period(df, start_col='date_of_disbursement', end_col='date_of_release'):
    """
    Calculate holding period (days between two dates).
    Adds 'days_to_release' or custom column name.
    
    Args:
        df (pd.DataFrame): DataFrame to modify
        start_col (str): Start date column name
        end_col (str): End date column name
    
    Returns:
        pd.DataFrame: Modified DataFrame with holding period column
    
    Example:
        calculate_holding_period(released_df)
    """
    df[start_col] = pd.to_datetime(df[start_col], errors='coerce')
    df[end_col] = pd.to_datetime(df[end_col], errors='coerce')
    df['days_to_release'] = (df[end_col] - df[start_col]).dt.days
    return df


# ============================================================================
# 3. FINANCIAL CALCULATIONS (CRITICAL - PORTFOLIO-LEVEL YIELDS)
# ============================================================================

def calculate_portfolio_yield(df, interest_col='realized_interest', 
                              capital_col='loan_amount', days_col='days_to_release'):
    """
    Calculate portfolio-level annualized yield (CORRECT METHOD).
    
    ⚠️ CRITICAL: This uses portfolio-level formula, NOT averaged individual yields.
    
    Formula: (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
    
    Args:
        df (pd.DataFrame): DataFrame with interest, capital, and days columns
        interest_col (str): Column name for interest amounts
        capital_col (str): Column name for capital amounts
        days_col (str): Column name for holding period days
    
    Returns:
        dict: {
            'portfolio_yield': float,
            'total_interest': float,
            'total_capital': float,
            'weighted_avg_days': float,
            'simple_return': float  # (total_interest / total_capital) × 100
        }
    
    Example:
        metrics = calculate_portfolio_yield(released_df)
        st.metric("Portfolio Yield", f"{metrics['portfolio_yield']:.2f}%")
    """
    # Filter out invalid data
    valid_df = df[(df[capital_col] > 0) & (df[days_col] > 0)].copy()
    
    if valid_df.empty:
        return {
            'portfolio_yield': 0.0,
            'total_interest': 0.0,
            'total_capital': 0.0,
            'weighted_avg_days': 0.0,
            'simple_return': 0.0
        }
    
    total_interest = valid_df[interest_col].sum()
    total_capital = valid_df[capital_col].sum()
    
    # Calculate weighted average days
    weighted_avg_days = calculate_weighted_average_days(
        valid_df, capital_col, days_col
    )
    
    # Portfolio-level yield calculation
    if total_capital > 0 and weighted_avg_days > 0:
        simple_return = (total_interest / total_capital) * 100
        portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
    else:
        simple_return = 0.0
        portfolio_yield = 0.0
    
    return {
        'portfolio_yield': portfolio_yield,
        'total_interest': total_interest,
        'total_capital': total_capital,
        'weighted_avg_days': weighted_avg_days,
        'simple_return': simple_return
    }


def calculate_weighted_average_days(df, amount_col='loan_amount', days_col='days_to_release'):
    """
    Calculate weighted average holding period.
    
    Formula: Σ(amount × days) / Σ(amount)
    
    Args:
        df (pd.DataFrame): DataFrame with amount and days columns
        amount_col (str): Column name for amounts (weights)
        days_col (str): Column name for days
    
    Returns:
        float: Weighted average days
    
    Example:
        avg_days = calculate_weighted_average_days(released_df)
    """
    valid_df = df[(df[amount_col] > 0) & (df[days_col] > 0)].copy()
    
    if valid_df.empty:
        return 0.0
    
    total_amount = valid_df[amount_col].sum()
    
    if total_amount == 0:
        return 0.0
    
    weighted_sum = (valid_df[amount_col] * valid_df[days_col]).sum()
    return weighted_sum / total_amount


def calculate_yoy_change(pivot):
    """
    Calculate year-over-year percentage change for pivot tables.
    Works on columns (years).
    
    Args:
        pivot (pd.DataFrame): Pivot table with years as columns
    
    Returns:
        pd.DataFrame: YoY change percentages
    
    Example:
        yoy_change = calculate_yoy_change(disbursed_pivot)
    """
    yoy = pivot.pct_change(axis=1) * 100
    yoy.replace([np.inf, -np.inf], np.nan, inplace=True)
    return yoy


def calculate_mom_change(pivot):
    """
    Calculate month-over-month percentage change for pivot tables.
    Works on rows (months).
    
    Args:
        pivot (pd.DataFrame): Pivot table with months as rows
    
    Returns:
        pd.DataFrame: MoM change percentages
    
    Example:
        mom_change = calculate_mom_change(monthly_pivot)
    """
    # Exclude 'Total' row if present
    data_rows = pivot.index != 'Total'
    mom = pivot.loc[data_rows].pct_change(axis=0) * 100
    mom.replace([np.inf, -np.inf], np.nan, inplace=True)
    return mom


# ============================================================================
# 4. PIVOT TABLES
# ============================================================================

def create_monthly_pivot(df, value_col, date_col='date_of_disbursement', 
                        agg_func='sum', add_totals=True):
    """
    Create standardized Month (rows) × Year (columns) pivot table.
    
    Args:
        df (pd.DataFrame): Source DataFrame
        value_col (str): Column to aggregate
        date_col (str): Date column to extract year/month from
        agg_func (str or callable): Aggregation function ('sum', 'count', 'mean', etc.)
        add_totals (bool): Whether to add Total row and column
    
    Returns:
        pd.DataFrame: Pivot table with months as rows, years as columns
    
    Example:
        pivot = create_monthly_pivot(loan_df, 'loan_amount', agg_func='sum')
    """
    # Prepare data
    temp_df = df.copy()
    add_date_columns(temp_df, date_col)
    
    # Create pivot
    pivot = temp_df.pivot_table(
        index='month_name',
        columns='year',
        values=value_col,
        aggfunc=agg_func,
        fill_value=0
    )
    
    # Reorder months
    pivot = reindex_by_months(pivot)
    
    # Add totals
    if add_totals:
        pivot = add_pivot_totals(pivot)
    
    return pivot


def add_pivot_totals(pivot):
    """
    Add 'Total' row and optionally 'Total' column to pivot table.
    
    Args:
        pivot (pd.DataFrame): Pivot table to modify
    
    Returns:
        pd.DataFrame: Pivot table with totals added
    
    Example:
        pivot_with_totals = add_pivot_totals(pivot)
    """
    # Add Total row
    pivot.loc['Total'] = pivot.sum(axis=0)
    
    # Add Total column (if multiple year columns exist)
    if pivot.shape[1] > 1:
        pivot['Total'] = pivot.sum(axis=1)
    
    return pivot


def reindex_by_months(pivot):
    """
    Reorder pivot table rows to calendar month order (Jan, Feb, ..., Dec).
    
    Args:
        pivot (pd.DataFrame): Pivot table with month names as index
    
    Returns:
        pd.DataFrame: Reordered pivot table
    
    Example:
        ordered_pivot = reindex_by_months(pivot)
    """
    month_order = [calendar.month_abbr[i] for i in range(1, 13)]
    return pivot.reindex(index=month_order, fill_value=0)


# ============================================================================
# 5. DATAFRAME STYLING
# ============================================================================

def style_currency_table(df, currency_cols, other_formats=None):
    """
    Apply currency formatting to specified columns in a DataFrame.
    
    Args:
        df (pd.DataFrame): DataFrame to style
        currency_cols (list): List of column names to format as currency
        other_formats (dict): Optional dict of other column formats
    
    Returns:
        pd.io.formats.style.Styler: Styled DataFrame
    
    Example:
        styled = style_currency_table(
            df, 
            currency_cols=['loan_amount', 'interest_amount'],
            other_formats={'interest_yield': '{:.2f}%'}
        )
        st.dataframe(styled, use_container_width=True)
    """
    format_dict = {col: '₹{:,.0f}' for col in currency_cols}
    
    if other_formats:
        format_dict.update(other_formats)
    
    return (df.style
            .format(format_dict, na_rep='')
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{
                "selector": "th",
                "props": [("text-align", "center")]
            }]))


def style_percentage_table(df, pct_cols, decimals=1, other_formats=None):
    """
    Apply percentage formatting to specified columns in a DataFrame.
    
    Args:
        df (pd.DataFrame): DataFrame to style
        pct_cols (list): List of column names to format as percentages
        decimals (int): Number of decimal places
        other_formats (dict): Optional dict of other column formats
    
    Returns:
        pd.io.formats.style.Styler: Styled DataFrame
    
    Example:
        styled = style_percentage_table(df, pct_cols=['yoy_change', 'mom_change'])
    """
    format_dict = {col: f'{{:+.{decimals}f}}%' for col in pct_cols}
    
    if other_formats:
        format_dict.update(other_formats)
    
    return (df.style
            .format(format_dict, na_rep='')
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{
                "selector": "th",
                "props": [("text-align", "center")]
            }]))


def style_mixed_table(df, currency_cols=None, pct_cols=None, 
                     int_cols=None, float_cols=None):
    """
    Apply mixed formatting to a DataFrame (currency, percentage, integers, floats).
    
    Args:
        df (pd.DataFrame): DataFrame to style
        currency_cols (list): Columns to format as currency
        pct_cols (list): Columns to format as percentages
        int_cols (list): Columns to format as integers
        float_cols (list): Columns to format as floats with 2 decimals
    
    Returns:
        pd.io.formats.style.Styler: Styled DataFrame
    
    Example:
        styled = style_mixed_table(
            df,
            currency_cols=['loan_amount'],
            pct_cols=['interest_yield'],
            int_cols=['days_to_release']
        )
    """
    format_dict = {}
    
    if currency_cols:
        format_dict.update({col: '₹{:,.0f}' for col in currency_cols})
    
    if pct_cols:
        format_dict.update({col: '{:.2f}%' for col in pct_cols})
    
    if int_cols:
        format_dict.update({col: '{:,.0f}' for col in int_cols})
    
    if float_cols:
        format_dict.update({col: '{:.2f}' for col in float_cols})
    
    return (df.style
            .format(format_dict, na_rep='')
            .set_properties(**{"text-align": "right"})
            .set_table_styles([{
                "selector": "th",
                "props": [("text-align", "center")]
            }]))


# ============================================================================
# 6. UI COMPONENTS (FILTERS)
# ============================================================================

def create_year_filter(df, date_col='date_of_disbursement', label='📅 Year', key=None):
    """
    Create a standardized year filter dropdown.
    
    Args:
        df (pd.DataFrame): DataFrame containing date column
        date_col (str): Name of date column to extract years from
        label (str): Label for the selectbox
        key (str): Optional unique key for the widget
    
    Returns:
        str: Selected year ('--All--' or year string)
    
    Example:
        selected_year = create_year_filter(loan_df)
        if selected_year != '--All--':
            filtered_df = filtered_df[filtered_df['year'] == int(selected_year)]
    """
    years = sorted(df[date_col].dt.year.dropna().unique())
    year_options = ['--All--'] + [str(year) for year in years]
    return st.selectbox(label, year_options, key=key)


def create_month_filter(df, date_col='date_of_disbursement', label='📆 Month', key=None):
    """
    Create a standardized month filter dropdown.
    
    Args:
        df (pd.DataFrame): DataFrame containing date column
        date_col (str): Name of date column
        label (str): Label for the selectbox
        key (str): Optional unique key for the widget
    
    Returns:
        str: Selected month ('--All--' or month name)
    
    Example:
        selected_month = create_month_filter(loan_df)
    """
    month_options = ['--All--'] + [calendar.month_name[i] for i in range(1, 13)]
    return st.selectbox(label, month_options, key=key)


def create_customer_type_filter(df, label='👥 Customer Type', key=None):
    """
    Create a customer type filter (Private/Vyapari/Both).
    
    Args:
        df (pd.DataFrame): DataFrame with customer_type column
        label (str): Label for the selectbox
        key (str): Optional unique key for the widget
    
    Returns:
        str: Selected customer type
    
    Example:
        customer_type = create_customer_type_filter(loan_df)
    """
    return st.selectbox(label, ['Both', 'Private', 'Vyapari'], key=key)


def create_vyapari_customer_filter(df, include_all=True, include_private=True, 
                                   label='👤 Client', key=None):
    """
    Create a Vyapari customer name filter with optional Private/All options.
    
    Args:
        df (pd.DataFrame): DataFrame with customer_name and customer_type columns
        include_all (bool): Include '--ALL--' option
        include_private (bool): Include 'Private' option
        label (str): Label for the selectbox
        key (str): Optional unique key for the widget
    
    Returns:
        str: Selected customer name
    
    Example:
        selected_client = create_vyapari_customer_filter(loan_df)
    """
    vyapari_customers = sorted(
        df[df['customer_type'] == 'Vyapari']['customer_name'].unique()
    )
    
    options = []
    if include_all:
        options.append('--ALL--')
    if include_private:
        options.append('Private')
    options.extend(vyapari_customers)
    
    return st.selectbox(label, options, key=key)


# ============================================================================
# 7. CHART HELPERS
# ============================================================================

def create_standardized_line_chart(df, x, y, title, color=None, 
                                   markers=True, height=400):
    """
    Create a standardized line chart with consistent styling.
    
    Args:
        df (pd.DataFrame): Data source
        x (str): X-axis column name
        y (str or list): Y-axis column name(s)
        title (str): Chart title
        color (str): Optional color column for multi-line charts
        markers (bool): Show markers on data points
        height (int): Chart height in pixels
    
    Returns:
        plotly.graph_objects.Figure: Configured chart
    
    Example:
        fig = create_standardized_line_chart(
            monthly_df, 
            x='month', 
            y='loan_amount', 
            title='Monthly Disbursements'
        )
        st.plotly_chart(fig, use_container_width=True)
    """
    fig = px.line(
        df, x=x, y=y, 
        title=title,
        color=color,
        markers=markers,
        height=height
    )
    
    fig.update_layout(
        xaxis_title=x.replace('_', ' ').title(),
        yaxis_title=y if isinstance(y, str) else 'Value',
        hovermode='x unified'
    )
    
    return fig


def create_standardized_bar_chart(df, x, y, title, color=None, 
                                  orientation='v', height=400):
    """
    Create a standardized bar chart with consistent styling.
    
    Args:
        df (pd.DataFrame): Data source
        x (str): X-axis column name
        y (str): Y-axis column name
        title (str): Chart title
        color (str): Optional color column
        orientation (str): 'v' for vertical, 'h' for horizontal
        height (int): Chart height in pixels
    
    Returns:
        plotly.graph_objects.Figure: Configured chart
    
    Example:
        fig = create_standardized_bar_chart(
            yearly_df, 
            x='year', 
            y='total_amount', 
            title='Yearly Disbursements'
        )
    """
    fig = px.bar(
        df, x=x, y=y,
        title=title,
        color=color,
        orientation=orientation,
        height=height
    )
    
    fig.update_layout(
        xaxis_title=x.replace('_', ' ').title(),
        yaxis_title=y.replace('_', ' ').title(),
        hovermode='x unified'
    )
    
    return fig


# ============================================================================
# 8. DATA VALIDATION
# ============================================================================

def validate_loan_data(df, required_cols=None):
    """
    Validate loan data for completeness and correctness.
    
    Args:
        df (pd.DataFrame): Loan DataFrame to validate
        required_cols (list): List of required column names
    
    Returns:
        dict: {
            'valid': bool,
            'missing_cols': list,
            'null_counts': dict,
            'warnings': list
        }
    
    Example:
        validation = validate_loan_data(loan_df, ['loan_amount', 'date_of_disbursement'])
        if not validation['valid']:
            st.error(f"Missing columns: {validation['missing_cols']}")
    """
    if required_cols is None:
        required_cols = [
            'loan_number', 'loan_amount', 'date_of_disbursement',
            'customer_name', 'customer_type'
        ]
    
    missing_cols = [col for col in required_cols if col not in df.columns]
    
    null_counts = {}
    for col in df.columns:
        null_count = df[col].isna().sum()
        if null_count > 0:
            null_counts[col] = null_count
    
    warnings = []
    
    # Check for negative amounts
    if 'loan_amount' in df.columns:
        negative_loans = (df['loan_amount'] < 0).sum()
        if negative_loans > 0:
            warnings.append(f"{negative_loans} loans with negative amounts")
    
    # Check for future dates
    if 'date_of_disbursement' in df.columns:
        future_dates = (pd.to_datetime(df['date_of_disbursement']) > datetime.now()).sum()
        if future_dates > 0:
            warnings.append(f"{future_dates} loans with future disbursement dates")
    
    return {
        'valid': len(missing_cols) == 0,
        'missing_cols': missing_cols,
        'null_counts': null_counts,
        'warnings': warnings
    }


def check_missing_values(df, columns=None):
    """
    Generate a missing value report for specified columns.
    
    Args:
        df (pd.DataFrame): DataFrame to check
        columns (list): Columns to check (None = all columns)
    
    Returns:
        pd.DataFrame: Report with counts and percentages
    
    Example:
        missing_report = check_missing_values(loan_df)
        st.dataframe(missing_report)
    """
    if columns is None:
        columns = df.columns
    
    report = pd.DataFrame({
        'Column': columns,
        'Missing Count': [df[col].isna().sum() for col in columns],
        'Total Count': [len(df) for _ in columns]
    })
    
    report['Missing %'] = (report['Missing Count'] / report['Total Count'] * 100).round(2)
    report = report[report['Missing Count'] > 0].sort_values('Missing Count', ascending=False)
    
    return report


def identify_outliers(df, column, method='iqr', threshold=1.5):
    """
    Identify outliers in a numeric column using IQR method.
    
    Args:
        df (pd.DataFrame): DataFrame to analyze
        column (str): Column name to check for outliers
        method (str): 'iqr' or 'zscore'
        threshold (float): IQR multiplier (default 1.5) or z-score threshold
    
    Returns:
        pd.DataFrame: DataFrame containing only outlier rows
    
    Example:
        outliers = identify_outliers(loan_df, 'loan_amount')
        st.write(f"Found {len(outliers)} outliers")
    """
    if method == 'iqr':
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR
        return df[(df[column] < lower_bound) | (df[column] > upper_bound)]
    
    elif method == 'zscore':
        if not SCIPY_AVAILABLE:
            raise ImportError("scipy is required for zscore method. Install with: pip install scipy")
        z_scores = np.abs(stats.zscore(df[column].dropna()))
        return df[z_scores > threshold]
    
    else:
        raise ValueError("Method must be 'iqr' or 'zscore'")


# ============================================================================
# 9. PERFORMANCE TRACKING
# ============================================================================

def get_cache_status():
    """
    Get current cache status from session state.
    
    Returns:
        dict: {
            'loan_data_cached': bool,
            'loan_data_loaded_at': datetime or None,
            'expense_data_cached': bool,
            'expense_data_loaded_at': datetime or None
        }
    
    Example:
        status = get_cache_status()
        if status['loan_data_cached']:
            st.success(f"Data cached at {status['loan_data_loaded_at']}")
    """
    return {
        'loan_data_cached': 'loan_data_loaded' in st.session_state,
        'loan_data_loaded_at': st.session_state.get('loan_data_loaded_at'),
        'expense_data_cached': 'expense_data_loaded' in st.session_state,
        'expense_data_loaded_at': st.session_state.get('expense_data_loaded_at')
    }


# ============================================================================
# 10. HELPER FUNCTIONS
# ============================================================================

def format_currency(amount):
    """
    Format number as Indian currency (₹).
    
    Args:
        amount (float): Amount to format
    
    Returns:
        str: Formatted currency string
    
    Example:
        st.metric("Total", format_currency(1234567))  # ₹12,34,567
    """
    if pd.isna(amount):
        return "₹0"
    return f"₹{amount:,.0f}"


def format_percentage(value, decimals=2, include_sign=False):
    """
    Format number as percentage.
    
    Args:
        value (float): Value to format
        decimals (int): Number of decimal places
        include_sign (bool): Include + sign for positive values
    
    Returns:
        str: Formatted percentage string
    
    Example:
        st.metric("Yield", format_percentage(14.36))  # 14.36%
    """
    if pd.isna(value):
        return "0%"
    
    sign = '+' if include_sign and value > 0 else ''
    return f"{sign}{value:.{decimals}f}%"


def safe_divide(numerator, denominator, default=0.0):
    """
    Safely divide two numbers, returning default if division by zero.
    
    Args:
        numerator (float): Numerator
        denominator (float): Denominator
        default (float): Value to return if denominator is zero
    
    Returns:
        float: Division result or default
    
    Example:
        yield_pct = safe_divide(total_interest, total_capital, 0.0) * 100
    """
    if denominator == 0 or pd.isna(denominator):
        return default
    return numerator / denominator


# ============================================================================
# END OF UTILS.PY
# ============================================================================
