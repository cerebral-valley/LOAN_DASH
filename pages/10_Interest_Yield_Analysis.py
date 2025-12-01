"""
Interest Yield Analysis Page
Comprehensive yield analysis across different dimensions
"""

import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
from datetime import datetime
from dateutil.relativedelta import relativedelta
import db

# Page configuration
st.set_page_config(
    page_title="Interest Yield Analysis",
    page_icon="📈",
    layout="wide"
)

st.title("📈 Interest Yield Analysis")
st.markdown("---")

# Sidebar information
with st.sidebar:
    st.info("""
    **📊 About This Page**
    
    Comprehensive analysis of interest yields across:
    - Portfolio-level metrics
    - Holding period segments
    - Loan amount ranges
    - Time-based trends
    - Customer types
    
    **Key Metric:**
    Portfolio Yield = (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
    """)


# Data loading function with session state caching
@st.cache_data(ttl=3600, show_spinner=False)
def load_loan_data():
    """Load and prepare loan data for yield analysis"""
    return db.get_all_loans()


def prepare_yield_data(df):
    """
    Prepare yield analysis dataset from raw loan data
    Returns only released loans with calculated yield metrics
    """
    # Filter for released loans only
    released = df[df['date_of_release'].notna()].copy()
    
    if released.empty:
        return None
    
    # Ensure datetime types
    released['date_of_disbursement'] = pd.to_datetime(released['date_of_disbursement'])
    released['date_of_release'] = pd.to_datetime(released['date_of_release'])
    
    # Calculate days to release
    released['days_to_release'] = (released['date_of_release'] - released['date_of_disbursement']).dt.days
    
    # Remove invalid data
    released = released[(released['days_to_release'] > 0) & (released['loan_amount'] > 0)]
    
    if released.empty:
        return None
    
    # Calculate realized interest using CORRECT formula
    # Primary: Use interest_deposited_till_date (actual PAID interest)
    # Fallback: For released loans with 0/NULL deposited, use interest_amount (charged)
    # This reflects cash-basis performance with legacy data handling
    from db import calculate_realized_interest
    released['realized_interest'] = calculate_realized_interest(released)
    
    # Calculate individual annualized yield (for reference, not for averaging)
    released['interest_yield'] = (released['realized_interest'] / released['loan_amount']) * (365 / released['days_to_release']) * 100
    
    # Add time dimensions
    released['release_year'] = released['date_of_release'].dt.year
    released['release_month'] = released['date_of_release'].dt.to_period('M')
    released['release_month_str'] = released['date_of_release'].dt.strftime('%b %Y')
    
    return released


# Load data
with st.spinner("Loading loan data..."):
    raw_df = load_loan_data()
    yield_df = prepare_yield_data(raw_df)

if yield_df is None or yield_df.empty:
    st.error("⚠️ No released loans found in the database. Cannot perform yield analysis.")
    st.stop()

# Display data quality metrics
st.sidebar.markdown("---")
st.sidebar.markdown("**📋 Data Summary**")
st.sidebar.metric("Total Released Loans", f"{len(yield_df):,}")
st.sidebar.metric("Date Range", f"{yield_df['date_of_release'].min().strftime('%b %Y')} - {yield_df['date_of_release'].max().strftime('%b %Y')}")
st.sidebar.metric("Total Interest Realized", f"₹{yield_df['realized_interest'].sum()/1_000_000:.1f}M")
st.sidebar.metric("Total Capital Deployed", f"₹{yield_df['loan_amount'].sum()/1_000_000:.1f}M")

st.markdown("---")

# SECTION 1: OVERALL PORTFOLIO METRICS
st.markdown("## 📊 Overall Portfolio Performance")
st.caption("*Comprehensive yield metrics for all released loans*")

# Calculate portfolio-level metrics
total_interest = yield_df['realized_interest'].sum()
total_capital = yield_df['loan_amount'].sum()
weighted_avg_days = (yield_df['loan_amount'] * yield_df['days_to_release']).sum() / total_capital

# Portfolio annualized yield (PRIMARY METRIC)
portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100

# Simple return (not annualized)
simple_return = (total_interest / total_capital) * 100

# Display metrics
col1, col2, col3, col4, col5 = st.columns(5)

with col1:
    st.metric(
        "Portfolio Yield",
        f"{portfolio_yield:.2f}%",
        help="Annualized portfolio-level yield: (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100"
    )
    st.caption("📊 Primary Metric")

