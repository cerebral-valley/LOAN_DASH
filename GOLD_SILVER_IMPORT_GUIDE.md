# How to Update Gold/Silver Rates from WhatsApp Chat

## Quick Guide

Follow these simple steps whenever you want to add new gold/silver rates from the WhatsApp group chat.

---

## Step-by-Step Instructions

### 1. Export WhatsApp Chat

1. Open WhatsApp on your phone
2. Go to "Maha Suvarna Gold Rates" group
3. Tap the group name at the top
4. Scroll down and tap "Export Chat"
5. Choose "Without Media"
6. Send to your computer (email, cloud drive, etc.)
7. Save the file as `_chat.txt` in `c:\Users\ishan\Downloads\`

### 2. Run the Parser Script

Open PowerShell in the `Z:\Loan_Dash` directory and run:

```powershell
.\.venv\Scripts\python.exe parse_and_insert_chat_rates.py
```

### 3. Enter MySQL Password

When prompted, enter the MySQL root password:
```
Shree@Krishna01
```

### 4. Wait for Completion

The script will:
- Parse the WhatsApp chat file
- Extract EOD (End-of-Day) rates for each date
- Insert new records to the database
- Show progress and summary

Example output:
```
✅ Extracted 42 EOD rates

💾 Inserting 42 EOD rates to database...
  Progress: 5/42
  Progress: 10/42
  ...
  Progress: 40/42

✅ Database update complete!
   • New records inserted: 42
   • Existing records updated: 0
```

### 5. Verify Data (Optional)

To verify the import was successful:

```powershell
.\.venv\Scripts\python.exe verify_gold_silver_data.py
```

This shows:
- Latest 10 records
- Total record count
- Date range coverage

---

## What the Script Does

### Automatic Processing

1. **Reads WhatsApp chat export** (`_chat.txt`)
2. **Finds all rate entries** from Oct 14, 2025 onwards
3. **Identifies EOD rates** - the LAST complete entry for each day
4. **Parses rate values**:
   - NGP Gold/Silver (HAZIR)
   - NGP Gold/Silver (GST 3%)
   - USD/INR exchange rate
   - CMX Gold/Silver (USD)
5. **Inserts to database** without duplicates
6. **Updates dashboard automatically**

### Smart Features

- **Duplicate handling**: Won't insert the same date twice (uses `ON DUPLICATE KEY UPDATE`)
- **NULL handling**: Accepts entries even if some rates are missing
- **Date filtering**: Only processes dates >= Oct 14, 2025 (configurable)
- **Progress tracking**: Shows real-time progress during insertion
- **Error recovery**: Continues even if some entries have issues

---

## Dashboard Access

After import, view the updated data:

**URL**: http://localhost:8501

**Page**: "💰 Gold & Silver Rates"

The dashboard automatically shows:
- Latest 30 days of rates
- 3-month rolling averages
- Price movement charts
- Statistical summaries

**No restart required!** Just refresh the page.

---

## Troubleshooting

### "File not found" Error

**Problem**: `c:\Users\ishan\Downloads\_chat.txt` doesn't exist

**Solution**: 
1. Export WhatsApp chat again
2. Make sure it's saved as `_chat.txt` (exactly)
3. Save it in `c:\Users\ishan\Downloads\`

### "Column cannot be null" Error

**Problem**: Database schema doesn't allow NULL values

**Solution**: Run the schema update script (one-time only):
```powershell
.\.venv\Scripts\python.exe update_gold_silver_table_allow_nulls.py
```

### "No entries found" Error

**Problem**: Chat file format might have changed

**Solution**:
1. Check if chat file has entries after Oct 14, 2025
2. Open `_chat.txt` and verify format looks like:
   ```
   [14/10/25, 8:01:17 PM] Maha Suvarna Gold Rates: *14/OCT/2025*
   *MSLIVE BULLION RATES*
   NGP G 131500, S 190180 (995 HAZIR)
   ```

### MySQL Connection Error

**Problem**: Can't connect to database

**Solution**:
1. Check if MySQL is running
2. Verify password is correct
3. Check database name is `loan_app`

---

## Configuration

### Change Start Date

To import rates from a different date, edit `parse_and_insert_chat_rates.py`:

Find line ~301:
```python
entries_by_date = parse_chat_file(chat_file, start_date="2025-10-14")
```

Change `start_date` to your desired date (format: `YYYY-MM-DD`)

### Change Chat File Location

To use a different file location, edit line ~299:
```python
chat_file = r"c:\Users\ishan\Downloads\_chat.txt"
```

---

## Technical Details

### Files Involved

1. **parse_and_insert_chat_rates.py** (348 lines)
   - Main parser and insertion script
   - Run this every time you want to import new rates

2. **update_gold_silver_table_allow_nulls.py** (60 lines)
   - Schema migration (run once)
   - Already executed, don't need to run again

3. **verify_gold_silver_data.py** (35 lines)
   - Verification utility
   - Optional, use to check data

### Database Table

**Name**: `loan_app.gold_silver_rates`

**Columns**:
- `rate_date` (DATE, PRIMARY KEY)
- `rate_time` (TIME)
- `ngp_hazir_gold` (DECIMAL 10,2) - Gold HAZIR rate
- `ngp_hazir_silver` (DECIMAL 10,2) - Silver HAZIR rate
- `ngp_gst_gold` (DECIMAL 10,2) - Gold GST rate
- `ngp_gst_silver` (DECIMAL 10,2) - Silver GST rate
- `usd_inr` (DECIMAL 10,5) - USD/INR exchange rate
- `cmx_gold_usd` (DECIMAL 10,2) - CMX Gold in USD
- `cmx_silver_usd` (DECIMAL 10,2) - CMX Silver in USD

All columns (except `rate_date`) allow NULL values.

### Regex Patterns

The parser uses these patterns to extract rates:

- **Date**: `\[(\d{2})/(\d{2})/(\d{2}), ([\d:]+\s*[AP]M)\].*\*(\d{2})/([A-Z]+)/(\d{4})\*`
- **NGP HAZIR**: `NGP G (\d+),?\s*S (\d+)\s*\(995 HAZIR\)`
- **NGP GST**: `NGP G (\d+),?\s*S (\d+)\s*\(RTGS 995 GST 3% ext\)`
- **USD/INR**: `USD/INR ([\d.]+)`
- **CMX**: `CMX:\s*G ([\d.]+),\s*S ([\d.]+)`

---

## Example: Complete Import Session

```powershell
# 1. Navigate to project
cd Z:\Loan_Dash

