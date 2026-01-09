import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Shree@Krishna01",
    database="loan_app"
)

cursor = conn.cursor(dictionary=True)

# Check for loans with non-zero interest in 2026
query = """
SELECT 
    loan_number,
    date_of_disbursement,
    loan_amount,
    interest_amount,
    released
FROM loan_table
WHERE YEAR(date_of_disbursement) = 2026 AND interest_amount > 0
LIMIT 10
"""

cursor.execute(query)
results = cursor.fetchall()

print("=== Loans with Non-Zero Interest in 2026 ===")
if results:
    for row in results:
        print(f"Loan {row['loan_number']}: Disbursed {row['date_of_disbursement']}, "
              f"Amount: ₹{row['loan_amount']:,.2f}, "
              f"Interest: ₹{row['interest_amount']:,.2f}, "
              f"Released: {row['released']}")
else:
    print("No loans with interest > 0 found for 2026")

# Also check total stats
cursor.execute("""
    SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN interest_amount > 0 THEN 1 ELSE 0 END) as with_interest,
        SUM(CASE WHEN interest_amount IS NULL OR interest_amount = 0 THEN 1 ELSE 0 END) as without_interest
    FROM loan_table
    WHERE YEAR(date_of_disbursement) = 2026
""")
stats = cursor.fetchone()
print(f"\n=== Summary ===")
print(f"Total 2026 loans: {stats['total_loans']}")
print(f"With interest > 0: {stats['with_interest']}")
print(f"Without interest (NULL/0): {stats['without_interest']}")

cursor.close()
conn.close()
