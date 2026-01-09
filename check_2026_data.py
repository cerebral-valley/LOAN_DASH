import mysql.connector
from datetime import datetime

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="Shree@Krishna01",
    database="loan_app"
)

cursor = conn.cursor(dictionary=True)

# Check for loans disbursed in 2026
query = """
SELECT 
    YEAR(date_of_disbursement) as year,
    MONTH(date_of_disbursement) as month,
    COUNT(*) as loan_count,
    SUM(loan_amount) as total_disbursed,
    SUM(interest_amount) as total_interest,
    SUM(CASE WHEN UPPER(released) = 'TRUE' THEN 1 ELSE 0 END) as released_count
FROM loan_table
WHERE YEAR(date_of_disbursement) = 2026
GROUP BY YEAR(date_of_disbursement), MONTH(date_of_disbursement)
ORDER BY month
"""

cursor.execute(query)
results = cursor.fetchall()

print("=== Loans Disbursed in 2026 ===")
if results:
    for row in results:
        total_interest = row['total_interest'] if row['total_interest'] is not None else 0
        print(f"Month {row['month']}: {row['loan_count']} loans, "
              f"Disbursed: ₹{row['total_disbursed']:,.2f}, "
              f"Interest: ₹{total_interest:,.2f}, "
              f"Released: {row['released_count']}")
else:
    print("No loans found for 2026")

cursor.close()
conn.close()