# 2. Run parser
.\.venv\Scripts\python.exe parse_and_insert_chat_rates.py

# Output:
# 🔄 WhatsApp Chat Gold/Silver Rates Parser & Inserter
# 📂 Reading chat file: c:\Users\ishan\Downloads\_chat.txt
# ✅ Found entries for 42 unique dates
# 
# 📌 Extracting EOD (End-of-Day) rates...
#   2025-10-14: 11 updates → EOD at 20:01:17
#   2025-10-15: 8 updates → EOD at 20:01:55
#   ...
# 
# ✅ Extracted 42 EOD rates
# 
# Enter MySQL root password: ************
# 
# 💾 Inserting 42 EOD rates to database...
#   Progress: 5/42
#   ...
#   Progress: 40/42
# 
# ✅ Database update complete!
#    • New records inserted: 42
#    • Existing records updated: 0

# 3. Verify (optional)
.\.venv\Scripts\python.exe verify_gold_silver_data.py

# Output:
# 📊 Latest 10 Records in Database:
# Date            Time         Gold HAZIR    Silver HAZIR
# 2025-12-01      17:05:57       ₹129,240      ₹180,920
# ...

# 4. View in dashboard
# Open browser: http://localhost:8501
# Click: "💰 Gold & Silver Rates"
```

---

## Summary

**Quick Steps**:
1. Export WhatsApp chat → `c:\Users\ishan\Downloads\_chat.txt`
2. Run: `.\.venv\Scripts\python.exe parse_and_insert_chat_rates.py`
3. Enter password: `Shree@Krishna01`
4. Done! Dashboard updates automatically

**That's it!** The process is fully automated and handles all the complexity for you.

---

**Last Updated**: December 1, 2025  
**Status**: Production Ready ✅  
**Maintainer**: Ishan Kukade
