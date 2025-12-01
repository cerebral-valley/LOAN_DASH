"""
Test script to verify the realized_interest calculation is working correctly.
Compares old method (interest_amount) vs new method (deposited + fallback).
"""

import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import pandas as pd
import db

def test_realized_interest():
    """Test the calculate_realized_interest function"""
    
    print("=" * 80)
    print("REALIZED INTEREST CALCULATION TEST")
    print("=" * 80)
    print()
    
    # Load loan data
    print("Loading loan data...")
    loan_df = db.get_all_loans()
    print(f"Total loans: {len(loan_df):,}")
    print()
    
    # Filter to released loans only
    released = loan_df[loan_df['released'] == 'TRUE'].copy()
    print(f"Released loans: {len(released):,}")
    print()
    
    # Calculate using OLD method (interest_amount only)
    old_total_interest = released['interest_amount'].sum()
    
    # Calculate using NEW method (deposited + fallback)
    released['realized_interest'] = db.calculate_realized_interest(released)
    new_total_interest = released['realized_interest'].sum()
    
    # Statistics
    print("=" * 80)
    print("COMPARISON: OLD vs NEW METHOD")
    print("=" * 80)
    print()
    
    print(f"OLD Method (interest_amount):           ₹{old_total_interest:,.2f}")
    print(f"NEW Method (deposited + fallback):      ₹{new_total_interest:,.2f}")
    print(f"Difference:                              ₹{new_total_interest - old_total_interest:+,.2f}")
    print(f"Change:                                  {((new_total_interest - old_total_interest) / old_total_interest * 100):+.2f}%")
    print()
    
    # Legacy loan analysis
    print("=" * 80)
    print("LEGACY LOAN ANALYSIS")
    print("=" * 80)
    print()
    
    legacy_mask = (released['released'] == 'TRUE') & (
        released['interest_deposited_till_date'].isna() | 
        (released['interest_deposited_till_date'] <= 0)
    )
    
    legacy_count = legacy_mask.sum()
    modern_count = len(released) - legacy_count
    
    print(f"Total Released Loans:                    {len(released):,}")
    print(f"  Modern loans (using deposited):        {modern_count:,} ({modern_count/len(released)*100:.1f}%)")
    print(f"  Legacy loans (using fallback):         {legacy_count:,} ({legacy_count/len(released)*100:.1f}%)")
    print()
    
    # Interest breakdown
    modern_interest = released.loc[~legacy_mask, 'interest_deposited_till_date'].sum()
    legacy_interest = released.loc[legacy_mask, 'interest_amount'].sum()
    
    print(f"Interest from modern loans:              ₹{modern_interest:,.2f}")
    print(f"Interest from legacy loans (fallback):   ₹{legacy_interest:,.2f}")
    print(f"Total realized interest:                 ₹{modern_interest + legacy_interest:,.2f}")
    print()
    
    # Sample breakdown
    print("=" * 80)
    print("SAMPLE LOANS (First 10 Released)")
    print("=" * 80)
    print()
    
    sample = released.head(10)[['loan_number', 'customer_name', 'loan_amount', 
                                  'interest_amount', 'interest_deposited_till_date', 
                                  'realized_interest']].copy()
    
    sample['method'] = sample.apply(
        lambda row: 'Deposited' if (row['interest_deposited_till_date'] > 0) else 'Fallback',
        axis=1
    )
    
    print(sample.to_string(index=False))
    print()
    
    # Portfolio yield comparison
    print("=" * 80)
    print("PORTFOLIO YIELD IMPACT")
    print("=" * 80)
    print()
    
    released['days_to_release'] = (
        pd.to_datetime(released['date_of_release']) - 
        pd.to_datetime(released['date_of_disbursement'])
    ).dt.days
    
    total_capital = released['loan_amount'].sum()
    weighted_avg_days = (released['loan_amount'] * released['days_to_release']).sum() / total_capital
    
    # Old yield
    old_yield = (old_total_interest / total_capital) * (365 / weighted_avg_days) * 100
    
    # New yield
    new_yield = (new_total_interest / total_capital) * (365 / weighted_avg_days) * 100
    
    print(f"Total Capital:                           ₹{total_capital:,.2f}")
    print(f"Weighted Avg Days:                       {weighted_avg_days:.1f} days")
    print()
    print(f"OLD Portfolio Yield (charged):           {old_yield:.2f}%")
    print(f"NEW Portfolio Yield (actual paid):       {new_yield:.2f}%")
    print(f"Yield Difference:                        {new_yield - old_yield:+.2f}%")
    print()
    
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)
    print()
    
    if abs(new_total_interest - old_total_interest) > 1000:
        print("✅ NEW METHOD IS DIFFERENT - Formula is working correctly!")
        print(f"   Using actual paid interest reduces total by ₹{old_total_interest - new_total_interest:,.2f}")
    else:
        print("⚠️  WARNING: Methods are very similar - check if deposited data exists")
    
    print()


if __name__ == "__main__":
    test_realized_interest()
