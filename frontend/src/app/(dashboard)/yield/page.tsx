'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, TrendingUp, Calendar, PieChart } from 'lucide-react';

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
  const [metrics, setMetrics] = useState<YieldMetrics | null>(null);
  const [holdingPeriodSegments, setHoldingPeriodSegments] = useState<HoldingPeriodSegment[]>([]);
  const [loanAmountBuckets, setLoanAmountBuckets] = useState<LoanAmountBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getAll();
      const loansData = response.data;

      // Filter released loans only
      const releasedLoans = loansData.filter(
        (loan) =>
          loan.released === 'TRUE' &&
          loan.date_of_disbursement &&
          loan.date_of_release &&
          loan.loan_amount &&
          loan.loan_amount > 0
      );

      // Calculate metrics
      calculateMetrics(releasedLoans);
      calculateHoldingPeriodSegments(releasedLoans);
      calculateLoanAmountBuckets(releasedLoans);

      setError(null);
    } catch (err) {
      setError('Failed to fetch loan data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysToRelease = (disbursement: Date, release: Date): number => {
    const diff = release.getTime() - disbursement.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const calculateMetrics = (releasedLoans: Loan[]) => {
    const totalCapital = releasedLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
    const totalInterest = releasedLoans.reduce((sum, loan) => sum + (loan.interest_deposited_till_date || 0), 0);

    // Calculate weighted average days
    const weightedDays = releasedLoans.reduce((sum, loan) => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        const days = calculateDaysToRelease(loan.date_of_disbursement, loan.date_of_release);
        return sum + (loan.loan_amount || 0) * days;
      }
      return sum;
    }, 0);

    const weightedAvgDays = totalCapital > 0 ? weightedDays / totalCapital : 0;

    // Portfolio yield = (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
    const portfolioYield = totalCapital > 0 && weightedAvgDays > 0
      ? (totalInterest / totalCapital) * (365 / weightedAvgDays) * 100
      : 0;

    const simpleReturn = totalCapital > 0 ? (totalInterest / totalCapital) * 100 : 0;

    setMetrics({
      portfolioYield,
      simpleReturn,
      totalInterest,
      totalCapital,
      weightedAvgDays: Math.round(weightedAvgDays),
    });
  };

  const calculateHoldingPeriodSegments = (releasedLoans: Loan[]) => {
    const shortTerm = releasedLoans.filter((loan) => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        const days = calculateDaysToRelease(loan.date_of_disbursement, loan.date_of_release);
        return days < 30;
      }
      return false;
    });

    const longTerm = releasedLoans.filter((loan) => {
      if (loan.date_of_disbursement && loan.date_of_release) {
        const days = calculateDaysToRelease(loan.date_of_disbursement, loan.date_of_release);
        return days >= 30;
      }
      return false;
    });

    const calculateSegmentYield = (loans: Loan[]) => {
      const totalCapital = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      const totalInterest = loans.reduce((sum, loan) => sum + (loan.interest_deposited_till_date || 0), 0);
      const weightedDays = loans.reduce((sum, loan) => {
        if (loan.date_of_disbursement && loan.date_of_release) {
          const days = calculateDaysToRelease(loan.date_of_disbursement, loan.date_of_release);
          return sum + (loan.loan_amount || 0) * days;
        }
        return sum;
      }, 0);
      const avgDays = totalCapital > 0 ? weightedDays / totalCapital : 0;
      const portfolioYield = totalCapital > 0 && avgDays > 0
        ? (totalInterest / totalCapital) * (365 / avgDays) * 100
        : 0;
      return { portfolioYield, capital: totalCapital, avgDays: Math.round(avgDays) };
    };

    const shortTermData = calculateSegmentYield(shortTerm);
    const longTermData = calculateSegmentYield(longTerm);

    const totalCapital = releasedLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);

    setHoldingPeriodSegments([
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
    ]);
  };

  const calculateLoanAmountBuckets = (releasedLoans: Loan[]) => {
    const buckets = [
      { min: 0, max: 50000, label: '<₹50K' },
      { min: 50000, max: 100000, label: '₹50K-100K' },
      { min: 100000, max: 150000, label: '₹100K-150K' },
      { min: 150000, max: 200000, label: '₹150K-200K' },
      { min: 200000, max: Infinity, label: '₹200K+' },
    ];

    const totalCapital = releasedLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);

    const bucketData = buckets.map((bucket) => {
      const bucketLoans = releasedLoans.filter(
        (loan) => loan.loan_amount && loan.loan_amount >= bucket.min && loan.loan_amount < bucket.max
      );

      const capital = bucketLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      const interest = bucketLoans.reduce((sum, loan) => sum + (loan.interest_deposited_till_date || 0), 0);
      const weightedDays = bucketLoans.reduce((sum, loan) => {
        if (loan.date_of_disbursement && loan.date_of_release) {
          const days = calculateDaysToRelease(loan.date_of_disbursement, loan.date_of_release);
          return sum + (loan.loan_amount || 0) * days;
        }
        return sum;
      }, 0);

      const avgDays = capital > 0 ? weightedDays / capital : 0;
      const portfolioYield = capital > 0 && avgDays > 0
        ? (interest / capital) * (365 / avgDays) * 100
        : 0;

      return {
        range: bucket.label,
        portfolioYield,
        capital,
        portfolioPercentage: totalCapital > 0 ? (capital / totalCapital) * 100 : 0,
        loanCount: bucketLoans.length,
        avgDays: Math.round(avgDays),
      };
    });

    setLoanAmountBuckets(bucketData);
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'interest-yield-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading interest yield analysis...</div>
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
            <div className="text-2xl font-bold">{metrics?.portfolioYield.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Annualized return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Simple Return</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.simpleReturn.toFixed(2)}%</div>
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
              ₹{((metrics?.totalInterest || 0) / 1000000).toFixed(2)}M
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
              ₹{((metrics?.totalCapital || 0) / 1000000).toFixed(2)}M
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
                        {segment.portfolioYield.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{segment.capital.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {segment.portfolioPercentage.toFixed(1)}%
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
                        {bucket.portfolioYield.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{bucket.capital.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {bucket.portfolioPercentage.toFixed(1)}%
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
