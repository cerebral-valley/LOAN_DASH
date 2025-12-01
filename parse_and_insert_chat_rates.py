"""
Parse WhatsApp chat export and insert EOD gold/silver rates to database.

This script:
1. Reads the WhatsApp chat export file (_chat.txt)
2. Extracts rate entries from Oct 14, 2025 onwards
3. Parses the multi-line rate format
4. Identifies EOD (end-of-day) rates - the LAST entry per date
5. Inserts new records to gold_silver_rates table
"""

import re
from datetime import datetime
from typing import Dict, List, Optional
import mysql.connector
from collections import defaultdict

# Database credentials
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'database': 'loan_app'
}

# Regex patterns for parsing
DATE_PATTERN = r'\[(\d{2})/(\d{2})/(\d{2}), ([\d:]+\s*[AP]M)\].*\*(\d{2})/([A-Z]+)/(\d{4})\*'
NGP_HAZIR_PATTERN = r'NGP G (\d+),?\s*S (\d+)\s*\(995 HAZIR\)'
NGP_GST_PATTERN = r'NGP G (\d+),?\s*S (\d+)\s*\(RTGS 995 GST 3% ext\)'
USD_INR_PATTERN = r'USD/INR ([\d.]+)'
CMX_PATTERN = r'CMX:\s*G ([\d.]+),\s*S ([\d.]+)'

def parse_date(day: str, month: str, year: str) -> str:
    """Convert DD/MMM/YYYY or DD/MONTH/YYYY to YYYY-MM-DD format."""
    month_map = {
        'JAN': '01', 'JANUARY': '01',
        'FEB': '02', 'FEBRUARY': '02',
        'MAR': '03', 'MARCH': '03',
        'APR': '04', 'APRIL': '04',
        'MAY': '05',
        'JUN': '06', 'JUNE': '06',
        'JUL': '07', 'JULY': '07',
        'AUG': '08', 'AUGUST': '08',
        'SEP': '09', 'SEPTEMBER': '09',
        'OCT': '10', 'OCTOBER': '10',
        'NOV': '11', 'NOVEMBER': '11',
        'DEC': '12', 'DECEMBER': '12'
    }
    return f"{year}-{month_map[month.upper()]}-{day.zfill(2)}"

def parse_time(time_str: str) -> str:
    """Convert 12-hour format to 24-hour HH:MM:SS format."""
    try:
        # Handle both "5:06:35 PM" and "5:06:35PM" formats
        time_str = time_str.strip()
        if 'AM' in time_str or 'PM' in time_str:
            dt = datetime.strptime(time_str, '%I:%M:%S %p')
            return dt.strftime('%H:%M:%S')
        return time_str
    except Exception as e:
        print(f"⚠️  Error parsing time '{time_str}': {e}")
        return "00:00:00"

def extract_rate_value(pattern: str, text: str, group: int = 1) -> Optional[float]:
    """Extract numeric value from text using regex pattern."""
    match = re.search(pattern, text, re.IGNORECASE)
    if match:
        try:
            return float(match.group(group))
        except (ValueError, IndexError):
            return None
    return None

