"""Quick verification of newly inserted data."""
import mysql.connector
import getpass

pwd = getpass.getpass('MySQL root password: ')
conn = mysql.connector.connect(host='localhost', user='root', password=pwd, database='loan_app')
cursor = conn.cursor()

# Latest 10 records
cursor.execute('SELECT rate_date, rate_time, ngp_hazir_gold, ngp_hazir_silver FROM gold_silver_rates ORDER BY rate_date DESC LIMIT 10')

print('\n📊 Latest 10 Records in Database:')
print('=' * 80)
print(f"{'Date':<15} {'Time':<12} {'Gold HAZIR':>15} {'Silver HAZIR':>15}")
print('=' * 80)

for row in cursor.fetchall():
    date, time, gold, silver = row
    gold_str = f"₹{gold:,.0f}" if gold else "N/A"
    silver_str = f"₹{silver:,.0f}" if silver else "N/A"
    time_str = str(time) if time else "N/A"
    print(f"{date} {time_str:<12} {gold_str:>15} {silver_str:>15}")

# Summary
cursor.execute('SELECT MIN(rate_date), MAX(rate_date), COUNT(*) FROM gold_silver_rates')
min_date, max_date, count = cursor.fetchone()

print('=' * 80)
print(f"\n✅ Total Records: {count}")
print(f"   Date Range: {min_date} to {max_date}")

# Count new records from Oct 14 onwards
cursor.execute("SELECT COUNT(*) FROM gold_silver_rates WHERE rate_date >= '2025-10-14'")
new_count = cursor.fetchone()[0]
print(f"   New Records (Oct 14+): {new_count}")

conn.close()
print("\n✅ Verification Complete!")