with col2:
    st.metric(
        "Simple Return",
        f"{simple_return:.2f}%",
        help="Actual return earned (not annualized): (Total Interest / Total Capital) × 100"
    )
    st.caption("💰 Actual Return")

with col3:
    st.metric(
        "Total Interest",
        f"₹{total_interest/1_000_000:.2f}M",
        help="Sum of all realized interest from released loans"
    )
    st.caption("💵 Interest Earned")

with col4:
    st.metric(
        "Total Capital",
        f"₹{total_capital/1_000_000:.2f}M",
        help="Sum of all loan amounts for released loans"
    )
    st.caption("💼 Capital Deployed")

with col5:
    st.metric(
        "Avg Holding",
        f"{weighted_avg_days:.0f} days",
        help="Capital-weighted average holding period across all loans"
    )
    st.caption("⏱️ Weighted Avg")

st.markdown("---")

# SECTION 2: HOLDING PERIOD SEGMENTATION
st.markdown("## ⏱️ Yield by Holding Period")
st.caption("*Comparison of short-term (<30 days) vs long-term (30+ days) loan performance*")

# Segment the data
short_term = yield_df[yield_df['days_to_release'] < 30].copy()
long_term = yield_df[yield_df['days_to_release'] >= 30].copy()

col1, col2 = st.columns(2)

with col1:
    st.markdown("### 🏃 Short-term Loans (<30 days)")
    
    if not short_term.empty:
        st_capital = short_term['loan_amount'].sum()
        st_interest = short_term['realized_interest'].sum()
        st_avg_days = (short_term['loan_amount'] * short_term['days_to_release']).sum() / st_capital
        st_yield = (st_interest / st_capital) * (365 / st_avg_days) * 100
        st_pct = (st_capital / total_capital) * 100
        st_simple_return = (st_interest / st_capital) * 100
        
        st.metric("Annualized Yield", f"{st_yield:.2f}%")
        st.write(f"**Capital Deployed:** ₹{st_capital/1_000_000:.2f}M ({st_pct:.1f}% of portfolio)")
        st.write(f"**Loan Count:** {len(short_term):,}")
        st.write(f"**Avg Holding:** {st_avg_days:.1f} days")
        st.write(f"**Simple Return:** {st_simple_return:.2f}%")
        st.write(f"**Total Interest:** ₹{st_interest/1_000_000:.2f}M")
    else:
        st.info("No short-term loans found")

with col2:
    st.markdown("### 🐢 Long-term Loans (30+ days)")
    
    if not long_term.empty:
        lt_capital = long_term['loan_amount'].sum()
        lt_interest = long_term['realized_interest'].sum()
        lt_avg_days = (long_term['loan_amount'] * long_term['days_to_release']).sum() / lt_capital
        lt_yield = (lt_interest / lt_capital) * (365 / lt_avg_days) * 100
        lt_pct = (lt_capital / total_capital) * 100
        lt_simple_return = (lt_interest / lt_capital) * 100
        
        st.metric("Annualized Yield", f"{lt_yield:.2f}%")
        st.write(f"**Capital Deployed:** ₹{lt_capital/1_000_000:.2f}M ({lt_pct:.1f}% of portfolio)")
        st.write(f"**Loan Count:** {len(long_term):,}")
        st.write(f"**Avg Holding:** {lt_avg_days:.0f} days")
        st.write(f"**Simple Return:** {lt_simple_return:.2f}%")
        st.write(f"**Total Interest:** ₹{lt_interest/1_000_000:.2f}M")
    else:
        st.info("No long-term loans found")

st.markdown("---")

st.markdown("**ℹ️ Understanding the Numbers**")
st.info(f"""
The portfolio yield ({portfolio_yield:.2f}%) is calculated from the TOTAL interest and capital across both segments.

**Why not a simple weighted average?**
- Short-term capital: ₹{st_capital/1_000_000:.2f}M at {st_avg_days:.1f} days
- Long-term capital: ₹{lt_capital/1_000_000:.2f}M at {lt_avg_days:.0f} days
- **Overall weighted avg holding:** {weighted_avg_days:.1f} days

The correct calculation uses this combined weighted average holding period, not a mix of the segment yields.
This is why (({st_yield:.2f}% × {st_pct:.1f}%) + ({lt_yield:.2f}% × {lt_pct:.1f}%)) ≠ {portfolio_yield:.2f}%
""")