def parse_chat_file(file_path: str, start_date: str = "2025-10-14") -> Dict[str, List[Dict]]:
    """
    Parse WhatsApp chat file and group entries by date.
    
    Returns:
        Dictionary mapping date (YYYY-MM-DD) to list of rate entries
    """
    entries_by_date = defaultdict(list)
    
    print(f"📂 Reading chat file: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error reading file: {e}")
        return {}
    
    # Find all date entries with context
    lines = content.split('\n')
    i = 0
    total_lines = len(lines)
    
    while i < total_lines:
        line = lines[i]
        
        # Check if this line contains a date header
        date_match = re.search(DATE_PATTERN, line)
        
        if date_match:
            # Extract date components
            dd, mm, yy, time_12h, day_full, month_full, year_full = date_match.groups()
            
            # Convert to YYYY-MM-DD format
            rate_date = parse_date(day_full, month_full, year_full)
            
            # Only process dates from Oct 14, 2025 onwards
            if rate_date < start_date:
                i += 1
                continue
            
            # Parse time
            rate_time = parse_time(time_12h)
            
            # Collect next 10 lines as rate block context
            rate_block = '\n'.join(lines[i:min(i+10, total_lines)])
            
            # Extract rate values
            entry = {
                'rate_date': rate_date,
                'rate_time': rate_time,
                'ngp_hazir_gold': extract_rate_value(NGP_HAZIR_PATTERN, rate_block, 1),
                'ngp_hazir_silver': extract_rate_value(NGP_HAZIR_PATTERN, rate_block, 2),
                'ngp_gst_gold': extract_rate_value(NGP_GST_PATTERN, rate_block, 1),
                'ngp_gst_silver': extract_rate_value(NGP_GST_PATTERN, rate_block, 2),
                'usd_inr': extract_rate_value(USD_INR_PATTERN, rate_block, 1),
                'cmx_gold_usd': extract_rate_value(CMX_PATTERN, rate_block, 1),
                'cmx_silver_usd': extract_rate_value(CMX_PATTERN, rate_block, 2)
            }
            
            # Only add if we have at least HAZIR rates
            if entry['ngp_hazir_gold'] or entry['ngp_gst_gold']:
                entries_by_date[rate_date].append(entry)
        
        i += 1
    
    print(f"✅ Found entries for {len(entries_by_date)} unique dates")
    
    return entries_by_date

def get_eod_rates(entries_by_date: Dict[str, List[Dict]]) -> List[Dict]:
    """
    Extract End-of-Day (EOD) rates - the LAST complete entry per date.
    
    Prioritizes entries with both HAZIR and GST rates.
    """
    eod_rates = []
    
    for date in sorted(entries_by_date.keys()):
        entries = entries_by_date[date]
        
        if not entries:
            continue
        
        # Filter entries with at least HAZIR or GST gold rates
        valid_entries = [
            e for e in entries 
            if e.get('ngp_hazir_gold') or e.get('ngp_gst_gold')
        ]
        
        if not valid_entries:
            continue
        
        # Prefer entries with BOTH HAZIR and GST rates
        complete_entries = [
            e for e in valid_entries
            if e.get('ngp_hazir_gold') and e.get('ngp_gst_gold')
        ]
        
        # Take LAST complete entry if available, otherwise LAST valid entry
        if complete_entries:
            eod_entry = complete_entries[-1]
        else:
            eod_entry = valid_entries[-1]
        
        eod_rates.append(eod_entry)
        
        print(f"  {date}: {len(entries)} updates → EOD at {eod_entry['rate_time']}")
    
    return eod_rates

