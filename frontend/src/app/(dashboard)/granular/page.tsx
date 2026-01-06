'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { VyapariCustomer } from '@/lib/api';
import { useLoans, useVyapariCustomers } from '@/lib/queries';
import { Download, Search, Filter } from 'lucide-react';
import { extractUniqueYears, filterLoansByCustomerType, filterLoansByCustomer } from '@/lib/loan-utils';
import { sumLoanAmounts, sumOutstanding, calculateAverageAmount } from '@/lib/aggregation-utils';
import { formatCurrency, formatDate } from '@/lib/formatting-utils';
import { exportToCSV } from '@/lib/csv-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function GranularPage() {
  const { data: loans = [], isLoading: loansLoading, error: loansError, refetch: refetchLoans } = useLoans();
  const { data: vyapariCustomers = [], isLoading: customersLoading, error: customersError, refetch: refetchCustomers } = useVyapariCustomers();

  const isLoading = loansLoading || customersLoading;
  const error = loansError || customersError;

  // Filters
  const [selectedClient, setSelectedClient] = useState<string>('--ALL--');
  const [selectedType, setSelectedType] = useState<string>('Both');
  const [selectedStatus, setSelectedStatus] = useState<string>('--All--');
  const [selectedYear, setSelectedYear] = useState<string>('--All--');
  const [selectedMonth, setSelectedMonth] = useState<string>('--All--');

  // Extract unique years
  const years = useMemo(() => extractUniqueYears(loans), [loans]);

  // Apply filters
  const filteredLoans = useMemo(() => {
    let filtered = [...loans];

    // Client filter
    if (selectedClient !== '--ALL--') {
      if (selectedClient === 'Private') {
        filtered = filterLoansByCustomerType(filtered, 'private');
      } else {
        filtered = filterLoansByCustomer(filtered, selectedClient);
      }
    }

    // Status filter
    if (selectedStatus !== '--All--') {
      if (selectedStatus === 'Released') {
        filtered = filtered.filter((loan) => loan.released === 'TRUE');
      } else if (selectedStatus === 'Open') {
        filtered = filtered.filter((loan) => loan.released !== 'TRUE');
      }
    }

    // Type and date filters
    filtered = filtered.filter((loan) => {
      const dateField =
        selectedType === 'Release'
          ? loan.date_of_release
          : loan.date_of_disbursement;

      if (!dateField) return false;

      const date = new Date(dateField);
      const year = date.getFullYear().toString();
      const month = MONTHS[date.getMonth()];

      // Year filter
      if (selectedYear !== '--All--' && year !== selectedYear) {
        return false;
      }

      // Month filter
      if (selectedMonth !== '--All--' && month !== selectedMonth) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [loans, selectedClient, selectedType, selectedStatus, selectedYear, selectedMonth]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalAmount = sumLoanAmounts(filteredLoans);
    const totalCount = filteredLoans.length;
    const averageAmount = calculateAverageAmount(filteredLoans);
    const active = filteredLoans.filter((loan) => loan.released !== 'TRUE');
    const totalOutstanding = sumOutstanding(active);

    return {
      totalAmount,
      totalCount,
      averageAmount,
      activeLoans: active,
      totalOutstanding,
    };
  }, [filteredLoans]);

  const handleDownloadCSV = () => {
    try {
      const csvData = filteredLoans.map((loan) => ({
        'Loan Number': loan.loan_number,
        'Customer Name': loan.customer_name,
        'Loan Amount': loan.loan_amount,
        'Outstanding': loan.pending_loan_amount,
        'Status': loan.released === 'TRUE' ? 'Released' : 'Open',
        'Disbursement Date': loan.date_of_disbursement ? formatDate(new Date(loan.date_of_disbursement)) : 'N/A',
        'Release Date': loan.date_of_release ? formatDate(new Date(loan.date_of_release)) : 'N/A',
      }));
      
      exportToCSV(csvData, 'granular-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch loan data. Please ensure the backend server is running." onRetry={() => { refetchLoans(); refetchCustomers(); }} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">🔍 Granular Analysis</h1>
          <p className="text-muted-foreground">
            Detailed loan analysis with advanced filtering capabilities
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Options
            </CardTitle>
            <CardDescription>
              Apply filters to narrow down the loan data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {/* Client Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">👤 Client</label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--ALL--">--ALL--</option>
                  <option value="Private">Private</option>
                  {vyapariCustomers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_name}>
                      {customer.customer_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">📋 Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Both">Both</option>
                  <option value="Disbursement">Disbursement</option>
                  <option value="Release">Release</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">🔓 Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  <option value="Released">Released</option>
                  <option value="Open">Open</option>
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">📅 Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">📆 Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  {MONTHS.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Reset Filters */}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedClient('--ALL--');
                  setSelectedType('Both');
                  setSelectedStatus('--All--');
                  setSelectedYear('--All--');
                  setSelectedMonth('--All--');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Search className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">Filtered total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
            <Search className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCount}</div>
            <p className="text-xs text-muted-foreground">Number of loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Loan</CardTitle>
            <Search className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.averageAmount, { showSymbol: true })}
            </div>
            <p className="text-xs text-muted-foreground">Per loan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <Search className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">Pending amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtered Loans Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Filtered Loan Records</CardTitle>
            <CardDescription>
              Showing {filteredLoans.length} loan(s) matching your filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLoans.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loan #</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Loan Amount</TableHead>
                      <TableHead>Disbursement Date</TableHead>
                      <TableHead>Release Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoans.map((loan) => (
                      <TableRow key={loan.loan_number}>
                        <TableCell className="font-medium">{loan.loan_number}</TableCell>
                        <TableCell>{loan.customer_name || '-'}</TableCell>
                        <TableCell>
                          {loan.customer_type?.toUpperCase().trim() === 'VYAPARI'
                            ? 'Vyapari'
                            : 'Private'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(loan.loan_amount)}
                        </TableCell>
                        <TableCell>
                          {formatDate(loan.date_of_disbursement)}
                        </TableCell>
                        <TableCell>
                          {formatDate(loan.date_of_release)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                              loan.released === 'TRUE'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {loan.released === 'TRUE' ? 'Released' : 'Active'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {loan.released !== 'TRUE'
                            ? formatCurrency(loan.pending_loan_amount)
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No loans found matching the selected filters
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
