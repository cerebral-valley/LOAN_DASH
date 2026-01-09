# Backend API Optimization Recommendations

## Critical Issue: Client-Side Data Processing

### Problem
Several frontend pages load **50,000 loans** and perform aggregations in the browser:

```typescript
// ❌ INEFFICIENT: Loads 5-10MB of data
const { data: loans = [] } = useLoans(1, 50000);

// Then processes in browser:
const metrics = useMemo(() => {
  return loans.reduce((acc, loan) => {
    // Complex calculations on 50k records
  }, {});
}, [loans]);
```

**Impact:**
- Page compile: 1.2-1.6s (1100-1166 modules)
- Data transfer: 5-10MB per page
- Browser memory: High
- Slow on mobile devices

### Solution: Backend Aggregation Endpoints

Move calculations to backend where they're cached and fast.

## Recommended New Endpoints

### 1. Performance Stats
**Current:** `/performance` page loads 50k loans
**New Endpoint:** `GET /api/loans/performance/stats`

```typescript
// Backend: LoanController.ts
async getPerformanceStats(req: Request, res: Response) {
  const cacheKey = 'performance_stats';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  const stats = await this.loanRepository
    .createQueryBuilder('loan')
    .select('loan.customer_type', 'type')
    .addSelect('COUNT(*)', 'count')
    .addSelect('SUM(loan.loan_amount)', 'disbursed')
    .addSelect(
      `SUM(CASE WHEN loan.released = 'TRUE' THEN loan.loan_amount ELSE 0 END)`,
      'collected'
    )
    .addSelect('SUM(loan.pending_loan_amount)', 'outstanding')
    .addSelect('SUM(loan.interest_amount)', 'interestReceived')
    .groupBy('loan.customer_type')
    .getRawMany();

  await cache.set(cacheKey, stats, 600); // 10 min cache
  res.json(stats);
}
```

**Frontend:**
```typescript
// queries.ts
export function usePerformanceStats() {
  return useQuery({
    queryKey: ['loans', 'performance', 'stats'],
    queryFn: async () => {
      const response = await loanApi.getPerformanceStats();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}

// page.tsx
const { data: stats } = usePerformanceStats(); // Fast! Only aggregated data
```

### 2. Customer Analytics
**Current:** `/customer-analytics` loads 50k loans
**New Endpoint:** `GET /api/loans/customer-analytics`

```typescript
interface CustomerAnalytics {
  topCustomers: {
    name: string;
    totalLoans: number;
    totalDisbursed: number;
    avgLoanSize: number;
    interestReceived: number;
  }[];
  byCustomerType: {
    type: string;
    count: number;
    avgDisbursement: number;
    retentionRate: number;
  }[];
  monthlyNewCustomers: {
    month: string;
    newCustomers: number;
    repeatCustomers: number;
  }[];
}
```

### 3. Portfolio Summary
**Current:** `/portfolio` loads 50k loans
**New Endpoint:** `GET /api/loans/portfolio/summary`

```typescript
interface PortfolioSummary {
  byType: {
    type: string;
    count: number;
    totalAmount: number;
    totalOutstanding: number;
    activeLoans: number;
  }[];
  ltvDistribution: {
    range: string;
    count: number;
    totalValue: number;
  }[];
  riskProfile: {
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  };
}
```

### 4. Profitability Analysis
**Current:** `/profitability` loads 50k loans
**New Endpoint:** `GET /api/loans/profitability/analysis`

```typescript
interface ProfitabilityAnalysis {
  overall: {
    totalRevenue: number;
    costOfFunds: number;
    grossProfit: number;
    profitMargin: number;
  };
  byProduct: {
    type: string;
    revenue: number;
    costs: number;
    profit: number;
    margin: number;
  }[];
  trends: {
    month: string;
    revenue: number;
    profit: number;
  }[];
}
```

## Implementation Priority

