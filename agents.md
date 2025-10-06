# 🤖 Agent Instructions - Loan Dashboard Application

## 📋 Application Overview

**Application Name**: City Central Loan Dashboard  
**Purpose**: Web-based analytics dashboard for gold loan management  
**Framework**: Streamlit (Python)  
**Database**: MySQL  
**Visualization**: Plotly  

This is a multi-page Streamlit application for analyzing gold loan data with various perspectives (client-wise, vyapari-wise, yearly breakdown, etc.).

---

## 🚀 Running the Application

### ⚠️ IMPORTANT: Always Use run_dev.bat

**DO NOT** manually run streamlit commands or activate environments separately.

**ALWAYS** use the provided batch file:

```bash
# From project root (Z:\Loan_Dash)
.\run_dev.bat
```

This batch file:
1. Activates the Poetry virtual environment (`.venv`)
2. Starts Streamlit on the default port (8501)
3. Handles all necessary setup automatically

### Alternative: Manual Commands (NOT RECOMMENDED)

If you absolutely must run manually:

```bash
cd Z:\Loan_Dash
.\.venv\Scripts\activate
streamlit run main.py
```

### Stopping the Application

```powershell
# Kill Streamlit process
Get-Process -Name streamlit -ErrorAction SilentlyContinue | Stop-Process -Force

# Or use Ctrl+C in the terminal running the app
```

---

## 📁 Project Structure

```
Loan_Dash/
├── main.py                          # Home page with navigation
├── db.py                            # Database models and query functions (SQLAlchemy)
├── plotly_template.py               # Reusable chart templates
├── run_dev.bat                      # ⭐ Main launcher script
├── run_production_loan_dashboard.bat # Production launcher
├── .env                             # Database credentials (NOT in git)
├── pyproject.toml                   # Poetry dependencies
├── poetry.lock                      # Locked dependency versions
│
├── pages/                           # Streamlit multi-page app
│   ├── 1_Overview.py                # Summary metrics and KPIs
│   ├── 2_Yearly_Breakdown.py        # Year x Month analysis
│   ├── 3_Client_Wise.py             # Private vs Vyapari analysis
│   ├── 4_Vyapari_Wise.py            # Vyapari customer details
│   ├── 5_Active_Vyapari_Loans.py    # Active customer tracking
│   ├── 6_Annual_Data.py             # Annual summaries
│   ├── 6_Receipt_And_Payment.py     # Financial statements
│   ├── 7_Balance_Sheet.py           # Balance sheet view
│   ├── 8_Granular_Analysis.py       # ⭐ NEW: Detailed filtering & analysis
│   └── 8_Profit_And_Loss.py         # P&L statement
│
├── db/                              # Database schema files
│   └── schema.sql
│
├── excel_files/                     # Excel import/export
├── annual_data/                     # Annual data processing
│   └── schema.sql
│
└── __pycache__/                     # Python cache (auto-generated)
```

---

## 🗄️ Database Configuration

### Database: MySQL

