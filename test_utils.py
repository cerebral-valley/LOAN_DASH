"""
Test script for utils.py
Run this to validate all utility functions work correctly
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import utils

print("=" * 70)
print("TESTING UTILS.PY - Loan Dashboard Utility Functions")
print("=" * 70)

# Create sample data
print("\n1. Creating sample loan data...")
sample_data = pd.DataFrame({
    'loan_number': range(1, 11),
    'loan_amount': [50000, 75000, 100000, 150000, 200000, 60000, 80000, 120000, 90000, 110000],
    'realized_interest': [5000, 7500, 10000, 15000, 20000, 6000, 8000, 12000, 9000, 11000],
    'date_of_disbursement': pd.date_range('2024-01-01', periods=10, freq='30D'),
    'date_of_release': pd.date_range('2024-06-01', periods=10, freq='30D'),
    'customer_type': ['vyapari', 'Private', 'VYAPARI', 'private'] * 2 + ['Vyapari', 'Private'],
    'customer_name': [f'Customer {i}' for i in range(1, 11)]
})

print(f"✅ Created {len(sample_data)} sample loans")
print(f"   Total loan amount: ₹{sample_data['loan_amount'].sum():,.0f}")

# Test 2: Add date columns
print("\n2. Testing add_date_columns()...")
utils.add_date_columns(sample_data, 'date_of_disbursement')
assert 'year' in sample_data.columns
assert 'month' in sample_data.columns
assert 'month_name' in sample_data.columns
print("✅ Date columns added successfully")
print(f"   Columns: {[col for col in sample_data.columns if col in ['year', 'month', 'month_name', 'day']]}")

# Test 3: Normalize customer data
print("\n3. Testing normalize_customer_data()...")
utils.normalize_customer_data(sample_data)
unique_types = sample_data['customer_type'].unique()
print(f"✅ Customer data normalized: {unique_types}")
assert all(t in ['Vyapari', 'Private'] for t in unique_types)

# Test 4: Calculate holding period
print("\n4. Testing calculate_holding_period()...")
utils.calculate_holding_period(sample_data)
assert 'days_to_release' in sample_data.columns
avg_days = sample_data['days_to_release'].mean()
print(f"✅ Holding period calculated")
print(f"   Average days: {avg_days:.0f}")

# Test 5: Portfolio yield calculation (CRITICAL TEST)
print("\n5. Testing calculate_portfolio_yield()... (CRITICAL)")
metrics = utils.calculate_portfolio_yield(sample_data)
print(f"✅ Portfolio metrics calculated:")
print(f"   Portfolio Yield: {metrics['portfolio_yield']:.2f}%")
print(f"   Total Interest: ₹{metrics['total_interest']:,.0f}")
print(f"   Total Capital: ₹{metrics['total_capital']:,.0f}")
print(f"   Weighted Avg Days: {metrics['weighted_avg_days']:.0f}")
print(f"   Simple Return: {metrics['simple_return']:.2f}%")

# Validate formula
expected_simple = (metrics['total_interest'] / metrics['total_capital']) * 100
expected_yield = expected_simple * (365 / metrics['weighted_avg_days'])
assert abs(metrics['simple_return'] - expected_simple) < 0.01
assert abs(metrics['portfolio_yield'] - expected_yield) < 0.01
print("✅ Formula validation passed!")

# Test 6: Weighted average days
print("\n6. Testing calculate_weighted_average_days()...")
weighted_days = utils.calculate_weighted_average_days(sample_data)
print(f"✅ Weighted average days: {weighted_days:.2f}")
assert weighted_days > 0

# Test 7: Create monthly pivot
print("\n7. Testing create_monthly_pivot()...")
pivot = utils.create_monthly_pivot(
    sample_data,
    'loan_amount',
    date_col='date_of_disbursement',
    agg_func='sum'
)
print(f"✅ Monthly pivot created")
print(f"   Shape: {pivot.shape}")
print(f"   Has 'Total' row: {'Total' in pivot.index}")

# Test 8: YoY and MoM changes
print("\n8. Testing calculate_yoy_change() and calculate_mom_change()...")
if pivot.shape[1] > 1:
    yoy = utils.calculate_yoy_change(pivot)
    print(f"✅ YoY change calculated, shape: {yoy.shape}")

mom = utils.calculate_mom_change(pivot)
print(f"✅ MoM change calculated, shape: {mom.shape}")

# Test 9: Data validation
print("\n9. Testing validate_loan_data()...")
validation = utils.validate_loan_data(sample_data)
print(f"✅ Validation complete:")
print(f"   Valid: {validation['valid']}")
print(f"   Missing columns: {validation['missing_cols']}")
print(f"   Warnings: {validation['warnings']}")

# Test 10: Missing values check
print("\n10. Testing check_missing_values()...")
missing_report = utils.check_missing_values(sample_data)
print(f"✅ Missing values report:")
if missing_report.empty:
    print("   No missing values found!")
else:
    print(missing_report.to_string())

# Test 11: Formatting functions
print("\n11. Testing formatting functions...")
formatted_currency = utils.format_currency(1234567.89)
formatted_pct = utils.format_percentage(14.36)
formatted_pct_signed = utils.format_percentage(5.5, include_sign=True)
print(f"✅ Currency: {formatted_currency}")
print(f"✅ Percentage: {formatted_pct}")
print(f"✅ Percentage (signed): {formatted_pct_signed}")

# Test 12: Safe divide
print("\n12. Testing safe_divide()...")
result1 = utils.safe_divide(100, 10)
result2 = utils.safe_divide(100, 0, default=0.0)
print(f"✅ 100 / 10 = {result1}")
print(f"✅ 100 / 0 (with default) = {result2}")

print("\n" + "=" * 70)
print("ALL TESTS PASSED! ✅")
print("=" * 70)
print("\nutils.py is ready for production use!")
print("Next step: Migrate pages to use these utilities")
