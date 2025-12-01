# Executive Dashboard - Quick Reference Guide

## 🎯 Overview

The Executive Dashboard provides comprehensive portfolio analytics with **accurate portfolio-level yield calculations** across all metrics.

---

## 📊 Dashboard Tabs

### Tab 1: Portfolio Performance Metrics
**Key Metrics**:
- Portfolio Annualized Yield: **14.36%**
- Simple Return (Non-Annualized): **6.55%**
- Total Interest Realized: **₹40.7M**
- Total Capital Deployed: **₹619.6M**
- Weighted Avg Holding: **166 days**

**Holding Period Segmentation**:
- Short-term (<30 days): 32% yield, 23% of capital
- Long-term (30+ days): 14.5% yield, 77% of capital

**Loan Size Analysis** (5 buckets):
- Shows portfolio yield by loan size segment
- Capital deployment distribution
- Identifies optimal loan sizes

### Tab 2: Time-Based Analysis
**Yearly Yields** (2021-2025):
- Portfolio-level calculation by release year
- Shows trend: declining from 15.24% (2021) to 13.76% (2025)
- Reflects portfolio maturation

**Monthly Yields** (Last 12 months):
- Rolling monthly portfolio yields
- 3/6/12 month averages
- Typical range: 12-15%

### Tab 3: Customer Type Analysis
**Vyapari vs Private**:
- Vyapari: 14.91% yield (152 days avg)
- Private: 12.17% yield (267 days avg)
- Shows loan count, capital deployment, interest realized

### Tab 4: Additional Metrics
- Loan distribution charts
- Geographical analysis
- Other business metrics

### Tab 5: Risk & Collections
- Delinquency tracking
- Collections performance
- Risk segmentation

---

## 🧮 Calculation Methodology

### Portfolio Yield Formula
```
Portfolio Yield = (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100

where:
Weighted Avg Days = Σ(loan_amount × days_to_release) / Σ(loan_amount)
```

### Why Portfolio-Level vs Averaging?
❌ **WRONG**: Average individual annualized yields  
✅ **CORRECT**: Calculate portfolio-level yield

**Example**:
- Loan A: ₹1M @ 400% (7 days)
- Loan B: ₹9M @ 12% (365 days)

**Wrong Method** (averaging):
- (400% + 12%) / 2 = **206%** ❌

**Correct Method** (portfolio-level):
- Interest: (₹1M × 400% × 7/365) + (₹9M × 12%) = ₹76.7K + ₹1.08M = ₹1.157M
- Capital: ₹10M
- Weighted Days: (₹1M × 7 + ₹9M × 365) / ₹10M = 330 days
- Yield: (₹1.157M / ₹10M) × (365 / 330) × 100 = **12.8%** ✅

---

## 📈 Key Insights

### Portfolio Composition
1. **Majority is long-term**: 77% of capital in 30+ day loans
2. **Short-term has high velocity**: 32% annualized yield on quick turnover
3. **Blended portfolio yield**: 14.36% (capital-weighted average)

### Customer Types
1. **Vyapari outperforms**: Higher yield (14.91%) due to faster turnover
2. **Private more stable**: Longer holding periods (267 days avg)
3. **Capital allocation**: Understand mix for optimization

### Temporal Trends
1. **Declining yields**: From 15.24% (2021) to 13.76% (2025)
2. **Monthly variation**: Typically 12-15% range
3. **Seasonal patterns**: Monitor monthly chart for trends

---

## 🔍 Data Filters

### Released Loans Only
```python
released = df[df['date_of_release'].notna()]
```

### Quality Filters
```python
# Positive days and amounts
released = released[(released['days_to_release'] > 0) & (released['loan_amount'] > 0)]
```

### Realized Interest Logic
```python
realized_interest = max(interest_deposited_till_date, interest_amount)
```

---

## 🚨 Important Notes

### What Changed (December 2025)
- **Old Method**: Averaged individual annualized yields → **inflated results** (18-20%)
- **New Method**: Portfolio-level calculation → **accurate results** (13-15%)
- **Impact**: All yield metrics reduced by 4-7 percentage points

### Interpretation Guide
1. **Portfolio Yield**: True annualized return on capital deployed
2. **Simple Return**: Non-annualized return (interest / capital × 100)
3. **Weighted Avg Period**: Capital-weighted average holding days
4. **Short-term vs Long-term**: Understand yield drivers by tenure

### Edge Cases
- **1-7 day loans**: Extreme annualized yields (400-5000%) are mathematically correct but rare
- **Data errors**: Monitor for entry mistakes (recent fixes: #13138, #11440)
- **Empty periods**: Some months may have zero releases

---

## 🛠️ Troubleshooting

### Common Issues

**Issue**: Yields seem too high/low  
**Check**: 
- Time period filter (year/month)
- Customer type filter
- Data completeness

**Issue**: Chart not displaying  
**Check**:
- Sufficient data in selected period
- Browser console for errors
- Streamlit version compatibility

**Issue**: Numbers don't match spreadsheet  
**Check**:
- Calculation methodology (portfolio-level vs averaging)
- Date filters (disbursement vs release)
- Realized interest logic

---

## 📞 Support

**Documentation**:
- `YIELD_FIX_SUMMARY.md` - Detailed fix documentation
- `test_yield_fixes.py` - Validation script
- `agents.md` - Application architecture

**Testing**:
```bash
# Run validation
.\.venv\Scripts\python.exe .\test_yield_fixes.py

# Start dashboard
.\run_dev.bat
```

---

## ✅ Quick Validation Checklist

When reviewing metrics:
- [ ] Portfolio yield in 13-15% range? ✓
- [ ] Monthly yields NOT in 18-20% range? ✓
- [ ] Short-term yield (~32%) > Long-term yield (~14.5%)? ✓
- [ ] Vyapari yield > Private yield? ✓
- [ ] Weighted avg holding period realistic (100-200 days)? ✓

---

**Version**: 1.0  
**Last Updated**: December 2025  
**Status**: Production ✓