st.markdown("---")

# SECTION 3: LOAN AMOUNT RANGE ANALYSIS (TABLE)
st.markdown("## 💰 Yield by Loan Amount Range")
st.caption("*Portfolio yield analysis across different loan size segments*")

# Define loan amount buckets
amount_bins = [0, 50000, 100000, 150000, 200000, float('inf')]
amount_labels = ['<₹50K', '₹50K-100K', '₹100K-150K', '₹150K-200K', '₹200K+']

# Categorize loans into buckets
yield_df['amount_range'] = pd.cut(
    yield_df['loan_amount'], 
    bins=amount_bins, 
    labels=amount_labels,
    include_lowest=True
)

# Calculate portfolio-level metrics for each bucket
amount_range_analysis = []

for bucket in amount_labels:
    bucket_data = yield_df[yield_df['amount_range'] == bucket].copy()
    
    if not bucket_data.empty:
        bucket_capital = bucket_data['loan_amount'].sum()
        bucket_interest = bucket_data['realized_interest'].sum()
        bucket_avg_days = (bucket_data['loan_amount'] * bucket_data['days_to_release']).sum() / bucket_capital
        bucket_yield = (bucket_interest / bucket_capital) * (365 / bucket_avg_days) * 100
        bucket_simple_return = (bucket_interest / bucket_capital) * 100
        bucket_pct = (bucket_capital / total_capital) * 100
        
        amount_range_analysis.append({
            'Loan Amount Range': bucket,
            'Portfolio Yield (%)': bucket_yield,
            'Simple Return (%)': bucket_simple_return,
            'Capital Deployed (₹M)': bucket_capital / 1_000_000,
            '% of Portfolio': bucket_pct,
            'Loan Count': len(bucket_data),
            'Avg Holding (days)': bucket_avg_days,
            'Total Interest (₹M)': bucket_interest / 1_000_000
        })

# Create DataFrame
amount_range_df = pd.DataFrame(amount_range_analysis)

# Display the table
st.dataframe(
    amount_range_df.style.format({
        'Portfolio Yield (%)': '{:.2f}',
        'Simple Return (%)': '{:.2f}',
        'Capital Deployed (₹M)': '{:.2f}',
        '% of Portfolio': '{:.1f}',
        'Loan Count': '{:,.0f}',
        'Avg Holding (days)': '{:.0f}',
        'Total Interest (₹M)': '{:.2f}'
    }),
    use_container_width=True,
    hide_index=True
)

# Visualization: Bar chart of yield by amount range
fig = go.Figure()

fig.add_trace(go.Bar(
    x=amount_range_df['Loan Amount Range'],
    y=amount_range_df['Portfolio Yield (%)'],
    name='Portfolio Yield',
    marker_color='#3b82f6',
    text=amount_range_df['Portfolio Yield (%)'].round(2),
    texttemplate='%{text:.2f}%',
    textposition='outside',
    hovertemplate='<b>%{x}</b><br>Yield: %{y:.2f}%<br>Capital: ₹' + (amount_range_df['Capital Deployed (₹M)']).round(2).astype(str) + 'M<extra></extra>'
))

fig.update_layout(
    title="Portfolio Yield by Loan Amount Range",
    xaxis_title="Loan Amount Range",
    yaxis_title="Portfolio Yield (%)",
    template='plotly_white',
    height=400,
    showlegend=False
)

st.plotly_chart(fig, use_container_width=True)

# Key insights
st.markdown("**📌 Key Insights:**")
col_insights1, col_insights2, col_insights3 = st.columns(3)

with col_insights1:
    highest_yield_range = amount_range_df.loc[amount_range_df['Portfolio Yield (%)'].idxmax()]
    st.metric(
        "Highest Yield Range",
        str(highest_yield_range['Loan Amount Range']),
        f"{highest_yield_range['Portfolio Yield (%)']:.2f}%"
    )

with col_insights2:
    largest_capital_range = amount_range_df.loc[amount_range_df['Capital Deployed (₹M)'].idxmax()]
    st.metric(
        "Largest Capital Range",
        str(largest_capital_range['Loan Amount Range']),
        f"₹{largest_capital_range['Capital Deployed (₹M)']:.2f}M"
    )

