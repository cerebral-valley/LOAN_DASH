# React Query Migration - Implementation Guide

## 📋 Overview

This document provides a comprehensive guide for completing the React Query migration across all dashboard pages in the LOAN_DASH application.

## ✅ Current Status (8/21 pages complete - 38%)

### Migrated Pages
1. **overview** - Aggregated statistics dashboard
2. **clients** - Customer type analysis
3. **vyapari** - Vyapari customer breakdown
4. **yearly** - Monthly disbursement/release analysis
5. **expenses** - Expense tracker with filtering
6. **aging** - Loan age analysis
7. **active-loans** - Active loans by customer
8. **portfolio** - Portfolio composition metrics

### Remaining Pages (13)
- customer-analytics
- ltv-trends
- payment-history
- performance
- profitability
- projections
- rates
- recommendations
- risk-assessment
- granular
- yield
- [page] (dynamic route)
- dashboard (if not already migrated)

## 🎯 Migration Pattern

### Step-by-Step Process

#### 1. Update Imports
```typescript
// REMOVE these imports:
import { useEffect, useState } from 'react';
import { loanApi, Loan, downloadCSV } from '@/lib/api';

// ADD these imports:
import { useMemo } from 'react'; // if needed for computed values
import { useLoans } from '@/lib/queries'; // or appropriate query hook
import { useDownloadLoanCSV } from '@/lib/hooks';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
```

#### 2. Replace State Management
```typescript
// BEFORE:
const [loans, setLoans] = useState<Loan[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  fetchData();
}, []);

const fetchData = async () => {
  try {
    setLoading(true);
    const response = await loanApi.getAll();
    setLoans(response.data);
    setError(null);
  } catch (err) {
    setError('Failed to fetch...');
  } finally {
    setLoading(false);
  }
};

// AFTER:
const { data: loans = [], isLoading, error, refetch } = useLoans();
const { download: downloadCSV } = useDownloadLoanCSV();
```

#### 3. Wrap Computed Values in useMemo
```typescript
// BEFORE:
const activeLoans = loans.filter(loan => loan.released !== 'TRUE');
const totalAmount = loans.reduce((sum, loan) => sum + loan.amount, 0);

// AFTER:
const { activeLoans, totalAmount } = useMemo(() => {
  const active = loans.filter(loan => loan.released !== 'TRUE');
  const total = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  
  return { activeLoans: active, totalAmount: total };
}, [loans]);
```

#### 4. Update Loading/Error States
```typescript
// BEFORE:
if (loading) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  );
}

if (error) {
  return (
    <div className="p-8">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Connection Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchData}>Retry</Button>
        </CardContent>
      </Card>
    </div>
  );
}

// AFTER:
if (isLoading) {
  return <LoadingState />;
}

if (error) {
  return <ErrorState 
    message="Failed to fetch data. Please ensure the backend server is running." 
    onRetry={() => refetch()} 
  />;
}
```

#### 5. Update CSV Download
```typescript
// BEFORE:
const handleDownloadCSV = async () => {
  try {
    const response = await loanApi.downloadCSV();
    downloadCSV(response.data, 'filename.csv');
  } catch (err) {
    console.error('Error downloading CSV:', err);
  }
};

<Button onClick={handleDownloadCSV}>Export CSV</Button>

// AFTER:
<Button onClick={() => downloadCSV('filename.csv')}>Export CSV</Button>
```

## 📚 Available Query Hooks

Located in `/frontend/src/lib/queries.ts`:

### Loan Queries
- `useLoans(page?, limit?)` - All loans with pagination
- `useActiveLoans(page?, limit?)` - Active loans only
- `useReleasedLoans(page?, limit?)` - Released loans only
- `useLoansByCustomerType(type, page?, limit?)` - Filter by customer type
- `useLoansByCustomer(customerName, page?, limit?)` - Filter by customer
- `useVyapariCustomers()` - Get unique Vyapari customers
- `useLoanStats()` - Aggregated loan statistics
- `useOverviewStats()` - Overview page statistics

### Expense Queries
- `useExpenses(page?, limit?)` - All expenses with pagination
- `useExpenseStats()` - Aggregated expense statistics

### Custom Hooks
Located in `/frontend/src/lib/hooks.ts`:

