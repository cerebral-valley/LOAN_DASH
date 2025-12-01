# make parent folder importable
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import data_cache
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from db import calculate_realized_interest, calculate_correct_ltv

st.set_page_config(page_title="Smart Recommendations", layout="wide", initial_sidebar_state="expanded")

# Custom CSS
st.markdown("""
<style>
    .recommendation-card {
        padding: 20px;
        border-radius: 10px;
        margin: 10px 0;
        border-left: 5px solid;
        background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
    }
    .priority-high { border-color: #ef4444; }
    .priority-medium { border-color: #f59e0b; }
    .priority-low { border-color: #10b981; }
    .metric-impact {
        font-size: 14px;
        font-weight: bold;
        color: #3b82f6;
    }
    .action-steps {
        background-color: rgba(59, 130, 246, 0.1);
        padding: 10px;
        border-radius: 5px;
        margin-top: 10px;
    }
</style>
""", unsafe_allow_html=True)

st.title("🧠 Smart Recommendations & Portfolio Strategy")
st.markdown("*AI-powered insights for optimizing loan quality and interest yield*")

# ---- SIDEBAR: Analysis Controls ----
with st.sidebar:
    st.markdown("### 🎯 Analysis Settings")
    
    analysis_depth = st.selectbox(
        "Analysis Depth",
        ["Quick Scan", "Standard Analysis", "Deep Dive"],
        index=1
    )
    
    focus_area = st.multiselect(
        "Focus Areas",
        ["Loan Quality", "Interest Yield", "Risk Management", "Customer Retention", "Portfolio Growth"],
        default=["Loan Quality", "Interest Yield"]
    )
    
    st.markdown("---")
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
    loan_df['customer_type'] = loan_df['customer_type'].str.title()
    loan_df['released'] = loan_df['released'].apply(
        lambda x: str(x).upper() if isinstance(x, str) else ('TRUE' if x is True else 'FALSE')
    )
    
    # ========================================
    # CALCULATE KEY METRICS FOR ANALYSIS
    # ========================================
    
    # Portfolio Overview
    total_loans = len(loan_df)
    active_loans = len(loan_df[loan_df['released'] == 'FALSE'])
    released_loans = len(loan_df[loan_df['released'] == 'TRUE'])
    
    total_disbursed = loan_df['loan_amount'].sum()
    total_outstanding = loan_df[loan_df['released'] == 'FALSE']['pending_loan_amount'].sum()
    
    # Interest Metrics
    released_df = loan_df[loan_df['date_of_release'].notna()].copy()
    if not released_df.empty:
        released_df['realized_interest'] = calculate_realized_interest(released_df)
        released_df['days_to_release'] = (released_df['date_of_release'] - released_df['date_of_disbursement']).dt.days
        released_df = released_df[released_df['days_to_release'] > 0]
        
        total_interest = released_df['realized_interest'].sum()
        avg_interest = released_df['realized_interest'].mean()
        
        # Portfolio yield calculation
        total_capital = released_df['loan_amount'].sum()
        weighted_avg_days = (released_df['loan_amount'] * released_df['days_to_release']).sum() / total_capital if total_capital > 0 else 0
        portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100 if total_capital > 0 and weighted_avg_days > 0 else 0
    else:
        total_interest = 0
        avg_interest = 0
        portfolio_yield = 0
        weighted_avg_days = 0
    
    # Collection Efficiency
    total_deposited = loan_df['interest_deposited_till_date'].sum()
    legacy_released_mask = (loan_df['released'] == 'TRUE') & (loan_df['interest_deposited_till_date'] <= 0)
    legacy_recovered = loan_df.loc[legacy_released_mask, 'interest_amount'].sum()
    total_collected = total_deposited + legacy_recovered
    expected_interest = total_disbursed * 0.12
    collection_efficiency = (total_collected / expected_interest * 100) if expected_interest > 0 else 0
    
    # LTV Analysis (using CORRECTED LTV calculation)
    active_df = loan_df[loan_df['released'] == 'FALSE'].copy()
    if len(active_df) > 0:
        active_df['ltv_correct'] = calculate_correct_ltv(active_df)
        avg_ltv = active_df['ltv_correct'].mean()
    else:
        avg_ltv = 0
    
    # Customer Concentration
    if len(active_df) > 0:
        top_5_concentration = (active_df.nlargest(5, 'pending_loan_amount')['pending_loan_amount'].sum() / 
                              active_df['pending_loan_amount'].sum() * 100) if active_df['pending_loan_amount'].sum() > 0 else 0
    else:
        top_5_concentration = 0
    
    # Growth Metrics (Last 3 months vs Previous 3 months)
    today = datetime.now()
    last_3m_start = today - relativedelta(months=3)
    prev_3m_start = today - relativedelta(months=6)
    
    last_3m_loans = loan_df[(loan_df['date_of_disbursement'] >= last_3m_start) & (loan_df['date_of_disbursement'] <= today)]
    prev_3m_loans = loan_df[(loan_df['date_of_disbursement'] >= prev_3m_start) & (loan_df['date_of_disbursement'] < last_3m_start)]
    
    last_3m_volume = last_3m_loans['loan_amount'].sum()
    prev_3m_volume = prev_3m_loans['loan_amount'].sum()
    volume_growth = ((last_3m_volume - prev_3m_volume) / prev_3m_volume * 100) if prev_3m_volume > 0 else 0
    
    # Customer Retention
    repeat_customers = loan_df.groupby('customer_name')['loan_number'].count()
    repeat_rate = (len(repeat_customers[repeat_customers > 1]) / len(repeat_customers) * 100) if len(repeat_customers) > 0 else 0
    
    # Average Loan Size Trend
    avg_loan_size = loan_df['loan_amount'].mean()
    last_3m_avg = last_3m_loans['loan_amount'].mean() if len(last_3m_loans) > 0 else 0
    prev_3m_avg = prev_3m_loans['loan_amount'].mean() if len(prev_3m_loans) > 0 else 0
    avg_size_trend = ((last_3m_avg - prev_3m_avg) / prev_3m_avg * 100) if prev_3m_avg > 0 else 0
    
    # ========================================
    # DYNAMIC RECOMMENDATION ENGINE
    # ========================================
    
    def generate_loan_quality_recommendations():
        """Generate 5 dynamic recommendations for improving loan quality"""
        recommendations = []
        
        # Recommendation 1: LTV Optimization
        if avg_ltv > 85:
            recommendations.append({
                'title': '🔴 HIGH PRIORITY: Reduce LTV to Manage Risk',
                'priority': 'high',
                'current_state': f'Average LTV at {avg_ltv:.1f}% - Above safe threshold (85%)',
                'impact': 'Reduce default risk by 30-40%, improve portfolio safety',
                'action_steps': [
                    f'Target LTV reduction to 75-80% (currently {avg_ltv:.1f}%)',
                    'Implement stricter valuation guidelines for new loans',
                    'Review and adjust gold purity assessment process',
                    'Consider requiring additional collateral for high-value loans',
                    'Set up automated alerts for loans exceeding 85% LTV'
                ],
                'expected_outcome': 'Safer portfolio with lower default probability'
            })
        elif avg_ltv < 65:
            recommendations.append({
                'title': '🟡 OPPORTUNITY: Increase LTV for Better Returns',
                'priority': 'medium',
                'current_state': f'Average LTV at {avg_ltv:.1f}% - Conservative lending',
                'impact': 'Potential to increase revenue by 15-25% without significant risk increase',
                'action_steps': [
                    f'Gradually increase LTV to 70-75% (currently {avg_ltv:.1f}%)',
                    'Pilot program with select low-risk customers',
                    'Monitor default rates closely during transition',
                    'Maintain conservative LTV for new/unknown customers',
                    'Update pricing to reflect improved capital efficiency'
                ],
                'expected_outcome': 'Higher disbursement volume with maintained safety'
            })
        else:
            recommendations.append({
                'title': '✅ MAINTAIN: LTV in Optimal Range',
                'priority': 'low',
                'current_state': f'Average LTV at {avg_ltv:.1f}% - Within optimal range (65-85%)',
                'impact': 'Continue monitoring to maintain balanced risk-return profile',
                'action_steps': [
                    'Maintain current LTV policies',
                    'Quarterly review of LTV distribution across portfolio',
                    'Track LTV trends by customer type and loan size',
                    'Document exceptions and their outcomes for future reference'
                ],
                'expected_outcome': 'Sustained healthy risk-return balance'
            })
        
        # Recommendation 2: Customer Concentration
        if top_5_concentration > 50:
            recommendations.append({
                'title': '🔴 CRITICAL: Reduce Customer Concentration Risk',
                'priority': 'high',
                'current_state': f'Top 5 customers represent {top_5_concentration:.1f}% of portfolio - High concentration',
                'impact': 'Reduce portfolio volatility by 40-50%, improve stability',
                'action_steps': [
                    f'Target: Reduce top 5 concentration to <40% (currently {top_5_concentration:.1f}%)',
                    'Launch customer acquisition campaign targeting new segments',
                    'Set per-customer exposure limits (e.g., max 10% of portfolio)',
                    'Incentivize smaller, more frequent loans over large single disbursements',
                    'Review and potentially cap limits for top customers'
                ],
                'expected_outcome': 'More diversified, resilient portfolio'
            })
        elif top_5_concentration > 30:
            recommendations.append({
                'title': '🟡 IMPROVE: Enhance Portfolio Diversification',
                'priority': 'medium',
                'current_state': f'Top 5 customers represent {top_5_concentration:.1f}% of portfolio - Moderate concentration',
                'impact': 'Better risk distribution and customer base expansion',
                'action_steps': [
                    f'Target: Reduce top 5 concentration to <25% (currently {top_5_concentration:.1f}%)',
                    'Focus marketing on acquiring 10-15 mid-sized customers',
                    'Implement tiered pricing to encourage broader distribution',
                    'Track monthly concentration metrics',
                    'Set alerts when any single customer exceeds 15% of portfolio'
                ],
                'expected_outcome': 'Improved portfolio stability and growth potential'
            })
        else:
            recommendations.append({
                'title': '✅ EXCELLENT: Well-Diversified Portfolio',
                'priority': 'low',
                'current_state': f'Top 5 customers represent {top_5_concentration:.1f}% of portfolio - Good diversification',
                'impact': 'Maintain current diversification levels',
                'action_steps': [
                    'Continue balanced customer acquisition strategy',
                    'Monitor concentration metrics monthly',
                    'Celebrate and replicate successful diversification strategies',
                    'Use as benchmark for future growth initiatives'
                ],
                'expected_outcome': 'Sustained low concentration risk'
            })
        
        # Recommendation 3: Customer Retention
        if repeat_rate < 40:
            recommendations.append({
                'title': '🔴 URGENT: Improve Customer Retention',
                'priority': 'high',
                'current_state': f'Only {repeat_rate:.1f}% of customers return - Low retention',
                'impact': 'Increasing retention by 10% can boost profits by 25-50%',
                'action_steps': [
                    'Implement customer loyalty program (e.g., rate discounts for repeat customers)',
                    'Survey customers who haven\'t returned to understand pain points',
                    'Streamline loan renewal process to reduce friction',
                    'Set up automated follow-up 2 weeks before typical loan maturity',
                    'Track and reward staff based on customer retention metrics',
                    f'Target: Increase repeat rate to 50%+ (currently {repeat_rate:.1f}%)'
                ],
                'expected_outcome': 'Higher retention, lower acquisition costs, predictable revenue'
            })
        elif repeat_rate < 60:
            recommendations.append({
                'title': '🟡 OPPORTUNITY: Strengthen Customer Loyalty',
                'priority': 'medium',
                'current_state': f'Repeat customer rate at {repeat_rate:.1f}% - Room for improvement',
                'impact': 'Better customer lifetime value and reduced marketing costs',
                'action_steps': [
                    'Create VIP tier for customers with 3+ loans',
                    'Implement referral rewards program',
                    'Personalize communication based on customer history',
                    'Offer flexible repayment options for loyal customers',
                    f'Target: Increase repeat rate to 65%+ (currently {repeat_rate:.1f}%)'
                ],
                'expected_outcome': 'Stronger customer relationships and organic growth'
            })
        else:
            recommendations.append({
                'title': '✅ STRONG: High Customer Retention',
                'priority': 'low',
                'current_state': f'Repeat customer rate at {repeat_rate:.1f}% - Excellent retention',
                'impact': 'Leverage loyal customer base for referral growth',
                'action_steps': [
                    'Document what drives high retention and replicate',
                    'Launch formal referral program to leverage satisfied customers',
                    'Create case studies from long-term customer relationships',
                    'Maintain service quality standards that drive retention'
                ],
                'expected_outcome': 'Sustained loyalty and word-of-mouth growth'
            })
        
        # Recommendation 4: Loan Size Strategy
        if avg_size_trend < -10:
            recommendations.append({
                'title': '🟡 TREND ALERT: Declining Average Loan Size',
                'priority': 'medium',
                'current_state': f'Average loan size down {abs(avg_size_trend):.1f}% in last 3 months',
                'impact': 'May indicate shift to smaller customers or market changes',
                'action_steps': [
                    'Analyze if decline is strategic (targeting new segments) or unintended',
                    'Review pricing to ensure profitability on smaller loans',
                    'If unintended: Implement minimum loan amount or service fees',
                    'Consider tiered service model (express processing for larger loans)',
                    'Track profitability by loan size segment'
                ],
                'expected_outcome': 'Optimized loan size mix for maximum profitability'
            })
        elif avg_size_trend > 15:
            recommendations.append({
                'title': '🟡 TREND ALERT: Rapidly Growing Average Loan Size',
                'priority': 'medium',
                'current_state': f'Average loan size up {avg_size_trend:.1f}% in last 3 months',
                'impact': 'Higher revenue per loan but increased concentration risk',
                'action_steps': [
                    'Ensure risk management processes scale with loan size growth',
                    'Review if larger loans maintain same credit quality standards',
                    'Consider portfolio limits to prevent over-concentration in large loans',
                    'Monitor default rates specifically for larger loan segments',
                    'Ensure adequate capital reserves for larger exposures'
                ],
                'expected_outcome': 'Balanced growth without compromising risk management'
            })
        else:
            recommendations.append({
                'title': '✅ STABLE: Consistent Loan Size Distribution',
                'priority': 'low',
                'current_state': f'Average loan size stable (change: {avg_size_trend:+.1f}%)',
                'impact': 'Predictable portfolio composition',
                'action_steps': [
                    'Continue current loan sizing strategies',
                    'Monitor for any emerging trends in customer demand',
                    'Periodically review if current mix aligns with profit goals',
                    'Use stability as baseline for testing new initiatives'
                ],
                'expected_outcome': 'Maintained operational efficiency'
            })
        
        # Recommendation 5: Portfolio Growth
        if volume_growth < 0:
            recommendations.append({
                'title': '🔴 CRITICAL: Negative Portfolio Growth',
                'priority': 'high',
                'current_state': f'Disbursement volume down {abs(volume_growth):.1f}% in last 3 months',
                'impact': 'Revenue decline and potential market share loss',
                'action_steps': [
                    'Conduct immediate market analysis - is this seasonal or structural?',
                    'Review if pricing is competitive vs market',
                    'Accelerate marketing and customer acquisition efforts',
                    'Survey lost customers to understand why they went elsewhere',
                    'Consider promotional rates or enhanced terms to stimulate demand',
                    'Analyze competitor activities and market dynamics'
                ],
                'expected_outcome': 'Return to growth trajectory and market competitiveness'
            })
        elif volume_growth < 10:
            recommendations.append({
                'title': '🟡 BELOW TARGET: Slow Portfolio Growth',
                'priority': 'medium',
                'current_state': f'Disbursement volume up only {volume_growth:.1f}% in last 3 months',
                'impact': 'Missing growth opportunities in expanding market',
                'action_steps': [
                    'Set aggressive growth targets (e.g., 15-20% quarterly growth)',
                    'Increase marketing budget and expand customer acquisition channels',
                    'Streamline application and approval process to reduce friction',
                    'Train staff on consultative selling approaches',
                    'Explore new customer segments or geographic areas',
                    'Consider strategic partnerships for customer referrals'
                ],
                'expected_outcome': 'Accelerated growth and market share gains'
            })
        else:
            recommendations.append({
                'title': '✅ STRONG GROWTH: Expanding Portfolio',
                'priority': 'low',
                'current_state': f'Disbursement volume up {volume_growth:.1f}% in last 3 months - Excellent growth',
                'impact': 'Maintain momentum while ensuring quality',
                'action_steps': [
                    'Document successful growth strategies for replication',
                    'Ensure credit quality standards are maintained during growth',
                    'Plan for operational scaling (staff, systems, capital)',
                    'Monitor key ratios to ensure profitable growth',
                    'Set up early warning systems for quality degradation',
                    'Consider capturing learnings for future scaling initiatives'
                ],
                'expected_outcome': 'Sustained, profitable growth'
            })
        
        return recommendations[:5]  # Return top 5
    
    def generate_interest_yield_recommendations():
        """Generate 5 dynamic recommendations for optimizing interest yield"""
        recommendations = []
        
        # Recommendation 1: Portfolio Yield Optimization
        if portfolio_yield < 12:
            recommendations.append({
                'title': '🔴 URGENT: Low Portfolio Yield - Pricing Review Needed',
                'priority': 'high',
                'current_state': f'Portfolio yield at {portfolio_yield:.2f}% - Below industry standard (12-15%)',
                'impact': 'Increasing yield to 14% could add ₹{:,.0f} annual revenue'.format((14 - portfolio_yield) / 100 * total_outstanding),
                'action_steps': [
                    f'Immediate: Review and increase interest rates (current yield: {portfolio_yield:.2f}%)',
                    'Implement risk-based pricing (higher rates for higher risk)',
                    'Analyze competitor rates to ensure competitiveness while improving margins',
                    'Consider reducing loan tenure to improve annualized yields',
                    'Review fee structure - add processing/documentation fees if not present',
                    'Target yield: 13-15% within next quarter'
                ],
                'expected_outcome': f'Potential additional revenue: ₹{(2 / 100 * total_outstanding):,.0f} annually'
            })
        elif portfolio_yield > 18:
            recommendations.append({
                'title': '🟡 CAUTION: Very High Yield - Monitor Competition',
                'priority': 'medium',
                'current_state': f'Portfolio yield at {portfolio_yield:.2f}% - Above market rates',
                'impact': 'Risk of customer attrition to lower-priced competitors',
                'action_steps': [
                    'Monitor customer feedback on pricing',
                    'Track competitive pricing monthly',
                    'Consider creating tiered pricing (lower rates for loyal/low-risk customers)',
                    'Ensure high yield is sustainable and not driving away good customers',
                    'Invest excess margins in customer experience improvements'
                ],
                'expected_outcome': 'Balanced pricing that optimizes revenue and retention'
            })
        else:
            recommendations.append({
                'title': '✅ OPTIMAL: Portfolio Yield in Healthy Range',
                'priority': 'low',
                'current_state': f'Portfolio yield at {portfolio_yield:.2f}% - Competitive and profitable',
                'impact': 'Maintain yield while optimizing for volume growth',
                'action_steps': [
                    'Continue monitoring yield trends monthly',
                    'Test minor rate adjustments on new customers to optimize',
                    'Benchmark against market rates quarterly',
                    'Document pricing strategies for different customer segments',
                    'Focus on volume growth while maintaining current yields'
                ],
                'expected_outcome': 'Sustained profitability with competitive positioning'
            })
        
        # Recommendation 2: Collection Efficiency
        if collection_efficiency < 85:
            recommendations.append({
                'title': '🔴 CRITICAL: Poor Collection Efficiency',
                'priority': 'high',
                'current_state': f'Collection efficiency at {collection_efficiency:.1f}% - Well below target (90%+)',
                'impact': f'Improving to 92% could recover additional ₹{((92 - collection_efficiency) / 100 * expected_interest):,.0f}',
                'action_steps': [
                    'Implement automated payment reminders (SMS/Email) 7 days before due date',
                    'Set up systematic follow-up process for overdue payments',
                    'Offer incentives for early/on-time payment (e.g., 0.5% discount)',
                    'Review and strengthen loan documentation process',
                    'Consider penalty structure for late payments',
                    'Assign dedicated collection staff for large outstanding amounts',
                    f'Target: Increase collection efficiency to 92%+ (currently {collection_efficiency:.1f}%)'
                ],
                'expected_outcome': f'Recover ₹{((5 / 100 * expected_interest)):,.0f}+ in pending interest'
            })
        elif collection_efficiency < 92:
            recommendations.append({
                'title': '🟡 IMPROVE: Good but Not Optimal Collection',
                'priority': 'medium',
                'current_state': f'Collection efficiency at {collection_efficiency:.1f}% - Above average but room to improve',
                'impact': 'Fine-tuning can add 2-3% to bottom line',
                'action_steps': [
                    'Analyze top 20% of uncollected interest - what are common patterns?',
                    'Implement proactive outreach before payment due dates',
                    'Create customer payment profiles to predict and prevent defaults',
                    'Test different communication channels for payment reminders',
                    f'Target: Achieve 95%+ collection efficiency (currently {collection_efficiency:.1f}%)'
                ],
                'expected_outcome': 'Near-perfect collection with minimal effort increase'
            })
        else:
            recommendations.append({
                'title': '✅ EXCELLENT: Outstanding Collection Efficiency',
                'priority': 'low',
                'current_state': f'Collection efficiency at {collection_efficiency:.1f}% - Best-in-class',
                'impact': 'Maintain and document best practices',
                'action_steps': [
                    'Document collection processes for training and replication',
                    'Share best practices with industry peers (can be competitive advantage)',
                    'Monitor for any degradation in collection rates',
                    'Consider if collection team can support portfolio growth',
                    'Use as case study for operational excellence'
                ],
                'expected_outcome': 'Sustained excellence in collections'
            })
        
        # Recommendation 3: Loan Tenure Optimization
        avg_days = weighted_avg_days
        if avg_days > 250:
            recommendations.append({
                'title': '🟡 OPPORTUNITY: Long Loan Tenure Reducing Yield',
                'priority': 'medium',
                'current_state': f'Average loan duration {avg_days:.0f} days - Longer tenure reduces annualized yield',
                'impact': 'Reducing tenure by 50 days could improve yield by 1-2%',
                'action_steps': [
                    f'Analyze: Why are loans held so long? (average: {avg_days:.0f} days)',
                    'Encourage earlier repayment through tenure-based pricing',
                    'Offer slight rate discount for loans closed within 120 days',
                    'Implement proactive early settlement reminders at 90-day mark',
                    'Review if long tenure indicates customer financial stress',
                    'Consider maximum tenure limits for new loans'
                ],
                'expected_outcome': 'Improved capital turnover and annualized yields'
            })
        elif avg_days < 90:
            recommendations.append({
                'title': '🟡 REVIEW: Very Short Loan Tenure',
                'priority': 'medium',
                'current_state': f'Average loan duration {avg_days:.0f} days - High turnover but may limit total interest',
                'impact': 'Balance quick turnover with revenue optimization',
                'action_steps': [
                    'Analyze profitability: Are short loans generating sufficient revenue?',
                    'Consider minimum tenure requirements or fees for very short loans',
                    'Review if short tenure indicates processing inefficiencies',
                    'Ensure operational costs don\'t eat into margins on quick-turnaround loans',
                    'May be optimal - validate against profitability metrics'
                ],
                'expected_outcome': 'Optimized tenure that balances turnover and revenue'
            })
        else:
            recommendations.append({
                'title': '✅ BALANCED: Optimal Loan Duration',
                'priority': 'low',
                'current_state': f'Average loan duration {avg_days:.0f} days - Good balance of turnover and yield',
                'impact': 'Maintain current tenure patterns',
                'action_steps': [
                    'Continue monitoring average tenure trends',
                    'Track tenure by customer segment to identify patterns',
                    'Use current tenure as benchmark for forecasting',
                    'Document factors that contribute to optimal tenure'
                ],
                'expected_outcome': 'Sustained efficient capital utilization'
            })
        
        # Recommendation 4: Interest Rate Strategy by Customer Type
        if 'customer_type' in released_df.columns and not released_df.empty:
            vyapari_df = released_df[released_df['customer_type'] == 'Vyapari']
            private_df = released_df[released_df['customer_type'] == 'Private']
            
            if len(vyapari_df) > 0 and len(private_df) > 0:
                # Calculate yields
                vyapari_capital = vyapari_df['loan_amount'].sum()
                vyapari_interest = vyapari_df['realized_interest'].sum()
                vyapari_days = (vyapari_df['loan_amount'] * vyapari_df['days_to_release']).sum() / vyapari_capital if vyapari_capital > 0 else 0
                vyapari_yield = (vyapari_interest / vyapari_capital) * (365 / vyapari_days) * 100 if vyapari_capital > 0 and vyapari_days > 0 else 0
                
                private_capital = private_df['loan_amount'].sum()
                private_interest = private_df['realized_interest'].sum()
                private_days = (private_df['loan_amount'] * private_df['days_to_release']).sum() / private_capital if private_capital > 0 else 0
                private_yield = (private_interest / private_capital) * (365 / private_days) * 100 if private_capital > 0 and private_days > 0 else 0
                
                yield_diff = vyapari_yield - private_yield
                
                if abs(yield_diff) > 3:
                    higher_segment = "Vyapari" if yield_diff > 0 else "Private"
                    lower_segment = "Private" if yield_diff > 0 else "Vyapari"
                    higher_yield = max(vyapari_yield, private_yield)
                    lower_yield = min(vyapari_yield, private_yield)
                    
                    recommendations.append({
                        'title': f'🟡 SEGMENT PRICING: {higher_segment} Yields {abs(yield_diff):.1f}% More Than {lower_segment}',
                        'priority': 'medium',
                        'current_state': f'{higher_segment}: {higher_yield:.2f}% yield vs {lower_segment}: {lower_yield:.2f}% yield',
                        'impact': 'Optimize pricing strategy by customer segment',
                        'action_steps': [
                            f'Review if {abs(yield_diff):.1f}% difference is intentional or should be addressed',
                            f'Consider if {lower_segment} pricing can be increased without losing customers',
                            f'Analyze if {higher_segment} customers are more profitable or just priced higher',
                            'Test pricing adjustments on new customers before portfolio-wide changes',
                            'Document pricing rationale by segment for consistency',
                            f'If unintentional: Align pricing to target {portfolio_yield:.1f}% yield across both segments'
                        ],
                        'expected_outcome': 'Optimized, intentional pricing strategy by customer type'
                    })
                else:
                    recommendations.append({
                        'title': '✅ CONSISTENT: Balanced Pricing Across Customer Types',
                        'priority': 'low',
                        'current_state': f'Vyapari ({vyapari_yield:.2f}%) and Private ({private_yield:.2f}%) yields aligned',
                        'impact': 'Fair and consistent pricing strategy',
                        'action_steps': [
                            'Maintain pricing parity across customer segments',
                            'Monitor for any emerging yield gaps',
                            'Document pricing philosophy for future reference',
                            'Use balanced approach as competitive advantage'
                        ],
                        'expected_outcome': 'Sustained customer satisfaction through fair pricing'
                    })
            else:
                recommendations.append({
                    'title': '📊 INSIGHT: Insufficient Data for Segment Analysis',
                    'priority': 'low',
                    'current_state': 'Not enough data in one or both customer segments',
                    'impact': 'N/A',
                    'action_steps': ['Collect more data before analyzing segment-level pricing'],
                    'expected_outcome': 'Future segment-based optimization'
                })
        else:
            recommendations.append({
                'title': '📊 DATA: Customer Type Analysis Not Available',
                'priority': 'low',
                'current_state': 'Customer type data not captured or insufficient released loans',
                'impact': 'Missing opportunity for segment-based pricing',
                'action_steps': [
                    'Ensure customer_type is captured for all new loans',
                    'Backfill customer_type for historical data if possible',
                    'Plan for segment-based analysis once data is sufficient'
                ],
                'expected_outcome': 'Enable future segment-based yield optimization'
            })
        
        # Recommendation 5: Dynamic Pricing Implementation
        current_month = datetime.now().month
        if current_month in [10, 11, 3, 4]:  # Festival/Wedding seasons in India
            recommendations.append({
                'title': '💡 SEASONAL: Leverage Festival Season Demand',
                'priority': 'medium',
                'current_state': f'Currently in high-demand season (Month {current_month})',
                'impact': 'Can optimize rates during peak demand periods',
                'action_steps': [
                    'Implement seasonal pricing: 0.5-1% rate increase during festival months',
                    'Expedited processing for urgent festival needs at premium pricing',
                    'Market heavily during wedding season (April-May, Oct-Nov)',
                    'Prepare for demand surge with additional capital reserves',
                    'Track yield improvement during peak vs off-peak seasons',
                    'Build inventory of high-quality collateral during off-peak for festival rush'
                ],
                'expected_outcome': 'Maximize revenue during high-demand periods'
            })
        else:
            recommendations.append({
                'title': '💡 OFF-PEAK: Drive Volume Through Promotions',
                'priority': 'medium',
                'current_state': f'Currently in off-peak season (Month {current_month})',
                'impact': 'Maintain volume through strategic promotions',
                'action_steps': [
                    'Consider limited-time promotional rates to stimulate demand',
                    'Focus on customer acquisition (easier during off-peak)',
                    'Use off-peak to test new products/services',
                    'Build customer pipeline for upcoming peak season',
                    'Offer loyalty bonuses to encourage early renewals',
                    'Prepare operations and capital for next peak season'
                ],
                'expected_outcome': 'Sustained volume and customer growth year-round'
            })
        
        return recommendations[:5]  # Return top 5
    
    # ========================================
    # DISPLAY RECOMMENDATIONS
    # ========================================
    
    st.markdown("---")
    st.markdown("## 📊 Portfolio Health Snapshot")
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.metric("Portfolio Yield", f"{portfolio_yield:.2f}%", 
                 "Target: 13-15%")
    with col2:
        st.metric("Collection Rate", f"{collection_efficiency:.1f}%",
                 "Target: 92%+")
    with col3:
        st.metric("Average LTV", f"{avg_ltv:.1f}%",
                 "Target: 70-80%")
    with col4:
        st.metric("Repeat Customer Rate", f"{repeat_rate:.1f}%",
                 "Target: 60%+")
    with col5:
        st.metric("Growth (3M)", f"{volume_growth:+.1f}%",
                 "Target: 15%+")
    
    # Generate recommendations
    loan_quality_recs = generate_loan_quality_recommendations()
    interest_yield_recs = generate_interest_yield_recommendations()
    
    # Display Loan Quality Recommendations
    if "Loan Quality" in focus_area or not focus_area:
        st.markdown("---")
        st.markdown("## 🎯 Top 5 Loan Quality Recommendations")
        
        for idx, rec in enumerate(loan_quality_recs, 1):
            priority_class = f"priority-{rec['priority']}"
            
            with st.expander(f"**{idx}. {rec['title']}**", expanded=(idx == 1)):
                st.markdown(f"<div class='recommendation-card {priority_class}'>", unsafe_allow_html=True)
                
                col1, col2 = st.columns([2, 1])
                
                with col1:
                    st.markdown(f"**📍 Current State:**")
                    st.info(rec['current_state'])
                    
                    st.markdown(f"**💥 Expected Impact:**")
                    st.success(rec['impact'])
                
                with col2:
                    # Priority badge
                    priority_colors = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
                    st.markdown(f"### {priority_colors[rec['priority']]} {rec['priority'].upper()}")
                
                st.markdown(f"**🎯 Action Steps:**")
                st.markdown("<div class='action-steps'>", unsafe_allow_html=True)
                for step in rec['action_steps']:
                    st.markdown(f"- {step}")
                st.markdown("</div>", unsafe_allow_html=True)
                
                st.markdown(f"**✨ Expected Outcome:**")
                st.markdown(f"*{rec['expected_outcome']}*")
                
                st.markdown("</div>", unsafe_allow_html=True)
    
    # Display Interest Yield Recommendations
    if "Interest Yield" in focus_area or not focus_area:
        st.markdown("---")
        st.markdown("## 💰 Top 5 Interest Yield Optimization Recommendations")
        
        for idx, rec in enumerate(interest_yield_recs, 1):
            priority_class = f"priority-{rec['priority']}"
            
            with st.expander(f"**{idx}. {rec['title']}**", expanded=(idx == 1)):
                st.markdown(f"<div class='recommendation-card {priority_class}'>", unsafe_allow_html=True)
                
                col1, col2 = st.columns([2, 1])
                
                with col1:
                    st.markdown(f"**📍 Current State:**")
                    st.info(rec['current_state'])
                    
                    st.markdown(f"**💥 Expected Impact:**")
                    st.success(rec['impact'])
                
                with col2:
                    # Priority badge
                    priority_colors = {'high': '🔴', 'medium': '🟡', 'low': '🟢'}
                    st.markdown(f"### {priority_colors[rec['priority']]} {rec['priority'].upper()}")
                
                st.markdown(f"**🎯 Action Steps:**")
                st.markdown("<div class='action-steps'>", unsafe_allow_html=True)
                for step in rec['action_steps']:
                    st.markdown(f"- {step}")
                st.markdown("</div>", unsafe_allow_html=True)
                
                st.markdown(f"**✨ Expected Outcome:**")
                st.markdown(f"*{rec['expected_outcome']}*")
                
                st.markdown("</div>", unsafe_allow_html=True)
    
    # ========================================
    # BCG MATRIX - PORTFOLIO EVOLUTION
    # ========================================
    
    st.markdown("---")
    st.markdown("## 📈 BCG Matrix: Portfolio Evolution (2020-2025)")
    st.caption("*Analyzing Loan Book vs Interest Yield vs Average Repayment Days by Year*")
    
    # Calculate yearly metrics
    yearly_data = []
    
    for year in range(2020, 2026):
        year_released = released_df[released_df['date_of_release'].dt.year == year].copy()
        
        if len(year_released) > 0:
            # Loan Book (Total Disbursed)
            loan_book = year_released['loan_amount'].sum()
            
            # Interest Yield
            year_capital = year_released['loan_amount'].sum()
            year_interest = year_released['realized_interest'].sum()
            year_days = (year_released['loan_amount'] * year_released['days_to_release']).sum() / year_capital if year_capital > 0 else 0
            year_yield = (year_interest / year_capital) * (365 / year_days) * 100 if year_capital > 0 and year_days > 0 else 0
            
            # Average Days
            avg_days_year = year_released['days_to_release'].mean()
            
            # Count
            loan_count = len(year_released)
            
            yearly_data.append({
                'Year': str(year),
                'Loan Book (₹M)': loan_book / 1_000_000,
                'Interest Yield (%)': year_yield,
                'Avg Repayment Days': avg_days_year,
                'Loan Count': loan_count
            })
    
    if yearly_data:
        bcg_df = pd.DataFrame(yearly_data)
        
        # Calculate quadrant thresholds (median values)
        median_yield = bcg_df['Interest Yield (%)'].median()
        median_book = bcg_df['Loan Book (₹M)'].median()
        
        # Create BCG Matrix bubble chart
        fig = go.Figure()
        
        # Define colors for each year
        colors = {
            '2020': '#ef4444',
            '2021': '#f59e0b', 
            '2022': '#10b981',
            '2023': '#3b82f6',
            '2024': '#8b5cf6',
            '2025': '#ec4899'
        }
        
        for _, row in bcg_df.iterrows():
            fig.add_trace(go.Scatter(
                x=[row['Interest Yield (%)']],
                y=[row['Loan Book (₹M)']],
                mode='markers+text',
                name=row['Year'],
                text=row['Year'],
                textposition='top center',
                marker=dict(
                    size=row['Avg Repayment Days'] / 3,  # Scale bubble size
                    color=colors.get(row['Year'], '#6b7280'),
                    opacity=0.7,
                    line=dict(color='white', width=2)
                ),
                hovertemplate=(
                    f"<b>{row['Year']}</b><br>"
                    f"Loan Book: ₹{row['Loan Book (₹M)']:.1f}M<br>"
                    f"Interest Yield: {row['Interest Yield (%)']:.2f}%<br>"
                    f"Avg Days: {row['Avg Repayment Days']:.0f}<br>"
                    f"Loans: {row['Loan Count']:,.0f}"
                    "<extra></extra>"
                )
            ))
        
        # Add quadrant lines
        fig.add_hline(y=median_book, line_dash="dash", line_color="gray", opacity=0.5)
        fig.add_vline(x=median_yield, line_dash="dash", line_color="gray", opacity=0.5)
        
        # Add quadrant labels
        max_yield = bcg_df['Interest Yield (%)'].max()
        max_book = bcg_df['Loan Book (₹M)'].max()
        
        fig.add_annotation(x=max_yield * 0.95, y=max_book * 0.95,
                          text="⭐ STARS<br>(High Yield, High Volume)",
                          showarrow=False, font=dict(size=10, color="green"))
        
        fig.add_annotation(x=median_yield * 0.3, y=max_book * 0.95,
                          text="💰 CASH COWS<br>(High Volume, Lower Yield)",
                          showarrow=False, font=dict(size=10, color="blue"))
        
        fig.add_annotation(x=max_yield * 0.95, y=median_book * 0.3,
                          text="❓ QUESTION MARKS<br>(High Yield, Low Volume)",
                          showarrow=False, font=dict(size=10, color="orange"))
        
        fig.add_annotation(x=median_yield * 0.3, y=median_book * 0.3,
                          text="🐕 DOGS<br>(Low Volume, Low Yield)",
                          showarrow=False, font=dict(size=10, color="red"))
        
        fig.update_layout(
            title="BCG Matrix: Portfolio Performance Evolution (Bubble Size = Avg Repayment Days)",
            xaxis_title="Interest Yield (%)",
            yaxis_title="Loan Book Size (₹M)",
            template='plotly_white',
            height=600,
            showlegend=True,
            legend=dict(
                orientation="v",
                yanchor="top",
                y=1,
                xanchor="left",
                x=1.02
            ),
            hovermode='closest'
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # BCG Interpretation
        st.markdown("### 📊 BCG Matrix Interpretation")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.markdown("""
            **Quadrant Definitions:**
            
            - **⭐ STARS** (Top Right): High yield, high volume - Your best performing years. Invest to maintain momentum.
            
            - **💰 CASH COWS** (Top Left): High volume but lower yield - Stable revenue generators. Optimize pricing.
            
            - **❓ QUESTION MARKS** (Bottom Right): High yield but low volume - Test if you can scale these conditions.
            
            - **🐕 DOGS** (Bottom Left): Low volume, low yield - Analyze what went wrong and avoid repeating.
            """)
        
        with col2:
            # Find best and worst years
            best_year_idx = bcg_df[['Interest Yield (%)', 'Loan Book (₹M)']].sum(axis=1).idxmax()
            best_year = bcg_df.loc[best_year_idx, 'Year']
            best_yield = bcg_df.loc[best_year_idx, 'Interest Yield (%)']
            best_book = bcg_df.loc[best_year_idx, 'Loan Book (₹M)']
            
            st.markdown("**Key Insights:**")
            st.success(f"🏆 Best Performance: **{best_year}** (Yield: {best_yield:.2f}%, Book: ₹{best_book:.1f}M)")
            
            # Trend analysis
            if len(bcg_df) >= 2:
                recent_yield = bcg_df.iloc[-1]['Interest Yield (%)']
                prev_yield = bcg_df.iloc[-2]['Interest Yield (%)']
                yield_trend = recent_yield - prev_yield
                
                if yield_trend > 0:
                    st.info(f"📈 Yield improving: +{yield_trend:.2f}% year-over-year")
                else:
                    st.warning(f"📉 Yield declining: {yield_trend:.2f}% year-over-year")
        
        # Detailed yearly table
        st.markdown("### 📋 Yearly Performance Summary")
        st.dataframe(
            bcg_df.style.format({
                'Loan Book (₹M)': '₹{:.2f}M',
                'Interest Yield (%)': '{:.2f}%',
                'Avg Repayment Days': '{:.0f} days',
                'Loan Count': '{:,.0f}'
            }),
            use_container_width=True,
            hide_index=True
        )
    else:
        st.warning("Insufficient data for BCG Matrix analysis. Need released loans from 2020 onwards.")
    
    # ========================================
    # EXPORT FUNCTIONALITY
    # ========================================
    
    st.markdown("---")
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col3:
        # Combine all recommendations for export
        all_recs = []
        
        for idx, rec in enumerate(loan_quality_recs, 1):
            all_recs.append({
                'Category': 'Loan Quality',
                'Priority': rec['priority'].upper(),
                'Recommendation': rec['title'].replace('🔴', '').replace('🟡', '').replace('✅', '').replace('💡', '').strip(),
                'Current State': rec['current_state'],
                'Impact': rec['impact'],
                'Actions': '; '.join(rec['action_steps'][:3])  # First 3 actions
            })
        
        for idx, rec in enumerate(interest_yield_recs, 1):
            all_recs.append({
                'Category': 'Interest Yield',
                'Priority': rec['priority'].upper(),
                'Recommendation': rec['title'].replace('🔴', '').replace('🟡', '').replace('✅', '').replace('💡', '').strip(),
                'Current State': rec['current_state'],
                'Impact': rec['impact'],
                'Actions': '; '.join(rec['action_steps'][:3])
            })
        
        export_df = pd.DataFrame(all_recs)
        csv = export_df.to_csv(index=False)
        
        st.download_button(
            "📥 Export Recommendations",
            csv,
            f"smart_recommendations_{datetime.now().strftime('%Y%m%d')}.csv",
            "text/csv",
            use_container_width=True
        )

except Exception as e:
    st.error(f"An error occurred: {e}")
    import traceback
    st.code(traceback.format_exc())