with col_insights3:
    most_loans_range = amount_range_df.loc[amount_range_df['Loan Count'].idxmax()]
    st.metric(
        "Most Loans Range",
        str(most_loans_range['Loan Amount Range']),
        f"{most_loans_range['Loan Count']:,.0f} loans"
    )

st.markdown("---")

# SECTION 4: YEARLY INTEREST YIELD TRENDS
st.markdown("## 📅 Yearly Interest Yield Trends")
st.caption("*Portfolio yield analysis by release year*")

# Calculate portfolio-level yield for each year
yearly_data = []
for year in sorted(yield_df['release_year'].unique()):
    year_loans = yield_df[yield_df['release_year'] == year].copy()
    
    year_capital = year_loans['loan_amount'].sum()
    year_interest = year_loans['realized_interest'].sum()
    year_avg_days = (year_loans['loan_amount'] * year_loans['days_to_release']).sum() / year_capital
    year_yield = (year_interest / year_capital) * (365 / year_avg_days) * 100
    year_simple_return = (year_interest / year_capital) * 100
    
    yearly_data.append({
        'Year': int(year),
        'Portfolio Yield (%)': year_yield,
        'Simple Return (%)': year_simple_return,
        'Total Interest (₹M)': year_interest / 1_000_000,
        'Total Capital (₹M)': year_capital / 1_000_000,
        'Loan Count': len(year_loans),
        'Avg Holding (days)': year_avg_days
    })

yearly_df = pd.DataFrame(yearly_data)

# Calculate YoY change
yearly_df['YoY Change (%)'] = yearly_df['Portfolio Yield (%)'].pct_change() * 100

# Visualizations
col_chart1, col_chart2 = st.columns(2)

with col_chart1:
    # Portfolio yield by year
    fig1 = go.Figure()
    
    fig1.add_trace(go.Bar(
        x=yearly_df['Year'],
        y=yearly_df['Portfolio Yield (%)'],
        marker_color='#3b82f6',
        text=yearly_df['Portfolio Yield (%)'].round(2),
        texttemplate='%{text:.2f}%',
        textposition='outside',
        hovertemplate='<b>%{x}</b><br>Yield: %{y:.2f}%<extra></extra>'
    ))
    
    fig1.update_layout(
        title="Portfolio Yield by Year",
        xaxis_title="Year",
        yaxis_title="Portfolio Yield (%)",
        template='plotly_white',
        height=400,
        showlegend=False
    )
    
    st.plotly_chart(fig1, use_container_width=True)

with col_chart2:
    # YoY change
    fig2 = go.Figure()
    
    colors = ['#10b981' if x >= 0 else '#ef4444' for x in yearly_df['YoY Change (%)'].fillna(0)]
    
    fig2.add_trace(go.Bar(
        x=yearly_df['Year'],
        y=yearly_df['YoY Change (%)'],
        marker_color=colors,
        text=yearly_df['YoY Change (%)'].round(2),
        texttemplate='%{text:+.2f}%',
        textposition='outside',
        hovertemplate='<b>%{x}</b><br>Change: %{y:+.2f}%<extra></extra>'
    ))
    
    fig2.add_hline(y=0, line_dash="dash", line_color="gray")
    
    fig2.update_layout(
        title="Year-over-Year Yield Change",
        xaxis_title="Year",
        yaxis_title="YoY Change (%)",
        template='plotly_white',
        height=400,
        showlegend=False
    )
    
    st.plotly_chart(fig2, use_container_width=True)

# Yearly summary table
st.markdown("### Yearly Summary Table")
st.dataframe(
    yearly_df.style.format({
        'Year': '{:.0f}',
        'Portfolio Yield (%)': '{:.2f}',
        'Simple Return (%)': '{:.2f}',
        'Total Interest (₹M)': '{:.2f}',
        'Total Capital (₹M)': '{:.2f}',
        'Loan Count': '{:,.0f}',
        'Avg Holding (days)': '{:.0f}',
        'YoY Change (%)': '{:+.2f}'
    }, na_rep='-'),
    use_container_width=True,
    hide_index=True
)

st.markdown("---")

# SECTION 5: MONTHLY INTEREST YIELD TRENDS
st.markdown("## 📆 Monthly Interest Yield Trends")
st.caption("*Last 12 months portfolio yield analysis*")

# Get last 12 months
end_month = datetime.now()
start_month = end_month - relativedelta(months=11)

