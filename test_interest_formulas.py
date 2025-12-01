"""
Test script to verify the corrected interest formulas in Executive Dashboard
"""

import sys
import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import pandas as pd
import db
from datetime import datetime

def test_interest_formulas():
    """Test the corrected interest calculation formulas"""
    
    print("=" * 80)
    print("INTEREST FORMULA VERIFICATION TEST")
    print("=" * 80)
    print()
    
    # Load loan data
    print("Loading loan data...")
    loan_df = db.get_all_loans()
    print(f"Total loans: {len(loan_df):,}")
    print()
    
    # Filter to released loans only
    interest_df = loan_df[loan_df['date_of_release'].notna()].copy()
    print(f"Released loans: {len(interest_df):,}")
    print()
    
    # Calculate realized_interest
    print("Calculating realized_interest...")
    interest_df['realized_interest'] = db.calculate_realized_interest(interest_df)
    print()
    
    # Test Formula 1: Average Interest = Total Realized Interest / Number of Loans
    print("=" * 80)
    print("FORMULA 1: AVERAGE INTEREST")
    print("=" * 80)
    print()
    
    total_realized = interest_df['realized_interest'].sum()
    num_loans = len(interest_df)
    avg_interest = total_realized / num_loans
    
    print(f"Total Realized Interest:    ₹{total_realized:,.2f}")
    print(f"Number of Released Loans:   {num_loans:,}")
    print(f"Average Interest:           ₹{avg_interest:,.2f}")
    print(f"Formula: {total_realized:,.2f} / {num_loans} = ₹{avg_interest:,.2f}")
    print()
    
    # Test Formula 2: Average Daily Interest = Total Realized / Days from March 1, 2020
    print("=" * 80)
    print("FORMULA 2: AVERAGE DAILY INTEREST")
    print("=" * 80)
    print()
    
    start_date = pd.Timestamp('2020-03-01')
    today = pd.Timestamp.now()
    days_from_start = (today - start_date).days
    avg_daily_interest = total_realized / days_from_start
    
    print(f"Start Date (Fixed):         March 1, 2020")
    print(f"Today's Date:               {today.strftime('%B %d, %Y')}")
    print(f"Days from Start:            {days_from_start:,} days")
    print(f"Total Realized Interest:    ₹{total_realized:,.2f}")
    print(f"Avg Daily Interest:         ₹{avg_daily_interest:,.2f}")
    print(f"Formula: {total_realized:,.2f} / {days_from_start} = ₹{avg_daily_interest:,.2f}")
    print()
    
    # Test Range Distribution
    print("=" * 80)
    print("INTEREST RANGE DISTRIBUTION")
    print("=" * 80)
    print()
    
    bins = [0, 1000, 2500, 5000, 10000, 20000, 50000, 100000, float('inf')]
    labels = ['₹0-1,000', '₹1,001-2,500', '₹2,501-5,000', '₹5,001-10,000', 
             '₹10,001-20,000', '₹20,001-50,000', '₹50,001-1,00,000', '₹1,00,000+']
    
    interest_df['interest_range'] = pd.cut(interest_df['realized_interest'], bins=bins, labels=labels, right=True)
    
    range_summary = interest_df.groupby('interest_range', observed=True).agg({
        'realized_interest': ['sum', 'count', 'mean']
    }).reset_index()
    range_summary.columns = ['Interest Range', 'Total Interest', 'Count', 'Avg Interest']
    
    print("Realized Interest Range Distribution:")
    print()
    print(range_summary.to_string(index=False))
    print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print()
    print(f"✅ Average Interest:       ₹{avg_interest:,.2f} (per loan)")
    print(f"✅ Avg Daily Interest:     ₹{avg_daily_interest:,.2f} (since March 1, 2020)")
    print(f"✅ Total Ranges:           {len(range_summary)} ranges")
    print(f"✅ Total Items:            {range_summary['Count'].sum():,.0f} released items")
    print()


if __name__ == "__main__":
    test_interest_formulas()
