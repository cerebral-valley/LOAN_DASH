# make parent folder importable
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import data_cache
import utils  # Import centralized utility functions
import pandas as pd
import numpy as np
import calendar
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from db import calculate_correct_ltv

st.set_page_config(page_title="Executive Dashboard", layout="wide", initial_sidebar_state="expanded")

# Custom CSS for better aesthetics
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 20px;
        border-radius: 10px;
        color: white;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .insight-card {
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
        border-left: 4px solid;
        color: #1f2937;
    }
    .alert-red { border-color: #ef4444; background-color: #fee2e2; color: #7f1d1d; }
    .alert-yellow { border-color: #f59e0b; background-color: #fef3c7; color: #78350f; }
    .alert-green { border-color: #10b981; background-color: #d1fae5; color: #065f46; }
    .alert-blue { border-color: #3b82f6; background-color: #dbeafe; color: #1e3a8a; }
    .health-score {
        font-size: 48px;
        font-weight: bold;
        text-align: center;
    }
    .stMetric {
        background-color: rgba(248, 250, 252, 0.05);
        padding: 15px;
        border-radius: 8px;
        border: 1px solid rgba(226, 232, 240, 0.2);
    }
    /* Dark mode text visibility fixes */
    [data-testid="stMetricValue"] {
        color: inherit;
    }
    [data-testid="stMetricDelta"] {
        color: inherit;
    }
</style>
""", unsafe_allow_html=True)

st.title("📊 Executive Dashboard")
st.markdown("*Real-time portfolio insights and performance metrics*")

# ---- SIDEBAR: Filters and Controls ----
with st.sidebar:
    st.markdown("### 🎯 Dashboard Controls")
    
    # Time Period Selector
    st.markdown("#### 📅 Time Period")
    period_type = st.selectbox(
        "Select Period",
        ["MTD (Month to Date)", "QTD (Quarter to Date)", "YTD (Year to Date)", "Last 30 Days", "Last 90 Days", "All Time", "Custom Range"],
        index=0
    )
    
    # Custom date range
    if period_type == "Custom Range":
        col1, col2 = st.columns(2)
        with col1:
            start_date = st.date_input("From", datetime.now() - timedelta(days=30))
        with col2:
            end_date = st.date_input("To", datetime.now())
    
    # Comparison toggle
    compare_previous = st.checkbox("📈 Compare with previous period", value=True)
    
    st.markdown("---")
    st.markdown("#### 🔍 Quick Filters")
    
    # Customer type filter
    customer_type_filter = st.multiselect(
        "Customer Type",
        ["Private", "Vyapari"],
        default=["Private", "Vyapari"]
    )
    
    # Loan status filter
    loan_status_filter = st.radio(
        "Loan Status",
        ["All Loans", "Active Only", "Released Only"],
        index=0
    )
    
    # Minimum amount filter
    min_amount = st.number_input(
        "Min Loan Amount (₹)",
        min_value=0,
        value=0,
        step=10000
    )
    
    st.markdown("---")
    # Cache status
    data_cache.show_cache_status_sidebar()

# ---- LOAD AND PROCESS DATA ----
try:
    loan_df = data_cache.load_loan_data_with_cache()
    
    if loan_df.empty:
        st.error("No data available")
        st.stop()
    
    # Data preprocessing
    num_cols = ["loan_amount", "pending_loan_amount", "interest_amount", "interest_rate", 
                "gross_wt", "net_wt", "gold_rate", "purity", "valuation", "ltv_given",
                "interest_deposited_till_date"]
    
    for col in num_cols:
        if col in loan_df.columns:
            loan_df[col] = pd.to_numeric(loan_df[col], errors="coerce").fillna(0)
    
    loan_df["date_of_disbursement"] = pd.to_datetime(loan_df["date_of_disbursement"], errors='coerce')
    loan_df["date_of_release"] = pd.to_datetime(loan_df["date_of_release"], errors='coerce')
    
    # Normalize customer data using utils
    loan_df = utils.normalize_customer_data(loan_df)
    
    # Calculate date ranges based on period selection
    today = datetime.now()
    
    if period_type == "MTD (Month to Date)":
        period_start = today.replace(day=1)
        period_end = today
        prev_period_start = (period_start - relativedelta(months=1))
        prev_period_end = period_start - timedelta(days=1)
        period_label = f"{today.strftime('%B %Y')}"
        prev_period_label = f"{prev_period_start.strftime('%B %Y')}"
        
    elif period_type == "QTD (Quarter to Date)":
        quarter = (today.month - 1) // 3
        period_start = datetime(today.year, quarter * 3 + 1, 1)
        period_end = today
        prev_period_start = period_start - relativedelta(months=3)
        prev_period_end = period_start - timedelta(days=1)
        period_label = f"Q{quarter + 1} {today.year}"
        prev_quarter = ((prev_period_start.month - 1) // 3) + 1
        prev_period_label = f"Q{prev_quarter} {prev_period_start.year}"
        
    elif period_type == "YTD (Year to Date)":
        period_start = datetime(today.year, 1, 1)
        period_end = today
        prev_period_start = datetime(today.year - 1, 1, 1)
        prev_period_end = datetime(today.year - 1, 12, 31)
        period_label = f"YTD {today.year}"
        prev_period_label = f"YTD {today.year - 1}"
        
    elif period_type == "Last 30 Days":
        period_end = today
        period_start = today - timedelta(days=30)
        prev_period_end = period_start - timedelta(days=1)
        prev_period_start = prev_period_end - timedelta(days=30)
        period_label = "Last 30 Days"
        prev_period_label = "Previous 30 Days"
        
    elif period_type == "Last 90 Days":
        period_end = today
        period_start = today - timedelta(days=90)
        prev_period_end = period_start - timedelta(days=1)
        prev_period_start = prev_period_end - timedelta(days=90)
        period_label = "Last 90 Days"
        prev_period_label = "Previous 90 Days"
        
    elif period_type == "Custom Range":
        period_start = datetime.combine(start_date, datetime.min.time())
        period_end = datetime.combine(end_date, datetime.max.time())
        days_diff = (period_end - period_start).days
        prev_period_end = period_start - timedelta(days=1)
        prev_period_start = prev_period_end - timedelta(days=days_diff)
        period_label = f"{start_date} to {end_date}"
        prev_period_label = f"Previous {days_diff} days"
        
    else:  # All Time
        period_start = loan_df['date_of_disbursement'].min()
        period_end = today
        prev_period_start = period_start
        prev_period_end = period_end
        period_label = "All Time"
        prev_period_label = "All Time"
    
    # Apply filters
    filtered_df = loan_df.copy()
    
    # Customer type filter
    if customer_type_filter:
        filtered_df = filtered_df[filtered_df['customer_type'].isin(customer_type_filter)]
    
    # Loan status filter
    if loan_status_filter == "Active Only":
        filtered_df = filtered_df[filtered_df['released'] == 'FALSE']
    elif loan_status_filter == "Released Only":
        filtered_df = filtered_df[filtered_df['released'] == 'TRUE']
    
    # Amount filter
    if min_amount > 0:
        filtered_df = filtered_df[filtered_df['loan_amount'] >= min_amount]
    
    # Period filter for current period
    current_period_df = filtered_df[
        (filtered_df['date_of_disbursement'] >= period_start) &
        (filtered_df['date_of_disbursement'] <= period_end)
    ]
    
    # Previous period data
    prev_period_df = filtered_df[
        (filtered_df['date_of_disbursement'] >= prev_period_start) &
        (filtered_df['date_of_disbursement'] <= prev_period_end)
    ]
    
    # Calculate current period metrics
    total_disbursed = current_period_df['loan_amount'].sum()
    total_outstanding = filtered_df[filtered_df['released'] == 'FALSE']['pending_loan_amount'].sum()
    total_interest = current_period_df['interest_amount'].sum()
    loan_count = len(current_period_df)
    active_loans = len(filtered_df[filtered_df['released'] == 'FALSE'])
    avg_loan_size = current_period_df['loan_amount'].mean() if loan_count > 0 else 0
    active_customers = filtered_df[filtered_df['released'] == 'FALSE']['customer_name'].nunique()
    
    # Calculate previous period metrics
    prev_disbursed = prev_period_df['loan_amount'].sum()
    prev_interest = prev_period_df['interest_amount'].sum()
    prev_loan_count = len(prev_period_df)
    
    # Calculate growth percentages
    disbursed_growth = ((total_disbursed - prev_disbursed) / prev_disbursed * 100) if prev_disbursed > 0 else 0
    interest_growth = ((total_interest - prev_interest) / prev_interest * 100) if prev_interest > 0 else 0
    loan_count_growth = ((loan_count - prev_loan_count) / prev_loan_count * 100) if prev_loan_count > 0 else 0
    
    # ========================================
    # EXECUTIVE SUMMARY SECTION
    # ========================================
    
    st.markdown("---")
    st.markdown(f"## 📋 Executive Summary - {period_label}")
    
    # Create 4-column layout for summary cards
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "💰 Total Disbursed",
            f"₹{total_disbursed/1_000_000:.2f}M",
            f"{disbursed_growth:+.1f}%" if compare_previous else None,
            delta_color="normal" if disbursed_growth >= 0 else "inverse"
        )
        st.caption(f"vs {prev_period_label}")
    
    with col2:
        st.metric(
            "📊 Active Loans",
            f"{active_loans:,}",
            f"{loan_count_growth:+.1f}%" if compare_previous else None,
            delta_color="normal" if loan_count_growth >= 0 else "inverse"
        )
        st.caption(f"{loan_count} new in period")
    
    with col3:
        # Interest Earned Calculation - Fixed Start Date: March 1, 2020
        # Always calculate from March 1, 2020 to current period end
        fixed_start_date = pd.Timestamp('2020-03-01')
        
        # Get all released loans from March 1, 2020 to period end
        released_in_period = filtered_df[
            (filtered_df['date_of_release'] >= fixed_start_date) &
            (filtered_df['date_of_release'] <= period_end) &
            (filtered_df['released'] == 'TRUE')
        ].copy()
        
        # For released loans: Use higher of interest_amount or interest_deposited_till_date
        if not released_in_period.empty:
            released_in_period['legacy_interest'] = released_in_period.apply(
                lambda row: max(row['interest_amount'], row['interest_deposited_till_date']),
                axis=1
            )
            interest_from_released = released_in_period['legacy_interest'].sum()
        else:
            interest_from_released = 0
        
        # For active loans (released = FALSE): Use interest_deposited_till_date
        active_with_interest = filtered_df[
            (filtered_df['released'] == 'FALSE') &
            (filtered_df['interest_deposited_till_date'] > 0)
        ].copy()
        
        interest_from_active = active_with_interest['interest_deposited_till_date'].sum()
        
        # Total interest = Released + Active deposits
        total_interest = interest_from_released + interest_from_active
        
        # Previous period calculation (same logic for comparison)
        prev_released = filtered_df[
            (filtered_df['date_of_release'] >= fixed_start_date) &
            (filtered_df['date_of_release'] <= prev_period_end) &
            (filtered_df['released'] == 'TRUE')
        ].copy()
        
        if not prev_released.empty:
            prev_released['legacy_interest'] = prev_released.apply(
                lambda row: max(row['interest_amount'], row['interest_deposited_till_date']),
                axis=1
            )
            prev_interest_from_released = prev_released['legacy_interest'].sum()
        else:
            prev_interest_from_released = 0
        
        prev_active_with_interest = filtered_df[
            (filtered_df['released'] == 'FALSE') &
            (filtered_df['interest_deposited_till_date'] > 0)
        ].copy()
        
        prev_interest_from_active = prev_active_with_interest['interest_deposited_till_date'].sum()
        prev_interest = prev_interest_from_released + prev_interest_from_active
        
        interest_growth = ((total_interest - prev_interest) / prev_interest * 100) if prev_interest > 0 else 0
        
        collection_rate = (total_interest / (total_disbursed * 0.12) * 100) if total_disbursed > 0 else 0
        st.metric(
            "💵 Interest Earned",
            f"₹{total_interest/1_000:.0f}K",
            f"{interest_growth:+.1f}%" if compare_previous else None,
            delta_color="normal" if interest_growth >= 0 else "inverse"
        )
        st.caption(f"Collection: {collection_rate:.1f}%")

    
    with col4:
        portfolio_value = total_outstanding
        st.metric(
            "🏦 Portfolio Value",
            f"₹{portfolio_value/1_000_000:.2f}M",
            f"{active_customers} active customers"
        )
        st.caption(f"Avg: ₹{avg_loan_size:,.0f}")
    
    # ========================================
    # PORTFOLIO HEALTH SCORE
    # ========================================
    
    st.markdown("---")
    st.markdown("## 🏥 Portfolio Health Dashboard")
    
    # Calculate health scores
    avg_ltv = filtered_df[filtered_df['released'] == 'FALSE']['ltv_given'].mean()
    ltv_health = min(100, max(0, 100 - abs(75 - avg_ltv) * 2))  # Optimal LTV around 75%
    
    # Adjusted Collection Efficiency: Include legacy released loans where deposit data is missing
    # Logic: Sum of interest_deposited_till_date + (interest_amount for released loans where deposited is 0)
    total_deposited = filtered_df['interest_deposited_till_date'].sum()
    legacy_released_mask = (filtered_df['released'] == 'TRUE') & (filtered_df['interest_deposited_till_date'] <= 0)
    legacy_recovered_interest = filtered_df.loc[legacy_released_mask, 'interest_amount'].sum()
    total_collected_adjusted = total_deposited + legacy_recovered_interest
    
    collection_efficiency = (total_collected_adjusted / 
                            (filtered_df['loan_amount'].sum() * 0.12) * 100) if filtered_df['loan_amount'].sum() > 0 else 0
    collection_health = min(100, collection_efficiency)
    
    # Diversification: lower concentration = better
    active_df = filtered_df[filtered_df['released'] == 'FALSE']
    if len(active_df) > 0:
        top_5_concentration = (active_df.nlargest(5, 'pending_loan_amount')['pending_loan_amount'].sum() / 
                              active_df['pending_loan_amount'].sum() * 100)
        diversification_health = max(0, 100 - top_5_concentration)
    else:
        diversification_health = 100
        top_5_concentration = 0
    
    # Interest Coverage: Interest received from released loans relative to total disbursed
    # Use total_interest already calculated above (from March 1, 2020)
    # Calculate total disbursed from March 1, 2020 to match the interest period
    fixed_start_date = pd.Timestamp('2020-03-01')
    total_disbursed_since_start = filtered_df[
        filtered_df['date_of_disbursement'] >= fixed_start_date
    ]['loan_amount'].sum()
    
    interest_coverage = (total_interest / total_disbursed_since_start * 100) if total_disbursed_since_start > 0 else 0
    interest_health = min(100, interest_coverage * 10)  # Scale to 0-100 (10% = 100 health)
    
    overall_health = (ltv_health + collection_health + diversification_health + interest_health) / 4
    
    # Display health gauges
    col1, col2, col3, col4, col5 = st.columns(5)
    
    def create_gauge(value, title, subtitle=""):
        """Create a gauge chart"""
        color = "#10b981" if value >= 80 else "#f59e0b" if value >= 60 else "#ef4444"
        
        fig = go.Figure(go.Indicator(
            mode="gauge+number",
            value=value,
            title={'text': title, 'font': {'size': 14}},
            number={'suffix': "", 'font': {'size': 24}},
            gauge={
                'axis': {'range': [0, 100], 'tickwidth': 1},
                'bar': {'color': color},
                'bgcolor': "white",
                'borderwidth': 2,
                'bordercolor': "gray",
                'steps': [
                    {'range': [0, 60], 'color': '#fee2e2'},
                    {'range': [60, 80], 'color': '#fef3c7'},
                    {'range': [80, 100], 'color': '#d1fae5'}
                ],
                'threshold': {
                    'line': {'color': "red", 'width': 4},
                    'thickness': 0.75,
                    'value': 90
                }
            }
        ))
        
        fig.update_layout(
            height=200,
            margin=dict(l=10, r=10, t=50, b=10),
            font={'size': 12}
        )
        
        return fig
    
    with col1:
        st.plotly_chart(create_gauge(overall_health, "Overall Health"), use_container_width=True)
        status = "EXCELLENT ✓" if overall_health >= 80 else "GOOD ⚠️" if overall_health >= 60 else "REVIEW NEEDED ⚠️"
        st.markdown(f"<p style='text-align: center; font-weight: bold;'>{status}</p>", unsafe_allow_html=True)
        with st.popover("ℹ️"):
            st.markdown("""
            **Overall Health Score**
            
            Combined health of your entire portfolio (average of all metrics).
            
            - **80-100**: Excellent across all metrics
            - **60-79**: Generally healthy, minor improvements needed
            - **<60**: Multiple issues - review individual metrics
            """)
    
    with col2:
        st.plotly_chart(create_gauge(ltv_health, "LTV Health"), use_container_width=True)
        st.markdown(f"<p style='text-align: center;'>Avg: {avg_ltv:.1f}%</p>", unsafe_allow_html=True)
        with st.popover("ℹ️"):
            st.markdown("""
            **LTV (Loan-to-Value) Health**
            
            Measures how conservative/aggressive your lending is.
            
            - **Optimal**: ~75% LTV
            - **Too high (>85%)**: Risky - exceeds safe collateral coverage
            - **Too low (<65%)**: Conservative - leaving money on table
            
            Score drops when you're far from 75%.
            """)
    
    with col3:
        st.plotly_chart(create_gauge(collection_health, "Collection"), use_container_width=True)
        st.markdown(f"<p style='text-align: center;'>{collection_efficiency:.1f}%</p>", unsafe_allow_html=True)
        with st.popover("ℹ️"):
            st.markdown("""
            **Collection Efficiency**
            
            How well you're collecting interest payments.
            
            - **90%+**: Excellent - customers paying on time
            - **70-89%**: Needs improvement - follow up on pending
            - **<70%**: Critical - significant collection issues
            
            Formula: ((Interest Deposited + Legacy Recovered) ÷ Expected Interest) × 100
            """)
    
    with col4:
        st.plotly_chart(create_gauge(diversification_health, "Diversification"), use_container_width=True)
        st.markdown(f"<p style='text-align: center;'>Top 5: {top_5_concentration:.1f}%</p>", unsafe_allow_html=True)
        with st.popover("ℹ️"):
            st.markdown("""
            **Diversification Score**
            
            How spread out your portfolio is across customers.
            
            Shows what % top 5 customers represent.
            
            - **Top 5 <20%**: Excellent diversification (score 80+)
            - **Top 5 30-50%**: Moderate concentration (score 50-70)
            - **Top 5 >50%**: High risk (score <50)
            
            **Note**: Score is HIGHER when concentration is LOWER
            """)
    
    with col5:
        st.plotly_chart(create_gauge(interest_health, "Interest Coverage"), use_container_width=True)
        st.markdown(f"<p style='text-align: center;'>{interest_coverage:.1f}%</p>", unsafe_allow_html=True)
        with st.popover("ℹ️"):
            st.markdown(f"""
            **Interest Coverage**
            
            Total interest earned since March 1, 2020 relative to total disbursed since that date.
            
            **Current**: {interest_coverage:.2f}% of disbursed amount
            
            **Calculation Method**:
            - **Released Loans**: max(interest_amount, interest_deposited_till_date)
            - **Active Loans**: interest_deposited_till_date
            - **Period**: March 1, 2020 to present
            
            **Score Interpretation**:
            - **10%+**: Excellent interest generation (score 100)
            - **8-10%**: Good income (score 80-100)
            - **5-8%**: Moderate (score 50-80)
            - **<5%**: Review pricing or collection (score <50)
            
            Formula: (Total Interest ÷ Total Disbursed since Mar 2020) × 100
            """)
    
    # ========================================
    # KEY INSIGHTS PANEL
    # ========================================
    
    st.markdown("---")
    st.markdown("## 💡 Key Insights & Alerts")
    
    insights = []
    
    # Generate smart insights
    if disbursed_growth > 15:
        insights.append(("🟢", "Good", f"Disbursement up {disbursed_growth:.1f}% - Strong growth momentum"))
    elif disbursed_growth < -10:
        insights.append(("🔴", "Alert", f"Disbursement down {abs(disbursed_growth):.1f}% - Review market conditions"))
    
    if collection_efficiency < 90:
        insights.append(("🔴", "Alert", f"Collection efficiency at {collection_efficiency:.1f}% - Below target (90%)"))
    elif collection_efficiency >= 95:
        insights.append(("🟢", "Good", f"Excellent collection efficiency: {collection_efficiency:.1f}%"))
    
    if top_5_concentration > 50:
        insights.append(("🟡", "Notice", f"Top 5 customers represent {top_5_concentration:.1f}% of portfolio - Consider diversification"))
    
    # Check for loans approaching maturity (if expiry date is available)
    if 'expiry' in filtered_df.columns:
        filtered_df['expiry'] = pd.to_datetime(filtered_df['expiry'], errors='coerce')
        upcoming_maturity = filtered_df[
            (filtered_df['released'] == 'FALSE') &
            (filtered_df['expiry'].notna()) &
            (filtered_df['expiry'] <= datetime.now() + timedelta(days=7))
        ]
        if len(upcoming_maturity) > 0:
            insights.append(("🟡", "Action", f"{len(upcoming_maturity)} loans maturing in next 7 days"))
    
    # Private vs Vyapari growth
    if 'Private' in customer_type_filter and 'Vyapari' in customer_type_filter:
        private_growth = len(current_period_df[current_period_df['customer_type'] == 'Private'])
        vyapari_growth = len(current_period_df[current_period_df['customer_type'] == 'Vyapari'])
        if private_growth > vyapari_growth * 1.5:
            insights.append(("🔵", "Trend", f"Private loans growing faster ({private_growth} vs {vyapari_growth} Vyapari)"))
        elif vyapari_growth > private_growth * 1.5:
            insights.append(("🔵", "Trend", f"Vyapari loans growing faster ({vyapari_growth} vs {private_growth} Private)"))
    
    # Average loan size trend
    if avg_loan_size > 200000:
        insights.append(("🔵", "Trend", f"Average loan size increased to ₹{avg_loan_size:,.0f}"))
    
    # Display insights
    if insights:
        cols = st.columns(2)
        for idx, (emoji, category, message) in enumerate(insights):
            col = cols[idx % 2]
            with col:
                alert_class = {
                    "Alert": "alert-red",
                    "Notice": "alert-yellow",
                    "Good": "alert-green",
                    "Trend": "alert-blue",
                    "Action": "alert-yellow"
                }.get(category, "alert-blue")
                
                st.markdown(f"""
                <div class="insight-card {alert_class}">
                    <strong>{emoji} {category}:</strong> {message}
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("All metrics within normal range")
    
    # ========================================
    # TOP CUSTOMERS SECTION
    # ========================================
    
    st.markdown("---")
    st.markdown("## 🏆 Top 10 Customers by Outstanding Amount")
    st.caption("*Outstanding = Pending Loan Amount for active (unreleased) loans only*")
    
    top_customers = filtered_df[filtered_df['released'] == 'FALSE'].groupby('customer_name').agg({
        'pending_loan_amount': 'sum',
        'loan_number': 'count',
        'customer_type': 'first'
    }).sort_values('pending_loan_amount', ascending=False).head(10)
    
    if not top_customers.empty:
        top_customers = top_customers.reset_index()
        top_customers.columns = ['Customer', 'Outstanding (₹)', 'Active Loans', 'Type']
        
        fig = px.bar(
            top_customers,
            y='Customer',
            x='Outstanding (₹)',
            color='Type',
            orientation='h',
            text='Outstanding (₹)',
            color_discrete_map={'Private': '#3b82f6', 'Vyapari': '#8b5cf6'}
        )
        
        fig.update_traces(
            texttemplate='₹%{text:,.0f}',
            textposition='outside'
        )
        
        fig.update_layout(
            height=400,
            showlegend=True,
            xaxis_title="Outstanding Amount (₹)",
            yaxis_title="",
            hovermode='y unified',
            template='plotly_white'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Summary table
        col1, col2 = st.columns([3, 1])
        with col1:
            styled_top = utils.style_mixed_table(
                top_customers,
                currency_cols=['Outstanding (₹)'],
                int_cols=['Active Loans']
            )
            st.dataframe(styled_top, use_container_width=True, hide_index=True)
        with col2:
            total_top10 = top_customers['Outstanding (₹)'].sum()
            concentration = (total_top10 / total_outstanding * 100) if total_outstanding > 0 else 0
            st.metric("Top 10 Concentration", f"{concentration:.1f}%")
            st.metric("Total Outstanding", f"₹{total_top10/1_000_000:.2f}M")
    else:
        st.info("No active loans in selected period")
    
    # ========================================
    # AGED ITEMS ALERT - RISK MONITORING
    # ========================================
    
    st.markdown("---")
    st.markdown("## 🚨 Aged Items Alert")
    
    # Only analyze active (unreleased) loans
    active_loans_df = filtered_df[filtered_df['released'] == 'FALSE'].copy()
    
    if len(active_loans_df) > 0:
        # Calculate days since disbursement
        now = pd.Timestamp(datetime.now())
        active_loans_df['days_since_disbursement'] = (now - pd.to_datetime(active_loans_df['date_of_disbursement'])).dt.days
        active_loans_df['months_since_disbursement'] = active_loans_df['days_since_disbursement'] / 30.44
        
        # Calculate correct LTV
        active_loans_df['ltv_correct'] = calculate_correct_ltv(active_loans_df)
        
        # Calculate equity remaining: 100% - (LTV + 1.25% * months)
        active_loans_df['equity_remaining'] = 100 - (active_loans_df['ltv_correct'] + 1.25 * active_loans_df['months_since_disbursement'])
        
        # Criteria 1: Private clients older than 365 days
        private_aged = active_loans_df[
            (active_loans_df['customer_type'] == 'Private') & 
            (active_loans_df['days_since_disbursement'] > 365)
        ].copy()
        
        # Criteria 2: Vyapari clients older than 730 days
        vyapari_aged = active_loans_df[
            (active_loans_df['customer_type'] == 'Vyapari') & 
            (active_loans_df['days_since_disbursement'] > 730)
        ].copy()
        
        # Criteria 3: Payment overdue (equity remaining < 1.25%)
        payment_overdue = active_loans_df[
            active_loans_df['equity_remaining'] < 1.25
        ].copy()
        
        # Summary metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Private Aged (>365d)", 
                len(private_aged),
                f"₹{private_aged['pending_loan_amount'].sum()/1_000_000:.2f}M" if len(private_aged) > 0 else "₹0.00M"
            )
        
        with col2:
            st.metric(
                "Vyapari Aged (>730d)", 
                len(vyapari_aged),
                f"₹{vyapari_aged['pending_loan_amount'].sum()/1_000_000:.2f}M" if len(vyapari_aged) > 0 else "₹0.00M"
            )
        
        with col3:
            st.metric(
                "Payment Overdue", 
                len(payment_overdue),
                f"₹{payment_overdue['pending_loan_amount'].sum()/1_000_000:.2f}M" if len(payment_overdue) > 0 else "₹0.00M"
            )
        
        with col4:
            total_aged = len(private_aged) + len(vyapari_aged) + len(payment_overdue)
            total_aged_amount = (
                private_aged['pending_loan_amount'].sum() +
                vyapari_aged['pending_loan_amount'].sum() +
                payment_overdue['pending_loan_amount'].sum()
            )
            st.metric(
                "Total Aged Items", 
                total_aged,
                f"₹{total_aged_amount/1_000_000:.2f}M"
            )
        
        # Detailed tables in expanders
        if len(private_aged) > 0 or len(vyapari_aged) > 0 or len(payment_overdue) > 0:
            st.markdown("### 📋 Detailed Breakdown")
            
            tab1, tab2, tab3 = st.tabs([
                f"🟡 Private Aged ({len(private_aged)})",
                f"🟠 Vyapari Aged ({len(vyapari_aged)})",
                f"🔴 Payment Overdue ({len(payment_overdue)})"
            ])
            
            with tab1:
                if len(private_aged) > 0:
                    display_df = private_aged[[
                        'loan_number', 'customer_name', 'loan_amount', 
                        'pending_loan_amount', 'days_since_disbursement', 
                        'ltv_correct', 'equity_remaining'
                    ]].copy()
                    
                    display_df.columns = [
                        'Loan #', 'Customer', 'Original (₹)', 
                        'Outstanding (₹)', 'Age (Days)', 'LTV (%)', 'Equity Remaining (%)'
                    ]
                    
                    display_df = display_df.sort_values('Age (Days)', ascending=False)
                    
                    styled_display = utils.style_mixed_table(
                        display_df,
                        currency_cols=['Original (₹)', 'Outstanding (₹)'],
                        int_cols=['Age (Days)'],
                        pct_cols=['LTV (%)', 'Equity Remaining (%)']
                    )
                    st.dataframe(styled_display, use_container_width=True, hide_index=True)
                else:
                    st.success("✅ No private loans aged beyond 365 days")
            
            with tab2:
                if len(vyapari_aged) > 0:
                    display_df = vyapari_aged[[
                        'loan_number', 'customer_name', 'loan_amount', 
                        'pending_loan_amount', 'days_since_disbursement', 
                        'ltv_correct', 'equity_remaining'
                    ]].copy()
                    
                    display_df.columns = [
                        'Loan #', 'Customer', 'Original (₹)', 
                        'Outstanding (₹)', 'Age (Days)', 'LTV (%)', 'Equity Remaining (%)'
                    ]
                    
                    display_df = display_df.sort_values('Age (Days)', ascending=False)
                    
                    styled_display = utils.style_mixed_table(
                        display_df,
                        currency_cols=['Original (₹)', 'Outstanding (₹)'],
                        int_cols=['Age (Days)'],
                        pct_cols=['LTV (%)', 'Equity Remaining (%)']
                    )
                    st.dataframe(styled_display, use_container_width=True, hide_index=True)
                else:
                    st.success("✅ No vyapari loans aged beyond 730 days")
            
            with tab3:
                if len(payment_overdue) > 0:
                    display_df = payment_overdue[[
                        'loan_number', 'customer_name', 'customer_type',
                        'loan_amount', 'pending_loan_amount', 
                        'days_since_disbursement', 'ltv_correct', 'equity_remaining'
                    ]].copy()
                    
                    display_df.columns = [
                        'Loan #', 'Customer', 'Type',
                        'Original (₹)', 'Outstanding (₹)', 
                        'Age (Days)', 'LTV (%)', 'Equity Remaining (%)'
                    ]
                    
                    display_df = display_df.sort_values('Equity Remaining (%)', ascending=True)
                    
                    styled_display = utils.style_mixed_table(
                        display_df,
                        currency_cols=['Original (₹)', 'Outstanding (₹)'],
                        int_cols=['Age (Days)'],
                        pct_cols=['LTV (%)', 'Equity Remaining (%)']
                    )
                    st.dataframe(styled_display, use_container_width=True, hide_index=True)
                    
                    st.warning("""
                    ⚠️ **Payment Overdue Explanation**: These loans have equity remaining < 1.25%. 
                    
                    **Formula**: Equity Remaining = 100% - (LTV + 1.25% × Months)
                    
                    **Example**: A loan with 95% LTV from Jan to Dec (11 months):
                    - Equity = 100% - (95% + 1.25% × 11) = 100% - 108.75% = **-8.75%** (OVERDUE)
                    """)
                else:
                    st.success("✅ No loans with payment overdue")
        else:
            st.success("✅ No aged items detected in the current period!")
    else:
        st.info("No active loans in selected period")
    
    # ========================================
    # GRANULAR METRICS - ITEM-WISE ANALYSIS
    # ========================================
    
    st.markdown("---")
    st.markdown("## 📊 Granular Portfolio Metrics")
    
    # Create tabs for different metric categories
    tab1, tab2, tab3, tab4 = st.tabs(["💰 Loan Size Metrics", "💵 Interest Metrics", "⏱️ Time Metrics", "🏆 Customer Metrics"])
    
    with tab1:
        st.markdown("### Loan Size Distribution & Statistics")
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            avg_loan = filtered_df['loan_amount'].mean()
            st.metric("Average Loan Size", f"₹{avg_loan:,.0f}")
        
        with col2:
            median_loan = filtered_df['loan_amount'].median()
            st.metric("Median Loan Size", f"₹{median_loan:,.0f}")
        
        with col3:
            min_loan = filtered_df['loan_amount'].min()
            max_loan = filtered_df['loan_amount'].max()
            st.metric("Range", f"₹{min_loan:,.0f} - ₹{max_loan/1000:.0f}K")
        
        with col4:
            std_loan = filtered_df['loan_amount'].std()
            cv = (std_loan / avg_loan * 100) if avg_loan > 0 else 0
            st.metric("Std Dev", f"₹{std_loan:,.0f}", f"CV: {cv:.1f}%")
        
        # Loan size distribution histogram
        fig = px.histogram(
            filtered_df,
            x='loan_amount',
            nbins=30,
            title="Loan Amount Distribution",
            labels={'loan_amount': 'Loan Amount (₹)', 'count': 'Frequency'},
            color_discrete_sequence=['#3b82f6']
        )
        
        fig.add_vline(x=avg_loan, line_dash="dash", line_color="red", annotation_text="Mean")
        fig.add_vline(x=median_loan, line_dash="dash", line_color="green", annotation_text="Median")
        
        fig.update_layout(template='plotly_white', height=350, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        # Percentile breakdown
        st.markdown("#### Loan Size Percentiles")
        percentiles = filtered_df['loan_amount'].quantile([0.25, 0.5, 0.75, 0.9, 0.95, 0.99])
        
        col1, col2, col3 = st.columns(3)
        with col1:
            st.metric("25th Percentile", f"₹{percentiles[0.25]:,.0f}")
            st.metric("50th Percentile", f"₹{percentiles[0.5]:,.0f}")
        with col2:
            st.metric("75th Percentile", f"₹{percentiles[0.75]:,.0f}")
            st.metric("90th Percentile", f"₹{percentiles[0.9]:,.0f}")
        with col3:
            st.metric("95th Percentile", f"₹{percentiles[0.95]:,.0f}")
            st.metric("99th Percentile", f"₹{percentiles[0.99]:,.0f}")
        
        # Last 12 Months Loan Size Metrics
        st.markdown("---")
        st.markdown("### 📅 Last 12 Months Performance")
        st.caption("*Loan size metrics for loans disbursed in the past 12 months*")
        
        # Filter for last 12 months
        twelve_months_ago = pd.Timestamp.now() - pd.DateOffset(months=12)
        last_12m_df = filtered_df[filtered_df['date_of_disbursement'] >= twelve_months_ago].copy()
        
        if not last_12m_df.empty:
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                avg_loan_12m = last_12m_df['loan_amount'].mean()
                avg_diff = avg_loan_12m - avg_loan
                avg_pct = (avg_diff / avg_loan * 100) if avg_loan > 0 else 0
                st.metric("Average Loan Size (12M)", f"₹{avg_loan_12m:,.0f}", 
                         f"{avg_pct:+.1f}% vs All-Time")
            
            with col2:
                median_loan_12m = last_12m_df['loan_amount'].median()
                median_diff = median_loan_12m - median_loan
                median_pct = (median_diff / median_loan * 100) if median_loan > 0 else 0
                st.metric("Median Loan Size (12M)", f"₹{median_loan_12m:,.0f}",
                         f"{median_pct:+.1f}% vs All-Time")
            
            with col3:
                total_12m = last_12m_df['loan_amount'].sum()
                count_12m = len(last_12m_df)
                st.metric("Total Disbursed (12M)", f"₹{total_12m/1_000_000:.2f}M",
                         f"{count_12m:,} loans")
            
            with col4:
                std_loan_12m = last_12m_df['loan_amount'].std()
                cv_12m = (std_loan_12m / avg_loan_12m * 100) if avg_loan_12m > 0 else 0
                st.metric("Std Dev (12M)", f"₹{std_loan_12m:,.0f}",
                         f"CV: {cv_12m:.1f}%")
            
            # Monthly trend for last 12 months
            st.markdown("#### Monthly Loan Size Trend (Last 12 Months)")
            last_12m_df['month_year'] = last_12m_df['date_of_disbursement'].dt.to_period('M').astype(str)
            monthly_trend = last_12m_df.groupby('month_year').agg({
                'loan_amount': ['mean', 'sum', 'count']
            }).reset_index()
            monthly_trend.columns = ['Month', 'Avg Loan Size', 'Total Disbursed', 'Count']
            
            fig = go.Figure()
            fig.add_trace(go.Scatter(
                x=monthly_trend['Month'],
                y=monthly_trend['Avg Loan Size'],
                mode='lines+markers',
                name='Avg Loan Size',
                line=dict(color='#3b82f6', width=2),
                marker=dict(size=8)
            ))
            fig.update_layout(
                template='plotly_white',
                height=300,
                xaxis_title='Month',
                yaxis_title='Average Loan Size (₹)',
                hovermode='x unified'
            )
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No loans disbursed in the last 12 months")
    
    with tab2:
        st.markdown("### Interest Earnings Analysis")
        
        # Filter for released loans (interest is realized on release)
        interest_df = filtered_df[filtered_df['date_of_release'].notna()].copy()
        
        # Calculate realized_interest using correct formula
        if not interest_df.empty:
            from db import calculate_realized_interest
            interest_df['realized_interest'] = calculate_realized_interest(interest_df)
        
        if not interest_df.empty:
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                # Average Interest = Total Realized Interest / Number of Loans
                avg_interest = interest_df['realized_interest'].sum() / len(interest_df)
                st.metric("Average Interest", f"₹{avg_interest:,.0f}")
            
            with col2:
                median_interest = interest_df['realized_interest'].median()
                st.metric("Median Interest", f"₹{median_interest:,.0f}")
            
            with col3:
                total_interest_all = interest_df['realized_interest'].sum()
                total_principal = interest_df['loan_amount'].sum()
                avg_roi = (total_interest_all / total_principal * 100) if total_principal > 0 else 0
                st.metric("Average ROI", f"{avg_roi:.2f}%")
            
            with col4:
                # Average Daily Interest = Total Realized Interest / Days from March 1, 2020 to Today
                start_date = pd.Timestamp('2020-03-01')
                today = pd.Timestamp.now()
                days_from_start = (today - start_date).days
                total_realized_interest = interest_df['realized_interest'].sum()
                avg_daily_interest = total_realized_interest / days_from_start if days_from_start > 0 else 0
                st.metric("Avg Daily Interest", f"₹{avg_daily_interest:,.0f}")
            
            # Interest distribution by range
            st.markdown("#### Realized Interest Distribution by Range")
            
            # Define interest ranges
            bins = [0, 1000, 2500, 5000, 10000, 20000, 50000, 100000, float('inf')]
            labels = ['₹0-1,000', '₹1,001-2,500', '₹2,501-5,000', '₹5,001-10,000', 
                     '₹10,001-20,000', '₹20,001-50,000', '₹50,001-1,00,000', '₹1,00,000+']
            
            # Create range categories
            interest_df['interest_range'] = pd.cut(interest_df['realized_interest'], bins=bins, labels=labels, right=True)
            
            # Count items in each range
            range_dist = interest_df['interest_range'].value_counts().sort_index().reset_index()
            range_dist.columns = ['Realized Interest Range', 'Count of Released Items']
            
            # Calculate total interest per range
            range_summary = interest_df.groupby('interest_range', observed=True).agg({
                'realized_interest': ['sum', 'count', 'mean']
            }).reset_index()
            range_summary.columns = ['Realized Interest Range', 'Total Interest (₹)', 'Count', 'Avg Interest (₹)']
            range_summary = range_summary.sort_index()
            
            col1, col2 = st.columns([1, 1])
            
            with col1:
                # Display table
                styled_range = utils.style_mixed_table(
                    range_summary,
                    currency_cols=['Total Interest (₹)', 'Avg Interest (₹)'],
                    int_cols=['Count']
                )
                st.dataframe(styled_range, use_container_width=True, hide_index=True)
            
            with col2:
                # Bar chart for visual distribution
                fig = px.bar(
                    range_summary,
                    x='Realized Interest Range',
                    y='Count',
                    title="Count of Released Items by Interest Range",
                    labels={'Count': 'Number of Loans', 'Realized Interest Range': 'Interest Range'},
                    color='Count',
                    color_continuous_scale='Greens',
                    text='Count'
                )
                fig.update_layout(
                    template='plotly_white',
                    height=350,
                    showlegend=False,
                    xaxis_tickangle=-45
                )
                fig.update_traces(textposition='outside')
                st.plotly_chart(fig, use_container_width=True)
            
            # Interest by customer type
            if 'customer_type' in interest_df.columns:
                st.markdown("#### Interest Metrics by Customer Type")
                interest_by_type = interest_df.groupby('customer_type', observed=True).agg(
                    avg_interest=('realized_interest', 'mean'),
                    median_interest=('realized_interest', 'median'),
                    total_interest=('realized_interest', 'sum'),
                    count=('realized_interest', 'count')
                ).round(0)
                interest_by_type.columns = ['Avg Interest', 'Median Interest', 'Total Interest', 'Count']
                
                styled_interest = utils.style_mixed_table(
                    interest_by_type,
                    currency_cols=['Avg Interest', 'Median Interest', 'Total Interest'],
                    int_cols=['Count']
                )
                st.dataframe(styled_interest, use_container_width=True)
        else:
            st.info("No released loans with interest data available")
        
        # Last 12 Months Interest Metrics
        if not interest_df.empty:
            st.markdown("---")
            st.markdown("### 📅 Last 12 Months Performance")
            st.caption("*Interest metrics for loans released in the past 12 months*")
            
            # Filter for last 12 months releases
            twelve_months_ago = pd.Timestamp.now() - pd.DateOffset(months=12)
            last_12m_interest = interest_df[interest_df['date_of_release'] >= twelve_months_ago].copy()
            
            if not last_12m_interest.empty:
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    avg_interest_12m = last_12m_interest['realized_interest'].sum() / len(last_12m_interest)
                    avg_diff = avg_interest_12m - avg_interest
                    avg_pct = (avg_diff / avg_interest * 100) if avg_interest > 0 else 0
                    st.metric("Average Interest (12M)", f"₹{avg_interest_12m:,.0f}",
                             f"{avg_pct:+.1f}% vs All-Time")
                
                with col2:
                    median_interest_12m = last_12m_interest['realized_interest'].median()
                    median_diff = median_interest_12m - median_interest
                    median_pct = (median_diff / median_interest * 100) if median_interest > 0 else 0
                    st.metric("Median Interest (12M)", f"₹{median_interest_12m:,.0f}",
                             f"{median_pct:+.1f}% vs All-Time")
                
                with col3:
                    total_interest_12m = last_12m_interest['realized_interest'].sum()
                    count_12m = len(last_12m_interest)
                    st.metric("Total Interest (12M)", f"₹{total_interest_12m/1_000_000:.2f}M",
                             f"{count_12m:,} loans")
                
                with col4:
                    total_principal_12m = last_12m_interest['loan_amount'].sum()
                    avg_roi_12m = (total_interest_12m / total_principal_12m * 100) if total_principal_12m > 0 else 0
                    roi_diff = avg_roi_12m - avg_roi
                    st.metric("Average ROI (12M)", f"{avg_roi_12m:.2f}%",
                             f"{roi_diff:+.2f}% vs All-Time")
                
                # Monthly interest trend
                st.markdown("#### Monthly Interest Earnings (Last 12 Months)")
                last_12m_interest['month_year'] = last_12m_interest['date_of_release'].dt.to_period('M').astype(str)
                monthly_interest = last_12m_interest.groupby('month_year').agg({
                    'realized_interest': ['mean', 'sum', 'count']
                }).reset_index()
                monthly_interest.columns = ['Month', 'Avg Interest', 'Total Interest', 'Count']
                
                fig = make_subplots(
                    rows=1, cols=2,
                    subplot_titles=('Total Interest Earned', 'Average Interest per Loan'),
                    specs=[[{"type": "bar"}, {"type": "scatter"}]]
                )
                
                fig.add_trace(
                    go.Bar(
                        x=monthly_interest['Month'],
                        y=monthly_interest['Total Interest'],
                        name='Total Interest',
                        marker_color='#10b981',
                        text=monthly_interest['Total Interest'].apply(lambda x: f"₹{x/1000:.0f}K"),
                        textposition='outside'
                    ),
                    row=1, col=1
                )
                
                fig.add_trace(
                    go.Scatter(
                        x=monthly_interest['Month'],
                        y=monthly_interest['Avg Interest'],
                        mode='lines+markers',
                        name='Avg Interest',
                        line=dict(color='#f59e0b', width=2),
                        marker=dict(size=8)
                    ),
                    row=1, col=2
                )
                
                fig.update_layout(
                    template='plotly_white',
                    height=350,
                    showlegend=False,
                    hovermode='x unified'
                )
                fig.update_xaxes(title_text="Month", row=1, col=1)
                fig.update_xaxes(title_text="Month", row=1, col=2)
                fig.update_yaxes(title_text="Total Interest (₹)", row=1, col=1)
                fig.update_yaxes(title_text="Avg Interest (₹)", row=1, col=2)
                
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No loans released in the last 12 months")
    
    # Interest Yield Analysis has been moved to dedicated page: 10_Interest_Yield_Analysis.py
    
    with tab3:
        st.markdown("### Time-Based Performance Metrics")
        
        # Calculate time to release for completed loans
        released_loans = filtered_df[filtered_df['date_of_release'].notna()].copy()
        
        if not released_loans.empty:
            released_loans['days_to_release'] = (
                released_loans['date_of_release'] - released_loans['date_of_disbursement']
            ).dt.days
            
            # Remove negative or zero values (data errors)
            released_loans = released_loans[released_loans['days_to_release'] > 0]
            
            if not released_loans.empty:
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    avg_days = released_loans['days_to_release'].mean()
                    st.metric("Avg Days to Release", f"{avg_days:.0f} days")
                
                with col2:
                    median_days = released_loans['days_to_release'].median()
                    st.metric("Median Days to Release", f"{median_days:.0f} days")
                
                with col3:
                    min_days = released_loans['days_to_release'].min()
                    max_days = released_loans['days_to_release'].max()
                    st.metric("Range", f"{min_days:.0f} - {max_days:.0f} days")
                
                with col4:
                    # Loans released within 30 days
                    quick_releases = (released_loans['days_to_release'] <= 30).sum()
                    quick_pct = (quick_releases / len(released_loans) * 100)
                    st.metric("Released ≤30 Days", f"{quick_pct:.1f}%", f"{quick_releases} loans")
                
                # Time distribution
                fig = px.histogram(
                    released_loans,
                    x='days_to_release',
                    nbins=40,
                    title="Distribution of Days to Release",
                    labels={'days_to_release': 'Days to Release', 'count': 'Frequency'},
                    color_discrete_sequence=['#8b5cf6']
                )
                
                fig.add_vline(x=avg_days, line_dash="dash", line_color="red", annotation_text="Mean")
                fig.add_vline(x=median_days, line_dash="dash", line_color="green", annotation_text="Median")
                
                fig.update_layout(template='plotly_white', height=350, showlegend=False)
                st.plotly_chart(fig, use_container_width=True)
                
                # Time brackets
                st.markdown("#### Release Time Brackets")
                released_loans['time_bracket'] = pd.cut(
                    released_loans['days_to_release'],
                    bins=[0, 30, 60, 90, 180, 365, float('inf')],
                    labels=['0-30 days', '31-60 days', '61-90 days', '91-180 days', '181-365 days', '365+ days']
                )
                
                time_summary = released_loans.groupby('time_bracket', observed=True).agg({
                    'loan_number': 'count',
                    'loan_amount': 'sum',
                    'interest_amount': 'sum'
                }).reset_index()
                
                time_summary.columns = ['Time Bracket', 'Loan Count', 'Total Principal', 'Total Interest']
                time_summary['% of Total'] = (time_summary['Loan Count'] / time_summary['Loan Count'].sum() * 100).round(1)
                
                col1, col2 = st.columns([2, 1])
                
                with col1:
                    # Bar chart
                    fig = px.bar(
                        time_summary,
                        x='Time Bracket',
                        y='Loan Count',
                        title="Loans by Release Time Bracket",
                        text='Loan Count',
                        color_discrete_sequence=['#f59e0b']
                    )
                    fig.update_layout(template='plotly_white', height=300, showlegend=False)
                    st.plotly_chart(fig, use_container_width=True)
                
                with col2:
                    styled_time = utils.style_mixed_table(
                        time_summary,
                        currency_cols=['Total Principal', 'Total Interest'],
                        int_cols=['Loan Count'],
                        pct_cols=['% of Total']
                    )
                    st.dataframe(styled_time, use_container_width=True, hide_index=True, height=300)
                
                # Active loan duration for unreleased loans
                st.markdown("#### Active Loan Duration (Unreleased)")
                active_loans_time = filtered_df[filtered_df['released'] == 'FALSE'].copy()
                
                if not active_loans_time.empty:
                    active_loans_time['days_active'] = (pd.Timestamp.now() - pd.to_datetime(active_loans_time['date_of_disbursement'])).dt.days
                    
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        avg_active = active_loans_time['days_active'].mean()
                        st.metric("Avg Days Active", f"{avg_active:.0f} days")
                    with col2:
                        median_active = active_loans_time['days_active'].median()
                        st.metric("Median Days Active", f"{median_active:.0f} days")
                    with col3:
                        long_active = (active_loans_time['days_active'] > 365).sum()
                        st.metric("Active >365 Days", f"{long_active} loans")
                
                # Last 12 Months Time Metrics
                st.markdown("---")
                st.markdown("### 📅 Last 12 Months Performance")
                st.caption("*Time-based metrics for loans released in the past 12 months*")
                
                # Filter for last 12 months releases
                twelve_months_ago = pd.Timestamp.now() - pd.DateOffset(months=12)
                last_12m_released = released_loans[released_loans['date_of_release'] >= twelve_months_ago].copy()
                
                if not last_12m_released.empty:
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        avg_days_12m = last_12m_released['days_to_release'].mean()
                        avg_diff = avg_days_12m - avg_days
                        st.metric("Avg Days to Release (12M)", f"{avg_days_12m:.0f} days",
                                 f"{avg_diff:+.0f} days vs All-Time")
                    
                    with col2:
                        median_days_12m = last_12m_released['days_to_release'].median()
                        median_diff = median_days_12m - median_days
                        st.metric("Median Days (12M)", f"{median_days_12m:.0f} days",
                                 f"{median_diff:+.0f} days vs All-Time")
                    
                    with col3:
                        count_12m = len(last_12m_released)
                        quick_12m = (last_12m_released['days_to_release'] <= 30).sum()
                        quick_pct_12m = (quick_12m / count_12m * 100) if count_12m > 0 else 0
                        st.metric("Released ≤30 Days (12M)", f"{quick_pct_12m:.1f}%",
                                 f"{quick_12m} loans")
                    
                    with col4:
                        min_days_12m = last_12m_released['days_to_release'].min()
                        max_days_12m = last_12m_released['days_to_release'].max()
                        st.metric("Range (12M)", f"{min_days_12m:.0f} - {max_days_12m:.0f} days")
                    
                    # Monthly trend for average days to release
                    st.markdown("#### Monthly Average Days to Release (Last 12 Months)")
                    last_12m_released['release_month'] = last_12m_released['date_of_release'].dt.to_period('M').astype(str)
                    monthly_time = last_12m_released.groupby('release_month').agg({
                        'days_to_release': ['mean', 'median', 'count']
                    }).reset_index()
                    monthly_time.columns = ['Month', 'Avg Days', 'Median Days', 'Count']
                    
                    fig = go.Figure()
                    fig.add_trace(go.Scatter(
                        x=monthly_time['Month'],
                        y=monthly_time['Avg Days'],
                        mode='lines+markers',
                        name='Avg Days',
                        line=dict(color='#ef4444', width=2),
                        marker=dict(size=8)
                    ))
                    fig.add_trace(go.Scatter(
                        x=monthly_time['Month'],
                        y=monthly_time['Median Days'],
                        mode='lines+markers',
                        name='Median Days',
                        line=dict(color='#8b5cf6', width=2, dash='dash'),
                        marker=dict(size=8)
                    ))
                    fig.update_layout(
                        template='plotly_white',
                        height=300,
                        xaxis_title='Month',
                        yaxis_title='Days to Release',
                        hovermode='x unified',
                        legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1)
                    )
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No loans released in the last 12 months")
            else:
                st.info("No valid release time data available")
        else:
            st.info("No released loans to analyze")
    
    with tab4:
        st.markdown("### Customer-Level Metrics")
        
        # Customer concentration and behavior
        customer_stats = filtered_df.groupby('customer_name').agg({
            'loan_number': 'count',
            'loan_amount': ['sum', 'mean', 'median'],
            'interest_amount': 'sum'
        }).round(0)
        
        customer_stats.columns = ['Total Loans', 'Total Principal', 'Avg Loan Size', 'Median Loan Size', 'Total Interest']
        customer_stats = customer_stats.sort_values('Total Principal', ascending=False)
        
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            total_customers = len(customer_stats)
            st.metric("Total Customers", f"{total_customers:,}")
        
        with col2:
            avg_loans_per_customer = customer_stats['Total Loans'].mean()
            st.metric("Avg Loans/Customer", f"{avg_loans_per_customer:.1f}")
        
        with col3:
            repeat_customers = (customer_stats['Total Loans'] > 1).sum()
            repeat_pct = (repeat_customers / total_customers * 100) if total_customers > 0 else 0
            st.metric("Repeat Customers", f"{repeat_pct:.1f}%", f"{repeat_customers} customers")
        
        with col4:
            high_value_customers = (customer_stats['Total Principal'] > customer_stats['Total Principal'].quantile(0.75)).sum()
            st.metric("High Value (Top 25%)", f"{high_value_customers} customers")
        
        # Customer distribution by loan count
        st.markdown("#### Customer Distribution by Loan Count")
        loan_count_dist = customer_stats['Total Loans'].value_counts().sort_index()
        
        fig = px.bar(
            x=loan_count_dist.index,
            y=loan_count_dist.values,
            title="Number of Customers by Loan Count",
            labels={'x': 'Number of Loans', 'y': 'Number of Customers'},
            color_discrete_sequence=['#ec4899']
        )
        fig.update_layout(template='plotly_white', height=300, showlegend=False)
        st.plotly_chart(fig, use_container_width=True)
        
        # Top customers detail table
        st.markdown("#### Top 20 Customers by Total Principal")
        top_20_customers = customer_stats.head(20).reset_index()
        
        styled_top20 = utils.style_mixed_table(
            top_20_customers,
            currency_cols=['Total Principal', 'Avg Loan Size', 'Median Loan Size', 'Total Interest'],
            int_cols=['Total Loans']
        )
        st.dataframe(styled_top20, use_container_width=True, hide_index=True, height=400)
    
    # ========================================
    # ENHANCED VISUALIZATIONS
    # ========================================
    
    st.markdown("---")
    st.markdown("## 📈 Performance Trends")
    
    # Prepare time series data
    all_dates = pd.date_range(
        start=filtered_df['date_of_disbursement'].min(),
        end=datetime.now(),
        freq='D'
    )
    
    daily_disbursed = filtered_df.groupby('date_of_disbursement')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_disbursed = daily_disbursed.cumsum()
    
    released_df = filtered_df[filtered_df['released'] == 'TRUE']
    daily_released = released_df.groupby('date_of_release')['loan_amount'].sum().reindex(all_dates, fill_value=0)
    cumulative_released = daily_released.cumsum()
    
    outstanding_series = cumulative_disbursed - cumulative_released
    
    # Create dual-axis chart
    col1, col2 = st.columns(2)
    
    with col1:
        # Cumulative Disbursement & Outstanding
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=all_dates,
            y=cumulative_disbursed,
            name='Cumulative Disbursed',
            line=dict(color='#3b82f6', width=3, shape='spline'),
            hovertemplate='%{y:,.0f}<extra></extra>'
        ))
        
        fig.add_trace(go.Scatter(
            x=all_dates,
            y=outstanding_series,
            name='Outstanding',
            line=dict(color='#8b5cf6', width=3, shape='spline'),
            fill='tonexty',
            hovertemplate='%{y:,.0f}<extra></extra>'
        ))
        
        fig.update_layout(
            title="Portfolio Growth Over Time",
            xaxis_title="Date",
            yaxis_title="Amount (₹)",
            hovermode='x unified',
            template='plotly_white',
            height=400,
            showlegend=True,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        
        fig.update_xaxes(
            rangeslider_visible=True,
            rangeselector=dict(
                buttons=list([
                    dict(count=1, label="1M", step="month", stepmode="backward"),
                    dict(count=3, label="3M", step="month", stepmode="backward"),
                    dict(count=6, label="6M", step="month", stepmode="backward"),
                    dict(count=1, label="YTD", step="year", stepmode="todate"),
                    dict(step="all", label="All")
                ])
            )
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        # 13-Month Disbursement Trend with MoM Growth
        # Get last 13 months of data
        end_month = datetime.now()
        start_month = end_month - relativedelta(months=12)
        
        # Filter data for last 13 months
        last_13_months_df = filtered_df[
            (filtered_df['date_of_disbursement'] >= start_month) &
            (filtered_df['date_of_disbursement'] <= end_month)
        ].copy()
        
        if not last_13_months_df.empty:
            # Group by month
            last_13_months_df['month_year'] = last_13_months_df['date_of_disbursement'].dt.to_period('M')
            monthly_trend = last_13_months_df.groupby('month_year').agg({
                'loan_amount': 'sum',
                'loan_number': 'count'
            }).reset_index()
            
            # Ensure we have all 13 months (fill missing with 0)
            all_months = pd.period_range(start=pd.Period(start_month, freq='M'), end=pd.Period(end_month, freq='M'), freq='M')
            monthly_trend = monthly_trend.set_index('month_year').reindex(all_months, fill_value=0).reset_index()
            monthly_trend.columns = ['month_year', 'loan_amount', 'loan_number']
            
            # Calculate MoM growth percentage
            monthly_trend['mom_growth'] = monthly_trend['loan_amount'].pct_change() * 100
            monthly_trend['month_label'] = monthly_trend['month_year'].astype(str)
            
            # Create figure with secondary y-axis
            fig = make_subplots(
                specs=[[{"secondary_y": True}]]
            )
            
            # Add bar chart for disbursement
            fig.add_trace(
                go.Bar(
                    x=monthly_trend['month_label'],
                    y=monthly_trend['loan_amount'],
                    name='Disbursement',
                    marker_color='#10b981',
                    hovertemplate='%{y:,.0f}<extra></extra>',
                    opacity=0.7
                ),
                secondary_y=False
            )
            
            # Add line chart for MoM growth
            fig.add_trace(
                go.Scatter(
                    x=monthly_trend['month_label'],
                    y=monthly_trend['mom_growth'],
                    name='MoM Growth %',
                    line=dict(color='#ef4444', width=3, shape='spline'),
                    mode='lines+markers',
                    marker=dict(size=8, symbol='diamond'),
                    hovertemplate='%{y:+.1f}%<extra></extra>'
                ),
                secondary_y=True
            )
            
            # Update axes
            fig.update_xaxes(title_text="Month", tickangle=-45)
            fig.update_yaxes(title_text="Disbursement (₹)", secondary_y=False, tickformat=',d')
            fig.update_yaxes(title_text="MoM Growth (%)", secondary_y=True, tickformat='+.1f')
            
            fig.update_layout(
                title="13-Month Disbursement Trend with MoM Growth",
                template='plotly_white',
                height=400,
                hovermode='x unified',
                legend=dict(
                    orientation="h",
                    yanchor="bottom",
                    y=1.02,
                    xanchor="right",
                    x=1
                )
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Show summary stats below chart
            col_a, col_b, col_c = st.columns(3)
            with col_a:
                avg_monthly = monthly_trend['loan_amount'].mean()
                st.metric("Avg Monthly", f"₹{avg_monthly/1_000:.0f}K")
            with col_b:
                avg_growth = monthly_trend['mom_growth'].iloc[1:].mean()  # Skip first NaN
                st.metric("Avg MoM Growth", f"{avg_growth:+.1f}%")
            with col_c:
                last_month_growth = monthly_trend['mom_growth'].iloc[-1]
                st.metric("Last Month Growth", f"{last_month_growth:+.1f}%")
        else:
            st.info("No data available for 13-month trend")
    
    # ========================================
    # 25-MONTH EARNINGS VS EXPENSES
    # ========================================
    
    st.markdown("---")
    st.markdown("## 💰 Earnings vs Expenses - Last 25 Months")
    
    # Calculate 25-month period
    end_month_25 = datetime.now()
    start_month_25 = end_month_25 - relativedelta(months=24)
    
    # Load expense data
    expense_df = data_cache.load_expense_data_with_cache()
    
    if not expense_df.empty:
        expense_df['date'] = pd.to_datetime(expense_df['date'], errors='coerce')
        expense_df['amount'] = pd.to_numeric(expense_df['amount'], errors='coerce').fillna(0)
        
        # Filter expenses for last 25 months
        expense_25m = expense_df[
            (expense_df['date'] >= start_month_25) &
            (expense_df['date'] <= end_month_25)
        ].copy()
        
        # Filter loans released in last 25 months (interest is on release date as per Yearly Breakdown)
        released_25m = loan_df[
            (loan_df['date_of_release'] >= start_month_25) &
            (loan_df['date_of_release'] <= end_month_25) &
            (loan_df['date_of_release'].notna())
        ].copy()
        
        # Group by month-year
        expense_25m['month_year'] = expense_25m['date'].dt.to_period('M')
        released_25m['month_year'] = released_25m['date_of_release'].dt.to_period('M')
        
        # Aggregate monthly data
        monthly_expenses = expense_25m.groupby('month_year')['amount'].sum()
        monthly_interest = released_25m.groupby('month_year')['interest_amount'].sum()
        
        # Create complete month range
        all_months_25 = pd.period_range(start=pd.Period(start_month_25, freq='M'), end=pd.Period(end_month_25, freq='M'), freq='M')
        
        # Reindex to ensure all months present
        monthly_expenses = monthly_expenses.reindex(all_months_25, fill_value=0)
        monthly_interest = monthly_interest.reindex(all_months_25, fill_value=0)
        
        # Calculate net profit
        net_profit = monthly_interest - monthly_expenses
        
        # Create DataFrame for display
        earnings_df = pd.DataFrame({
            'Interest Earned': monthly_interest,
            'Expenses': monthly_expenses,
            'Net Profit': net_profit
        })
        earnings_df.index = earnings_df.index.astype(str)
        
        # Create combined chart with bars and line
        fig = go.Figure()
        
        # Add Interest Earned bars
        fig.add_trace(go.Bar(
            x=earnings_df.index,
            y=earnings_df['Interest Earned'],
            name='Interest Earned',
            marker_color='#10b981',
            opacity=0.8,
            hovertemplate='₹%{y:,.0f}<extra></extra>'
        ))
        
        # Add Expenses bars
        fig.add_trace(go.Bar(
            x=earnings_df.index,
            y=earnings_df['Expenses'],
            name='Expenses',
            marker_color='#ef4444',
            opacity=0.8,
            hovertemplate='₹%{y:,.0f}<extra></extra>'
        ))
        
        # Add Net Profit line
        fig.add_trace(go.Scatter(
            x=earnings_df.index,
            y=earnings_df['Net Profit'],
            name='Net Profit',
            line=dict(color='#3b82f6', width=3, shape='spline'),
            mode='lines+markers',
            marker=dict(size=8, symbol='diamond'),
            yaxis='y2',
            hovertemplate='₹%{y:,.0f}<extra></extra>'
        ))
        
        # Update layout with dual y-axes
        fig.update_layout(
            title="25-Month Earnings vs Expenses Trend",
            xaxis_title="Month",
            yaxis_title="Amount (₹)",
            yaxis2=dict(
                title="Net Profit (₹)",
                overlaying='y',
                side='right',
                showgrid=False
            ),
            template='plotly_white',
            height=500,
            hovermode='x unified',
            barmode='group',
            legend=dict(
                orientation="h",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1
            ),
            xaxis=dict(tickangle=-45)
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Summary statistics
        col_a, col_b, col_c, col_d = st.columns(4)
        
        with col_a:
            total_interest_25m = earnings_df['Interest Earned'].sum()
            st.metric("Total Interest (25M)", f"₹{total_interest_25m/1_000_000:.2f}M")
        
        with col_b:
            total_expenses_25m = earnings_df['Expenses'].sum()
            st.metric("Total Expenses (25M)", f"₹{total_expenses_25m/1_000_000:.2f}M")
        
        with col_c:
            total_profit_25m = earnings_df['Net Profit'].sum()
            profit_margin = (total_profit_25m / total_interest_25m * 100) if total_interest_25m > 0 else 0
            st.metric("Total Net Profit (25M)", f"₹{total_profit_25m/1_000_000:.2f}M", f"{profit_margin:.1f}% margin")
        
        with col_d:
            avg_monthly_profit = earnings_df['Net Profit'].mean()
            st.metric("Avg Monthly Profit", f"₹{avg_monthly_profit/1_000:.0f}K")
    else:
        st.info("No expense data available for analysis")
    
    # ========================================
    # MATURITY CALENDAR & COLLECTION FUNNEL
    # ========================================
    
    st.markdown("---")
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 📅 Upcoming Loan Maturities")
        
        if 'expiry' in filtered_df.columns:
            active_with_expiry = filtered_df[
                (filtered_df['released'] == 'FALSE') &
                (filtered_df['expiry'].notna())
            ].copy()
            
            if not active_with_expiry.empty:
                active_with_expiry['days_to_maturity'] = (
                    pd.to_datetime(active_with_expiry['expiry']) - pd.Timestamp.now()
                ).dt.days
                
                # Group into weeks
                bins = [0, 7, 14, 21, 30, 60, 90, float('inf')]
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', '30-60 days', '60-90 days', '90+ days']
                
                active_with_expiry['period'] = pd.cut(
                    active_with_expiry['days_to_maturity'],
                    bins=bins,
                    labels=labels,
                    right=False
                )
                
                maturity_summary = active_with_expiry.groupby('period').agg({
                    'loan_number': 'count',
                    'pending_loan_amount': 'sum'
                }).reset_index()
                
                styled_maturity = utils.style_mixed_table(
                    maturity_summary,
                    currency_cols=['pending_loan_amount'],
                    int_cols=[]
                )
                # Note: 'loan_number' formatted with custom string in column_config
                st.dataframe(
                    styled_maturity,
                    use_container_width=True,
                    hide_index=True,
                    column_config={
                        'period': 'Period',
                        'loan_number': 'Count',
                        'pending_loan_amount': 'Amount'
                    }
                )
            else:
                st.info("No maturity data available")
        else:
            st.info("Expiry date not available in dataset")
    
    with col2:
        st.markdown("### 💰 Interest Collection Funnel")
        
        expected_interest = filtered_df['loan_amount'].sum() * 0.12  # Assuming 12% avg rate
        
        # Adjusted collected interest (same logic as Health Score)
        total_deposited_funnel = filtered_df['interest_deposited_till_date'].sum()
        legacy_released_mask_funnel = (filtered_df['released'] == 'TRUE') & (filtered_df['interest_deposited_till_date'] <= 0)
        legacy_recovered_funnel = filtered_df.loc[legacy_released_mask_funnel, 'interest_amount'].sum()
        collected_interest = total_deposited_funnel + legacy_recovered_funnel
        
        pending_interest = expected_interest - collected_interest
        
        funnel_data = pd.DataFrame({
            'Stage': ['Expected', 'Collected', 'Pending'],
            'Amount': [expected_interest, collected_interest, pending_interest],
            'Percentage': [100, (collected_interest/expected_interest*100) if expected_interest > 0 else 0, 
                         (pending_interest/expected_interest*100) if expected_interest > 0 else 0]
        })
        
        fig = go.Figure()
        
        colors = ['#94a3b8', '#10b981', '#f59e0b']
        for i, (idx, row) in enumerate(funnel_data.iterrows()):
            fig.add_trace(go.Bar(
                y=[row['Stage']],
                x=[row['Amount']],
                name=row['Stage'],
                orientation='h',
                marker_color=colors[i],
                text=f"₹{row['Amount']:,.0f} ({row['Percentage']:.1f}%)",
                textposition='inside',
                hovertemplate='%{text}<extra></extra>'
            ))
        
        fig.update_layout(
            showlegend=False,
            xaxis_title="Amount (₹)",
            height=250,
            template='plotly_white',
            barmode='overlay'
        )
        
        st.plotly_chart(fig, use_container_width=True)
    
    # ========================================
    # EXPORT FUNCTIONALITY
    # ========================================
    
    st.markdown("---")
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col3:
        # Create summary DataFrame for export
        export_data = pd.DataFrame({
            'Metric': [
                'Total Disbursed',
                'Active Loans',
                'Total Outstanding',
                'Interest Earned',
                'Active Customers',
                'Average Loan Size',
                'Collection Efficiency',
                'Overall Health Score'
            ],
            'Value': [
                f"₹{total_disbursed:,.0f}",
                f"{active_loans:,}",
                f"₹{total_outstanding:,.0f}",
                f"₹{total_interest:,.0f}",
                f"{active_customers:,}",
                f"₹{avg_loan_size:,.0f}",
                f"{collection_efficiency:.2f}%",
                f"{overall_health:.1f}/100"
            ],
            'Growth': [
                f"{disbursed_growth:+.1f}%" if compare_previous else "N/A",
                f"{loan_count_growth:+.1f}%" if compare_previous else "N/A",
                "N/A",
                f"{interest_growth:+.1f}%" if compare_previous else "N/A",
                "N/A",
                "N/A",
                "N/A",
                "N/A"
            ]
        })
        
        csv = export_data.to_csv(index=False)
        st.download_button(
            "📥 Export Summary",
            csv,
            f"executive_summary_{period_label.replace(' ', '_')}.csv",
            "text/csv",
            use_container_width=True
        )
    
    # Data quality indicator
    with col1:
        last_loan = filtered_df['date_of_disbursement'].max()
        data_age = (datetime.now() - last_loan).days
        
        if data_age <= 1:
            status_color = "🟢"
            status_text = "Up to date"
        elif data_age <= 7:
            status_color = "🟡"
            status_text = "Recent"
        else:
            status_color = "🔴"
            status_text = "Needs update"
        
        st.info(f"{status_color} **Data Status:** {status_text} | Last loan: {last_loan.strftime('%d %b %Y')} ({data_age} days ago)")

except Exception as e:
    st.error(f"An error occurred: {e}")
    import traceback
    st.code(traceback.format_exc())
