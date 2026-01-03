'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { expenseApi, Expense, downloadCSV } from '@/lib/api';
import { Download, Receipt, Search, Filter, DollarSign } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchId, setSearchId] = useState<string>('');
  const [searchInvoice, setSearchInvoice] = useState<string>('');
  const [selectedLedger, setSelectedLedger] = useState<string>('--All--');
  const [selectedUser, setSelectedUser] = useState<string>('--All--');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('--All--');
  const [selectedYear, setSelectedYear] = useState<string>('--All--');
  const [selectedMonth, setSelectedMonth] = useState<string>('--All--');

  // Filter options
  const [ledgers, setLedgers] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    expenses,
    searchId,
    searchInvoice,
    selectedLedger,
    selectedUser,
    selectedPaymentMode,
    selectedYear,
    selectedMonth,
  ]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await expenseApi.getAll();
      const expensesData = response.data;
      setExpenses(expensesData);

      // Extract unique filter options
      const ledgerSet = new Set<string>();
      const userSet = new Set<string>();
      const paymentModeSet = new Set<string>();
      const yearSet = new Set<string>();

      expensesData.forEach((expense) => {
        if (expense.ledger) ledgerSet.add(expense.ledger);
        if (expense.user) userSet.add(expense.user);
        if (expense.payment_mode) paymentModeSet.add(expense.payment_mode);
        if (expense.date) {
          yearSet.add(new Date(expense.date).getFullYear().toString());
        }
      });

      setLedgers(Array.from(ledgerSet).sort());
      setUsers(Array.from(userSet).sort());
      setPaymentModes(Array.from(paymentModeSet).sort());
      setYears(Array.from(yearSet).sort());

      setError(null);
    } catch (err) {
      setError('Failed to fetch expense data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Search by ID
    if (searchId) {
      filtered = filtered.filter((expense) => expense.id.toString().includes(searchId));
    }

    // Search by Invoice
    if (searchInvoice) {
      filtered = filtered.filter((expense) =>
        expense.invoice_no?.toLowerCase().includes(searchInvoice.toLowerCase())
      );
    }

    // Ledger filter
    if (selectedLedger !== '--All--') {
      filtered = filtered.filter((expense) => expense.ledger === selectedLedger);
    }

    // User filter
    if (selectedUser !== '--All--') {
      filtered = filtered.filter((expense) => expense.user === selectedUser);
    }

    // Payment mode filter
    if (selectedPaymentMode !== '--All--') {
      filtered = filtered.filter((expense) => expense.payment_mode === selectedPaymentMode);
    }

    // Year filter
    if (selectedYear !== '--All--') {
      filtered = filtered.filter((expense) => {
        if (!expense.date) return false;
        return new Date(expense.date).getFullYear().toString() === selectedYear;
      });
    }

    // Month filter
    if (selectedMonth !== '--All--') {
      filtered = filtered.filter((expense) => {
        if (!expense.date) return false;
        const month = MONTHS[new Date(expense.date).getMonth()];
        return month === selectedMonth;
      });
    }

    setFilteredExpenses(filtered);
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await expenseApi.downloadCSV();
      downloadCSV(response.data, 'expenses.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalCount = filteredExpenses.length;
  const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;
  const cashExpenses = filteredExpenses.filter(
    (e) => e.payment_mode?.toLowerCase() === 'cash'
  ).length;
  const bankExpenses = filteredExpenses.filter(
    (e) => e.payment_mode?.toLowerCase() !== 'cash' && e.payment_mode
  ).length;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading expense tracker...</div>
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
          <h1 className="text-4xl font-bold">💰 Expense Tracker</h1>
          <p className="text-muted-foreground">
            Comprehensive expense tracking and analysis with advanced filtering
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
              Search Expenses
            </CardTitle>
            <CardDescription>Search by ID or Invoice Number</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">🆔 Search by ID</label>
                <input
                  type="text"
                  placeholder="Enter expense ID..."
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">📄 Search by Invoice Number</label>
                <input
                  type="text"
                  placeholder="Enter invoice number..."
                  value={searchInvoice}
                  onChange={(e) => setSearchInvoice(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Filters */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>Filter expenses by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              {/* Ledger Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">📊 Ledger</label>
                <select
                  value={selectedLedger}
                  onChange={(e) => setSelectedLedger(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  {ledgers.map((ledger) => (
                    <option key={ledger} value={ledger}>
                      {ledger}
                    </option>
                  ))}
                </select>
              </div>

              {/* User Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">👤 User</label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  {users.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode Filter */}
              <div>
                <label className="mb-2 block text-sm font-medium">💳 Payment Mode</label>
                <select
                  value={selectedPaymentMode}
                  onChange={(e) => setSelectedPaymentMode(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="--All--">--All--</option>
                  {paymentModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
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
                  setSearchId('');
                  setSearchInvoice('');
                  setSelectedLedger('--All--');
                  setSelectedUser('--All--');
                  setSelectedPaymentMode('--All--');
                  setSelectedYear('--All--');
                  setSelectedMonth('--All--');
                }}
              >
                Reset All Filters
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
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</div>
            <p className="text-xs text-muted-foreground">Filtered total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
            <p className="text-xs text-muted-foreground">Number of expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
            <Receipt className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{averageAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">Per expense</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Split</CardTitle>
            <Receipt className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {cashExpenses}C / {bankExpenses}B
            </div>
            <p className="text-xs text-muted-foreground">Cash / Bank</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtered Expenses Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Expense Records</CardTitle>
            <CardDescription>
              Showing {filteredExpenses.length} expense(s) matching your filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Ledger</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Receipt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell className="font-medium">{expense.id}</TableCell>
                        <TableCell>
                          {expense.date
                            ? new Date(expense.date).toLocaleDateString('en-IN')
                            : '-'}
                        </TableCell>
                        <TableCell>{expense.item || '-'}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{(expense.amount || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>{expense.payment_mode || '-'}</TableCell>
                        <TableCell>{expense.ledger || '-'}</TableCell>
                        <TableCell>{expense.invoice_no || '-'}</TableCell>
                        <TableCell>{expense.user || '-'}</TableCell>
                        <TableCell>
                          {expense.receipt ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No expenses found matching the selected filters
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
