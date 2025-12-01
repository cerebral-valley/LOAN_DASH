import streamlit as st
import pathlib
import sys

# make parent folder importable
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))

st.set_page_config(page_title="Notes & Documentation", layout="wide")

st.title("📚 Application Notes & Documentation")
st.markdown("*Reference guide for metrics, formulas, and application logic.*")

st.markdown("---")

st.header("🏥 Portfolio Health Dashboard Metrics")
st.markdown("""
This section explains the mathematical models behind the health scores displayed on the Executive Dashboard.
The **Overall Health Score** is a balanced average of four distinct risk dimensions: Collateral, Cash Flow, Concentration, and Profitability.
""")

# 1. Overall Health
with st.expander("1. Overall Health Score", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Overall Health} = \frac{\text{LTV Health} + \text{Collection Health} + \text{Diversification Health} + \text{Interest Health}}{4} $$

    **Why it makes sense:**
    This is a balanced scorecard approach. Instead of relying on a single metric (like profit), it takes a simple average of four distinct risk dimensions. A high score requires you to be performing well across *all* these areas simultaneously.
    """)

# 2. LTV Health
with st.expander("2. LTV (Loan-to-Value) Health", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{LTV Health} = 100 - (\lvert 75 - \text{Avg LTV} \rvert \times 2) $$
    *(Capped between 0 and 100)*

    **Logic:**
    - **Target:** 75% LTV is set as the "Goldilocks" zone.
    - **Penalty:** For every **1%** you deviate from 75% (either higher or lower), you lose **2 points**.

    **Why it makes sense:**
    - **If LTV is too high (>75%)**: You are under-collateralized. If the gold price drops or the customer defaults, the gold might not cover the loan + interest.
    - **If LTV is too low (<75%)**: You are being too conservative. You could have safely lent more money on the same gold, meaning you are leaving potential interest income on the table.
    - This metric forces you to stay in the optimal lending band.
    """)

# 3. Collection Efficiency
with st.expander("3. Collection Efficiency", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Collection Efficiency} = \left( \frac{\text{Total Collected (Adjusted)}}{\text{Expected Interest}} \right) \times 100 $$
    
    Where:
    $$ \text{Expected Interest} = \text{Total Loan Amount} \times 0.12 $$
    $$ \text{Total Collected (Adjusted)} = \text{Interest Deposited} + \text{Legacy Recovered Interest} $$

    **Logic:**
    - **Numerator:** Actual interest collected. This includes:
        1. Explicit deposits recorded in `interest_deposited_till_date`.
        2. For legacy loans (where deposits weren't tracked but loan is closed), we assume the full `interest_amount` was recovered.
    - **Denominator:** Expected return, estimated as **12%** of the total loan book.

    **Why it makes sense:**
    This measures "Cash in Hand" vs "Potential".
    - It assumes a baseline expectation that your portfolio should generate roughly **12%** return in interest deposits.
    - If you collect less than this benchmark, it suggests customers are not paying interest regularly or loans are sitting idle without generating cash flow.
    """)

# 4. Diversification Score
with st.expander("4. Diversification Score", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Diversification Score} = 100 - \text{Top 5 Concentration \%} $$
    
    Where:
    $$ \text{Top 5 Concentration \%} = \left( \frac{\text{Sum of Pending Amount (Top 5 Customers)}}{\text{Total Pending Amount (All Active Loans)}} \right) \times 100 $$

    **Why it makes sense:**
    - This measures **Concentration Risk**.
    - If your Top 5 customers hold **80%** of your loan book, your risk is extremely high. If just one of them defaults, it devastates your business.
    - A healthy portfolio spreads risk across many small customers.
    - **Example:** If Top 5 customers hold 30% of loans, Score = 100 - 30 = **70** (Good). If they hold 90%, Score = 100 - 90 = **10** (Critical).
    """)

