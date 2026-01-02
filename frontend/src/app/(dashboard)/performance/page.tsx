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
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, BarChart3, TrendingUp, Award, Target } from 'lucide-react';

export default function PerformancePage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getAll();
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate performance metrics
  const totalDisbursed = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  const totalOutstanding = loans.reduce(
    (sum, loan) => sum + (loan.pending_loan_amount || 0),
    0
  );
  const totalInterestReceived = loans.reduce(
    (sum, loan) => sum + (loan.interest_deposited_till_date || 0),
    0
  );

  const collectionRate = totalDisbursed > 0
    ? ((totalDisbursed - totalOutstanding) / totalDisbursed) * 100
    : 0;

  const interestYield = totalDisbursed > 0
    ? (totalInterestReceived / totalDisbursed) * 100
    : 0;

  const activeLoans = loans.filter((loan) => loan.released !== 'TRUE');
  const activeRate = (activeLoans.length / loans.length) * 100;

  // Performance by customer type
  const performanceByType = loans.reduce((acc, loan) => {
    const type = loan.customer_type || 'Unknown';
    if (!acc[type]) {
      acc[type] = {
        type,
        count: 0,
        disbursed: 0,
        outstanding: 0,
        interestReceived: 0,
        collectionRate: 0,
        yieldRate: 0,
      };
    }

    acc[type].count++;
    acc[type].disbursed += loan.loan_amount || 0;
    acc[type].outstanding += loan.pending_loan_amount || 0;
    acc[type].interestReceived += loan.interest_deposited_till_date || 0;

    return acc;
  }, {} as Record<string, any>);

  // Calculate rates for each type
  Object.values(performanceByType).forEach((perf: any) => {
    perf.collectionRate = perf.disbursed > 0
      ? ((perf.disbursed - perf.outstanding) / perf.disbursed) * 100
      : 0;
    perf.yieldRate = perf.disbursed > 0
      ? (perf.interestReceived / perf.disbursed) * 100
      : 0;
  });

  const performanceData = Object.values(performanceByType).sort(
    (a: any, b: any) => b.disbursed - a.disbursed
  );

  const handleDownloadCSV = async () => {
    try {
      const csvData = performanceData.map((perf: any) => ({
        'Customer Type': perf.type,
        'Loan Count': perf.count,
        'Total Disbursed': perf.disbursed,
        'Total Outstanding': perf.outstanding,
        'Interest Received': perf.interestReceived,
        'Collection Rate': `${perf.collectionRate.toFixed(2)}%`,
        'Yield Rate': `${perf.yieldRate.toFixed(2)}%`,
      }));

      const csvString =
        Object.keys(csvData[0]).join(',') +
        '\n' +
        csvData.map((row: any) => Object.values(row).join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'performance-dashboard.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading performance data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Comparative performance metrics across customer segments
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
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Principal recovery rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interestYield.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Interest to disbursed ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Active loans percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((collectionRate + interestYield) / 2).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall performance score</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Customer Type</CardTitle>
            <CardDescription>
              Comparative analysis across customer segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Type</TableHead>
                  <TableHead className="text-right">Loans</TableHead>
                  <TableHead className="text-right">Disbursed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                  <TableHead className="text-right">Yield %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceData.map((perf: any) => (
                  <TableRow key={perf.type}>
                    <TableCell className="font-medium">{perf.type}</TableCell>
                    <TableCell className="text-right">{perf.count}</TableCell>
                    <TableCell className="text-right">
                      ₹{perf.disbursed.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{perf.outstanding.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{perf.interestReceived.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {perf.collectionRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {perf.yieldRate.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Best performing customer types by yield</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData
                .slice()
                .sort((a: any, b: any) => b.yieldRate - a.yieldRate)
                .slice(0, 5)
                .map((perf: any, index: number) => (
                  <div key={perf.type} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium">{perf.type}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {perf.yieldRate.toFixed(2)}% yield
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Performance highlights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Best Collection Rate</span>
                <span className="text-sm font-bold text-green-600">
                  {Math.max(...performanceData.map((p: any) => p.collectionRate)).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Best Yield Rate</span>
                <span className="text-sm font-bold text-blue-600">
                  {Math.max(...performanceData.map((p: any) => p.yieldRate)).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Total Customer Segments</span>
                <span className="text-sm text-muted-foreground">
                  {performanceData.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Loans per Segment</span>
                <span className="text-sm text-muted-foreground">
                  {(loans.length / performanceData.length).toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
