# 📐 Interest Yield Calculation Formulas - Complete Breakdown

**Date**: November 28, 2025  
**Purpose**: Detailed explanation of ALL yield calculation formulas used in the application

---

## 🔑 Key Variables & Definitions

### Database Fields (Raw Data)
| Field | Description | Example |
|-------|-------------|---------|
| `loan_amount` | Principal disbursed to customer | ₹100,000 |
| `interest_amount` | Total interest CHARGED for the loan period | ₹13,200 |
| `interest_deposited_till_date` | Interest actually PAID by customer (real cash) | ₹10,000 |
| `date_of_disbursement` | When loan was given | 2024-01-01 |
| `date_of_release` | When loan was closed/gold returned | 2024-12-31 |
| `released` | Loan status: "TRUE" or "FALSE" | "TRUE" |

### Calculated Fields
| Field | Formula | Purpose |
|-------|---------|---------|
| `days_to_release` | `date_of_release - date_of_disbursement` | Loan duration in days |
| `realized_interest` | **See Formula Below** | Interest used for yield calculations (ACTUAL PAID) |

### ⚡ Realized Interest Calculation (CRITICAL)

**Correct Formula**:
```python
realized_interest = SUM(interest_deposited_till_date) 
                  + SUM(interest_amount WHERE released='TRUE' AND (interest_deposited_till_date IS NULL OR interest_deposited_till_date = 0))
```

**Logic**:
1. **Primary**: Use `interest_deposited_till_date` (actual paid interest)
2. **Fallback**: For released loans with missing/zero paid interest, use `interest_amount` (charged)

**Why This Formula?**:
- ✅ Uses **actual cash collected** (`interest_deposited_till_date`)
- ✅ Handles **legacy data** where paid interest wasn't tracked
- ✅ Reflects **real business performance** (cash-basis)
- ✅ More accurate than using charged interest for all loans

**Example**:
```python
# Loan 1: Modern loan with tracked payments
loan_amount = ₹100,000
interest_deposited_till_date = ₹13,200
interest_amount = ₹13,200
realized_interest = ₹13,200  # Use deposited (actual paid)

# Loan 2: Customer paid partial interest
loan_amount = ₹50,000
interest_deposited_till_date = ₹5,000
interest_amount = ₹6,600
realized_interest = ₹5,000  # Use deposited (what was actually paid)

# Loan 3: Legacy released loan (no payment tracking)
loan_amount = ₹80,000
interest_deposited_till_date = 0 or NULL
interest_amount = ₹10,560
released = 'TRUE'
realized_interest = ₹10,560  # Use interest_amount as fallback
```

---

## 📊 Formula 1: Individual Loan Annualized Yield

**Purpose**: Calculate annualized yield for a SINGLE loan (for reference, NOT for averaging)

### Formula
```
Individual Yield (%) = (Interest / Principal) × (365 / Days) × 100
```

### Components

- **Interest**: `realized_interest` (see calculation above - actual paid + fallback to charged for legacy)
- **Principal**: `loan_amount` (disbursed amount)
- **Days**: `days_to_release` (duration of loan)
- **365**: Days in a year (for annualization)

### Example Calculation

**Loan Details**:
- Loan Amount: ₹100,000
- Interest Charged: ₹6,600
- Days to Release: 180 days (6 months)

**Step-by-Step**:
```
Step 1: Calculate simple return
        = Interest / Principal
        = ₹6,600 / ₹100,000
        = 0.066 (6.6%)

Step 2: Calculate annualization factor
        = 365 / Days
        = 365 / 180
        = 2.028

Step 3: Calculate annualized yield
        = Simple Return × Annualization Factor × 100
        = 0.066 × 2.028 × 100
        = 13.38%
```

### Why Annualize?
A 6-month loan earning 6.6% needs to be annualized to compare with a 12-month loan:
- 6 months at 6.6% → **13.38% annual equivalent**
- 12 months at 13.2% → **13.2% annual**