# 5. Interest Coverage
with st.expander("5. Interest Coverage", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Interest Coverage} = \left( \frac{\text{Interest Earned (Released Loans)}}{\text{Total Disbursed (In Period)} \times 0.10} \right) \times 100 $$

    **Logic:**
    - **Numerator:** Interest actually realized from loans released in the selected period.
    - **Denominator:** A benchmark of **10%** of the money you disbursed in that same period.

    **Why it makes sense:**
    - This is a **Velocity of Money** metric.
    - It compares your *Income* (Interest) against your *Outflow* (Disbursement).
    - It checks if the interest you are earning is keeping pace with the new loans you are giving out.
    - A low score implies you are pumping out money (high disbursement) but not realizing enough profit back from it yet (low interest realization).
    """)

st.markdown("---")

st.header("📈 Interest Yield Analysis Metrics")
st.markdown("""
This section explains the formulas used in the **Interest Yield Analysis** tab of the Granular Metrics section.
These metrics help you understand the *true* annualized return on your capital, accounting for how long the money was actually lent out.
""")

# 1. Annualized Interest Yield
with st.expander("1. Annualized Interest Yield", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Annualized Yield} = \left( \frac{\text{Realized Interest}}{\text{Loan Amount}} \right) \times \left( \frac{365}{\text{Days to Release}} \right) \times 100 $$

    **Where:**
    - **Realized Interest**: The actual interest collected.
        - If `Interest Deposited` > 0, we use `Interest Deposited`.
        - Otherwise, we use `Interest Amount` (assuming full recovery for legacy loans).

    **Logic:**
    - **Part 1 (Simple Return):** `Realized Interest / Loan Amount` gives the flat percentage return.
    - **Part 2 (Time Factor):** `365 / Days to Release` scales this return to a full year.
    
    **Why it makes sense:**
    - A flat 2% interest looks low. But if that loan was only open for 15 days, that's actually a massive **48% annualized return**!
    - Conversely, a 20% flat return looks great. But if it took 3 years to get it, that's only **~6.6% annualized**.
    - This metric allows you to compare the profitability of a 10-day loan vs. a 300-day loan on an "apples-to-apples" basis.
    """)

# 2. Weighted Average Yield
with st.expander("2. Weighted Average Yield", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Weighted Yield} = \frac{\sum (\text{Loan Amount} \times \text{Annualized Yield})}{\sum (\text{Loan Amount})} $$

    **Logic:**
    - This calculates the average **Annualized Yield** of your portfolio, but gives more "weight" to larger loans.
    - A ₹10 Lakh loan with 15% yield matters much more to your bottom line than a ₹5k loan with 100% yield.

    **Why it makes sense:**
    - It tells you the **true performance of your deployed capital**.
    - Simple averages can be misleading if you have many small, high-yield loans (like 1-day loans) and a few large, lower-yield loans. The weighted average corrects for this.
    """)

# 3. Actual Yield (Flat)
with st.expander("3. Actual Yield (Flat)", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{Actual Yield} = \left( \frac{\text{Interest Amount}}{\text{Loan Amount}} \right) \times 100 $$

    **Logic:**
    - The simple percentage of profit made on the principal, ignoring time.

    **Why it makes sense:**
    - Useful for cash flow planning. "If I lend 1 Lakh, I get 2k back."
    - It represents the raw cash-on-cash return for that specific transaction.
    """)

# 4. MoM (Month-over-Month) Yield Change
with st.expander("4. MoM Yield Change", expanded=True):
    st.markdown(r"""
    **Formula:**
    $$ \text{MoM Change \%} = \left( \frac{\text{Avg Yield (Current Month)} - \text{Avg Yield (Previous Month)}}{\text{Avg Yield (Previous Month)}} \right) \times 100 $$

    **Why it makes sense:**
    - Tracks the **trend** of your profitability.
    - If this is negative, your margins are shrinking (maybe you're giving discounts, or loans are staying open longer without proportional interest increase).
    - If positive, your capital efficiency is improving.
    """)
