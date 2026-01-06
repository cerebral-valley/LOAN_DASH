import streamlit as st
import data_cache

st.set_page_config(page_title="City Central Web App", page_icon="🏙️", layout="wide")
st.title("🏙️  Welcome to City Central Web App - Data Analytics and Visuals 📊")

# Add prominent refresh button
col1, col2, col3 = st.columns([2, 1, 2])
with col2:
    if st.button("🔄 Refresh All Data", use_container_width=True, type="primary"):
        data_cache.clear_all_cache()
        st.success("✅ Cache cleared! Data will refresh on next page visit.")
        st.balloons()

# Show cache status
if 'loan_data_loaded_at' in st.session_state:
    st.info(f"ℹ️ Data cached at: {st.session_state.loan_data_loaded_at.strftime('%Y-%m-%d %H:%M:%S')} - Use button above to refresh")

st.markdown("---")
st.markdown("### ➡️  Go To Dashboard Page")

# If st.page_link is available, use it for better navigation (safe fallback)
try:
    st.page_link("pages/0_Executive_Dashboard.py", label="⭐ Executive Dashboard", icon="📊")
    st.caption("*Comprehensive insights with health scores, trends, and smart alerts*")
    st.markdown("---")
    st.page_link("pages/10_Interest_Yield_Analysis.py", label="📈 Interest Yield Analysis", icon="📈")
    st.caption("*Comprehensive yield analysis across dimensions, holding periods, and customer types*")
    st.markdown("---")
    st.page_link("pages/10_Notes.py", label="📝 Notes", icon="📝")
    st.markdown("---")
    st.page_link("pages/11_Smart_Recommendations.py", label="🧠 Smart Recommendations", icon="🧠")
    st.caption("*AI-powered recommendations for loan quality & yield optimization + BCG Matrix*")
    st.markdown("---")
    st.page_link("pages/12_Gold_Silver_Rates.py", label="💰 Gold & Silver Rates", icon="💰")
    st.caption("*Daily market rates with 3-month averages and price trends*")
except AttributeError:
    pass