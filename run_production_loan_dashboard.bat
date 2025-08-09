@echo off
cd /d z:\Loan_Dash
streamlit run main.py --server.address=0.0.0.0 --server.port=8502
pause