import pandas as pd
import numpy as np
from db import get_all_loans

# Load data
df = get_all_loans()
df['date_of_disbursement'] = pd.to_datetime(df['date_of_disbursement'])
df['date_of_release'] = pd.to_datetime(df['date_of_release'])

# Filter released loans
released = df[df['date_of_release'].notna()].copy()
released['days_to_release'] = (released['date_of_release'] - released['date_of_disbursement']).dt.days

# Filter valid loans
released = released[(released['days_to_release'] > 0) & (released['loan_amount'] > 0)]

# Calculate realized interest (same logic as Executive Dashboard)
released['realized_interest'] = np.where(
    released['interest_deposited_till_date'] > 0,
    released['interest_deposited_till_date'],
    released['interest_amount']
)

# Calculate annualized interest yield
released['interest_yield'] = (released['realized_interest'] / released['loan_amount']) * (365 / released['days_to_release']) * 100

# Find outliers
print("=" * 80)
print("TOP 20 HIGHEST YIELD LOANS (OUTLIERS)")
print("=" * 80)

outliers = released.nlargest(20, 'interest_yield')[[
    'loan_number', 'customer_name', 'customer_type', 
    'loan_amount', 'realized_interest', 'days_to_release', 'interest_yield'
]]
print(outliers.to_string(index=False))

print("\n" + "=" * 80)
print("YIELD STATISTICS")
print("=" * 80)
print(f"Max Yield: {released['interest_yield'].max():.2f}%")
print(f"99th Percentile: {released['interest_yield'].quantile(0.99):.2f}%")
print(f"95th Percentile: {released['interest_yield'].quantile(0.95):.2f}%")
print(f"90th Percentile: {released['interest_yield'].quantile(0.90):.2f}%")
print(f"75th Percentile: {released['interest_yield'].quantile(0.75):.2f}%")
print(f"Median: {released['interest_yield'].median():.2f}%")
print(f"Mean: {released['interest_yield'].mean():.2f}%")

print("\n" + "=" * 80)
print("OUTLIER COUNTS BY THRESHOLD")
print("=" * 80)
print(f"Loans with yield > 200%: {(released['interest_yield'] > 200).sum()} ({(released['interest_yield'] > 200).sum() / len(released) * 100:.1f}%)")
print(f"Loans with yield > 500%: {(released['interest_yield'] > 500).sum()} ({(released['interest_yield'] > 500).sum() / len(released) * 100:.1f}%)")
print(f"Loans with yield > 1000%: {(released['interest_yield'] > 1000).sum()} ({(released['interest_yield'] > 1000).sum() / len(released) * 100:.1f}%)")
print(f"Loans with yield > 2000%: {(released['interest_yield'] > 2000).sum()} ({(released['interest_yield'] > 2000).sum() / len(released) * 100:.1f}%)")

print("\n" + "=" * 80)
print("OUTLIERS BY HOLDING PERIOD (yield > 200%)")
print("=" * 80)
high_yield = released[released['interest_yield'] > 200]
period_summary = high_yield.groupby('days_to_release').agg({
    'loan_number': 'count',
    'interest_yield': 'mean',
    'loan_amount': 'mean'
}).rename(columns={
    'loan_number': 'count',
    'interest_yield': 'avg_yield',
    'loan_amount': 'avg_loan_amt'
}).sort_index()

print(period_summary.to_string())

print("\n" + "=" * 80)
print("CUSTOMER TYPE BREAKDOWN (yield > 200%)")
print("=" * 80)
customer_breakdown = high_yield.groupby('customer_type').agg({
    'loan_number': 'count',
    'interest_yield': 'mean'
}).rename(columns={
    'loan_number': 'count',
    'interest_yield': 'avg_yield'
})
print(customer_breakdown.to_string())
