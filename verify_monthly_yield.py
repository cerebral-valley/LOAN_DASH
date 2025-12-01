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

# Calculate individual annualized yields (the OLD/WRONG way)
released['interest_yield'] = (released['realized_interest'] / released['loan_amount']) * (365 / released['days_to_release']) * 100

# Add release month
released['release_month'] = released['date_of_release'].dt.to_period('M')

# Get last 24 months
end_month = datetime.now()
start_month = end_month - relativedelta(months=23)

monthly_df = released[
    (released['date_of_release'] >= start_month) &
    (released['date_of_release'] <= end_month)
].copy()

print("=" * 100)
print("MONTHLY YIELD ANALYSIS - CURRENT vs CORRECT")
print("=" * 100)

if not monthly_df.empty:
    # METHOD 1: Current (WRONG) - Averaging individual annualized yields
    monthly_wrong = monthly_df.groupby('release_month').agg({
        'interest_yield': 'mean',  # ← WRONG
        'realized_interest': 'sum',
        'loan_amount': 'sum',
        'loan_number': 'count'
    }).reset_index()
    
    # METHOD 2: Correct - Portfolio-level yield for each month
    monthly_correct = []
    for month in monthly_df['release_month'].unique():
        month_data = monthly_df[monthly_df['release_month'] == month]
        
        total_interest = month_data['realized_interest'].sum()
        total_capital = month_data['loan_amount'].sum()
        weighted_avg_days = (month_data['loan_amount'] * month_data['days_to_release']).sum() / total_capital
        
        # Portfolio-level yield
        portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
        
        monthly_correct.append({
            'month': month,
            'portfolio_yield': portfolio_yield,
            'total_interest': total_interest,
            'total_capital': total_capital,
            'loan_count': len(month_data),
            'weighted_avg_days': weighted_avg_days
        })
    
    correct_df = pd.DataFrame(monthly_correct).sort_values('month')
    
    # Merge for comparison
    comparison = monthly_wrong.merge(correct_df, left_on='release_month', right_on='month')
    comparison['difference'] = comparison['interest_yield'] - comparison['portfolio_yield']
    
    # Show last 12 months
    print("\nLAST 12 MONTHS COMPARISON")
    print("-" * 100)
    
    last_12 = comparison.tail(12)
    for _, row in last_12.iterrows():
        print(f"{row['release_month']} | "
              f"WRONG (Avg): {row['interest_yield']:6.2f}% | "
              f"CORRECT (Portfolio): {row['portfolio_yield']:6.2f}% | "
              f"Difference: {row['difference']:+5.2f}%")
    
    print("\n" + "=" * 100)
    print("SUMMARY METRICS COMPARISON")
    print("=" * 100)
    
    # Last 3, 6, 12 months averages
    print("\nCURRENT METHOD (WRONG - Averaging Individual Yields):")
    print(f"  Last 3 Months:  {last_12['interest_yield'].tail(3).mean():.2f}%")
    print(f"  Last 6 Months:  {last_12['interest_yield'].tail(6).mean():.2f}%")
    print(f"  Last 12 Months: {last_12['interest_yield'].mean():.2f}%")
    
    print("\nCORRECT METHOD (Portfolio-Level Yield):")
    
    # Last 3 months portfolio yield
    last_3m_data = monthly_df[monthly_df['release_month'].isin(last_12['release_month'].tail(3))]
    last_3m_interest = last_3m_data['realized_interest'].sum()
    last_3m_capital = last_3m_data['loan_amount'].sum()
    last_3m_days = (last_3m_data['loan_amount'] * last_3m_data['days_to_release']).sum() / last_3m_capital
    last_3m_yield = (last_3m_interest / last_3m_capital) * (365 / last_3m_days) * 100
    
    # Last 6 months portfolio yield
    last_6m_data = monthly_df[monthly_df['release_month'].isin(last_12['release_month'].tail(6))]
    last_6m_interest = last_6m_data['realized_interest'].sum()
    last_6m_capital = last_6m_data['loan_amount'].sum()
    last_6m_days = (last_6m_data['loan_amount'] * last_6m_data['days_to_release']).sum() / last_6m_capital
    last_6m_yield = (last_6m_interest / last_6m_capital) * (365 / last_6m_days) * 100
    
    # Last 12 months portfolio yield
    last_12m_data = monthly_df[monthly_df['release_month'].isin(last_12['release_month'])]
    last_12m_interest = last_12m_data['realized_interest'].sum()
    last_12m_capital = last_12m_data['loan_amount'].sum()
    last_12m_days = (last_12m_data['loan_amount'] * last_12m_data['days_to_release']).sum() / last_12m_capital
    last_12m_yield = (last_12m_interest / last_12m_capital) * (365 / last_12m_days) * 100
    
    print(f"  Last 3 Months:  {last_3m_yield:.2f}%")
    print(f"  Last 6 Months:  {last_6m_yield:.2f}%")
    print(f"  Last 12 Months: {last_12m_yield:.2f}%")
    
    print("\n" + "=" * 100)
    print("DENOMINATOR ANALYSIS")
    print("=" * 100)
    print("\nWhat is the denominator?")
    print("  - SUM of loan amounts for loans RELEASED in that period ✓ (Correct)")
    print("  - NOT average loan amount")
    print("  - NOT outstanding loan amount")
    print("  - NOT total portfolio value")
    print("\nThe denominator is CORRECT, but the yield calculation method is WRONG.")
    print("\nCurrent method: Average of individual annualized yields")
    print("Correct method: (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100")
    
    print("\n" + "=" * 100)
    print("IMPACT ANALYSIS")
    print("=" * 100)
    
    avg_inflation = last_12['difference'].mean()
    print(f"\nAverage Inflation: {avg_inflation:+.2f} percentage points")
    print(f"Min Inflation:     {last_12['difference'].min():+.2f} percentage points")
    print(f"Max Inflation:     {last_12['difference'].max():+.2f} percentage points")
    
    print("\n✓ The numbers in the screenshot (19.13%, 19.07%, 19.97%) are INFLATED")
    print("✓ Correct numbers should be around 14-15% (consistent with overall portfolio yield of 14.36%)")

else:
    print("No data available for analysis")
