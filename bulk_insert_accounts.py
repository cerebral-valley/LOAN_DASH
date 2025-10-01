import mysql.connector
from dotenv import load_dotenv
import os

# Load environment variables
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

accounts = [
    ("BANK CHARGES", "30001", "expense"),
    ("COMPUTER CCTV MAINTENANCE", "30002", "expense"),
    ("TRAVELLING EXPENSES", "30003", "expense"),
    ("PRINTING AND STATIONARY  EXPENSES", "30004", "expense"),
    ("EMPLOYEE SALARY", "30005", "expense"),
    ("OFFICE EXPENSES", "30006", "expense"),
    ("POSTAGE EXPENSE", "30007", "expense"),
    ("ELECTRIC EXPENSES", "30008", "expense"),
    ("ADVERTISEMENT EXPENSES", "30009", "expense"),
    ("REPAIR AND MAITANACE CHARGES", "30010", "expense"),
    ("PETROL EXPENSES", "30012", "expense"),
    ("MISC EXPENSES", "30013", "expense"),
    ("GOLD VALUATION FEE", "30014", "expense"),
    ("CORPORATE MEMBERSHIP", "30016", "expense"),
    ("VEHICLE INSURANCE", "30017", "expense"),
    ("VECHICLE MAINTANCE EXPENSES", "30018", "expense"),
    ("INT. PAID ON SAVING DEPOSITE", "30020", "expense"),
    ("INT.PAID ON RECURRING DEPOSIT", "30021", "expense"),
    ("INT.PAID ON FIXED  DEPOSIT", "30022", "expense"),
    ("INT.PAID ON MONTLY FIXED DEPOSIT", "30023", "expense"),
    ("CCTV", "30024", "expense"),
    ("INT.PAID ON DAILY DEPOSITE", "30025", "expense"),
    ("AGENT COMMISSION", "30026", "expense"),
    ("INT.PAID ON AGENT SECURITY DEPOSIT", "30027", "expense"),
    ("TYPINIG EXPENSES", "30028", "expense"),
    ("INTERNET AND MOBILE CHARGES", "30029", "expense"),
    ("DONATION", "30030", "expense"),
    ("ELECTRIC BILL EXPENSES", "30031", "expense"),
    ("OFFICE RENT  AND TAXES", "30032", "expense"),
    ("ICICI CREDIT CARD", "30035", "expense"),
    ("LOCKER REPAIR AND MAINTANCE", "30036", "expense"),
    ("LOCKER REPAIR AND MAINTANCE", "30037", "expense"),
    ("REGISTRATION FEE", "30038", "expense"),
    ("GST PENALTY", "30039", "expense"),
    ("VEHICLE TRADE FEE", "30040", "expense"),
    ("SOCIETY GUMASAT FEE", "30041", "expense"),
    ("AUDIT FEE EXPENDITURE", "30042", "expense"),
    ("GOLD SUBSCRIPTION SMS CHARGES", "30043", "expense"),
    ("LEGAL EXPENSES", "30044", "expense"),
    ("EMPLOYEE BONUS", "30045", "expense"),
    ("DEPRICIATION", "30046", "expense"),
    ("DIVIDENDS", "30047", "expense"),
    ("INT.PAID ON GOLD LOAN (FEDRAL BANK)", "30048", "expense"),
    ("NMC WATER BILL EXP.", "30049", "expense"),
    ("Annual General Meeting", "30050", "expense"),
    ("ELECTION FUND EXP.", "30051", "expense"),
    ("DHARMADAY FUND EXP.", "30052", "expense"),
    ("WELFARE FUND EXP.", "30053", "expense"),
    ("N.P.A. EXP.", "30054", "expense"),
    ("INT.PAID ON CC/OD (FEDRAL BANK)", "30055", "expense"),
    ("INCOME TAX AUDIT FEE (CA.)", "30056", "expense"),
    ("EMPLOYEE WEFARE EXP.", "30057", "expense"),
    ("DIWALI GIFT  EXP.", "30058", "expense"),
    ("OFFICE INSURANCE POLICY EXP.", "30059", "expense"),
    ("NOTE COUNTING MACHINE", "30060", "expense"),
    ("VEHICLE ALLOWANCE", "30061", "expense"),
    ("REFRESHMENT EXP.", "30062", "expense"),
    ("ANNUAL SUBSCRIPTION CHARG.(NAGPUR FEDRATION)", "30063", "expense"),
    ("DAILY WAGES & SALARY", "30064", "expense"),
    ("SOFTWARE & OTHER ANNUAL MAINTANANCE CHARGES", "30065", "expense"),
    ("TRAINING PROGRAMME EXP.", "30066", "expense"),
    ("TRAVELLING & CONVEYANCE", "30067", "expense"),
    ("OFFICE POOJA & FESTIVAL EXP.", "30068", "expense"),
    ("DRIVER SALARY", "30069", "expense"),
    ("BAD DEBTS AND DEFAULT LOAN EXP.", "30070", "expense"),
    ("PROFESSIONAL TAX EXP.A/C", "30071", "expense"),
]

def bulk_insert_accounts():
    conn = get_connection()
    cursor = conn.cursor()
    sql = "INSERT INTO accounts (account_code, name, head) VALUES (%s, %s, %s)"
    for name, code, head in accounts:
        try:
            cursor.execute(sql, (code, name, head))
        except Exception as e:
            print(f"Error inserting {code}: {e}")
    conn.commit()
    cursor.close()
    conn.close()
    print("Bulk insert completed.")

if __name__ == "__main__":
    bulk_insert_accounts()
