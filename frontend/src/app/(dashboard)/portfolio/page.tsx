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
import { Download, PieChart } from 'lucide-react';

export default function PortfolioPage() {
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

  const handleDownloadCSV = async () => {
    try {
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'portfolio-summary.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  // Calculate portfolio metrics
  const activeLoans = loans.filter((l) => l.released !== 'TRUE');
  const releasedLoans = loans.filter((l) => l.released === 'TRUE');

  const portfolioByType = loans.reduce((acc, loan) => {
    const type = loan.customer_type || 'Unknown';
    if (!acc[type]) {
      acc[type] = {
        count: 0,
        totalAmount: 0,
        totalOutstanding: 0,
      };
    }
    acc[type].count++;
    acc[type].totalAmount += loan.loan_amount || 0;
    acc[type].totalOutstanding += loan.pending_loan_amount || 0;
    return acc;
  }, {} as Record<string, { count: number; totalAmount: number; totalOutstanding: number }>);

  const ltvDistribution = [
    {
      range: '0-50%',
      count: loans.filter((l) => (l.ltv_given || 0) <= 50).length,
    },
    {
      range: '51-70%',
      count: loans.filter((l) => (l.ltv_given || 0) > 50 && (l.ltv_given || 0) <= 70).length,
    },
    {
      range: '71-85%',
      count: loans.filter((l) => (l.ltv_given || 0) > 70 && (l.ltv_given || 0) <= 85).length,
    },
    {
      range: '86-100%',
      count: loans.filter((l) => (l.ltv_given || 0) > 85).length,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading portfolio data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Portfolio Summary</h1>
          <p className="text-muted-foreground">
            Comprehensive portfolio analysis and distribution metrics
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
            <CardTitle className="text-sm font-medium">Total Portfolio</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.length}</div>
            <p className="text-xs text-muted-foreground">Total loans in portfolio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <PieChart className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              {((activeLoans.length / loans.length) * 100).toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Released Loans</CardTitle>
            <PieChart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{releasedLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              {((releasedLoans.length / loans.length) * 100).toFixed(1)}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg LTV</CardTitle>
            <PieChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                loans.reduce((sum, l) => sum + (l.ltv_given || 0), 0) / loans.length
              ).toFixed(1)}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average loan-to-value ratio</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio by Customer Type</CardTitle>
            <CardDescription>Distribution of loans across customer segments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Type</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(portfolioByType).map(([type, data]) => (
                  <TableRow key={type}>
                    <TableCell className="font-medium">{type}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">
                      ₹{data.totalAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{data.totalOutstanding.toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LTV Distribution</CardTitle>
            <CardDescription>Loan-to-value ratio across portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LTV Range</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ltvDistribution.map((range) => (
                  <TableRow key={range.range}>
                    <TableCell className="font-medium">{range.range}</TableCell>
                    <TableCell className="text-right">{range.count}</TableCell>
                    <TableCell className="text-right">
                      {((range.count / loans.length) * 100).toFixed(1)}%
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