monthly_loans = yield_df[
    (yield_df['date_of_release'] >= start_month) &
    (yield_df['date_of_release'] <= end_month)
].copy()

if not monthly_loans.empty:
    # Calculate portfolio-level yield for each month
    monthly_data = []
    for month in sorted(monthly_loans['release_month'].unique()):
        month_loans = monthly_loans[monthly_loans['release_month'] == month].copy()
        
        month_capital = month_loans['loan_amount'].sum()
        month_interest = month_loans['realized_interest'].sum()
        month_avg_days = (month_loans['loan_amount'] * month_loans['days_to_release']).sum() / month_capital
        month_yield = (month_interest / month_capital) * (365 / month_avg_days) * 100
        
        monthly_data.append({
            'Month': month,
            'Month Label': str(month),
            'Portfolio Yield (%)': month_yield,
            'Total Interest (₹M)': month_interest / 1_000_000,
            'Total Capital (₹M)': month_capital / 1_000_000,
            'Loan Count': len(month_loans)
        })
    
    monthly_df = pd.DataFrame(monthly_data)
    
    # Calculate MoM change
    monthly_df['MoM Change (%)'] = monthly_df['Portfolio Yield (%)'].pct_change() * 100
    
    # Rolling averages
    last_3m_data = monthly_df.tail(3)
    last_6m_data = monthly_df.tail(6)
    last_12m_data = monthly_df
    
    avg_3m = (last_3m_data['Total Interest (₹M)'].sum() / last_3m_data['Total Capital (₹M)'].sum()) * (365 / ((last_3m_data['Total Capital (₹M)'] * monthly_df.tail(3)['Portfolio Yield (%)'] * monthly_df.tail(3)['Loan Count']).sum() / (last_3m_data['Total Capital (₹M)'] * monthly_df.tail(3)['Loan Count']).sum())) * 100
    avg_6m = (last_6m_data['Total Interest (₹M)'].sum() / last_6m_data['Total Capital (₹M)'].sum()) * (365 / ((last_6m_data['Total Capital (₹M)'] * monthly_df.tail(6)['Portfolio Yield (%)'] * monthly_df.tail(6)['Loan Count']).sum() / (last_6m_data['Total Capital (₹M)'] * monthly_df.tail(6)['Loan Count']).sum())) * 100
    avg_12m = (last_12m_data['Total Interest (₹M)'].sum() / last_12m_data['Total Capital (₹M)'].sum()) * (365 / ((last_12m_data['Total Capital (₹M)'] * monthly_df['Portfolio Yield (%)'] * monthly_df['Loan Count']).sum() / (last_12m_data['Total Capital (₹M)'] * monthly_df['Loan Count']).sum())) * 100
    
    # Recalculate rolling averages properly
    # Get actual data for each period
    last_3m_loans = monthly_loans[monthly_loans['release_month'].isin(monthly_df.tail(3)['Month'])]
    last_6m_loans = monthly_loans[monthly_loans['release_month'].isin(monthly_df.tail(6)['Month'])]
    
    def calc_period_yield(period_loans):
        if period_loans.empty:
            return 0
        p_capital = period_loans['loan_amount'].sum()
        p_interest = period_loans['realized_interest'].sum()
        p_avg_days = (period_loans['loan_amount'] * period_loans['days_to_release']).sum() / p_capital
        return (p_interest / p_capital) * (365 / p_avg_days) * 100
    
    avg_3m = calc_period_yield(last_3m_loans)
    avg_6m = calc_period_yield(last_6m_loans)
    avg_12m = calc_period_yield(monthly_loans)
    
    # Metrics
    col_m1, col_m2, col_m3, col_m4 = st.columns(4)
    
    with col_m1:
        st.metric("Last 3 Months Avg", f"{avg_3m:.2f}%")
    
    with col_m2:
        st.metric("Last 6 Months Avg", f"{avg_6m:.2f}%")
    
    with col_m3:
        st.metric("Last 12 Months Avg", f"{avg_12m:.2f}%")
    
    with col_m4:
        if len(monthly_df) >= 2:
            last_month_yield = monthly_df.iloc[-1]['Portfolio Yield (%)']
            prev_month_yield = monthly_df.iloc[-2]['Portfolio Yield (%)']
            trend = "📈 Rising" if last_month_yield > prev_month_yield else "📉 Falling" if last_month_yield < prev_month_yield else "➡️ Stable"
            st.metric("Trend", trend)
    
    # Chart
    fig_monthly = make_subplots(specs=[[{"secondary_y": True}]])
    
    fig_monthly.add_trace(
        go.Bar(
            x=monthly_df['Month Label'],
            y=monthly_df['Portfolio Yield (%)'],
            name='Portfolio Yield',
            marker_color='#8b5cf6',
            opacity=0.7,
            hovertemplate='%{y:.2f}%<extra></extra>'
        ),
        secondary_y=False
    )
    
    fig_monthly.add_trace(
        go.Scatter(
            x=monthly_df['Month Label'],
            y=monthly_df['MoM Change (%)'],
            name='MoM Change',
            line=dict(color='#ef4444', width=3),
            mode='lines+markers',
            marker=dict(size=8),
            hovertemplate='%{y:+.1f}%<extra></extra>'
        ),
        secondary_y=True
    )
    
    fig_monthly.update_xaxes(title_text="Month", tickangle=-45)
    fig_monthly.update_yaxes(title_text="Portfolio Yield (%)", secondary_y=False)
    fig_monthly.update_yaxes(title_text="MoM Change (%)", secondary_y=True)
    
    fig_monthly.update_layout(
        title="Monthly Portfolio Yield (Last 12 Months)",
        template='plotly_white',
        height=500,
        hovermode='x unified'
    )
    
    st.plotly_chart(fig_monthly, use_container_width=True)
    
    # Monthly details table
    st.markdown("### Monthly Details")
    monthly_display = monthly_df[['Month Label', 'Portfolio Yield (%)', 'Total Interest (₹M)', 'Total Capital (₹M)', 'Loan Count', 'MoM Change (%)']].copy()
    
    st.dataframe(
        monthly_display.style.format({
            'Portfolio Yield (%)': '{:.2f}',
            'Total Interest (₹M)': '{:.2f}',
            'Total Capital (₹M)': '{:.2f}',
            'Loan Count': '{:,.0f}',
            'MoM Change (%)': '{:+.2f}'
        }, na_rep='-'),
        use_container_width=True,
        hide_index=True
    )