### ⚠️ Critical Note
**DO NOT average these individual yields!** Each loan has different duration and amount, so simple averaging distorts results.

---

## 📊 Formula 2: Portfolio-Level Annualized Yield (PRIMARY METRIC)

**Purpose**: Calculate the TRUE portfolio yield across ALL loans (this is the CORRECT method)

### Formula
```
Portfolio Yield (%) = (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
```

### Components Breakdown

#### A. Total Interest
```
Total Interest = SUM(realized_interest for all loans)
                = SUM(interest_amount for all loans)
```

**Example**:
```
Loan 1: ₹6,600 (actual paid)
Loan 2: ₹3,300 (actual paid)
Loan 3: ₹13,200 (legacy released, fallback to charged)
**Total Interest** = ₹23,100
```

#### B. Total Capital
```
Total Capital = SUM(loan_amount for all loans)
```

**Example**:
- Loan 1: ₹100,000
- Loan 2: ₹50,000
- Loan 3: ₹100,000
- **Total Capital** = ₹250,000

#### C. Weighted Average Days
```
Weighted Avg Days = SUM(loan_amount × days_to_release) / SUM(loan_amount)
```

**Why Weighted?** Larger loans should have more influence on average holding period.

**Example**:
```
Loan 1: ₹100,000 × 180 days = 18,000,000
Loan 2: ₹50,000 × 90 days = 4,500,000
Loan 3: ₹100,000 × 365 days = 36,500,000
---------------------------------------------------
Total: 59,000,000

Weighted Avg Days = 59,000,000 / ₹250,000
                  = 236 days
```

**Note**: Not 211.67 days (simple average of 180, 90, 365)!

#### D. Final Portfolio Yield Calculation
```
Portfolio Yield = (₹23,100 / ₹250,000) × (365 / 236) × 100
                = 0.0924 × 1.546 × 100
                = 14.28%
```

### Why This is Correct

1. ✅ Uses TOTAL interest and capital (no averaging)
2. ✅ Uses WEIGHTED average days (respects loan sizes)
3. ✅ Reflects actual portfolio performance (cash-basis)
4. ✅ Matches P&L: ₹23,100 actual interest collected on ₹250,000 capital
5. ✅ Handles legacy data gracefully with fallback mechanism

---

## 📊 Formula 3: Simple Return (Not Annualized)

**Purpose**: Actual return percentage without time adjustment (for P&L reconciliation)

### Formula
```
Simple Return (%) = (Total Interest / Total Capital) × 100
```

### Example
```
Simple Return = (₹23,100 / ₹250,000) × 100
              = 9.24%
```

### When to Use
- P&L reporting (actual return earned)
- Cash flow analysis
- Comparing to non-annualized metrics

### Relationship to Portfolio Yield
```
Portfolio Yield = Simple Return × (365 / Weighted Avg Days)

Example:
14.28% = 9.24% × (365 / 236)
14.28% = 9.24% × 1.546 ✓
```

---

## 📊 Formula 4: Holding Period Segment Yields

**Purpose**: Calculate yield for SHORT-TERM vs. LONG-TERM loans separately

### Short-term (<30 days)

**Filter**: `days_to_release < 30`

**Formula** (Same as Portfolio Yield):
```
ST Yield (%) = (ST Total Interest / ST Total Capital) × (365 / ST Weighted Avg Days) × 100
```

**Example**:
- ST Total Interest: ₹5,000
- ST Total Capital: ₹150,000
- ST Weighted Avg Days: 15 days

```
ST Yield = (₹5,000 / ₹150,000) × (365 / 15) × 100
         = 0.0333 × 24.33 × 100
         = 81.1%
```

**Why so high?** Short duration loans are annualized:
- 15 days at 3.33% → **81.1% annual equivalent**

### Long-term (30+ days)

**Filter**: `days_to_release >= 30`

**Formula**:
```
LT Yield (%) = (LT Total Interest / LT Total Capital) × (365 / LT Weighted Avg Days) × 100
```

