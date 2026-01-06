# CHANGELOG - Yield Calculation Fix

## [1.1.0] - December 2025

### 🔥 BREAKING CHANGE: Yield Calculation Methodology

#### Changed
- **Executive Dashboard yield calculations** now use **portfolio-level methodology** instead of averaging individual annualized yields
- All yield metrics reduced by 4-7 percentage points to reflect accurate portfolio returns
- Chart titles updated from "Average" to "Portfolio" yield

#### Impact
| Metric | Before (Incorrect) | After (Correct) | Δ |
|--------|-------------------|----------------|---|
| Overall Portfolio Yield | 18.15% | 14.36% | -3.79% |
| Weighted Average Yield | 18.68% | 14.36% | -4.32% |
| Dec 2024 Monthly Yield | 19.13% | 14.42% | -4.71% |
| Jan 2025 Monthly Yield | 19.07% | 14.50% | -4.57% |
| Feb 2025 Monthly Yield | 19.97% | 12.71% | -7.26% |

### ✅ Added

#### New Sections in Executive Dashboard
1. **Holding Period Segmentation** (Lines 807-851)
   - Short-term (<30 days): 32% yield, 23% of capital
   - Long-term (30+ days): 14.5% yield, 77% of capital

2. **Loan Size vs Yield Analysis** (Lines 1124-1204)
   - 5-bucket analysis (₹0-50K, ₹50-100K, ₹100-150K, ₹150-200K, ₹200K+)
   - Portfolio yield by loan size segment
   - Capital deployment distribution

3. **Enhanced Customer Type Metrics** (Lines 1082-1115)
   - Portfolio yield calculation
   - Total interest and capital
   - Weighted average holding period
   - Loan count per customer type

#### Documentation
- `YIELD_FIX_SUMMARY.md` - Comprehensive technical documentation
- `EXECUTIVE_DASHBOARD_REFERENCE.md` - Quick reference guide
- `test_yield_fixes.py` - Validation script
- Updated `agents.md` with yield methodology section

### 🐛 Fixed

#### Yield Calculation Errors (Critical)
- **Yearly Interest Yield** (Lines 853-882): Replaced `'interest_yield': 'mean'` with portfolio-level loop
- **Monthly Interest Yield** (Lines 970-1000): Replaced `'interest_yield': 'mean'` with portfolio-level loop
- **Customer Type Yield** (Lines 1082-1115): Replaced stats (avg/median/min/max) with portfolio-level metrics

#### Root Cause
The previous method of averaging individual annualized yields was mathematically flawed:
- Short-term loans (1-30 days) have extreme annualized yields (30-500%)
- Averaging gave equal weight to these outliers despite them being only 23% of capital
- Portfolio-level calculation weights each loan by its capital contribution

### 🔄 Changed

#### Formula Implementation
**Before (Incorrect)**:
```python
yearly_yield = released.groupby('release_year').agg({'interest_yield': 'mean'})
```

**After (Correct)**:
```python
yearly_yield_list = []
for year in released['release_year'].unique():
    year_data = released[released['release_year'] == year]
    total_interest = year_data['realized_interest'].sum()
    total_capital = year_data['loan_amount'].sum()
    weighted_avg_days = (year_data['loan_amount'] * year_data['days_to_release']).sum() / total_capital
    portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
    yearly_yield_list.append({'year': year, 'portfolio_yield': portfolio_yield})
```

### 📈 Performance

#### Validation Results
- All tests in `test_yield_fixes.py` passed ✓
- Python compilation successful ✓
- Streamlit dashboard runs without errors ✓
- Yields now in realistic 12-15% range ✓

#### Key Findings
1. **Portfolio composition**: 77% long-term (30+ days), 23% short-term (<30 days)
2. **Vyapari outperforms Private**: 14.91% vs 12.17% due to higher velocity
3. **Temporal trend**: Declining from 15.24% (2021) to 13.76% (2025)
4. **True portfolio yield**: **14.36%** (authoritative metric)

### 📝 Technical Details

#### Files Modified
- `pages/0_Executive_Dashboard.py` - 9 sections updated (1,923 lines total)

#### Sections Updated
1. Portfolio Performance Metrics (Lines 758-803) - NEW
2. Holding Period Segmentation (Lines 807-851) - NEW
3. Yearly Interest Yield (Lines 853-882) - FIXED
4. Monthly Interest Yield (Lines 970-1000) - FIXED
5. Yield by Customer Type (Lines 1082-1115) - FIXED
6. Loan Size Analysis (Lines 1124-1204) - NEW

#### Formula Reference
```python
# Portfolio-level yield (CORRECT)
portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100

# Weighted average holding period
weighted_avg_days = sum(loan_amount × days_to_release) / sum(loan_amount)
```

### ⚠️ Migration Notes

#### For Report Consumers
- **All yield metrics are now lower** (by 4-7 percentage points)
- This reflects **accurate portfolio returns**, not a performance decline
- Previous metrics were inflated by mathematical error
- Use **14.36%** as the authoritative portfolio yield metric

#### For Developers
- **DO NOT** use `df.groupby().agg({'interest_yield': 'mean'})` for yield calculations
- **ALWAYS** use portfolio-level calculation for time-based or segment-based yields
- See `YIELD_FIX_SUMMARY.md` for implementation patterns
- Validate new calculations against `test_yield_fixes.py`

### 🔮 Future Enhancements

#### Recommended
1. Apply session state caching to Executive Dashboard (currently only in Granular Analysis)
2. Add yield distribution histograms
3. Create benchmark comparison charts
4. Add YoY/MoM change percentages to yield metrics
5. Extract portfolio yield calculation to utility function
6. Add unit tests for yield calculations

### 🙏 Acknowledgments

#### Data Corrections (December 2025)
- Loan #13138: Corrected erroneous 7-day entry (was showing 5,214% yield)
- Loan #11440: Corrected erroneous data (was showing extreme yield)
- These corrections reduced max yield from 5,214% to 547%

---

## Version History

### [1.1.0] - December 2025
- **MAJOR**: Fixed yield calculation methodology (portfolio-level)
- **ADDED**: Holding period segmentation analysis
- **ADDED**: Loan size vs yield analysis
- **FIXED**: Yearly, monthly, and customer type yield calculations
- **DOCS**: Comprehensive documentation suite

### [1.0.0] - October 2025
- Initial release
- Multi-page Streamlit dashboard
- MySQL database integration
- Basic analytics and reporting

---

**Semver**: 1.1.0  
**Release Date**: December 2025  
**Status**: Production ✓  
**Breaking Changes**: Yes (yield methodology change)
