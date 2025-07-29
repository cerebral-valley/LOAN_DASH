# LOAN_DASH

Loan Dashboard for client-wise and vyapari-wise analysis using Streamlit, Plotly, and MySQL.

## Features
- Yearly, client-wise, and vyapari-wise loan analytics
- Outstanding loan distribution
- Interactive charts and tables
- Data normalization and robust filtering

## Usage
1. Install dependencies: `pip install -r requirements.txt` or use Poetry
2. Copy `.env.template` to `.env` and fill in your actual database credentials (never commit `.env`)
3. If using VSCode, copy `.vscode/settings.json` and update with your local credentials (never commit this file)
4. Run the dashboard: `streamlit run main.py`

## Folder Structure
- `db.py` - Database access
- `pages/` - Streamlit dashboard pages
- `plotly_template.py` - Plotly chart templates

## Author
cerebral-valley

## License
Specify license in LICENSE file if needed.