- `useDownloadLoanCSV()` - Returns `{ download, isDownloading, error }`
- `useDownloadExpenseCSV()` - Returns `{ download, isDownloading, error }`

## 🎨 Best Practices

### 1. Always Use Default Values
```typescript
// Good: Provides fallback for initial render
const { data: loans = [], isLoading, error } = useLoans();

// Bad: Can cause undefined errors
const { data: loans, isLoading, error } = useLoans();
```

### 2. Memoize Expensive Calculations
```typescript
// Good: Only recalculates when loans change
const stats = useMemo(() => {
  return {
    total: loans.reduce((sum, l) => sum + l.amount, 0),
    count: loans.length,
  };
}, [loans]);

// Bad: Recalculates on every render
const stats = {
  total: loans.reduce((sum, l) => sum + l.amount, 0),
  count: loans.length,
};
```

### 3. Use Consistent Error Messages
```typescript
// Good: Clear and actionable
return <ErrorState 
  message="Failed to fetch loan data. Please ensure the backend server is running." 
  onRetry={() => refetch()} 
/>;

// Bad: Vague
return <ErrorState message="Error occurred" />;
```

### 4. Destructure With Meaningful Names
```typescript
// Good: Clear what data represents
const { data: loans = [], isLoading, error, refetch } = useLoans();

// Bad: Generic naming
const { data, isLoading, error } = useLoans();
```

## 🧪 Testing Checklist

After migrating each page:

1. ✅ **Build Check**: `npm run build` - Must pass without errors
2. ✅ **Type Check**: No TypeScript compilation errors
3. ✅ **Lint Check**: No new ESLint warnings
4. ✅ **Visual Test**: Page loads and displays data correctly
5. ✅ **Error State**: Test error handling (stop backend)
6. ✅ **Loading State**: Verify loading indicator appears
7. ✅ **CSV Export**: Test download functionality

## 📊 Expected Results Per Page

### Lines of Code
- **Before**: 200-500 lines (average: ~350)
- **After**: 150-400 lines (average: ~280)
- **Reduction**: ~50-70 lines per page

### Boilerplate Removed
- ❌ useState declarations (3-5 lines)
- ❌ useEffect hook (1-2 lines)
- ❌ fetchData function (20-30 lines)
- ❌ Manual error handling (10-15 lines)
- ❌ Loading state management (5-10 lines)
- ❌ CSV download handler (5-10 lines)

### Features Added
- ✅ Automatic caching (5-minute stale time)
- ✅ Background refetching
- ✅ Retry logic (3 attempts with exponential backoff)
- ✅ Request deduplication
- ✅ Optimistic updates
- ✅ Error recovery with retry button

## 🚀 Performance Benefits

### Before Migration
```
User opens page → useState initializes → useEffect runs → 
API call starts → Loading... → Data arrives → setLoans → Re-render

User switches pages → Come back → FULL CYCLE REPEATS
```

### After Migration
```
User opens page → React Query checks cache → 
  IF cached & fresh: Instant display ✨
  IF cached & stale: Show cached + refetch in background 🔄
  IF not cached: Fetch + cache 💾

User switches pages → Come back → INSTANT from cache! 🚀
```

### Cache Strategy
- **Stale Time**: 5 minutes (data considered fresh)
- **Cache Time**: 10 minutes (unused data kept in memory)
- **Refetch on Mount**: Only if stale
- **Refetch on Reconnect**: Yes
- **Retry**: 3 attempts with exponential backoff (1s, 2s, 4s)

## 🎯 Remaining Work Breakdown

### Batch 1: Simple Display Pages (~2 hours)
**Priority**: HIGH
**Complexity**: LOW

1. **customer-analytics** (~250 lines)
   - Customer distribution analysis
   - Simple aggregations
   - Standard patterns

2. **ltv-trends** (~280 lines)
   - LTV ratio analysis
   - Historical trends
   - Chart data preparation

3. **payment-history** (~250 lines)
   - Payment transactions
   - Simple filtering
   - Date-based display

4. **profitability** (~250 lines)
   - Profit/loss calculations
   - Simple metrics
   - Standard layout

### Batch 2: Complex Filtering Pages (~2-3 hours)
**Priority**: MEDIUM
**Complexity**: MEDIUM