**Connection Details** (stored in `.env`):
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=your_username
MYSQL_PASS=your_password
MYSQL_DB=loan_database
```

### Main Table: `loan_table`

Key fields:
- `loan_number` (INT, PRIMARY KEY)
- `customer_type` (VARCHAR): "Private" or "Vyapari"
- `customer_name` (VARCHAR)
- `customer_id` (VARCHAR)
- `loan_amount` (DECIMAL)
- `pending_loan_amount` (DECIMAL)
- `date_of_disbursement` (DATETIME)
- `date_of_release` (DATE)
- `released` (VARCHAR): "TRUE" or "FALSE"
- `interest_amount` (DECIMAL)
- `gold_rate`, `net_wt`, `gross_wt`, `purity`, etc.

### Database Functions (db.py)

```python
db.get_all_loans()  # Returns all loans as pandas DataFrame
```

**Model**: `Loan` (SQLAlchemy ORM model)

---

## 🎨 Application Pages

### 1. **main.py** - Home/Navigation
- Landing page with navigation links
- Uses `st.page_link()` for page navigation

### 2. **1_Overview.py**
- Summary metrics (total disbursed, released, outstanding)
- Top-level KPIs
- Quick overview charts

### 3. **2_Yearly_Breakdown.py**
- Disbursed/Released loans by year and month
- YoY change percentages
- Interest received breakdown
- Month (rows) × Year (columns) pivot tables

### 4. **3_Client_Wise.py**
- Private vs Vyapari comparison
- Pie charts for distribution
- Yearly trends by customer type
- Top 10 Vyapari analysis

### 5. **4_Vyapari_Wise.py**
- Individual Vyapari customer analysis
- Detailed breakdowns per customer

### 6. **5_Active_Vyapari_Loans.py**
- Active customers (≥10 outstanding loans)
- Last 365 days activity tracking

### 7. **6_Annual_Data.py**
- Annual financial summaries

### 8. **6_Receipt_And_Payment.py**
- Receipt and payment statements

### 9. **7_Balance_Sheet.py**
- Balance sheet view

### 10. **8_Granular_Analysis.py** ⭐ NEW
- **Session state caching** for performance
- Advanced filtering (Client, Type, Status, Year, Month, Date)
- Dual view modes:
  - Consolidated: Monthly summaries with YoY/MoM changes
  - Granular: Daily breakdown with loan-level details
- Interactive pivot tables and charts
- **Status filter**: Released/Open loans
- **Bug fixes**: Resolved pandas FutureWarnings and PyArrow conversion errors

### 11. **9_Expense_Tracker.py** ⭐ NEW
- **Comprehensive expense management** with 88 expense records
- **Session state caching** for instant performance (TanStack Query pattern)
- **Search functionality**: By ID and Invoice Number
- **Advanced filtering**: Ledger, User, Payment Mode, Year, Month, Receipt Status
- **Dual view modes**:
  - Consolidated: Monthly summaries with YoY/MoM changes
  - Granular: Daily breakdown with expense-level details
- **Rich visualizations**: Plotly charts for trends and distribution
- **Ledger analysis**: 15+ expense categories with pie chart distribution
- **Summary metrics**: Total amount (₹243,846.48), count, averages
- **Top insights**: Largest expenses, payment mode distribution

---

## 🚀 Performance Optimization

### Session State Caching Pattern

**Implemented in**: `8_Granular_Analysis.py`

**Pattern**:
```python
def load_data_with_cache():
    if 'data_loaded' not in st.session_state:
        # First load: fetch from database
        st.session_state.loan_data = db.get_all_loans()
        st.session_state.data_loaded = True
        st.session_state.data_loaded_at = datetime.now()
    # Subsequent loads: instant from cache
    return st.session_state.loan_data
