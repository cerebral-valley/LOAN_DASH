"""
Gold & Silver Rates Dashboard
==============================
Daily spot (Hazir) and GST rates for gold and silver from Nagpur market.
Includes 3-month moving averages and price trend analysis.

Data Range: September 2021 - October 2025
"""

import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import db
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# Page config
st.set_page_config(page_title="Gold & Silver Rates", layout="wide", page_icon="💰")

st.title("💰 Gold & Silver Rates Dashboard")
st.markdown("Daily spot (Hazir) and GST rates from Nagpur market with trend analysis")

# Sidebar info
with st.sidebar:
    st.info("""
    ℹ️ **About the Data**
    
    - **Hazir Rate**: Spot/ready delivery price
    - **GST Rate**: Rate including Goods & Services Tax
    - **Gold**: Price per 10 grams (₹)
    - **Silver**: Price per kilogram (₹)
    - **Data**: Nagpur market daily rates
    - **Range**: Sep 2021 - Oct 2025
    """)

# Load data (no caching - fresh load each time)
try:
    with st.spinner("Loading gold and silver rates..."):
        rates_df = db.get_gold_silver_rates()
    
    if rates_df.empty:
        st.error("⚠️ No data found in database. Please run the import script first.")
        st.info("Run: `python insert_gold_silver_rates.py`")
        st.stop()
    
    st.success(f"✅ Loaded {len(rates_df):,} records from {rates_df['rate_date'].min().date()} to {rates_df['rate_date'].max().date()}")
    
except Exception as e:
    st.error(f"❌ Error loading data: {e}")
    st.info("Make sure the `gold_silver_rates` table exists. See GOLD_SILVER_SETUP.md")
    st.stop()

# Calculate 3-month moving averages
rates_df = rates_df.sort_values('rate_date')
rates_df['gold_3m_avg'] = rates_df['ngp_hazir_gold'].rolling(window=90, min_periods=1).mean()
rates_df['silver_3m_avg'] = rates_df['ngp_hazir_silver'].rolling(window=90, min_periods=1).mean()

# =============================================================================
# DATE SEARCH SECTION
# =============================================================================
st.markdown("---")
st.subheader("🔍 Search Rate by Date")

col1, col2, col3 = st.columns([2, 1, 1])

with col1:
    search_date = st.date_input(
        "Select Date",
        value=rates_df['rate_date'].max().date(),
        min_value=rates_df['rate_date'].min().date(),
        max_value=rates_df['rate_date'].max().date()
    )

# Find data for selected date
selected_data = rates_df[rates_df['rate_date'].dt.date == search_date]

if not selected_data.empty:
    row = selected_data.iloc[0]
    
    with col2:
        st.metric(
            "Gold Hazir (₹/10g)", 
            f"₹{row['ngp_hazir_gold']:,}",
            delta=f"GST: ₹{row['ngp_gst_gold']:,}"
        )
    
    with col3:
        st.metric(
            "Silver Hazir (₹/kg)", 
            f"₹{row['ngp_hazir_silver']:,}",
            delta=f"GST: ₹{row['ngp_gst_silver']:,}"
        )
    
    # Detailed table for selected date
    st.markdown("#### 📋 Detailed Rates")
    detail_df = pd.DataFrame([{
        'Date': search_date.strftime('%d %b %Y'),
        'Time': row['rate_time'],
        'Gold Hazir (₹/10g)': f"₹{row['ngp_hazir_gold']:,}",
        'Gold GST (₹/10g)': f"₹{row['ngp_gst_gold']:,}",
        'Silver Hazir (₹/kg)': f"₹{row['ngp_hazir_silver']:,}",
        'Silver GST (₹/kg)': f"₹{row['ngp_gst_silver']:,}",
        'USD/INR': f"{row['usd_inr']:.2f}",
        'COMEX Gold ($/oz)': f"${row['cmx_gold_usd']:.2f}",
        'COMEX Silver ($/oz)': f"${row['cmx_silver_usd']:.2f}"
    }])
    
    st.dataframe(detail_df, use_container_width=True, hide_index=True)
    
else:
    st.warning(f"⚠️ No data available for {search_date.strftime('%d %b %Y')}")

# =============================================================================
# LATEST RATES TABLE
# =============================================================================
st.markdown("---")
st.subheader("📊 Latest Rates (Last 30 Days)")

# Get last 30 days data
latest_30 = rates_df.tail(30).copy()
latest_30['Date'] = latest_30['rate_date'].dt.strftime('%d %b %Y')

# Create display table
display_df = latest_30[[
    'Date', 'rate_time', 
    'ngp_hazir_gold', 'ngp_gst_gold',
    'ngp_hazir_silver', 'ngp_gst_silver'
]].copy()

display_df.columns = [
    'Date', 'Time',
    'Gold Hazir (₹/10g)', 'Gold GST (₹/10g)',
    'Silver Hazir (₹/kg)', 'Silver GST (₹/kg)'
]

# Sort by date descending
display_df = display_df.sort_values('Date', ascending=False)

st.dataframe(
    display_df.style.format({
        'Gold Hazir (₹/10g)': '{:,.0f}',
        'Gold GST (₹/10g)': '{:,.0f}',
        'Silver Hazir (₹/kg)': '{:,.0f}',
        'Silver GST (₹/kg)': '{:,.0f}'
    }),
    use_container_width=True,
    hide_index=True,
    height=400
)

# =============================================================================
# 3-MONTH MOVING AVERAGES
# =============================================================================
st.markdown("---")
st.subheader("📈 3-Month Moving Averages")

col1, col2 = st.columns(2)