1. **performance** (~360 lines)
   - Multiple KPIs
   - Complex calculations
   - Performance metrics

2. **rates** (~330 lines)
   - Interest rate analysis
   - Historical comparisons
   - Rate trends

3. **recommendations** (~450 lines)
   - Business insights
   - Data analysis
   - Recommendation engine

4. **risk-assessment** (~400 lines)
   - Risk scoring
   - Multiple factors
   - Assessment criteria

### Batch 3: Data-Intensive Pages (~2-3 hours)
**Priority**: MEDIUM
**Complexity**: HIGH

1. **projections** (~370 lines)
   - Future projections
   - Forecasting logic
   - Multiple scenarios

2. **granular** (~400 lines)
   - Detailed transaction view
   - Heavy filtering
   - Large datasets

3. **yield** (~460 lines)
   - Yield calculations
   - Monthly breakdowns
   - Complex formulas

### Special Considerations

**[page] - Dynamic Route**
- May need special handling
- Review routing logic first
- Ensure query parameters work

**dashboard**
- Check if already migrated
- Core landing page
- High visibility

## 🛠️ Troubleshooting

### Common Issues

#### Issue: "Cannot read property of undefined"
**Solution**: Always provide default values
```typescript
const { data: loans = [] } = useLoans(); // ✅ Good
const { data: loans } = useLoans(); // ❌ Bad
```

#### Issue: "Too many re-renders"
**Solution**: Wrap expensive calculations in useMemo
```typescript
const stats = useMemo(() => calculate Stats(loans), [loans]); // ✅
const stats = calculateStats(loans); // ❌ Recalculates every render
```

#### Issue: Build fails with "unused variable"
**Solution**: Remove or prefix with underscore
```typescript
const { data: loans = [], isLoading } = useLoans(); // ✅ If used
const { data: loans = [] } = useLoans(); // ✅ If isLoading not needed
const { data: loans = [], isLoading: _isLoading } = useLoans(); // ✅ Explicit ignore
```

#### Issue: ESLint "exhaustive-deps" warning
**Solution**: Add all dependencies to useMemo/useCallback
```typescript
useMemo(() => {
  return calculate(loans, filters);
}, [loans, filters]); // ✅ Include all used variables
```

## 📝 Commit Message Template

```
Migrate [page-name] page to React Query

- Replace useState/useEffect with use[Query]Hook
- Wrap computed values in useMemo
- Update to LoadingState/ErrorState components
- Use useDownload[Type]CSV hook for exports

Lines saved: ~[X] lines
```

## 🎉 Success Criteria

A page migration is complete when:

1. ✅ No useState for data/loading/error
2. ✅ No useEffect for data fetching
3. ✅ Uses appropriate React Query hook
4. ✅ Uses LoadingState component
5. ✅ Uses ErrorState component
6. ✅ Uses custom download hook
7. ✅ Computed values in useMemo
8. ✅ Build passes without errors
9. ✅ No new TypeScript errors
10. ✅ No new ESLint warnings

## 📈 Progress Tracking

Update this checklist as you complete pages:

- [x] overview
- [x] clients
- [x] vyapari
- [x] yearly
- [x] expenses
- [x] aging
- [x] active-loans
- [x] portfolio
- [ ] customer-analytics
- [ ] ltv-trends
- [ ] payment-history
- [ ] performance
- [ ] profitability
- [ ] projections
- [ ] rates
- [ ] recommendations
- [ ] risk-assessment
- [ ] granular
- [ ] yield
- [ ] [page]
- [ ] dashboard (if needed)

**Current Progress: 8/21 (38%)**

---

## 💡 Tips for Efficiency

1. **Work in batches**: Migrate similar pages together
2. **Copy patterns**: Use migrated pages as templates
3. **Test incrementally**: Build after each page
4. **Commit frequently**: One page per commit
5. **Use search/replace**: For common patterns
6. **Check types**: Let TypeScript guide you
7. **Review diffs**: Ensure changes are minimal

## 🤝 Need Help?

Reference completed pages for examples:
- **Simple patterns**: overview, clients, portfolio
- **Complex filtering**: expenses
- **Multiple datasets**: vyapari, yearly
- **Age calculations**: aging
- **Customer filtering**: active-loans

Good luck with the remaining migrations! 🚀