```

**Benefits**:
- First load: 5-10 seconds
- Subsequent loads: **Instant** (no database query)
- Page navigation: **Instant**
- User interactions: **Instant**

**Status**: Currently implemented in Granular Analysis page only.

**TODO**: Apply this pattern to all other pages for consistent performance.

---

## 🧪 Testing the Application

### Manual Testing

1. **Start the app**:
   ```bash
   .\run_dev.bat
   ```

2. **Access in browser**:
   ```
   http://localhost:8501
   ```

3. **Test navigation**: Click through all page links on home page

4. **Test filters**: Use dropdown filters on Granular Analysis page

5. **Check console**: Look for errors in terminal and browser console

### Automated Testing with Playwright

```python
# Example test flow
1. Navigate to http://localhost:8501
2. Wait for page load
3. Click "Granular Analysis" link
4. Wait for data loading
5. Select filters (Client, Type, Year, Month)
6. Toggle view mode (Consolidated/Granular)
7. Check for errors in browser logs
8. Verify tables are populated
9. Take screenshots for verification
```

### Common Issues to Check

- ✅ Database connection (check `.env` credentials)
- ✅ Data loading (session state caching)
- ✅ Filter functionality (dropdowns working)
- ✅ Pivot tables displaying correctly
- ✅ Charts rendering (Plotly)
- ✅ No console errors
- ✅ Performance (load times)

---

## 🔧 Development Guidelines

### Code Patterns

1. **Import structure** (every page):
   ```python
   import sys, pathlib
   sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
   import streamlit as st
   import db
   import pandas as pd
   import plotly.express as px
   ```

2. **Page config**:
   ```python
   st.set_page_config(page_title="Page Name", layout="wide")
   st.title("📊 Page Title")
   ```

3. **Data loading** (NEW pattern with caching):
   ```python
   def load_data_with_cache():
       if 'data_loaded' not in st.session_state:
           st.session_state.loan_data = db.get_all_loans()
           st.session_state.data_loaded = True
       return st.session_state.loan_data
   
   loan_df = load_data_with_cache()
   ```

4. **Sidebar info**:
   ```python
   with st.sidebar:
       st.info("ℹ️ Page description here")
   ```

5. **Column layouts**:
   ```python
   col1, col2, col3 = st.columns(3)
   with col1:
       st.metric("Metric", "Value")
   ```

6. **Dataframe styling**:
   ```python
   st.dataframe(
       df.style.format({
           'amount': '{:,.0f}',
           'percentage': '{:+.1f}%'
       })
       .set_properties(**{"text-align": "right"})
       .set_table_styles([{"selector": "th", "props": [("text-align", "center")]}]),
       use_container_width=True
   )
   ```

### Reusable Components

- **db.get_all_loans()**: Fetch all loan data
- **pd.pivot_table()**: Create cross-section tables
- **pct_change()**: Calculate YoY/MoM changes
- **px.line() / px.bar()**: Create Plotly charts
- **st.columns()**: Layout management
- **st.expander()**: Collapsible sections

---

## 📊 Data Processing Patterns

### Date Handling

```python
# Extract date components
df['date_of_disbursement'] = pd.to_datetime(df['date_of_disbursement'])
df['year'] = df['date_of_disbursement'].dt.year
df['month'] = df['date_of_disbursement'].dt.month
df['month_name'] = df['month'].map(lambda m: calendar.month_abbr[m])
df['day'] = df['date_of_disbursement'].dt.day
```

### Pivot Tables

```python
# Year × Month pivot
pivot = df.pivot_table(
    index='month_name',
    columns='year',
    values='loan_amount',
    aggfunc='sum',
    fill_value=0
)

# Reorder months
month_order = [calendar.month_abbr[i] for i in range(1, 13)]
pivot = pivot.reindex(index=month_order, fill_value=0)

# Add totals
pivot.loc['Total'] = pivot.sum(axis=0)
```

### Change Calculations

```python
# Year-over-Year (columns)
yoy_change = pivot.pct_change(axis=1) * 100

# Month-over-Month (rows)
mom_change = pivot.iloc[:-1].pct_change(axis=0) * 100

# Handle infinities
yoy_change.replace([np.inf, -np.inf], np.nan, inplace=True)
```

---

## 🐛 Debugging Tips

### Common Errors

1. **"Unknown column" error**
   - Check if column exists in `loan_table`
   - Verify `db.py` Loan model matches actual schema

2. **Slow page loads**
   - Implement session state caching pattern
   - Check database query efficiency
   - Add indexes to frequently filtered columns

3. **Empty dataframes**
   - Verify filters aren't too restrictive
   - Check date column for null values
   - Ensure data exists in database

4. **Styling errors**
   - Use `na_rep=""` for NaN values
   - Check format strings (e.g., `{:,.0f}` for integers)

5. **FutureWarnings (Deprecated pandas methods)**
   - Replace `.applymap()` with `.map()` for styling
   - ✅ **FIXED** in Granular Analysis page

6. **PyArrow conversion errors**
   - Convert mixed-type DataFrame indexes to string before display
   - Use `df.index = df.index.astype(str)` for DataFrames with "Total" rows
   - ✅ **FIXED** in Granular Analysis page

### Debug Commands

```python
# Check data shape and types
st.write(f"Data shape: {df.shape}")
st.write(df.dtypes)

# Display sample data
st.write(df.head())

# Check unique values
st.write(df['column_name'].unique())