with col1:
    latest_row = rates_df.iloc[-1]
    current_gold = latest_row['ngp_hazir_gold']
    avg_gold = latest_row['gold_3m_avg']
    diff_gold = current_gold - avg_gold
    pct_gold = (diff_gold / avg_gold) * 100
    
    st.metric(
        "Gold Current vs 3M Avg",
        f"₹{current_gold:,.0f}",
        delta=f"{diff_gold:+,.0f} ({pct_gold:+.1f}%)",
        delta_color="normal"
    )
    st.caption(f"3-Month Average: ₹{avg_gold:,.0f}")

with col2:
    current_silver = latest_row['ngp_hazir_silver']
    avg_silver = latest_row['silver_3m_avg']
    diff_silver = current_silver - avg_silver
    pct_silver = (diff_silver / avg_silver) * 100
    
    st.metric(
        "Silver Current vs 3M Avg",
        f"₹{current_silver:,.0f}",
        delta=f"{diff_silver:+,.0f} ({pct_silver:+.1f}%)",
        delta_color="normal"
    )
    st.caption(f"3-Month Average: ₹{avg_silver:,.0f}")

# =============================================================================
# PRICE MOVEMENT CHARTS
# =============================================================================
st.markdown("---")
st.subheader("📉 Price Movement Trends")

# Time range selector
time_range = st.selectbox(
    "Select Time Range",
    options=["Last 3 Months", "Last 6 Months", "Last 1 Year", "All Time"],
    index=1
)

# Filter data based on selection
if time_range == "Last 3 Months":
    cutoff_date = rates_df['rate_date'].max() - timedelta(days=90)
elif time_range == "Last 6 Months":
    cutoff_date = rates_df['rate_date'].max() - timedelta(days=180)
elif time_range == "Last 1 Year":
    cutoff_date = rates_df['rate_date'].max() - timedelta(days=365)
else:  # All Time
    cutoff_date = rates_df['rate_date'].min()

chart_data = rates_df[rates_df['rate_date'] >= cutoff_date].copy()

# Gold Price Chart
st.markdown("#### 🟡 Gold Price Movement")
fig_gold = go.Figure()

fig_gold.add_trace(go.Scatter(
    x=chart_data['rate_date'],
    y=chart_data['ngp_hazir_gold'],
    name='Hazir Rate',
    line=dict(color='gold', width=2),
    mode='lines'
))

fig_gold.add_trace(go.Scatter(
    x=chart_data['rate_date'],
    y=chart_data['gold_3m_avg'],
    name='3-Month Average',
    line=dict(color='orange', width=2, dash='dash'),
    mode='lines'
))

fig_gold.update_layout(
    title="Gold Hazir Rate (₹ per 10g)",
    xaxis_title="Date",
    yaxis_title="Rate (₹)",
    hovermode='x unified',
    height=400
)

st.plotly_chart(fig_gold, use_container_width=True)

# Silver Price Chart
st.markdown("#### ⚪ Silver Price Movement")
fig_silver = go.Figure()

fig_silver.add_trace(go.Scatter(
    x=chart_data['rate_date'],
    y=chart_data['ngp_hazir_silver'],
    name='Hazir Rate',
    line=dict(color='silver', width=2),
    mode='lines'
))

fig_silver.add_trace(go.Scatter(
    x=chart_data['rate_date'],
    y=chart_data['silver_3m_avg'],
    name='3-Month Average',
    line=dict(color='gray', width=2, dash='dash'),
    mode='lines'
))

fig_silver.update_layout(
    title="Silver Hazir Rate (₹ per kg)",
    xaxis_title="Date",
    yaxis_title="Rate (₹)",
    hovermode='x unified',
    height=400
)

st.plotly_chart(fig_silver, use_container_width=True)

# =============================================================================
# STATISTICS SUMMARY
# =============================================================================
st.markdown("---")
st.subheader("📊 Statistical Summary")

col1, col2 = st.columns(2)

with col1:
    st.markdown("##### Gold Statistics (All Time)")
    gold_stats = pd.DataFrame({
        'Metric': ['Minimum', 'Maximum', 'Average', 'Current', 'Change from Min'],
        'Value (₹)': [
            f"₹{rates_df['ngp_hazir_gold'].min():,.0f}",
            f"₹{rates_df['ngp_hazir_gold'].max():,.0f}",
            f"₹{rates_df['ngp_hazir_gold'].mean():,.0f}",
            f"₹{current_gold:,.0f}",
            f"+₹{(current_gold - rates_df['ngp_hazir_gold'].min()):,.0f} ({((current_gold - rates_df['ngp_hazir_gold'].min()) / rates_df['ngp_hazir_gold'].min() * 100):+.1f}%)"
        ]
    })
    st.dataframe(gold_stats, use_container_width=True, hide_index=True)

with col2:
    st.markdown("##### Silver Statistics (All Time)")
    silver_stats = pd.DataFrame({
        'Metric': ['Minimum', 'Maximum', 'Average', 'Current', 'Change from Min'],
        'Value (₹)': [
            f"₹{rates_df['ngp_hazir_silver'].min():,.0f}",
            f"₹{rates_df['ngp_hazir_silver'].max():,.0f}",
            f"₹{rates_df['ngp_hazir_silver'].mean():,.0f}",
            f"₹{current_silver:,.0f}",
            f"+₹{(current_silver - rates_df['ngp_hazir_silver'].min()):,.0f} ({((current_silver - rates_df['ngp_hazir_silver'].min()) / rates_df['ngp_hazir_silver'].min() * 100):+.1f}%)"
        ]
    })
    st.dataframe(silver_stats, use_container_width=True, hide_index=True)

# Footer
st.markdown("---")
st.caption(f"💡 Data updated up to {rates_df['rate_date'].max().strftime('%d %B %Y')} | Total records: {len(rates_df):,}")
