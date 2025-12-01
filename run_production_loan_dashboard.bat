@echo off
REM Production Loan Dashboard - Hidden Background Process
cd /d z:\Loan_Dash

REM Start Streamlit in a minimized, background window
start /min "" cmd /c "call .venv\Scripts\activate.bat && streamlit run main.py --server.address=0.0.0.0 --server.port=8502"

REM Exit this launcher window immediately
exit