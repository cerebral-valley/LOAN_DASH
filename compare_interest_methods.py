import pandas as pd

df = pd.read_csv(r'c:\Users\ishan\Downloads\loan_table.csv', dtype=str)

# Convert to numeric
df['interest_deposited_till_date'] = pd.to_numeric(df['interest_deposited_till_date'], errors='coerce').fillna(0)
df['interest_amount'] = pd.to_numeric(df['interest_amount'], errors='coerce').fillna(0)

print("=== COMPARISON OF DIFFERENT CALCULATION METHODS ===\n")

# Method 1: Only interest_deposited_till_date (ALL loans)
method1 = df['interest_deposited_till_date'].sum()
print(f"Method 1 - Only interest_deposited_till_date (all loans): ₹{method1:,.2f}")

# Method 2: Current implementation (released=TRUE → interest_amount, else → interest_deposited_till_date)
released_mask = df['released'].str.upper() == 'TRUE'
method2 = df[released_mask]['interest_amount'].sum() + df[~released_mask]['interest_deposited_till_date'].sum()
print(f"Method 2 - Current (released→interest_amount, active→deposited): ₹{method2:,.2f}")

# Method 3: Max of the two for each loan
df['max_interest'] = df[['interest_amount', 'interest_deposited_till_date']].max(axis=1)
method3 = df['max_interest'].sum()
print(f"Method 3 - Max of interest_amount and deposited for each loan: ₹{method3:,.2f}")

print(f"\nBackend currently returns: ₹44,069,111.72")
print(f"\nDifference (Method2 - Backend): ₹{method2 - 44069111.72:,.2f}")
print(f"Difference (Method1 - Backend): ₹{method1 - 44069111.72:,.2f}")

# Check if overestimation is about 1.10 crore
print(f"\nIs Method2 overestimated by ~₹1.10 crore compared to Method1?")
print(f"Difference: ₹{(method2 - method1) / 10000000:.2f} crore")
