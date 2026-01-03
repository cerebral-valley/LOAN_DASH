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
import { Download, CheckCircle, Clock, TrendingUp } from 'lucide-react';

export default function PaymentHistoryPage() {
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
      setError('Failed to fetch payment history data. Please ensure the backend server is running.');
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate payment metrics
  const loansWithPayments = loans.filter(
    (loan) => loan.interest_deposited_till_date && loan.interest_deposited_till_date > 0
  );

  const totalInterestPaid = loans.reduce(
    (sum, loan) => sum + (loan.interest_deposited_till_date || 0),
    0
  );

  const totalPrincipalPaid = loans.reduce((sum, loan) => {
    const disbursed = loan.loan_amount || 0;
    const outstanding = loan.pending_loan_amount || 0;
    return sum + (disbursed - outstanding);
  }, 0);

  const avgPaymentPerLoan = loansWithPayments.length > 0
    ? totalInterestPaid / loansWithPayments.length
    : 0;

  // Recent payments (loans with last interest payment date)
  const recentPayments = loans
    .filter((loan) => loan.last_date_of_interest_deposit)
    .sort((a, b) => {
      const dateA = a.last_date_of_interest_deposit
        ? new Date(a.last_date_of_interest_deposit).getTime()
        : 0;
      const dateB = b.last_date_of_interest_deposit
        ? new Date(b.last_date_of_interest_deposit).getTime()
        : 0;
      return dateB - dateA;
    })
    .slice(0, 20);

  const handleDownloadCSV = async () => {
    try {
      const csvData = recentPayments.map((loan) => ({
        'Loan Number': loan.loan_number,
        'Customer Name': loan.customer_name,
        'Loan Amount': loan.loan_amount,
        'Outstanding': loan.pending_loan_amount,
        'Interest Paid': loan.interest_deposited_till_date,
        'Last Payment Date': loan.last_date_of_interest_deposit
          ? new Date(loan.last_date_of_interest_deposit).toLocaleDateString()
          : 'N/A',
      }));

      const csvString =
        Object.keys(csvData[0]).join(',') +
        '\n' +
        csvData.map((row) => Object.values(row).join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'payment-history.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading payment history...</div>
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
          <h1 className="text-4xl font-bold">Payment History</h1>
          <p className="text-muted-foreground">
            Track interest and principal payment patterns
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
            <CardTitle className="text-sm font-medium">Total Interest Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalInterestPaid.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Across all loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Principal Paid</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalPrincipalPaid.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Principal recovered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loans with Payments</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loansWithPayments.length}</div>
            <p className="text-xs text-muted-foreground">
              {((loansWithPayments.length / loans.length) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{avgPaymentPerLoan.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Per loan with payments</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Payments (Top 20)</CardTitle>
            <CardDescription>Latest interest payment activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Interest Paid</TableHead>
                  <TableHead>Last Payment Date</TableHead>
                  <TableHead className="text-right">Payment %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentPayments.map((loan) => {
                  const paymentPercent = loan.loan_amount
                    ? ((loan.interest_deposited_till_date || 0) / loan.loan_amount) * 100
                    : 0;
                  return (
                    <TableRow key={loan.loan_number}>
                      <TableCell className="font-medium">{loan.loan_number}</TableCell>
                      <TableCell>{loan.customer_name || 'Unknown'}</TableCell>
                      <TableCell className="text-right">
                        ₹{(loan.loan_amount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(loan.pending_loan_amount || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{(loan.interest_deposited_till_date || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {loan.last_date_of_interest_deposit
                          ? new Date(loan.last_date_of_interest_deposit).toLocaleDateString()
                          : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        {paymentPercent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
