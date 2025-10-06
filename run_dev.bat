@echo off
echo ========================================
echo  Development Loan Dashboard Launcher
echo ========================================
echo.
echo Activating Poetry virtual environment...
cd /d z:\Loan_Dash
call .venv\Scripts\activate.bat
echo.
echo Environment activated successfully!
echo Starting Streamlit application on localhost...
echo.
streamlit run main.py
pause