# Show error details
st.exception(exc)
```

---

## 🔐 Security Notes

- ✅ `.env` file contains sensitive credentials (NOT in git)
- ✅ Use `.gitignore` to exclude `.env`, `__pycache__`, `.venv`
- ✅ Database passwords should be strong and rotated regularly
- ✅ Application runs on localhost (not exposed to internet)

---

## 📦 Dependencies

**Core**:
- streamlit ^1.35
- pandas ^2.2
- plotly ^5.22
- sqlalchemy ^2.0
- mysql-connector-python ^8.4

**Dev**:
- pytest ^8.2
- black ^24.4
- ruff ^0.4

**Management**: Poetry (see `pyproject.toml`)

---

## 🎯 Future Enhancements

1. **Apply session state caching to all pages**
2. **Add export functionality** (CSV/Excel)
3. **Implement auto-refresh** (periodic data reload)
4. **Add user authentication**
5. **Create admin panel** for data management
6. **Add database indexes** for performance
7. **Implement error logging**
8. **Add unit tests** for data processing functions

---

## ⚡ Data Caching & Performance Optimization Recommendations

### Current Implementation
- **Status**: Session state caching implemented in `8_Granular_Analysis.py` and `9_Expense_Tracker.py`
- **Pattern**: TanStack Query-like caching with instant subsequent loads
- **Performance**: First load 5-10 seconds, subsequent loads instant

### 🔥 Recommended Caching Strategies

#### 1. **Universal Session State Caching (HIGH PRIORITY)**
Apply the existing caching pattern to all remaining pages:

```python
# Pattern to implement in ALL pages
def load_data_with_cache(data_type="loan"):
    cache_key = f'{data_type}_data_loaded'
    data_key = f'{data_type}_data'
    timestamp_key = f'{data_type}_data_loaded_at'
    
    if cache_key not in st.session_state:
        with st.spinner(f'🔄 Loading {data_type} data...'):
            if data_type == "loan":
                data = db.get_all_loans()
            elif data_type == "expense":
                data = db.get_all_expenses()
            # Add other data types
            
            st.session_state[data_key] = data
            st.session_state[cache_key] = True
            st.session_state[timestamp_key] = datetime.now()
    
    return st.session_state[data_key]
```

**Pages to implement**: `1_Overview.py`, `2_Yearly_Breakdown.py`, `3_Client_Wise.py`, `4_Vyapari_Wise.py`, `5_Active_Vyapari_Loans.py`, `6_Annual_Data.py`

#### 2. **Multi-level Caching Architecture**
```python
# Level 1: Session State (Current session)
# Level 2: Browser Local Storage (Cross-session)
# Level 3: Redis Cache (Multi-user)
# Level 4: Database with smart invalidation
```

#### 3. **Database Query Optimization**
```python
# Create optimized query functions
def get_loans_optimized(filters=None):
    """Optimized loan query with selective loading"""
    with SessionLocal() as session:
        query = session.query(Loan)
        
        # Only load required columns
        if filters and 'columns' in filters:
            query = query.options(load_only(*filters['columns']))
        
        # Apply filters at database level
        if filters and 'year' in filters:
            query = query.filter(extract('year', Loan.date_of_disbursement) == filters['year'])
        
        return pd.read_sql(query.statement, session.bind)
```

#### 4. **Pre-computed Aggregations**
Create materialized views or cached aggregation tables:

```sql
-- Create pre-computed monthly summaries
CREATE TABLE loan_monthly_summary AS
SELECT 
    YEAR(date_of_disbursement) as year,
    MONTH(date_of_disbursement) as month,
    customer_type,
    COUNT(*) as loan_count,
    SUM(loan_amount) as total_amount,
    AVG(loan_amount) as avg_amount
FROM loan_table 
GROUP BY year, month, customer_type;

-- Similar for expense_monthly_summary
CREATE TABLE expense_monthly_summary AS
SELECT 
    YEAR(date) as year,
    MONTH(date) as month,
    ledger,
    COUNT(*) as expense_count,
    SUM(amount) as total_amount
FROM expense_tracker 
GROUP BY year, month, ledger;
```

#### 5. **Smart Cache Invalidation**
```python
def smart_cache_refresh():
    """Intelligent cache invalidation based on data changes"""
    # Check for data updates since last cache
    last_loan_update = get_last_modified_time('loan_table')
    last_expense_update = get_last_modified_time('expense_tracker')
    
    cache_time = st.session_state.get('data_loaded_at')
    
    if cache_time and (last_loan_update > cache_time or last_expense_update > cache_time):
        # Invalidate relevant caches
        clear_session_cache(['loan_data', 'expense_data'])
        st.rerun()