else:
    st.info("No data available for the last 12 months")

st.markdown("---")

# SECTION 6: YIELD BY CUSTOMER TYPE
st.markdown("## 👥 Yield by Customer Type")
st.caption("*Portfolio yield comparison: Vyapari vs Private customers*")

if 'customer_type' in yield_df.columns:
    customer_types = yield_df['customer_type'].unique()
    
    customer_analysis = []
    
    for ctype in customer_types:
        ctype_loans = yield_df[yield_df['customer_type'] == ctype].copy()
        
        if not ctype_loans.empty:
            ctype_capital = ctype_loans['loan_amount'].sum()
            ctype_interest = ctype_loans['realized_interest'].sum()
            ctype_avg_days = (ctype_loans['loan_amount'] * ctype_loans['days_to_release']).sum() / ctype_capital
            ctype_yield = (ctype_interest / ctype_capital) * (365 / ctype_avg_days) * 100
            ctype_simple_return = (ctype_interest / ctype_capital) * 100
            ctype_pct = (ctype_capital / total_capital) * 100
            
            customer_analysis.append({
                'Customer Type': ctype,
                'Portfolio Yield (%)': ctype_yield,
                'Simple Return (%)': ctype_simple_return,
                'Capital Deployed (₹M)': ctype_capital / 1_000_000,
                '% of Portfolio': ctype_pct,
                'Loan Count': len(ctype_loans),
                'Avg Holding (days)': ctype_avg_days,
                'Total Interest (₹M)': ctype_interest / 1_000_000
            })
    
    customer_df = pd.DataFrame(customer_analysis)
    
    # Display comparison
    col_ct1, col_ct2 = st.columns(2)
    
    for idx, row in customer_df.iterrows():
        with col_ct1 if idx == 0 else col_ct2:
            st.markdown(f"### {row['Customer Type']}")
            st.metric("Portfolio Yield", f"{row['Portfolio Yield (%)']:.2f}%")
            st.write(f"**Capital Deployed:** ₹{row['Capital Deployed (₹M)']:.2f}M ({row['% of Portfolio']:.1f}%)")
            st.write(f"**Loan Count:** {row['Loan Count']:,.0f}")
            st.write(f"**Avg Holding:** {row['Avg Holding (days)']:.0f} days")
            st.write(f"**Simple Return:** {row['Simple Return (%)']:.2f}%")
            st.write(f"**Total Interest:** ₹{row['Total Interest (₹M)']:.2f}M")
    
    # Comparison table
    st.markdown("### Customer Type Comparison Table")
    st.dataframe(
        customer_df.style.format({
            'Portfolio Yield (%)': '{:.2f}',
            'Simple Return (%)': '{:.2f}',
            'Capital Deployed (₹M)': '{:.2f}',
            '% of Portfolio': '{:.1f}',
            'Loan Count': '{:,.0f}',
            'Avg Holding (days)': '{:.0f}',
            'Total Interest (₹M)': '{:.2f}'
        }),
        use_container_width=True,
        hide_index=True
    )
    
    # Pie chart showing capital distribution
    fig_pie = go.Figure(data=[go.Pie(
        labels=customer_df['Customer Type'],
        values=customer_df['Capital Deployed (₹M)'],
        hole=0.4,
        marker=dict(colors=['#3b82f6', '#8b5cf6']),
        textinfo='label+percent',
        hovertemplate='<b>%{label}</b><br>Capital: ₹%{value:.2f}M<br>%{percent}<extra></extra>'
    )])
    
    fig_pie.update_layout(
        title="Capital Distribution by Customer Type",
        template='plotly_white',
        height=400
    )
    
    st.plotly_chart(fig_pie, use_container_width=True)
