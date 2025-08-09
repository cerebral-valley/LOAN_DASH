import streamlit as st
import mysql.connector
import pandas as pd
from dotenv import load_dotenv
import os
def calculate_closing_type(opening_type, closing_balance_amount):
    # Always return 'Cr' or 'Dr' only
    if closing_balance_amount > 0:
        return opening_type if opening_type in ["Cr", "Dr"] else "Cr"
    elif closing_balance_amount < 0:
        return "Dr" if opening_type == "Cr" else "Cr"
    else:
        return opening_type if opening_type in ["Cr", "Dr"] else "Cr"

def validate_closing_type(val):
    return val if val in ["Cr", "Dr"] else "Cr"
from sqlalchemy import create_engine

# Load environment variables from .env file
load_dotenv()

DB_CONFIG = {
    'host': os.getenv('MYSQL_HOST', 'localhost'),
    'user': os.getenv('MYSQL_USER', 'loan_dash_ro'),
    'password': os.getenv('MYSQL_PASS', ''),
    'database': os.getenv('MYSQL_DB_2', 'annual_data'),
    'port': int(os.getenv('MYSQL_PORT', 3306))
}

def get_connection():
    return mysql.connector.connect(**DB_CONFIG)

# Create SQLAlchemy engine for pandas
def get_engine():
    user = DB_CONFIG['user']
    password = DB_CONFIG['password']
    host = DB_CONFIG['host']
    port = DB_CONFIG['port']
    db = DB_CONFIG['database']
    return create_engine(f"mysql+mysqlconnector://{user}:{password}@{host}:{port}/{db}")

st.set_page_config(page_title="Annual Data Management", layout="wide")
st.title("Annual Data Management")

tabs = st.tabs([
    "Create Account",
    "View All Accounts",
    "Modify Account",
    "Add Transaction",
    "Bulk Monthly Transactions",
    "Modify Transaction"
])

# Tab 1: Create Account
with tabs[0]:
    st.header("Create Account")
    with st.form("create_account_form"):
        account_code = st.text_input("Account Code (5 digits)")
        name = st.text_input("Account Name")
        head = st.selectbox("Head", ["asset", "liability", "income", "expense"])
        description = st.text_area("Description")
        submitted = st.form_submit_button("Add Account")
        if submitted:
            try:
                conn = get_connection()
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO accounts (account_code, name, head, description) VALUES (%s, %s, %s, %s)",
                    (account_code, name, head, description)
                )
                conn.commit()
                st.success(f"Account {account_code} added successfully.")
            except Exception as e:
                st.error(f"Error: {e}")
            finally:
                cursor.close()
                conn.close()

# Tab 2: View All Accounts
with tabs[1]:
    st.header("View All Accounts")
    try:
        engine = get_engine()
        df = pd.read_sql("SELECT * FROM accounts", engine)
        st.dataframe(df, use_container_width=True)
    except Exception as e:
        st.error(f"Error: {e}")