```

#### 6. **Chunked Loading for Large Datasets**
```python
def load_large_dataset_chunked(table_name, chunk_size=10000):
    """Load large datasets in chunks to prevent memory issues"""
    chunks = []
    offset = 0
    
    while True:
        chunk = pd.read_sql(
            f"SELECT * FROM {table_name} LIMIT {chunk_size} OFFSET {offset}",
            engine
        )
        
        if chunk.empty:
            break
            
        chunks.append(chunk)
        offset += chunk_size
    
    return pd.concat(chunks, ignore_index=True)
```

#### 7. **Background Data Refresh**
```python
def background_refresh():
    """Refresh data in background thread"""
    import threading
    import time
    
    def refresh_worker():
        while True:
            time.sleep(300)  # Refresh every 5 minutes
            if 'auto_refresh_enabled' in st.session_state:
                # Refresh data silently
                fresh_data = db.get_all_loans()
                st.session_state.loan_data = fresh_data
                st.session_state.data_loaded_at = datetime.now()
    
    thread = threading.Thread(target=refresh_worker, daemon=True)
    thread.start()
```

#### 8. **Database Connection Pooling**
```python
# Enhanced connection pooling in db.py
from sqlalchemy.pool import QueuePool

engine = create_engine(
    URL, 
    pool_pre_ping=True,
    poolclass=QueuePool,
    pool_size=10,          # Number of connections to maintain
    max_overflow=20,       # Additional connections when needed
    pool_recycle=3600,     # Recycle connections every hour
    pool_timeout=30        # Timeout for getting connection
)
```

#### 9. **Lazy Loading Patterns**
```python
@st.cache_data(ttl=3600)  # Cache for 1 hour
def get_summary_stats():
    """Cache summary statistics separately"""
    return {
        'total_loans': loan_df['loan_amount'].sum(),
        'total_expenses': expense_df['amount'].sum(),
        'active_customers': loan_df['customer_name'].nunique()
    }

@st.cache_data(ttl=1800)  # Cache for 30 minutes  
def get_chart_data(chart_type, filters):
    """Cache chart data based on type and filters"""
    # Generate chart data based on parameters
    pass
```

#### 10. **Performance Monitoring Dashboard**
```python
def show_performance_metrics():
    """Display cache hit rates and load times"""
    with st.sidebar.expander("🔧 Performance Metrics"):
        st.metric("Cache Hit Rate", f"{get_cache_hit_rate():.1%}")
        st.metric("Avg Load Time", f"{get_avg_load_time():.2f}s")
        st.metric("Memory Usage", f"{get_memory_usage():.1f}MB")
```

### Implementation Priority

1. **🔥 Immediate (Week 1)**:
   - Apply session state caching to all remaining pages
   - Add performance metrics tracking

2. **⭐ Short-term (Month 1)**:
   - Database query optimization
   - Pre-computed aggregation tables
   - Smart cache invalidation

3. **💡 Long-term (Quarter 1)**:
   - Redis/external caching layer
   - Background refresh workers
   - Advanced performance monitoring

### Expected Performance Gains

- **Current**: 5-10 second initial loads
- **With full caching**: 0.1-0.5 second subsequent loads
- **With optimization**: 2-3 second initial loads
- **Memory usage**: 50-70% reduction with smart caching
- **User experience**: Near-instant navigation between pages

---

## 📞 Support

**Developer**: Ishan Kukade  
**Repository**: cerebral-valley/LOAN_DASH  
**Branch**: copilot/vscode1754739438763  

For issues or questions, consult this document first, then check:
1. Terminal error logs
2. Browser console logs
3. Streamlit error messages
4. Database connection status

---

## ✅ Quick Checklist for AI Agents

When working on this application:

- [ ] Use `run_dev.bat` to start the app
- [ ] Check `.env` for database credentials
- [ ] Test on http://localhost:8501
- [ ] Follow existing code patterns (see pages 1-7)
- [ ] Implement session state caching for new features
- [ ] Use Plotly for visualizations
- [ ] Style dataframes consistently
- [ ] Handle null values and edge cases
- [ ] Test filters and interactions thoroughly
- [ ] Check browser console for errors
- [ ] Document new features in this file

---

**Last Updated**: October 4, 2025  
**Version**: 1.0  
**Status**: Active Development
