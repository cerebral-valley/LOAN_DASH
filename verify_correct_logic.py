import pandas as pd

df = pd.read_csv(r'c:\Users\ishan\Downloads\loan_table.csv', dtype=str)

# Convert to numeric
df['interest_deposited_till_date'] = pd.to_numeric(df['interest_deposited_till_date'], errors='coerce')
df['interest_amount'] = pd.to_numeric(df['interest_amount'], errors='coerce')

# Apply the CORRECT logic from db.py calculate_realized_interest
# Primary: Use interest_deposited_till_date (actual paid)
realized = df['interest_deposited_till_date'].copy()

# Fallback: For released loans with missing/zero deposited interest, use interest_amount
legacy_mask = (df['released'].str.upper() == 'TRUE') & (
    df['interest_deposited_till_date'].isna() | 
    (df['interest_deposited_till_date'] <= 0)
)

realized.loc[legacy_mask] = df.loc[legacy_mask, 'interest_amount']

# Fill any remaining NaN with 0
realized = realized.fillna(0)

correct_total = realized.sum()

print("=== CORRECT CALCULATION (from db.py logic) ===\n")
print(f"Total using correct realized_interest logic: ₹{correct_total:,.2f}")
print(f"Backend currently returns: ₹44,069,111.72")
print(f"Difference: ₹{correct_total - 44069111.72:,.2f}")
print(f"\nOverestimation: ₹{(44069111.72 - correct_total) / 10000000:.2f} crore")

print("\n=== BREAKDOWN ===")
print(f"Loans with deposited interest data: {(~(df['interest_deposited_till_date'].isna() | (df['interest_deposited_till_date'] <= 0))).sum()}")
print(f"Released loans with missing deposited (using fallback): {legacy_mask.sum()}")
print(f"Sum of deposited interest: ₹{df['interest_deposited_till_date'].fillna(0).sum():,.2f}")
print(f"Sum of fallback interest_amount: ₹{df.loc[legacy_mask, 'interest_amount'].sum():,.2f}")
