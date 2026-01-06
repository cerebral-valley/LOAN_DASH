# Setup Instructions - SQLAlchemy Environment Fix

## Problem Solved ✅

Your project uses **SQLAlchemy 2.0+** features (like `DeclarativeBase`, `Mapped`, `mapped_column`) but you were running the application with the **global Python interpreter** which has SQLAlchemy 1.4.41 installed.

## The Solution

Your Poetry virtual environment (`.venv`) already has the correct SQLAlchemy version (2.0.42) installed. You just need to **always run the application from within this environment**.

---

## How to Run the Application

### Option 1: Use the Batch Files (Easiest) 🚀

We've created/updated batch files that automatically activate the Poetry environment:

#### For Production:
```batch
run_production_loan_dashboard.bat
```
This runs the app on `0.0.0.0:8502` (accessible from network)

#### For Development:
```batch
run_dev.bat
```
This runs the app on `localhost:8501` (local only)

### Option 2: Manual Poetry Activation

If you prefer to use the command line:

```powershell
# Navigate to project directory
cd z:\Loan_Dash

# Activate Poetry environment
.\.venv\Scripts\Activate.ps1

# Run the application
streamlit run main.py
```

### Option 3: Using Poetry Shell

```powershell
cd z:\Loan_Dash
poetry shell
streamlit run main.py
```

---

## Verification

To verify your environment is correct, run:

```powershell
# Activate the environment first
.\.venv\Scripts\Activate.ps1

# Check SQLAlchemy version (should be 2.0.42 or higher)
python -c "import sqlalchemy; print(sqlalchemy.__version__)"

# Test the imports
python -c "from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column; print('✓ All imports successful!')"
```

---

## Important Notes

⚠️ **Always activate the Poetry environment before running the app**

✅ **Your global Python** (3.13.5) has SQLAlchemy 1.4.41 - DO NOT use it for this project

✅ **Your Poetry environment** (.venv) has SQLAlchemy 2.0.42 - THIS is what you need

🔒 **Security**: This solution doesn't modify your global Python installation - everything stays isolated in the Poetry virtual environment

---

## Troubleshooting

### If you still get import errors:

1. Make sure you're in the right directory:
   ```powershell
   cd z:\Loan_Dash
   ```

2. Reinstall dependencies:
   ```powershell
   poetry install
   ```

3. Verify the environment:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   python -c "import sqlalchemy; print(sqlalchemy.__version__)"
   ```

### If Poetry environment doesn't exist:

```powershell
cd z:\Loan_Dash
poetry install
```

---

## What Changed

- ✅ Updated `run_production_loan_dashboard.bat` to activate Poetry environment
- ✅ Created `run_dev.bat` for local development
- ✅ Created this instruction file
- ❌ No changes to your code
- ❌ No changes to global Python installation
- ❌ No changes to system PATH

---

## Summary

**Problem**: Using wrong Python environment with old SQLAlchemy version
**Solution**: Always use Poetry virtual environment which has correct SQLAlchemy 2.0.42
**Implementation**: Use provided batch files or manually activate `.venv`

Everything is now configured correctly! 🎉
