import streamlit as st

st.set_page_config(page_title="City Central Web App", page_icon="🏙️", layout="wide")
st.title("🏙️  Welcome to City Central Web App - Data Analytics and Visuals 📊")
st.markdown("### ➡️  Go To Dashboard Page")



# If st.page_link is available, use it for better navigation (safe fallback)
try:
    st.page_link("pages/1_Overview.py", label="Overview", icon="📋")
    st.page_link("pages/2_Yearly_Breakdown.py", label="Yearly Breakdown", icon="📅")
    st.page_link("pages/3_Client_Wise.py", label="Client Wise", icon="👤")
    st.page_link("pages/4_Vyapari_Wise.py", label="Vyapari Wise", icon="🧑‍💼")
    st.page_link("pages/5_Active_Vyapari_Loans.py", label="Active Vyapari Loans", icon="💼")
    st.page_link("pages/6_Annual_Data.py", label="Annual Data", icon="👥")
except AttributeError:
    pass