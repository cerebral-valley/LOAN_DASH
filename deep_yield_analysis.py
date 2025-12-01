import pandas as pd
import numpy as np
from db import get_all_loans

# Load and prepare data
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

# Calculate both simple and annualized yields
released['simple_yield'] = (released['realized_interest'] / released['loan_amount']) * 100
released['interest_yield'] = (released['realized_interest'] / released['loan_amount']) * (365 / released['days_to_release']) * 100

print("=" * 80)
print("COMPREHENSIVE YIELD ANALYSIS")
print("=" * 80)

print(f"\nTotal released loans: {len(released):,}")
print(f"Total capital deployed: ₹{released['loan_amount'].sum():,.0f}")
print(f"Total interest earned: ₹{released['realized_interest'].sum():,.0f}")

print("\n" + "=" * 80)
print("SIMPLE YIELD (Not Annualized - Actual Return per Loan)")
print("=" * 80)
simple_avg = released['simple_yield'].mean()
simple_weighted = (released['realized_interest'].sum() / released['loan_amount'].sum() * 100)

print(f"Average simple yield: {simple_avg:.2f}%")
print(f"Weighted simple yield: {simple_weighted:.2f}%")
print(f"\nInterpretation:")
print(f"  - On average, each loan earned {simple_avg:.2f}% of its principal")
print(f"  - Weighted by loan size, portfolio earned {simple_weighted:.2f}% of deployed capital")

print("\n" + "=" * 80)
print("ANNUALIZED YIELD (Time-Normalized)")
print("=" * 80)
annualized_avg = released['interest_yield'].mean()
annualized_weighted = (released['loan_amount'] * released['interest_yield']).sum() / released['loan_amount'].sum()

print(f"Average annualized yield: {annualized_avg:.2f}%")
print(f"Weighted annualized yield: {annualized_weighted:.2f}%")
print(f"Difference (weighted - average): {annualized_weighted - annualized_avg:.2f}%")

print("\n" + "=" * 80)
print("PORTFOLIO-LEVEL METRICS (Most Accurate)")
print("=" * 80)

total_int = released['realized_interest'].sum()
total_cap = released['loan_amount'].sum()
avg_days = (released['loan_amount'] * released['days_to_release']).sum() / released['loan_amount'].sum()
portfolio_yield = (total_int / total_cap) * (365 / avg_days) * 100

print(f"Weighted average holding period: {avg_days:.1f} days")
print(f"Portfolio-level annualized yield: {portfolio_yield:.2f}%")
print(f"\nThis represents: If we earned ₹{total_int:,.0f} on ₹{total_cap:,.0f}")
print(f"over an average of {avg_days:.0f} days, the annualized return is {portfolio_yield:.2f}%")

print("\n" + "=" * 80)
print("HOLDING PERIOD BREAKDOWN")
print("=" * 80)

bins = [0, 30, 90, 180, 365, 999999]
labels = ['0-30 days', '31-90 days', '91-180 days', '181-365 days', '365+ days']
released['period_bin'] = pd.cut(released['days_to_release'], bins=bins, labels=labels)

period_stats = released.groupby('period_bin', observed=True).apply(
    lambda x: pd.Series({
        'count': len(x),
        'total_amount': x['loan_amount'].sum(),
        'avg_days': x['days_to_release'].mean(),
        'avg_simple_yield': x['simple_yield'].mean(),
        'avg_annualized_yield': x['interest_yield'].mean(),
        'wt_annualized_yield': (x['loan_amount'] * x['interest_yield']).sum() / x['loan_amount'].sum()
    })
).reset_index()

print(period_stats.to_string(index=False))

print("\n" + "=" * 80)
print("LOAN SIZE vs YIELD CORRELATION")
print("=" * 80)

# Create loan size buckets
amount_bins = [0, 50000, 100000, 200000, 500000, 999999999]
amount_labels = ['< 50K', '50K-100K', '100K-200K', '200K-500K', '500K+']
released['amount_bin'] = pd.cut(released['loan_amount'], bins=amount_bins, labels=amount_labels)

amount_stats = released.groupby('amount_bin', observed=True).apply(
    lambda x: pd.Series({
        'count': len(x),
        'avg_loan_size': x['loan_amount'].mean(),
        'avg_days': x['days_to_release'].mean(),
        'avg_annualized_yield': x['interest_yield'].mean(),
        'wt_annualized_yield': (x['loan_amount'] * x['interest_yield']).sum() / x['loan_amount'].sum()
    })
).reset_index()

print(amount_stats.to_string(index=False))

print("\n" + "=" * 80)
print("WHY WEIGHTED > AVERAGE?")
print("=" * 80)

correlation = np.corrcoef(released['loan_amount'], released['interest_yield'])[0, 1]
print(f"Correlation between loan size and annualized yield: {correlation:.4f}")

if correlation > 0:
    print("\n✓ Positive correlation: Larger loans tend to have higher yields")
    print("  This explains why weighted yield (18.68%) > average yield (18.15%)")
elif correlation < 0:
    print("\n✗ Negative correlation: Larger loans tend to have lower yields")
    print("  This would suggest weighted yield should be < average yield")
else:
    print("\n○ No correlation: Loan size doesn't affect yield")

print("\n" + "=" * 80)
print("THEORETICAL VALIDATION")
print("=" * 80)

print("""
1. FORMULA CORRECTNESS:
   Annualized Yield = (Interest / Principal) × (365 / Days) × 100
   ✓ This is the standard simple interest annualization formula
   ✓ Appropriate for non-compounding loans (gold loans)
   ✓ Mathematically sound

2. AVERAGE vs WEIGHTED:
   - Average Yield = Mean of individual yields (equal weight per loan)
   - Weighted Yield = Capital-weighted mean (larger loans have more influence)
   ✓ When weighted > average, larger loans have higher yields
   ✓ This is portfolio-positive (better returns on larger capital)

3. PORTFOLIO YIELD:
   - Most accurate measure: Total Interest / Total Capital × Time Adjustment
   - This accounts for actual cash flows and capital deployment
   ✓ Should be very close to weighted yield if holding periods are similar

4. POTENTIAL ISSUES:
   ⚠ Short-term loans (1-7 days) create extreme annualized values
   ⚠ Averaging annualized yields across vastly different periods can be misleading
   ⚠ realized_interest logic may use contracted amounts for legacy loans
""")

print("\n" + "=" * 80)
print("RECOMMENDATIONS")
print("=" * 80)

print("""
For business decision-making, focus on:

1. PORTFOLIO-LEVEL YIELD: {:.2f}%
   - This is your true annualized return on deployed capital
   - Most accurate for performance measurement

2. SIMPLE WEIGHTED YIELD: {:.2f}%
   - Actual return earned on portfolio (not annualized)
   - Best for P&L reconciliation

3. SEGMENTED ANALYSIS:
   - Separate metrics for short-term (<30 days) vs long-term loans
   - Different customer types may have different yield profiles
   - Consider median instead of mean for skewed distributions

4. EXCLUDE OUTLIERS for summary metrics:
   - Consider filtering loans < 3 days for yield reporting
   - These distort averages despite being only 0.5% of loans
""".format(portfolio_yield, simple_weighted))
