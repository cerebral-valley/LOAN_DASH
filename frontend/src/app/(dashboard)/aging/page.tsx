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
import { Download, Clock, AlertCircle } from 'lucide-react';

interface AgingMetrics {
  loanNumber: number;
  customerName: string;
  loanAmount: number;
  outstanding: number;
  disbursementDate: Date;
  ageInDays: number;
  ageBucket: string;
}

export default function AgingPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getActive();
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate aging metrics
  const calculateAging = (loan: Loan): AgingMetrics => {
    const today = new Date();
    const disbursementDate = loan.date_of_disbursement
      ? new Date(loan.date_of_disbursement)
      : new Date();
    const ageInDays = Math.floor(
      (today.getTime() - disbursementDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    let ageBucket: string;
    if (ageInDays <= 30) {
      ageBucket = '0-30 days';
    } else if (ageInDays <= 90) {
      ageBucket = '31-90 days';
    } else if (ageInDays <= 180) {
      ageBucket = '91-180 days';
    } else if (ageInDays <= 365) {
      ageBucket = '181-365 days';
    } else {
      ageBucket = '365+ days';
    }

    return {
      loanNumber: loan.loan_number,
      customerName: loan.customer_name || 'Unknown',
      loanAmount: loan.loan_amount || 0,
      outstanding: loan.pending_loan_amount || 0,
      disbursementDate,
      ageInDays,
      ageBucket,
    };
  };

  const agingMetrics = loans.map(calculateAging);
  const sortedByAge = agingMetrics.sort((a, b) => b.ageInDays - a.ageInDays);

  // Aging buckets summary
  const agingBuckets = [
    { label: '0-30 days', loans: agingMetrics.filter((a) => a.ageBucket === '0-30 days') },
    { label: '31-90 days', loans: agingMetrics.filter((a) => a.ageBucket === '31-90 days') },
    { label: '91-180 days', loans: agingMetrics.filter((a) => a.ageBucket === '91-180 days') },
    {
      label: '181-365 days',
      loans: agingMetrics.filter((a) => a.ageBucket === '181-365 days'),
    },
    { label: '365+ days', loans: agingMetrics.filter((a) => a.ageBucket === '365+ days') },
  ];

  const avgAge =
    agingMetrics.length > 0
      ? agingMetrics.reduce((sum, a) => sum + a.ageInDays, 0) / agingMetrics.length
      : 0;

  const oldestLoan = sortedByAge[0];

  const handleDownloadCSV = async () => {
    try {
      const csvData = sortedByAge.map((a) => ({
        'Loan Number': a.loanNumber,
        'Customer Name': a.customerName,
        'Loan Amount': a.loanAmount,
        'Outstanding': a.outstanding,
        'Disbursement Date': a.disbursementDate.toLocaleDateString(),
        'Age (Days)': a.ageInDays,
        'Age Bucket': a.ageBucket,
      }));

      const csvString =
        Object.keys(csvData[0]).join(',') +
        '\n' +
        csvData.map((row) => Object.values(row).join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'aging-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading aging analysis...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Aging Analysis</h1>
          <p className="text-muted-foreground">
            Track loan portfolio age and identify long-standing loans
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
            <CardTitle className="text-sm font-medium">Total Active Loans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loans.length}</div>
            <p className="text-xs text-muted-foreground">Currently outstanding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Age</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgAge.toFixed(0)} days</div>
            <p className="text-xs text-muted-foreground">Across all active loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Loan</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {oldestLoan ? oldestLoan.ageInDays : 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              Loan #{oldestLoan?.loanNumber || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Long-term Loans</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {agingMetrics.filter((a) => a.ageInDays > 365).length}
            </div>
            <p className="text-xs text-muted-foreground">&gt; 1 year old</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Aging Buckets</CardTitle>
            <CardDescription>Distribution of active loans by age</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Age Bucket</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Total Outstanding</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingBuckets.map((bucket) => {
                  const totalOutstanding = bucket.loans.reduce(
                    (sum, loan) => sum + loan.outstanding,
                    0
                  );
                  return (
                    <TableRow key={bucket.label}>
                      <TableCell className="font-medium">{bucket.label}</TableCell>
                      <TableCell className="text-right">{bucket.loans.length}</TableCell>
                      <TableCell className="text-right">
                        ₹{totalOutstanding.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        {((bucket.loans.length / loans.length) * 100).toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Oldest Active Loans</CardTitle>
            <CardDescription>Top 20 longest-standing loans</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Disbursement Date</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Age (Days)</TableHead>
                  <TableHead>Bucket</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByAge.slice(0, 20).map((aging) => (
                  <TableRow key={aging.loanNumber}>
                    <TableCell className="font-medium">{aging.loanNumber}</TableCell>
                    <TableCell>{aging.customerName}</TableCell>
                    <TableCell>
                      {aging.disbursementDate.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{aging.loanAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{aging.outstanding.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-bold">{aging.ageInDays}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${
                          aging.ageInDays > 365
                            ? 'bg-red-100 text-red-700'
                            : aging.ageInDays > 180
                            ? 'bg-orange-100 text-orange-700'
                            : aging.ageInDays > 90
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {aging.ageBucket}
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