**Example**:
- LT Total Interest: ₹18,100
- LT Total Capital: ₹100,000
- LT Weighted Avg Days: 450 days

```
LT Yield = (₹18,100 / ₹100,000) × (365 / 450) × 100
         = 0.181 × 0.811 × 100
         = 14.68%
```

---

## 📊 Formula 5: Loan Amount Range Yields

**Purpose**: Calculate yield for different loan size buckets

### Buckets
1. <₹50K
2. ₹50K-100K
3. ₹100K-150K
4. ₹150K-200K
5. ₹200K+

### Formula (for each bucket)
```
Bucket Yield (%) = (Bucket Total Interest / Bucket Total Capital) × (365 / Bucket Weighted Avg Days) × 100
```

**Example for ₹50K-100K bucket**:
- Bucket Total Interest: ₹8,500
- Bucket Total Capital: ₹78,000
- Bucket Weighted Avg Days: 165 days

```
Bucket Yield = (₹8,500 / ₹78,000) × (365 / 165) × 100
             = 0.1090 × 2.212 × 100
             = 24.11%
```

---

## 📊 Formula 6: Yearly Yield Trends

**Purpose**: Portfolio yield for each release year

### Formula (for each year)
```
Year Yield (%) = (Year Total Interest / Year Total Capital) × (365 / Year Weighted Avg Days) × 100
```

### Year-over-Year Change
```
YoY Change (%) = ((Current Year Yield - Previous Year Yield) / Previous Year Yield) × 100
```

**Example**:
- 2024 Yield: 14.5%
- 2025 Yield: 15.2%

```
YoY Change = ((15.2 - 14.5) / 14.5) × 100
           = (0.7 / 14.5) × 100
           = +4.83%
```

---

## 📊 Formula 7: Monthly Yield Trends

**Purpose**: Portfolio yield for each release month

### Formula (for each month)
```
Month Yield (%) = (Month Total Interest / Month Total Capital) × (365 / Month Weighted Avg Days) × 100
```

### Month-over-Month Change
```
MoM Change (%) = ((Current Month Yield - Previous Month Yield) / Previous Month Yield) × 100
```

### Rolling Averages

#### 3-Month Rolling Average
```
3M Avg = Portfolio yield calculated for last 3 months combined
       = (Last 3M Total Interest / Last 3M Total Capital) × (365 / Last 3M Weighted Avg Days) × 100
```

**NOT**: Average of 3 individual monthly yields ❌

---

## 📊 Formula 8: Customer Type Yields

**Purpose**: Yield comparison between Vyapari vs. Private customers

### Formula (for each type)
```
Type Yield (%) = (Type Total Interest / Type Total Capital) × (365 / Type Weighted Avg Days) × 100
```

**Example for Vyapari**:
- Vyapari Total Interest: ₹15,000
- Vyapari Total Capital: ₹156,000
- Vyapari Weighted Avg Days: 152 days

