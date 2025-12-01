"""
Test script to validate Aged Items calculations and LTV formula.

This script tests the three aged items criteria and validates the LTV formula.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from db import calculate_correct_ltv

def test_ltv_calculation():
    """Test the corrected LTV calculation formula."""
    print("=" * 60)
    print("TEST 1: LTV Calculation Formula")
    print("=" * 60)
    
    # Create sample data
    test_data = pd.DataFrame({
        'loan_amount': [100000, 50000, 75000],
        'net_wt': [50, 25, 30],
        'gold_rate': [6000, 6000, 6500],
        'purity': [91.6, 91.6, 99.9]
    })
    
    # Calculate LTV
    test_data['ltv_correct'] = calculate_correct_ltv(test_data)
    
    # Manual validation
    for idx, row in test_data.iterrows():
        collateral_value = row['net_wt'] * row['gold_rate'] * (row['purity'] / 100)
        expected_ltv = (row['loan_amount'] / collateral_value) * 100 if collateral_value > 0 else 0
        
        print(f"\nLoan #{idx + 1}:")
        print(f"  Loan Amount: ₹{row['loan_amount']:,.0f}")
        print(f"  Net Weight: {row['net_wt']}g")
        print(f"  Gold Rate: ₹{row['gold_rate']:,.0f}/g")
        print(f"  Purity: {row['purity']}%")
        print(f"  Collateral Value: ₹{collateral_value:,.2f}")
        print(f"  Expected LTV: {expected_ltv:.2f}%")
        print(f"  Calculated LTV: {row['ltv_correct']:.2f}%")
        print(f"  Match: {'✅' if abs(expected_ltv - row['ltv_correct']) < 0.01 else '❌'}")
    
    print("\n" + "=" * 60)

def test_aged_items_criteria():
    """Test the three aged items detection criteria."""
    print("\n" + "=" * 60)
    print("TEST 2: Aged Items Detection Criteria")
    print("=" * 60)
    
    # Create sample active loans
    today = datetime.now()
    
    test_loans = pd.DataFrame({
        'loan_number': [1001, 1002, 1003, 1004, 1005],
        'customer_type': ['Private', 'Private', 'Vyapari', 'Vyapari', 'Private'],
        'customer_name': ['Customer A', 'Customer B', 'Customer C', 'Customer D', 'Customer E'],
        'loan_amount': [100000, 50000, 200000, 150000, 80000],
        'pending_loan_amount': [100000, 50000, 200000, 150000, 80000],
        'net_wt': [50, 25, 100, 75, 40],
        'gold_rate': [6000, 6000, 6000, 6000, 6000],
        'purity': [91.6, 91.6, 91.6, 91.6, 91.6],
        'date_of_disbursement': [
            today - timedelta(days=400),  # Private > 365 days (AGED)
            today - timedelta(days=200),  # Private < 365 days (OK)
            today - timedelta(days=800),  # Vyapari > 730 days (AGED)
            today - timedelta(days=500),  # Vyapari < 730 days (OK)
            today - timedelta(days=330),  # Private ~11 months (HIGH LTV TEST)
        ],
        'released': ['FALSE'] * 5
    })
    
    # Calculate metrics
    test_loans['days_since_disbursement'] = (
        pd.Timestamp(today) - pd.to_datetime(test_loans['date_of_disbursement'])
    ).dt.days
    test_loans['months_since_disbursement'] = test_loans['days_since_disbursement'] / 30.44
    test_loans['ltv_correct'] = calculate_correct_ltv(test_loans)
    
    # For loan 5, artificially set high LTV to trigger payment overdue
    test_loans.loc[4, 'ltv_correct'] = 95.0  # Set to 95% LTV
    
    test_loans['equity_remaining'] = 100 - (
        test_loans['ltv_correct'] + 1.25 * test_loans['months_since_disbursement']
    )
    
    # Apply criteria
    print("\nCriteria 1: Private Aged (>365 days)")
    print("-" * 60)
    private_aged = test_loans[
        (test_loans['customer_type'] == 'Private') & 
        (test_loans['days_since_disbursement'] > 365)
    ]
    print(f"Count: {len(private_aged)}")
    if len(private_aged) > 0:
        for _, loan in private_aged.iterrows():
            print(f"  • Loan #{loan['loan_number']} - {loan['customer_name']}: {loan['days_since_disbursement']:.0f} days")
    
    print("\nCriteria 2: Vyapari Aged (>730 days)")
    print("-" * 60)
    vyapari_aged = test_loans[
        (test_loans['customer_type'] == 'Vyapari') & 
        (test_loans['days_since_disbursement'] > 730)
    ]
    print(f"Count: {len(vyapari_aged)}")
    if len(vyapari_aged) > 0:
        for _, loan in vyapari_aged.iterrows():
            print(f"  • Loan #{loan['loan_number']} - {loan['customer_name']}: {loan['days_since_disbursement']:.0f} days")
    
    print("\nCriteria 3: Payment Overdue (Equity < 1.25%)")
    print("-" * 60)
    payment_overdue = test_loans[test_loans['equity_remaining'] < 1.25]
    print(f"Count: {len(payment_overdue)}")
    if len(payment_overdue) > 0:
        for _, loan in payment_overdue.iterrows():
            print(f"  • Loan #{loan['loan_number']} - {loan['customer_name']}:")
            print(f"    LTV: {loan['ltv_correct']:.2f}%")
            print(f"    Months: {loan['months_since_disbursement']:.1f}")
            print(f"    Equity Remaining: {loan['equity_remaining']:.2f}%")
            print(f"    Formula: 100% - ({loan['ltv_correct']:.2f}% + 1.25% × {loan['months_since_disbursement']:.1f})")
            print(f"           = 100% - {loan['ltv_correct'] + 1.25 * loan['months_since_disbursement']:.2f}%")
            print(f"           = {loan['equity_remaining']:.2f}% {'(OVERDUE)' if loan['equity_remaining'] < 0 else '(WARNING)'}")
    
    print("\n" + "=" * 60)

def test_payment_overdue_example():
    """Test the specific example from documentation."""
    print("\n" + "=" * 60)
    print("TEST 3: Payment Overdue Example Validation")
    print("=" * 60)
    
    print("\nExample: LTV=95%, Jan to Dec (11 months)")
    print("-" * 60)
    
    ltv = 95.0
    months = 11.0
    
    equity_remaining = 100 - (ltv + 1.25 * months)
    
    print(f"  LTV: {ltv}%")
    print(f"  Months since disbursement: {months}")
    print(f"  Monthly interest accumulation: 1.25%")
    print(f"  Total accumulated interest: 1.25% × {months} = {1.25 * months}%")
    print(f"\n  Formula: 100% - (LTV + 1.25% × Months)")
    print(f"         = 100% - ({ltv}% + {1.25 * months}%)")
    print(f"         = 100% - {ltv + 1.25 * months}%")
    print(f"         = {equity_remaining}%")
    print(f"\n  Status: {'🔴 OVERDUE (negative equity!)' if equity_remaining < 0 else '🟡 WARNING'}")
    print(f"  Expected: -8.75%")
    print(f"  Calculated: {equity_remaining}%")
    print(f"  Match: {'✅' if abs(equity_remaining - (-8.75)) < 0.01 else '❌'}")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("AGED ITEMS FEATURE - VALIDATION TESTS")
    print("=" * 60)
    
    try:
        test_ltv_calculation()
        test_aged_items_criteria()
        test_payment_overdue_example()
        
        print("\n" + "=" * 60)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print()
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
