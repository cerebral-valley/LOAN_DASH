'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { loanApi, Loan, downloadCSV, isLoanReleased } from '@/lib/api';
import { Download, Scale, TrendingUp, TrendingDown } from 'lucide-react';

export default function LTVTrendsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await loanApi.getAll();
      setLoans(response.data);
    } catch (err) {
      setError('Failed to fetch LTV trends data. Please ensure the backend server is running.');
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate LTV metrics
  const avgLTV = loans.length > 0
    ? loans.reduce((sum, loan) => sum + (loan.ltv_given || 0), 0) / loans.length
    : 0;

  const activeLoans = loans.filter((loan) => !isLoanReleased(loan.released));
  const avgActiveLTV = activeLoans.length > 0
    ? activeLoans.reduce((sum, loan) => sum + (loan.ltv_given || 0), 0) / activeLoans.length
    : 0;

  const highLTVLoans = loans.filter((loan) => (loan.ltv_given || 0) > 80);
  const lowLTVLoans = loans.filter((loan) => (loan.ltv_given || 0) <= 60);

  // LTV distribution
  const ltvRanges = [
    { label: '0-40%', min: 0, max: 40 },
    { label: '41-60%', min: 41, max: 60 },
    { label: '61-75%', min: 61, max: 75 },
    { label: '76-85%', min: 76, max: 85 },
    { label: '86-100%', min: 86, max: 100 },
  ];

  const ltvDistribution = ltvRanges.map((range) => {
    const loansInRange = loans.filter(
      (loan) => (loan.ltv_given || 0) >= range.min && (loan.ltv_given || 0) <= range.max
    );
    const totalAmount = loansInRange.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
    const avgLoanSize = loansInRange.length > 0 ? totalAmount / loansInRange.length : 0;

    return {
      range: range.label,
      count: loansInRange.length,
      totalAmount,
      avgLoanSize,
      percentage: (loansInRange.length / loans.length) * 100,
    };
  });

  // Sort loans by LTV
  const sortedByLTV = [...loans].sort((a, b) => (b.ltv_given || 0) - (a.ltv_given || 0));

  const handleDownloadCSV = async () => {
    try {
      const csvData = sortedByLTV.map((loan) => ({
        'Loan Number': loan.loan_number,
        'Customer Name': loan.customer_name,
        'Valuation': loan.valuation,
        'Loan Amount': loan.loan_amount,
        'LTV %': loan.ltv_given,
        'Status': isLoanReleased(loan.released) ? 'Released' : 'Active',
      }));

      const csvString =
        Object.keys(csvData[0]).join(',') +
        '\n' +
        csvData.map((row) => Object.values(row).join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'ltv-trends.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading LTV trends...</div>
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
            <Button onClick={fetchLoans}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">LTV Trends Analysis</h1>
          <p className="text-muted-foreground">
            Loan-to-value ratio trends and risk exposure
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average LTV</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLTV.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans LTV</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgActiveLTV.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Current portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High LTV Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highLTVLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              {((highLTVLoans.length / loans.length) * 100).toFixed(1)}% &gt; 80%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conservative Loans</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowLTVLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              {((lowLTVLoans.length / loans.length) * 100).toFixed(1)}% ≤ 60%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>LTV Distribution</CardTitle>
            <CardDescription>Portfolio breakdown by loan-to-value ranges</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LTV Range</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Avg Loan Size</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ltvDistribution.map((dist) => (
                  <TableRow key={dist.range}>
                    <TableCell className="font-medium">{dist.range}</TableCell>
                    <TableCell className="text-right">{dist.count}</TableCell>
                    <TableCell className="text-right">
                      ₹{dist.totalAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{dist.avgLoanSize.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">{dist.percentage.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Highest LTV Loans (Top 20)</CardTitle>
            <CardDescription>Loans with highest loan-to-value ratios</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Valuation</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">LTV %</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByLTV.slice(0, 20).map((loan) => (
                  <TableRow key={loan.loan_number}>
                    <TableCell className="font-medium">{loan.loan_number}</TableCell>
                    <TableCell>{loan.customer_name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">
                      ₹{(loan.valuation || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(loan.loan_amount || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {(loan.ltv_given || 0).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          isLoanReleased(loan.released)
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {isLoanReleased(loan.released) ? 'Released' : 'Active'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
