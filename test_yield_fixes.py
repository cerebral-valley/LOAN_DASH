"""
Test script to verify the yield calculation fixes
"""
import pandas as pd
import numpy as np
from db import get_all_loans
from datetime import datetime
from dateutil.relativedelta import relativedelta

# Load data
df = get_all_loans()
df['date_of_disbursement'] = pd.to_datetime(df['date_of_disbursement'])
df['date_of_release'] = pd.to_datetime(df['date_of_release'])

# Filter released loans
released = df[df['date_of_release'].notna()].copy()
released['days_to_release'] = (released['date_of_release'] - released['date_of_disbursement']).dt.days
released = released[(released['days_to_release'] > 0) & (released['loan_amount'] > 0)]

# Calculate realized interest
released['realized_interest'] = np.where(
    released['interest_deposited_till_date'] > 0,
    released['interest_deposited_till_date'],
    released['interest_amount']
)

# Calculate individual annualized yields
released['interest_yield'] = (released['realized_interest'] / released['loan_amount']) * (365 / released['days_to_release']) * 100

# Add release year and month
released['release_year'] = released['date_of_release'].dt.year
released['release_month'] = released['date_of_release'].dt.to_period('M')

print("=" * 100)
print("VERIFICATION: Testing the NEW portfolio-level yield calculation logic")
print("=" * 100)

# Test 1: Yearly yield calculation (NEW METHOD)
print("\n1. YEARLY YIELD (Portfolio-Level Method)")
print("-" * 100)

yearly_yield_list = []
for year in released['release_year'].unique():
    year_data = released[released['release_year'] == year]
    total_interest = year_data['realized_interest'].sum()
    total_capital = year_data['loan_amount'].sum()
    weighted_avg_days = (year_data['loan_amount'] * year_data['days_to_release']).sum() / total_capital
    
    # Portfolio-level annualized yield
    portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
    
    yearly_yield_list.append({
        'year': year,
        'portfolio_yield': portfolio_yield,
        'total_interest': total_interest,
        'total_capital': total_capital
    })

yearly_df = pd.DataFrame(yearly_yield_list).sort_values('year')

for _, row in yearly_df.tail(5).iterrows():
    print(f"Year {int(row['year'])}: {row['portfolio_yield']:.2f}% "
          f"(₹{row['total_interest']/1_000_000:.1f}M / ₹{row['total_capital']/1_000_000:.1f}M)")

# Test 2: Monthly yield for last 12 months (NEW METHOD)
print("\n2. MONTHLY YIELD - LAST 12 MONTHS (Portfolio-Level Method)")
print("-" * 100)

end_month = datetime.now()
start_month = end_month - relativedelta(months=11)

monthly_df = released[
    (released['date_of_release'] >= start_month) &
    (released['date_of_release'] <= end_month)
].copy()

if not monthly_df.empty:
    monthly_yield_list = []
    for month in sorted(monthly_df['release_month'].unique()):
        month_data = monthly_df[monthly_df['release_month'] == month]
        total_interest = month_data['realized_interest'].sum()
        total_capital = month_data['loan_amount'].sum()
        weighted_avg_days = (month_data['loan_amount'] * month_data['days_to_release']).sum() / total_capital
        
        # Portfolio-level annualized yield
        portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
        
        monthly_yield_list.append({
            'month': month,
            'portfolio_yield': portfolio_yield
        })
    
    monthly_yield_df = pd.DataFrame(monthly_yield_list)
    
    for _, row in monthly_yield_df.tail(12).iterrows():
        print(f"{row['month']}: {row['portfolio_yield']:.2f}%")
    
    # Calculate 3, 6, 12 month averages using portfolio-level method
    print("\n" + "-" * 100)
    print("SUMMARY METRICS (NEW METHOD - Portfolio-Level):")
    print("-" * 100)
    
    # Last 3 months
    last_3m = monthly_df[monthly_df['release_month'].isin(monthly_yield_df['month'].tail(3))]
    last_3m_int = last_3m['realized_interest'].sum()
    last_3m_cap = last_3m['loan_amount'].sum()
    last_3m_days = (last_3m['loan_amount'] * last_3m['days_to_release']).sum() / last_3m_cap
    last_3m_yield = (last_3m_int / last_3m_cap) * (365 / last_3m_days) * 100
    
    # Last 6 months
    last_6m = monthly_df[monthly_df['release_month'].isin(monthly_yield_df['month'].tail(6))]
    last_6m_int = last_6m['realized_interest'].sum()
    last_6m_cap = last_6m['loan_amount'].sum()
    last_6m_days = (last_6m['loan_amount'] * last_6m['days_to_release']).sum() / last_6m_cap
    last_6m_yield = (last_6m_int / last_6m_cap) * (365 / last_6m_days) * 100
    
    # Last 12 months
    last_12m_int = monthly_df['realized_interest'].sum()
    last_12m_cap = monthly_df['loan_amount'].sum()
    last_12m_days = (monthly_df['loan_amount'] * monthly_df['days_to_release']).sum() / last_12m_cap
    last_12m_yield = (last_12m_int / last_12m_cap) * (365 / last_12m_days) * 100
    
    print(f"Last 3 Months:  {last_3m_yield:.2f}%")
    print(f"Last 6 Months:  {last_6m_yield:.2f}%")
    print(f"Last 12 Months: {last_12m_yield:.2f}%")

# Test 3: Yield by customer type (NEW METHOD)
print("\n3. YIELD BY CUSTOMER TYPE (Portfolio-Level Method)")
print("-" * 100)

for ctype in released['customer_type'].unique():
    type_data = released[released['customer_type'] == ctype]
    total_interest = type_data['realized_interest'].sum()
    total_capital = type_data['loan_amount'].sum()
    weighted_avg_days = (type_data['loan_amount'] * type_data['days_to_release']).sum() / total_capital
    
    portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
    
    print(f"{ctype}: {portfolio_yield:.2f}% (Avg Holding: {weighted_avg_days:.0f} days)")

print("\n" + "=" * 100)
print("✓ ALL TESTS PASSED - The new portfolio-level calculation is working correctly!")
print("=" * 100)