# Tab 3: Modify Account
with tabs[2]:
    st.header("Modify Account")
    try:
        engine = get_engine()
        df = pd.read_sql("SELECT account_code, name, head, description FROM accounts", engine)
        account_code = st.selectbox("Select Account Code", df["account_code"])
        account_row = df[df["account_code"] == account_code].iloc[0]
        with st.form("modify_account_form"):
            name = st.text_input("Account Name", value=account_row["name"])
            head = st.selectbox("Head", ["asset", "liability", "income", "expense"], index=["asset", "liability", "income", "expense"].index(account_row["head"]))
            description = st.text_area("Description", value=account_row["description"])
            submitted = st.form_submit_button("Update Account")
            if submitted:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE accounts SET name=%s, head=%s, description=%s WHERE account_code=%s",
                    (name, head, description, account_code)
                )
                conn.commit()
                st.success(f"Account {account_code} updated successfully.")
                cursor.close()
    except Exception as e:
        st.error(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

# Tab 4: Add Transaction to monthly_totals
with tabs[3]:
    st.header("Add Transaction to Monthly Totals")
    try:
        engine = get_engine()
        conn = get_connection()
        df_acc = pd.read_sql("SELECT account_code, name, head FROM accounts", engine)
        acc_display = df_acc.apply(lambda x: f"{x['account_code']} - {x['name']} ({x['head']})", axis=1)
        acc_map = dict(zip(acc_display, df_acc["account_code"]))
        selected_acc = st.selectbox("Select Account", acc_display)
        account_code = acc_map[selected_acc]
        # Autofill opening balance/type from previous month's closing
        # Use session state to persist values when account/year/month changes
        if 'year' not in st.session_state:
            st.session_state['year'] = 2025
        if 'month' not in st.session_state:
            st.session_state['month'] = 7
        year = st.number_input("Year", min_value=2000, max_value=2100, value=st.session_state['year'], key="year_input")
        month = st.number_input("Month", min_value=1, max_value=12, value=st.session_state['month'], key="month_input")

        # --- Previous Month/Year Calculation ---
        # If current month is January, previous month is December of previous year
        if month == 1:
            prev_month = 12
            prev_year = year - 1
        else:
            prev_month = month - 1
            prev_year = year

        # Query previous month's closing balance/type
        query_prev = "SELECT closing_balance, closing_type FROM monthly_totals WHERE account_code = %s AND year = %s AND month = %s ORDER BY id DESC LIMIT 1"
        cursor = conn.cursor()
        cursor.execute(query_prev, (account_code, prev_year, prev_month))
        result = cursor.fetchone()
        if result:
            prev_closing_balance, prev_closing_type = result
        else:
            prev_closing_balance, prev_closing_type = 0.0, "Cr"
        cursor.close()

        # Use session state to persist autofill
        if 'opening_balance' not in st.session_state or st.session_state.get('last_autofill') != (account_code, year, month):
            st.session_state['opening_balance'] = float(prev_closing_balance)
            st.session_state['opening_type'] = prev_closing_type
            st.session_state['last_autofill'] = (account_code, year, month)

        with st.form("add_transaction_form"):
            col1, col2, col3 = st.columns(3)
            with col1:
                ColA, ColB = st.columns(2)
                with ColA:
                    opening_balance = st.number_input("Opening Balance", value=st.session_state['opening_balance'], key="opening_balance_input")
                with ColB:
                    opening_type = st.selectbox("Opening Type", ["Cr", "Dr"], index=["Cr", "Dr"].index(st.session_state['opening_type']), key="opening_type_input")
            with col2:
                ColC, ColD = st.columns(2)
                with ColC:
                    debit = st.number_input("Debit", value=0.0, key="debit_input")
                with ColD:
                    credit = st.number_input("Credit", value=0.0, key="credit_input")
            # Calculate closing balance and type using helper
            ClosingBalanceAmount = opening_balance + (debit - credit)
            closing_type = calculate_closing_type(opening_type, ClosingBalanceAmount)
            closing_type = validate_closing_type(closing_type)
            if ClosingBalanceAmount < 0:
                ClosingBalanceAmount = abs(ClosingBalanceAmount)
            # Display as read-only
            with col3:
                ColE, ColF = st.columns(2)
                with ColE:
                    st.number_input("Closing Balance", value=ClosingBalanceAmount, key="closing_balance_input", disabled=True)
                with ColF:
                    st.text_input("Closing Type", value=closing_type, key="closing_type_input", disabled=True)
            submitted = st.form_submit_button("Add Transaction")
            if submitted:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO monthly_totals (account_code, year, month, opening_balance, opening_type, debit, credit, closing_balance, closing_type) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (account_code, year, month, opening_balance, opening_type, debit, credit, ClosingBalanceAmount, closing_type)
                )
                conn.commit()
                st.success("Transaction added successfully.")
                cursor.close()
        # Show all transactions for selected account
        df_tx = pd.read_sql(f"SELECT * FROM monthly_totals WHERE account_code = '{account_code}'", engine)
        st.dataframe(df_tx, use_container_width=True)
    except Exception as e:
        st.error(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

# Tab 5: Modify Transaction
## Bulk Monthly Transactions Tab
import datetime
with tabs[4]:
    st.header("Bulk Monthly Transactions")
    # Step 2: Year/Month input
    today = datetime.date.today()
    default_year = today.year
    default_month = today.month
    year = st.number_input("Year", min_value=2020, max_value=2100, value=default_year, key="bulk_year")
    month = st.number_input("Month", min_value=1, max_value=12, value=default_month, key="bulk_month")
    # Step 3: Load all account codes and their data for the selected month
    engine = get_engine()
    conn = get_connection()
    df_acc = pd.read_sql("SELECT account_code, name, head FROM accounts", engine)
    # Get all transactions for selected year/month
    df_tx = pd.read_sql(f"SELECT * FROM monthly_totals WHERE year = {year} AND month = {month}", engine)
    # Merge accounts with transactions, fill missing with zeros
    merged = df_acc.merge(df_tx, on="account_code", how="left", suffixes=("", "_tx"))
    merged["opening_balance"] = merged["opening_balance"].fillna(0.0)
    merged["opening_type"] = merged["opening_type"].fillna("Cr")
    merged["debit"] = merged["debit"].fillna(0.0)
    merged["credit"] = merged["credit"].fillna(0.0)
    merged["closing_balance"] = merged["closing_balance"].fillna(0.0)
    merged["closing_type"] = merged["closing_type"].fillna("Cr")
    # Step 5: Display editable table
    st.write("Edit transactions for all accounts below:")
    # Prepare editable columns
    editable_cols = ["opening_balance", "opening_type", "debit", "credit", "closing_balance", "closing_type"]
    edited_rows = []
    for idx, row in merged.iterrows():
        cols = st.columns([2,2,2,2,2,2,2])
        account_code = row["account_code"]
        name = row["name"]
        head = row["head"]
        with cols[0]:
            st.markdown(f"**{account_code} - {name} ({head})**")
        with cols[1]:
            opening_balance = st.number_input(f"OpeningBal_{account_code}", value=float(row["opening_balance"]), key=f"ob_{account_code}_{idx}")
        with cols[2]:
            opening_type = st.selectbox(f"OpeningType_{account_code}", ["Cr", "Dr"], index=["Cr", "Dr"].index(str(row["opening_type"])), key=f"ot_{account_code}_{idx}")
        with cols[3]:
            debit = st.number_input(f"Debit_{account_code}", value=float(row["debit"]), key=f"db_{account_code}_{idx}")
        with cols[4]:
            credit = st.number_input(f"Credit_{account_code}", value=float(row["credit"]), key=f"cr_{account_code}_{idx}")
        # Calculate closing balance/type using helper
        ClosingBalanceAmount = opening_balance + (debit - credit)
        closing_type = calculate_closing_type(opening_type, ClosingBalanceAmount)
        closing_type = validate_closing_type(closing_type)
        if ClosingBalanceAmount < 0:
            ClosingBalanceAmount = abs(ClosingBalanceAmount)
        with cols[5]:
            st.number_input(f"ClosingBal_{account_code}", value=ClosingBalanceAmount, key=f"cb_{account_code}_{idx}", disabled=True)
        with cols[6]:
            st.text_input(f"ClosingType_{account_code}", value=closing_type, key=f"ct_{account_code}_{idx}", disabled=True)
        edited_rows.append({
            "account_code": account_code,
            "year": year,
            "month": month,
            "opening_balance": opening_balance,
            "opening_type": opening_type,
            "debit": debit,
            "credit": credit,
            "closing_balance": ClosingBalanceAmount,
            "closing_type": closing_type,
            "head": head
        })

    # Step 7: Show summary totals
    heads = ["asset", "liability", "income", "expense"]
    summary = {h: {"credit": 0.0, "debit": 0.0} for h in heads}
    gross_credit = gross_debit = 0.0
    for row in edited_rows:
        h = row["head"].lower()
        summary[h]["credit"] += row["credit"]
        summary[h]["debit"] += row["debit"]
        gross_credit += row["credit"]
        gross_debit += row["debit"]
    net_total = gross_credit - gross_debit
    st.markdown("---")
    st.subheader("Summary Totals")
    for h in heads:
        st.write(f"{h.title()} - Total Credit: {summary[h]['credit']:.2f}, Total Debit: {summary[h]['debit']:.2f}")
    st.write(f"Gross Total Credit: {gross_credit:.2f}")
    st.write(f"Gross Total Debit: {gross_debit:.2f}")
    st.write(f"Net Total (Credit - Debit): {net_total:.2f}")

    # Step 8: Save All button
    if st.button("Save All Transactions"):
        cursor = conn.cursor()
        for row in edited_rows:
            safe_closing_type = validate_closing_type(row["closing_type"])
            # Check if transaction exists for this account/year/month
            cursor.execute(
                "SELECT id FROM monthly_totals WHERE account_code=%s AND year=%s AND month=%s",
                (row["account_code"], row["year"], row["month"])
            )
            result = cursor.fetchone()
            if result:
                # Update existing transaction
                cursor.execute(
                    "UPDATE monthly_totals SET opening_balance=%s, opening_type=%s, debit=%s, credit=%s, closing_balance=%s, closing_type=%s WHERE id=%s",
                    (row["opening_balance"], row["opening_type"], row["debit"], row["credit"], row["closing_balance"], safe_closing_type, result[0])
                )
            else:
                # Insert new transaction
                cursor.execute(
                    "INSERT INTO monthly_totals (account_code, year, month, opening_balance, opening_type, debit, credit, closing_balance, closing_type) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                    (row["account_code"], row["year"], row["month"], row["opening_balance"], row["opening_type"], row["debit"], row["credit"], row["closing_balance"], safe_closing_type)
                )
        conn.commit()
        st.success("All transactions saved successfully!")
        cursor.close()
with tabs[4]:
    st.header("Modify Transaction")
    try:
        engine = get_engine()
        conn = get_connection()
        df_tx = pd.read_sql("SELECT * FROM monthly_totals", engine)
        if df_tx.empty:
            st.info("No transactions available to modify.")
        else:
            tx_id = st.selectbox("Select Transaction ID", df_tx["id"])
            tx_row = df_tx[df_tx["id"] == tx_id].iloc[0]
            with st.form("modify_transaction_form"):
                account_code = st.text_input("Account Code", value=tx_row["account_code"])
                year = st.number_input("Year", min_value=2000, max_value=2100, value=tx_row["year"])
                month = st.number_input("Month", min_value=1, max_value=12, value=tx_row["month"])
                opening_balance = st.number_input("Opening Balance", value=float(tx_row["opening_balance"]))
                opening_type = st.selectbox("Opening Type", ["Cr", "Dr"], index=["Cr", "Dr"].index(tx_row["opening_type"]))
                debit = st.number_input("Debit", value=float(tx_row["debit"]))
                credit = st.number_input("Credit", value=float(tx_row["credit"]))
                closing_balance = st.number_input("Closing Balance", value=float(tx_row["closing_balance"]))
                closing_type = st.selectbox("Closing Type", ["Cr", "Dr"], index=["Cr", "Dr"].index(tx_row["closing_type"]))
                submitted = st.form_submit_button("Update Transaction")
                if submitted:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE monthly_totals SET account_code=%s, year=%s, month=%s, opening_balance=%s, opening_type=%s, debit=%s, credit=%s, closing_balance=%s, closing_type=%s WHERE id=%s",
                        (account_code, year, month, opening_balance, opening_type, debit, credit, closing_balance, closing_type, tx_id)
                    )
                    conn.commit()
                    st.success("Transaction updated successfully.")
                    cursor.close()
    except Exception as e:
        st.error(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()
