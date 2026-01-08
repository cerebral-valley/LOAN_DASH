import pandas as pd

# Read the CSV
df = pd.read_csv(r'c:\Users\ishan\Downloads\loan_table.csv')

print(f'Total records in CSV: {len(df)}')
print(f'Released=TRUE count: {(df["released"] == "TRUE").sum()}')
print(f'Released!=TRUE count: {(df["released"] != "TRUE").sum()}')
print()

# Apply the correct logic
# For released = TRUE: use interest_amount
# For released != TRUE: use interest_deposited_till_date

# Convert to numeric, handling NULLs
df['interest_amount'] = pd.to_numeric(df['interest_amount'], errors='coerce').fillna(0)
df['interest_deposited_till_date'] = pd.to_numeric(df['interest_deposited_till_date'], errors='coerce').fillna(0)

# Calculate using the logic
released_interest = df[df['released'] == 'TRUE']['interest_amount'].sum()
active_interest = df[df['released'] != 'TRUE']['interest_deposited_till_date'].sum()
total_interest = released_interest + active_interest

print(f'Released loans interest (interest_amount): {released_interest:,.2f}')
print(f'Active loans interest (interest_deposited_till_date): {active_interest:,.2f}')
print(f'Total Interest Received: {total_interest:,.2f}')
print()
print(f'Backend reported: 11,632,571.30')
print(f'Difference: {11632571.30 - total_interest:,.2f}')
print()

# Show some sample data
print('\n=== Sample of Released Loans ===')
print(df[df['released'] == 'TRUE'][['loan_number', 'released', 'interest_amount', 'interest_deposited_till_date']].head(10))

print('\n=== Sample of Active Loans ===')
print(df[df['released'] != 'TRUE'][['loan_number', 'released', 'interest_amount', 'interest_deposited_till_date']].head(10))
