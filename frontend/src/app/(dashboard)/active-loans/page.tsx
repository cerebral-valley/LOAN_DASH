'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { useVyapariCustomers, useLoansByCustomer } from '@/lib/queries';
import { Download, Search, Building, AlertCircle } from 'lucide-react';

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  });

  return debouncedValue;
}

export default function ActiveLoansPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Use debounced search for better performance
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Use React Query hooks for data fetching with automatic caching
  const { data: vyapariCustomers = [], isLoading: loading, error, refetch: fetchCustomers } = useVyapariCustomers();
  const { data: customerLoans = [] } = useLoansByCustomer(selectedCustomer);

  const handleDownloadCSV = useCallback(async () => {
    try {
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'active-vyapari-loans.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  }, []);

  // Memoize filtered customers to avoid recalculation on every render
  const filteredCustomers = useMemo(() => {
    if (!debouncedSearchTerm) return vyapariCustomers;
    return vyapariCustomers.filter((customer) =>
      customer.customer_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    );
  }, [vyapariCustomers, debouncedSearchTerm]);

  // Memoize active and released loans
  const { activeLoans, releasedLoans } = useMemo(() => {
    const active = customerLoans.filter((loan) => loan.released !== 'TRUE');
    const released = customerLoans.filter((loan) => loan.released === 'TRUE');
    return { activeLoans: active, releasedLoans: released };
  }, [customerLoans]);

  // Memoize totals
  const { totalOutstanding, totalReleased } = useMemo(() => {
    const outstanding = activeLoans.reduce(
      (sum, loan) => sum + (loan.pending_loan_amount || 0),
      0
    );
    const released = releasedLoans.reduce(
      (sum, loan) => sum + (loan.loan_amount || 0),
      0
    );
    return { totalOutstanding: outstanding, totalReleased: released };
  }, [activeLoans, releasedLoans]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading vyapari customers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Connection Error</CardTitle>
            <CardDescription>Failed to fetch vyapari customers. Please ensure the backend server is running.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => fetchCustomers()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">🏪 Active Vyapari Loans</h1>
          <p className="text-muted-foreground">
            Search and view active loans for Vyapari customers
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Search Section */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Customer
            </CardTitle>
            <CardDescription>
              Enter customer name to search and view their loan details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="🔍 Search Customer Name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />

              {searchTerm && filteredCustomers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Found {filteredCustomers.length} customer(s):
                  </p>
                  <select
                    value={selectedCustomer}
                    onChange={(e) => setSelectedCustomer(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">-- Select Customer --</option>
                    {filteredCustomers.map((customer) => (
                      <option key={customer.customer_id} value={customer.customer_name}>
                        {customer.customer_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {searchTerm && filteredCustomers.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No customers found matching &quot;{searchTerm}&quot;
                </div>
              )}

              {!searchTerm && (
                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">👆 Enter a customer name to search</p>
                  <p className="font-medium">Sample Vyapari Customers:</p>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {vyapariCustomers.slice(0, 5).map((customer) => (
                      <li key={customer.customer_id}>{customer.customer_name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details */}
      {selectedCustomer && customerLoans.length > 0 && (
        <>
          {/* Summary Metrics */}
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
                <Building className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customerLoans.length}</div>
                <p className="text-xs text-muted-foreground">All time loans</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeLoans.length}</div>
                <p className="text-xs text-muted-foreground">Currently outstanding</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Released Loans</CardTitle>
                <Building className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{releasedLoans.length}</div>
                <p className="text-xs text-muted-foreground">Completed loans</p>
              </CardContent>
            </Card>
          </div>

          {/* Active Loans Table */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>🔴 Active Loans (Outstanding)</CardTitle>
                <CardDescription>
                  Total Outstanding: ₹{totalOutstanding.toLocaleString('en-IN')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeLoans.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loan #</TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead className="text-right">Loan Amount</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Disbursement Date</TableHead>
                          <TableHead className="text-right">Interest Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activeLoans.map((loan) => (
                          <TableRow key={loan.loan_number}>
                            <TableCell className="font-medium">{loan.loan_number}</TableCell>
                            <TableCell>{loan.customer_name}</TableCell>
                            <TableCell className="text-right">
                              ₹{(loan.loan_amount || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell className="text-right font-bold text-orange-600">
                              ₹{(loan.pending_loan_amount || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>
                              {loan.date_of_disbursement
                                ? new Date(loan.date_of_disbursement).toLocaleDateString('en-IN')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {loan.interest_rate ? `${loan.interest_rate}%` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">
                    ✅ No active loans for this customer
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Released Loans Table */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>✅ Released Loans (Completed)</CardTitle>
                <CardDescription>
                  Total Released: ₹{totalReleased.toLocaleString('en-IN')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {releasedLoans.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Loan #</TableHead>
                          <TableHead>Customer Name</TableHead>
                          <TableHead className="text-right">Loan Amount</TableHead>
                          <TableHead>Disbursement Date</TableHead>
                          <TableHead>Release Date</TableHead>
                          <TableHead className="text-right">Interest Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {releasedLoans.map((loan) => (
                          <TableRow key={loan.loan_number}>
                            <TableCell className="font-medium">{loan.loan_number}</TableCell>
                            <TableCell>{loan.customer_name}</TableCell>
                            <TableCell className="text-right">
                              ₹{(loan.loan_amount || 0).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>
                              {loan.date_of_disbursement
                                ? new Date(loan.date_of_disbursement).toLocaleDateString('en-IN')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {loan.date_of_release
                                ? new Date(loan.date_of_release).toLocaleDateString('en-IN')
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {loan.interest_rate ? `${loan.interest_rate}%` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="py-4 text-center text-muted-foreground">
                    No completed loans for this customer
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {selectedCustomer && customerLoans.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No loan data found for the selected customer
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
