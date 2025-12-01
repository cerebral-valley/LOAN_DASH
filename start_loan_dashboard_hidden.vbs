Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c ""cd /d z:\Loan_Dash && call .venv\Scripts\activate.bat && streamlit run main.py --server.address=0.0.0.0 --server.port=8502""", 0, False
Set WshShell = Nothing