def insert_rates_to_db(rates: List[Dict], password: str):
    """Insert EOD rates to database using ON DUPLICATE KEY UPDATE."""
    
    if not rates:
        print("⚠️  No rates to insert!")
        return
    
    print(f"\n💾 Inserting {len(rates)} EOD rates to database...")
    
    # Connect to database
    conn = mysql.connector.connect(
        **DB_CONFIG,
        password=password
    )
    cursor = conn.cursor()
    
    # SQL insert with ON DUPLICATE KEY UPDATE
    sql = """
    INSERT INTO gold_silver_rates (
        rate_date, rate_time, 
        ngp_hazir_gold, ngp_hazir_silver,
        ngp_gst_gold, ngp_gst_silver,
        usd_inr, cmx_gold_usd, cmx_silver_usd
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s
    )
    ON DUPLICATE KEY UPDATE
        rate_time = VALUES(rate_time),
        ngp_hazir_gold = VALUES(ngp_hazir_gold),
        ngp_hazir_silver = VALUES(ngp_hazir_silver),
        ngp_gst_gold = VALUES(ngp_gst_gold),
        ngp_gst_silver = VALUES(ngp_gst_silver),
        usd_inr = VALUES(usd_inr),
        cmx_gold_usd = VALUES(cmx_gold_usd),
        cmx_silver_usd = VALUES(cmx_silver_usd)
    """
    
    inserted = 0
    updated = 0
    
    for rate in rates:
        values = (
            rate['rate_date'],
            rate['rate_time'],
            rate['ngp_hazir_gold'],
            rate['ngp_hazir_silver'],
            rate['ngp_gst_gold'],
            rate['ngp_gst_silver'],
            rate['usd_inr'],
            rate['cmx_gold_usd'],
            rate['cmx_silver_usd']
        )
        
        cursor.execute(sql, values)
        
        if cursor.rowcount == 1:
            inserted += 1
        elif cursor.rowcount == 2:
            updated += 1
        
        if (inserted + updated) % 5 == 0:
            print(f"  Progress: {inserted + updated}/{len(rates)}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"\n✅ Database update complete!")
    print(f"   • New records inserted: {inserted}")
    print(f"   • Existing records updated: {updated}")
    print(f"   • Total processed: {inserted + updated}")

def verify_data(password: str):
    """Verify the newly inserted data."""
    
    conn = mysql.connector.connect(
        **DB_CONFIG,
        password=password
    )
    cursor = conn.cursor()
    
    # Get latest records
    cursor.execute("""
        SELECT rate_date, rate_time, ngp_hazir_gold, ngp_hazir_silver
        FROM gold_silver_rates
        ORDER BY rate_date DESC
        LIMIT 5
    """)
    
    print("\n📊 Latest 5 records in database:")
    print("-" * 80)
    print(f"{'Date':<12} {'Time':<10} {'Gold (HAZIR)':<15} {'Silver (HAZIR)':<15}")
    print("-" * 80)
    
    for row in cursor.fetchall():
        date, time, gold, silver = row
        gold_str = f"₹{gold:,.0f}" if gold else "N/A"
        silver_str = f"₹{silver:,.0f}" if silver else "N/A"
        print(f"{date} {time:<10} {gold_str:<15} {silver_str:<15}")
    
    # Get date range
    cursor.execute("""
        SELECT MIN(rate_date), MAX(rate_date), COUNT(*)
        FROM gold_silver_rates
    """)
    
    min_date, max_date, count = cursor.fetchone()
    
    print("-" * 80)
    print(f"\n📅 Total records: {count}")
    print(f"   Date range: {min_date} to {max_date}")
    
    cursor.close()
    conn.close()

def main():
    """Main execution function."""
    
    print("=" * 80)
    print("🔄 WhatsApp Chat Gold/Silver Rates Parser & Inserter")
    print("=" * 80)
    
    # File path
    chat_file = r"c:\Users\ishan\Downloads\_chat.txt"
    
    # Parse chat file
    entries_by_date = parse_chat_file(chat_file, start_date="2025-10-14")
    
    if not entries_by_date:
        print("❌ No entries found!")
        return
    
    # Extract EOD rates
    print(f"\n📌 Extracting EOD (End-of-Day) rates...")
    eod_rates = get_eod_rates(entries_by_date)
    
    print(f"\n✅ Extracted {len(eod_rates)} EOD rates")
    
    # Show sample
    if eod_rates:
        print(f"\n📋 Sample EOD rate (latest):")
        sample = eod_rates[-1]
        print(f"   Date: {sample['rate_date']}")
        print(f"   Time: {sample['rate_time']}")
        print(f"   NGP HAZIR - Gold: ₹{sample['ngp_hazir_gold']:,.0f}" if sample['ngp_hazir_gold'] else "   NGP HAZIR - Gold: N/A")
        print(f"   NGP HAZIR - Silver: ₹{sample['ngp_hazir_silver']:,.0f}" if sample['ngp_hazir_silver'] else "   NGP HAZIR - Silver: N/A")
        print(f"   NGP GST - Gold: ₹{sample['ngp_gst_gold']:,.0f}" if sample['ngp_gst_gold'] else "   NGP GST - Gold: N/A")
        print(f"   NGP GST - Silver: ₹{sample['ngp_gst_silver']:,.0f}" if sample['ngp_gst_silver'] else "   NGP GST - Silver: N/A")
    
    # Get database password
    print("\n" + "=" * 80)
    password = input("Enter MySQL root password: ")
    
    # Insert to database
    insert_rates_to_db(eod_rates, password)
    
    # Verify
    verify_data(password)
    
    print("\n" + "=" * 80)
    print("✅ COMPLETE! Gold/Silver rates updated successfully!")
    print("=" * 80)

if __name__ == "__main__":
    main()