```
Vyapari Yield = (₹15,000 / ₹156,000) × (365 / 152) × 100
              = 0.0962 × 2.401 × 100
              = 23.09%
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ WRONG: Averaging Individual Yields
```python
# NEVER DO THIS:
avg_yield = yield_df['interest_yield'].mean()
```

**Why wrong?**
- Loan 1: ₹10,000 for 7 days = 400% yield (tiny loan, short duration)
- Loan 2: ₹100,000 for 365 days = 13% yield (large loan, long duration)
- **Average**: (400% + 13%) / 2 = 206.5% ❌ COMPLETELY WRONG!

### ✅ CORRECT: Portfolio-Level Calculation
```python
total_interest = yield_df['realized_interest'].sum()
total_capital = yield_df['loan_amount'].sum()
weighted_avg_days = (yield_df['loan_amount'] * yield_df['days_to_release']).sum() / total_capital
portfolio_yield = (total_interest / total_capital) * (365 / weighted_avg_days) * 100
```

---

## 🎯 Which Formula to Use When?

| Use Case | Formula | Example |
|----------|---------|---------|
| Overall portfolio performance | Portfolio Yield (Formula 2) | "What's our portfolio return?" |
| P&L reconciliation | Simple Return (Formula 3) | "What's our actual return?" |
| Individual loan analysis | Individual Yield (Formula 1) | "What's the yield on loan #12345?" |
| Segment comparison | Segment Portfolio Yield (Formula 4) | "Short-term vs. long-term performance?" |
| Time series analysis | Yearly/Monthly Yield (Formula 6/7) | "How are yields trending?" |
| Customer segmentation | Type Yield (Formula 8) | "Vyapari vs. Private performance?" |

---

## 🧮 Validation Examples

### Example Portfolio

| Loan | Amount | Interest | Days | Individual Yield |
|------|--------|----------|------|------------------|
| A | ₹100,000 | ₹13,200 | 365 | 13.20% |
| B | ₹50,000 | ₹3,300 | 180 | 13.38% |
| C | ₹150,000 | ₹8,250 | 182 | 11.04% |

### Step 1: Calculate Individual Yields (for reference only)
```
Loan A: (13,200 / 100,000) × (365 / 365) × 100 = 13.20%
Loan B: (3,300 / 50,000) × (365 / 180) × 100 = 13.38%
Loan C: (8,250 / 150,000) × (365 / 182) × 100 = 11.04%
```

### Step 2: Portfolio Yield (CORRECT METHOD)
```
Total Interest = 13,200 + 3,300 + 8,250 = ₹24,750
Total Capital = 100,000 + 50,000 + 150,000 = ₹300,000
Weighted Avg Days = (100,000×365 + 50,000×180 + 150,000×182) / 300,000
                  = (36,500,000 + 9,000,000 + 27,300,000) / 300,000
                  = 72,800,000 / 300,000
                  = 242.67 days

Portfolio Yield = (24,750 / 300,000) × (365 / 242.67) × 100
                = 0.0825 × 1.504 × 100
                = 12.41%
```

### Step 3: Verify NOT Simple Average
```
Simple Average = (13.20% + 13.38% + 11.04%) / 3 = 12.54% ❌ WRONG!
Portfolio Yield = 12.41% ✓ CORRECT!
```

**Why different?** Simple average ignores loan sizes and holding periods.

---

## 📚 Formula Summary Table

| # | Name | Formula | When to Use |
|---|------|---------|-------------|
| 1 | Individual Yield | `(Interest / Principal) × (365 / Days) × 100` | Single loan analysis |
| 2 | Portfolio Yield | `(ΣInterest / ΣCapital) × (365 / Weighted Days) × 100` | Overall performance (PRIMARY) |
| 3 | Simple Return | `(ΣInterest / ΣCapital) × 100` | P&L reconciliation |
| 4 | Segment Yield | `(Segment Interest / Segment Capital) × (365 / Segment Days) × 100` | Holding period analysis |
| 5 | Bucket Yield | `(Bucket Interest / Bucket Capital) × (365 / Bucket Days) × 100` | Loan size analysis |
| 6 | Yearly Yield | `(Year Interest / Year Capital) × (365 / Year Days) × 100` | Year trends |
| 7 | Monthly Yield | `(Month Interest / Month Capital) × (365 / Month Days) × 100` | Month trends |
| 8 | Type Yield | `(Type Interest / Type Capital) × (365 / Type Days) × 100` | Customer segmentation |

---

**Last Updated**: November 28, 2025  
**Status**: Complete breakdown of ALL yield formulas  
**Note**: ALL formulas use `realized_interest` = `SUM(interest_deposited_till_date) + SUM(interest_amount WHERE released='TRUE' AND interest_deposited_till_date ≤ 0)`  
**Basis**: Cash-basis accounting (actual paid interest), with fallback to charged interest for legacy released loans