| Page | Impact | Difficulty | Priority |
|------|--------|-----------|----------|
| `/performance` | HIGH (1166 modules) | Medium | 🔴 P0 |
| `/customer-analytics` | HIGH (1112 modules) | Medium | 🔴 P0 |
| `/portfolio` | HIGH (1103 modules) | Easy | 🟡 P1 |
| `/profitability` | HIGH (1130 modules) | Medium | 🟡 P1 |
| `/aging` | MEDIUM (1139 modules) | Easy | 🟢 P2 |
| `/ltv-trends` | MEDIUM (1148 modules) | Easy | 🟢 P2 |

## Expected Improvements

### Before (Client-Side Processing)
```
✓ Compiled /performance in 1640ms (1166 modules)
GET /performance 200 in 1767ms
Data transferred: ~8MB
Browser memory: High
```

### After (Backend Aggregation)
```
✓ Compiled /performance in 400ms (650 modules)
GET /performance 200 in 500ms
Data transferred: ~50KB
Browser memory: Low
```

**Improvements:**
- ⚡ 75% faster compilation
- 📦 99% less data transfer
- 🧠 90% less browser memory
- 📱 Much better mobile performance

## Code Migration Guide

### Step 1: Add Backend Endpoint

```typescript
// backend/src/controllers/LoanController.ts
getPerformanceStats = async (req: Request, res: Response) => {
  const cacheKey = 'performance_stats';
  const cached = await cache.get(cacheKey);
  if (cached) return res.json(cached);

  // SQL aggregation here
  const stats = await this.loanRepository
    .createQueryBuilder('loan')
    // ... aggregation logic
    .getRawMany();

  await cache.set(cacheKey, stats);
  res.json(stats);
};

// backend/src/routes/loanRoutes.ts
router.get('/performance/stats', loanController.getPerformanceStats);
```

### Step 2: Add Frontend Hook

```typescript
// frontend/src/lib/api.ts
export interface PerformanceStats {
  type: string;
  count: number;
  disbursed: number;
  // ... other fields
}

export const loanApi = {
  // ... existing methods
  getPerformanceStats: () => api.get<PerformanceStats[]>('/loans/performance/stats'),
};

// frontend/src/lib/queries.ts
export function usePerformanceStats() {
  return useQuery({
    queryKey: ['loans', 'performance', 'stats'],
    queryFn: async () => {
      const response = await loanApi.getPerformanceStats();
      return response.data;
    },
    staleTime: 10 * 60 * 1000,
  });
}
```

### Step 3: Update Page

```typescript
// frontend/src/app/(dashboard)/performance/page.tsx
export default function PerformancePage() {
  // ❌ OLD: Loads 50k records
  // const { data: loans = [] } = useLoans(1, 50000);
  
  // ✅ NEW: Loads aggregated stats
  const { data: stats = [], isLoading, error } = usePerformanceStats();

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState />;

  // Direct rendering - no client-side aggregation needed!
  return (
    <div>
      {stats.map(stat => (
        <Card key={stat.type}>
          <CardHeader>{stat.type}</CardHeader>
          <CardContent>
            Count: {stat.count}
            Disbursed: {formatCurrency(stat.disbursed)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Testing

### Backend
```bash
# Test new endpoint
curl http://localhost:3001/api/loans/performance/stats

# Verify caching
curl -w "@curl-format.txt" http://localhost:3001/api/loans/performance/stats
```

### Frontend
```bash
# Clear cache and test
rm -rf .next
npm run dev

# Navigate to /performance
# Check Network tab: Should see < 100KB response
```

## Rollback Plan

If issues occur, the old code still works:
1. Keep `useLoans(1, 50000)` as fallback
2. Feature flag: `USE_AGGREGATED_STATS`
3. Gradual rollout per page

## Monitoring

After implementation, monitor:
- API response times (should be < 100ms)
- Cache hit rates (should be > 90%)
- Page load times (should be < 500ms)
- Bundle sizes (should decrease by 40-50%)

## Next Steps

1. ✅ Review this document
2. ⚡ Implement performance stats endpoint (P0)
3. 🔄 Test with frontend
4. 📊 Measure improvements
5. 🚀 Roll out to other pages
