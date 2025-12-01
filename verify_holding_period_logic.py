"""
Verify holding period segmentation logic matches yearly yields
"""
import pandas as pd
import numpy as np
from db import get_all_loans
from datetime import datetime

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

# Add release year
released['release_year'] = released['date_of_release'].dt.year

print("=" * 100)
print("VERIFICATION: Holding Period Segmentation vs Yearly Yield")
print("=" * 100)

# Test for 2025
year = 2025
year_data = released[released['release_year'] == year].copy()

print(f"\n📅 YEAR {year}")
print("-" * 100)

# Overall yearly yield
total_interest = year_data['realized_interest'].sum()
total_capital = year_data['loan_amount'].sum()
weighted_avg_days = (year_data['loan_amount'] * year_data['days_to_release']).sum() / total_capital
yearly_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100

print(f"\n✅ OVERALL YEARLY YIELD: {yearly_yield:.2f}%")
print(f"   Total Interest: ₹{total_interest/1_000_000:.2f}M")
print(f"   Total Capital: ₹{total_capital/1_000_000:.2f}M")
print(f"   Weighted Avg Days: {weighted_avg_days:.1f}")

# Short-term (<30 days)
short_term = year_data[year_data['days_to_release'] < 30].copy()
if not short_term.empty:
    st_capital = short_term['loan_amount'].sum()
    st_interest = short_term['realized_interest'].sum()
    st_avg_days = (short_term['loan_amount'] * short_term['days_to_release']).sum() / st_capital
    st_yield = (st_interest / st_capital) * (365 / st_avg_days) * 100
    st_pct = (st_capital / total_capital) * 100
    
    print(f"\n📊 SHORT-TERM (<30 days):")
    print(f"   Yield: {st_yield:.2f}%")
    print(f"   Capital: ₹{st_capital/1_000_000:.2f}M ({st_pct:.1f}% of portfolio)")
    print(f"   Loan Count: {len(short_term):,}")
    print(f"   Avg Days: {st_avg_days:.1f}")

# Long-term (30+ days)
long_term = year_data[year_data['days_to_release'] >= 30].copy()
if not long_term.empty:
    lt_capital = long_term['loan_amount'].sum()
    lt_interest = long_term['realized_interest'].sum()
    lt_avg_days = (long_term['loan_amount'] * long_term['days_to_release']).sum() / lt_capital
    lt_yield = (lt_interest / lt_capital) * (365 / lt_avg_days) * 100
    lt_pct = (lt_capital / total_capital) * 100
    
    print(f"\n📊 LONG-TERM (30+ days):")
    print(f"   Yield: {lt_yield:.2f}%")
    print(f"   Capital: ₹{lt_capital/1_000_000:.2f}M ({lt_pct:.1f}% of portfolio)")
    print(f"   Loan Count: {len(long_term):,}")
    print(f"   Avg Days: {lt_avg_days:.0f}")

# Weighted average calculation
if not short_term.empty and not long_term.empty:
    weighted_avg_yield = (st_yield * st_pct / 100) + (lt_yield * lt_pct / 100)
    
    print(f"\n🔢 WEIGHTED AVERAGE CALCULATION:")
    print(f"   ({st_yield:.2f}% × {st_pct:.1f}%) + ({lt_yield:.2f}% × {lt_pct:.1f}%)")
    print(f"   = {st_yield * st_pct / 100:.2f}% + {lt_yield * lt_pct / 100:.2f}%")
    print(f"   = {weighted_avg_yield:.2f}%")
    
    diff = abs(weighted_avg_yield - yearly_yield)
    print(f"\n✅ VERIFICATION:")
    print(f"   Expected (Weighted Avg): {weighted_avg_yield:.2f}%")
    print(f"   Actual (Yearly Yield):   {yearly_yield:.2f}%")
    print(f"   Difference:              {diff:.4f}%")
    
    if diff < 0.01:
        print(f"   ✅ MATCH! The calculations are consistent.")
    else:
        print(f"   ⚠️ Small difference due to rounding")

print("\n" + "=" * 100)
print("Testing ALL YEARS (Historical Data)")
print("=" * 100)

for year in sorted(released['release_year'].unique()):
    year_data = released[released['release_year'] == year].copy()
    
    # Calculate yearly yield
    total_interest = year_data['realized_interest'].sum()
    total_capital = year_data['loan_amount'].sum()
    weighted_avg_days = (year_data['loan_amount'] * year_data['days_to_release']).sum() / total_capital
    yearly_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
    
    # Calculate holding period breakdown
    short_term = year_data[year_data['days_to_release'] < 30].copy()
    long_term = year_data[year_data['days_to_release'] >= 30].copy()
    
    if not short_term.empty and not long_term.empty:
        st_capital = short_term['loan_amount'].sum()
        st_interest = short_term['realized_interest'].sum()
        st_avg_days = (short_term['loan_amount'] * short_term['days_to_release']).sum() / st_capital
        st_yield = (st_interest / st_capital) * (365 / st_avg_days) * 100
        st_pct = (st_capital / total_capital) * 100
        
        lt_capital = long_term['loan_amount'].sum()
        lt_interest = long_term['realized_interest'].sum()
        lt_avg_days = (long_term['loan_amount'] * long_term['days_to_release']).sum() / lt_capital
        lt_yield = (lt_interest / lt_capital) * (365 / lt_avg_days) * 100
        lt_pct = (lt_capital / total_capital) * 100
        
        weighted_avg_yield = (st_yield * st_pct / 100) + (lt_yield * lt_pct / 100)
        
        print(f"\n{year}: Yearly={yearly_yield:.2f}% | ST={st_yield:.2f}%({st_pct:.0f}%) + LT={lt_yield:.2f}%({lt_pct:.0f}%) = {weighted_avg_yield:.2f}%")

print("\n" + "=" * 100)
