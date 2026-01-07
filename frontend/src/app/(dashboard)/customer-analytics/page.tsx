'use client';

import { useMemo } from 'react';
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
import { useLoans } from '@/lib/queries';
import { Download, Users, TrendingUp, Award } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

interface CustomerMetrics {
  customerId: string;
  customerName: string;
  totalLoans: number;
  totalBorrowed: number;
  totalOutstanding: number;
  totalInterestPaid: number;
  activeLoans: number;
  avgLoanSize: number;
}

export default function CustomerAnalyticsPage() {
  const { data: loans = [], isLoading, error, refetch } = useLoans();

  // Calculate customer-wise metrics
  const metrics = useMemo(() => {
    const customerMetrics = loans.reduce((acc, loan) => {
      const customerId = loan.customer_id || 'Unknown';
      const customerName = loan.customer_name || 'Unknown';
      
      if (!acc[customerId]) {
        acc[customerId] = {
          customerId,
          customerName,
          totalLoans: 0,
          totalBorrowed: 0,
          totalOutstanding: 0,
          totalInterestPaid: 0,
          activeLoans: 0,
          avgLoanSize: 0,
        };
      }

      acc[customerId].totalLoans++;
      acc[customerId].totalBorrowed += loan.loan_amount || 0;
      
      // Only add outstanding for active loans (released = FALSE)
      if (loan.released !== 'TRUE') {
        acc[customerId].totalOutstanding += loan.pending_loan_amount || 0;
        acc[customerId].activeLoans++;
        // For active loans, use interest_deposited_till_date
        acc[customerId].totalInterestPaid += loan.interest_deposited_till_date || 0;
      } else {
        // For released loans, use interest_amount
        acc[customerId].totalInterestPaid += loan.interest_amount || 0;
      }

      return acc;
    }, {} as Record<string, CustomerMetrics>);

    // Calculate average loan size for each customer
    Object.values(customerMetrics).forEach((customer) => {
      customer.avgLoanSize = customer.totalLoans > 0 ? customer.totalBorrowed / customer.totalLoans : 0;
    });

    // Sort by total borrowed (descending)
    const sortedCustomers = Object.values(customerMetrics).sort(
      (a, b) => b.totalBorrowed - a.totalBorrowed
    );

    // Top 10 customers
    const topCustomers = sortedCustomers.slice(0, 10);

    // Calculate aggregate metrics
    const totalCustomers = sortedCustomers.length;
    const repeatCustomers = sortedCustomers.filter((c) => c.totalLoans > 1).length;
    const avgLoansPerCustomer = loans.length > 0 && totalCustomers > 0
      ? loans.length / totalCustomers
      : 0;

    return {
      customerMetrics,
      sortedCustomers,
      topCustomers,
      totalCustomers,
      repeatCustomers,
      avgLoansPerCustomer,
    };
  }, [loans]);

  // Destructure metrics for easier access
  const {
    sortedCustomers,
    totalCustomers,
    repeatCustomers,
    avgLoansPerCustomer,
  } = metrics;

  const handleDownloadCSV = () => {
    try {
      const csvData = metrics.sortedCustomers.map((c) => ({
        'Customer ID': c.customerId,
        'Customer Name': c.customerName,
        'Total Loans': c.totalLoans,
        'Total Borrowed': c.totalBorrowed,
        'Total Outstanding': c.totalOutstanding,
        'Total Interest Paid': c.totalInterestPaid,
        'Active Loans': c.activeLoans,
        'Average Loan Size': c.avgLoanSize.toFixed(2),
      }));

      exportToCSV(csvData, 'customer-analytics.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch customer analytics data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Customer Analytics</h1>
          <p className="text-muted-foreground">
            Customer behavior analysis and engagement metrics
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
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">Unique customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{repeatCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {((repeatCustomers / totalCustomers) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Loans/Customer</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLoansPerCustomer.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Average engagement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Customer Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{metrics.topCustomers[0]?.totalBorrowed.toLocaleString('en-IN') || 0}
            </div>
            <p className="text-xs text-muted-foreground">Highest total borrowed</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Customers by Total Borrowed</CardTitle>
            <CardDescription>
              Most valuable customers based on total loan amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Customer ID</TableHead>
                  <TableHead className="text-right">Total Loans</TableHead>
                  <TableHead className="text-right">Total Borrowed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Interest Paid</TableHead>
                  <TableHead className="text-right">Active Loans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.topCustomers.map((customer, index) => (
                  <TableRow key={customer.customerId}>
                    <TableCell className="font-bold">{index + 1}</TableCell>
                    <TableCell className="font-medium">{customer.customerName}</TableCell>
                    <TableCell>{customer.customerId}</TableCell>
                    <TableCell className="text-right">{customer.totalLoans}</TableCell>
                    <TableCell className="text-right">
                      ₹{customer.totalBorrowed.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Math.round(customer.totalOutstanding).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{customer.totalInterestPaid.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">{customer.activeLoans}</TableCell>
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
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>Customer classification by loan count</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Segment</TableHead>
                  <TableHead className="text-right">Customers</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                  <TableHead className="text-right">Avg Loan Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">New (1 loan)</TableCell>
                  <TableCell className="text-right">
                    {sortedCustomers.filter((c) => c.totalLoans === 1).length}
                  </TableCell>
                  <TableCell className="text-right">
                    {(
                      (sortedCustomers.filter((c) => c.totalLoans === 1).length /
                        totalCustomers) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className="text-right">
                    ₹
                    {(
                      sortedCustomers
                        .filter((c) => c.totalLoans === 1)
                        .reduce((sum, c) => sum + c.avgLoanSize, 0) /
                      sortedCustomers.filter((c) => c.totalLoans === 1).length
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Regular (2-5 loans)</TableCell>
                  <TableCell className="text-right">
                    {
                      sortedCustomers.filter(
                        (c) => c.totalLoans >= 2 && c.totalLoans <= 5
                      ).length
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {(
                      (sortedCustomers.filter(
                        (c) => c.totalLoans >= 2 && c.totalLoans <= 5
                      ).length /
                        totalCustomers) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className="text-right">
                    ₹
                    {(
                      sortedCustomers
                        .filter((c) => c.totalLoans >= 2 && c.totalLoans <= 5)
                        .reduce((sum, c) => sum + c.avgLoanSize, 0) /
                      sortedCustomers.filter(
                        (c) => c.totalLoans >= 2 && c.totalLoans <= 5
                      ).length
                    ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">VIP (6+ loans)</TableCell>
                  <TableCell className="text-right">
                    {sortedCustomers.filter((c) => c.totalLoans > 5).length}
                  </TableCell>
                  <TableCell className="text-right">
                    {(
                      (sortedCustomers.filter((c) => c.totalLoans > 5).length /
                        totalCustomers) *
                      100
                    ).toFixed(1)}
                    %
                  </TableCell>
                  <TableCell className="text-right">
                    ₹
                    {sortedCustomers.filter((c) => c.totalLoans > 5).length > 0
                      ? (
                          sortedCustomers
                            .filter((c) => c.totalLoans > 5)
                            .reduce((sum, c) => sum + c.avgLoanSize, 0) /
                          sortedCustomers.filter((c) => c.totalLoans > 5).length
                        ).toLocaleString('en-IN', { maximumFractionDigits: 0 })
                      : '0'}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
