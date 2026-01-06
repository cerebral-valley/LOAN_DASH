# Quick Start Guide

## 🚀 Running the Application

### Fastest Way (Double-click):

**Production**: `run_production_loan_dashboard.bat`
**Development**: `run_dev.bat`

---

### From VS Code Terminal:

```powershell
# Activate environment
.\.venv\Scripts\Activate.ps1

# Run app
streamlit run main.py
```

---

### Verify Environment:

```powershell
.\.venv\Scripts\Activate.ps1
python -c "import sqlalchemy; print(f'SQLAlchemy: {sqlalchemy.__version__}')"
```

**Expected Output**: `SQLAlchemy: 2.0.42` (or higher)

---

## ⚠️ Common Mistake

**DON'T**: Run `python main.py` or `streamlit run main.py` without activating the environment first

**DO**: Always activate `.venv` before running any Python commands

---

## 🔍 Troubleshooting

**Error**: `cannot import name 'DeclarativeBase'`

**Solution**: You forgot to activate the Poetry environment. Run:
```powershell
.\.venv\Scripts\Activate.ps1
```

---

For detailed instructions, see `SETUP_INSTRUCTIONS.md`
