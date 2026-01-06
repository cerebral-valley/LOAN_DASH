'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loan } from '@/lib/api';
import { useLoans } from '@/lib/queries';
import { Download, TrendingUp, Calendar, PieChart } from 'lucide-react';
import { calculateDaysToRelease } from '@/lib/loan-utils';
import { 
  sumLoanAmounts, 
  sumInterest, 
  calculatePortfolioYield, 
  calculateSimpleReturn,
  calculateWeightedAvgDays 
} from '@/lib/aggregation-utils';
import { formatCurrency, formatCurrencyInMillions, formatPercentage } from '@/lib/formatting-utils';
import { exportToCSV } from '@/lib/csv-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

interface YieldMetrics {
  portfolioYield: number;
  simpleReturn: number;
  totalInterest: number;
  totalCapital: number;
  weightedAvgDays: number;
}

interface HoldingPeriodSegment {
  segment: string;
  portfolioYield: number;
  capital: number;
  portfolioPercentage: number;
  avgDays: number;
  loanCount: number;
}

interface LoanAmountBucket {
  range: string;
  portfolioYield: number;
  capital: number;
  portfolioPercentage: number;
  loanCount: number;
  avgDays: number;
}

export default function YieldPage() {
  const { data: allLoans = [], isLoading, error, refetch } = useLoans();

  const { metrics, holdingPeriodSegments, loanAmountBuckets, releasedLoans } = useMemo(() => {
    // Filter released loans only
    const released = allLoans.filter(
      (loan) =>
        loan.released === 'TRUE' &&
        loan.date_of_disbursement &&
        loan.date_of_release &&
        loan.loan_amount &&
        loan.loan_amount > 0
    );

    const calculateDaysToReleaseFn = (loan: Loan): number => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        return calculateDaysToRelease(
          new Date(loan.date_of_disbursement),
          new Date(loan.date_of_release)
        );
      }
      return 0;
    };

    // Calculate metrics
    const totalCapital = sumLoanAmounts(released);
    const totalInterest = sumInterest(released);
    const weightedAvgDays = calculateWeightedAvgDays(released, calculateDaysToReleaseFn);
    const portfolioYield = calculatePortfolioYield(totalInterest, totalCapital, weightedAvgDays);
    const simpleReturn = calculateSimpleReturn(totalInterest, totalCapital);

    const metricsData: YieldMetrics = {
      portfolioYield,
      simpleReturn,
      totalInterest,
      totalCapital,
      weightedAvgDays: Math.round(weightedAvgDays),
    };

    // Calculate holding period segments
    const shortTerm = released.filter((loan) => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        const days = calculateDaysToRelease(
          new Date(loan.date_of_disbursement),
          new Date(loan.date_of_release)
        );
        return days < 30;
      }
      return false;
    });

    const longTerm = released.filter((loan) => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        const days = calculateDaysToRelease(
          new Date(loan.date_of_disbursement),
          new Date(loan.date_of_release)
        );
        return days >= 30;
      }
      return false;
    });

    const calculateSegmentYield = (loans: Loan[]) => {
      const segCapital = sumLoanAmounts(loans);
      const segInterest = sumInterest(loans);
      const avgDays = calculateWeightedAvgDays(loans, calculateDaysToReleaseFn);
      const segYield = calculatePortfolioYield(segInterest, segCapital, avgDays);
      return { portfolioYield: segYield, capital: segCapital, avgDays: Math.round(avgDays) };
    };

    const shortTermData = calculateSegmentYield(shortTerm);
    const longTermData = calculateSegmentYield(longTerm);

    const holdingSegments: HoldingPeriodSegment[] = [
      {
        segment: 'Short-term (<30 days)',
        portfolioYield: shortTermData.portfolioYield,
        capital: shortTermData.capital,
        portfolioPercentage: totalCapital > 0 ? (shortTermData.capital / totalCapital) * 100 : 0,
        avgDays: shortTermData.avgDays,
        loanCount: shortTerm.length,
      },
      {
        segment: 'Long-term (30+ days)',
        portfolioYield: longTermData.portfolioYield,
        capital: longTermData.capital,
        portfolioPercentage: totalCapital > 0 ? (longTermData.capital / totalCapital) * 100 : 0,
        avgDays: longTermData.avgDays,
        loanCount: longTerm.length,
      },
    ];

    // Calculate loan amount buckets
    const buckets = [
      { min: 0, max: 50000, label: '<₹50K' },
      { min: 50000, max: 100000, label: '₹50K-100K' },
      { min: 100000, max: 150000, label: '₹100K-150K' },
      { min: 150000, max: 200000, label: '₹150K-200K' },
      { min: 200000, max: Infinity, label: '₹200K+' },
    ];

    const bucketData = buckets.map((bucket) => {
      const bucketLoans = released.filter(
        (loan) => loan.loan_amount && loan.loan_amount >= bucket.min && loan.loan_amount < bucket.max
      );

      const capital = sumLoanAmounts(bucketLoans);
      const interest = sumInterest(bucketLoans);
      const avgDays = calculateWeightedAvgDays(bucketLoans, calculateDaysToReleaseFn);
      const bucketYield = calculatePortfolioYield(interest, capital, avgDays);

      return {
        range: bucket.label,
        portfolioYield: bucketYield,
        capital,
        portfolioPercentage: totalCapital > 0 ? (capital / totalCapital) * 100 : 0,
        loanCount: bucketLoans.length,
        avgDays: Math.round(avgDays),
      };
    });

    return {
      metrics: metricsData,
      holdingPeriodSegments: holdingSegments,
      loanAmountBuckets: bucketData,
      releasedLoans: released,
    };
  }, [allLoans]);

  const handleDownloadCSV = () => {
    try {
      // Export the calculated yield analysis data
      const csvData = [
        {
          'Portfolio Yield': formatPercentage(metrics?.portfolioYield),
          'Simple Return': formatPercentage(metrics?.simpleReturn),
          'Total Interest': formatCurrencyInMillions(metrics?.totalInterest),
          'Total Capital': formatCurrencyInMillions(metrics?.totalCapital),
          'Weighted Avg Days': metrics?.weightedAvgDays?.toString() || '0',
        },
        ...holdingPeriodSegments.map((segment) => ({
          Segment: segment.segment,
          'Portfolio Yield': formatPercentage(segment.portfolioYield),
          Capital: formatCurrency(segment.capital),
          '% of Portfolio': formatPercentage(segment.portfolioPercentage, 1),
          'Loan Count': segment.loanCount.toString(),
          'Avg Holding Days': segment.avgDays + ' days',
        })),
        ...loanAmountBuckets.map((bucket) => ({
          'Loan Amount Range': bucket.range,
          'Portfolio Yield': formatPercentage(bucket.portfolioYield),
          Capital: formatCurrency(bucket.capital),
          '% of Portfolio': formatPercentage(bucket.portfolioPercentage, 1),
          'Loan Count': bucket.loanCount.toString(),
          'Avg Holding Days': bucket.avgDays + ' days',
        })),
      ];

      exportToCSV(csvData, 'interest-yield-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch loan data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">📈 Interest Yield Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive yield analysis with portfolio-level calculations
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Overall Portfolio Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metrics?.portfolioYield)}
            </div>
            <p className="text-xs text-muted-foreground">Annualized return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Simple Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(metrics?.simpleReturn)}</div>
            <p className="text-xs text-muted-foreground">Non-annualized</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInMillions(metrics?.totalInterest)}
            </div>
            <p className="text-xs text-muted-foreground">Interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInMillions(metrics?.totalCapital)}
            </div>
            <p className="text-xs text-muted-foreground">Principal deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Holding</CardTitle>
            <Calendar className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.weightedAvgDays}</div>
            <p className="text-xs text-muted-foreground">Days (weighted)</p>
          </CardContent>
        </Card>
      </div>

      {/* Holding Period Segmentation */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Holding Period Segmentation
            </CardTitle>
            <CardDescription>
              Portfolio yield analysis by holding period (Short-term vs Long-term)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Segment</TableHead>
                    <TableHead className="text-right">Portfolio Yield</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">% of Portfolio</TableHead>
                    <TableHead className="text-right">Loan Count</TableHead>
                    <TableHead className="text-right">Avg Holding Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdingPeriodSegments.map((segment) => (
                    <TableRow key={segment.segment}>
                      <TableCell className="font-medium">{segment.segment}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatPercentage(segment.portfolioYield)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(segment.capital)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(segment.portfolioPercentage, 1)}
                      </TableCell>
                      <TableCell className="text-right">{segment.loanCount}</TableCell>
                      <TableCell className="text-right">{segment.avgDays} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Amount Range Analysis */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Loan Amount Range Analysis
            </CardTitle>
            <CardDescription>
              Portfolio yield by loan size buckets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan Amount Range</TableHead>
                    <TableHead className="text-right">Portfolio Yield</TableHead>
                    <TableHead className="text-right">Capital</TableHead>
                    <TableHead className="text-right">% of Portfolio</TableHead>
                    <TableHead className="text-right">Loan Count</TableHead>
                    <TableHead className="text-right">Avg Holding Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loanAmountBuckets.map((bucket) => (
                    <TableRow key={bucket.range}>
                      <TableCell className="font-medium">{bucket.range}</TableCell>
                      <TableCell className="text-right font-bold text-blue-600">
                        {formatPercentage(bucket.portfolioYield)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(bucket.capital)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatPercentage(bucket.portfolioPercentage, 1)}
                      </TableCell>
                      <TableCell className="text-right">{bucket.loanCount}</TableCell>
                      <TableCell className="text-right">{bucket.avgDays} days</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formula Explanation */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>📝 Portfolio Yield Formula</CardTitle>
            <CardDescription>Understanding the calculation methodology</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="mb-2 font-mono text-sm">
                  Portfolio Yield = (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
                </p>
                <p className="text-sm text-muted-foreground">
                  This formula annualizes the return based on the weighted average holding period across all loans.
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="mb-2 font-mono text-sm">
                  Weighted Avg Days = Σ(Loan Amount × Days) / Σ(Loan Amount)
                </p>
                <p className="text-sm text-muted-foreground">
                  Loans with larger principal amounts contribute more weight to the average holding period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