else:
    st.warning("Customer type data not available")

st.markdown("---")

# SECTION 7: DATA QUALITY & VALIDATION
st.markdown("## 🔍 Data Quality & Validation")

with st.expander("📋 View Data Quality Checks"):
    st.markdown("### Data Completeness")
    
    col_dq1, col_dq2, col_dq3 = st.columns(3)
    
    with col_dq1:
        total_loans = len(yield_df)
        missing_interest = len(yield_df[yield_df['realized_interest'] == 0])
        st.metric("Total Released Loans", f"{total_loans:,}")
        st.metric("Loans with Zero Interest", f"{missing_interest:,}", 
                 delta=f"{(missing_interest/total_loans*100):.1f}%" if missing_interest > 0 else "0%",
                 delta_color="inverse")
    
    with col_dq2:
        avg_days_overall = (yield_df['loan_amount'] * yield_df['days_to_release']).sum() / yield_df['loan_amount'].sum()
        min_days = yield_df['days_to_release'].min()
        max_days = yield_df['days_to_release'].max()
        
        st.metric("Avg Holding Period", f"{avg_days_overall:.0f} days")
        st.metric("Min Holding Period", f"{min_days:.0f} days")
        st.metric("Max Holding Period", f"{max_days:.0f} days")
    
    with col_dq3:
        avg_loan_size = yield_df['loan_amount'].mean()
        min_loan = yield_df['loan_amount'].min()
        max_loan = yield_df['loan_amount'].max()
        
        st.metric("Avg Loan Size", f"₹{avg_loan_size/1000:.1f}K")
        st.metric("Min Loan", f"₹{min_loan/1000:.1f}K")
        st.metric("Max Loan", f"₹{max_loan/1000:.1f}K")
    
    # Sample calculation breakdown
    st.markdown("### Sample Calculation (Most Recent Loan)")
    recent_loan = yield_df.sort_values('date_of_release', ascending=False).iloc[0]
    
    st.code(f"""
Sample Loan Calculation:
------------------------
Loan Amount: ₹{recent_loan['loan_amount']:,.2f}
Realized Interest: ₹{recent_loan['realized_interest']:,.2f}
Days to Release: {recent_loan['days_to_release']:.0f} days

Portfolio Yield Formula:
(Interest / Capital) × (365 / Days) × 100
= ({recent_loan['realized_interest']:,.2f} / {recent_loan['loan_amount']:,.2f}) × (365 / {recent_loan['days_to_release']:.0f}) × 100
= {(recent_loan['realized_interest'] / recent_loan['loan_amount']):.4f} × {(365 / recent_loan['days_to_release']):.4f} × 100
= {recent_loan['interest_yield']:.2f}%

Release Date: {recent_loan['date_of_release'].strftime('%Y-%m-%d')}
Customer Type: {recent_loan.get('customer_type', 'N/A')}
    """)

st.markdown("---")

# Footer
st.caption("Interest Yield Analysis • City Central Loan Dashboard")
