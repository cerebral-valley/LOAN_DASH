'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, VyapariCustomer, downloadCSV } from '@/lib/api';
import { Download, Briefcase, TrendingUp } from 'lucide-react';

interface VyapariYearlyData {
  [customerName: string]: {
    [year: string]: {
      amount: number;
      count: number;
    };
  };
}

export default function VyapariPage() {
  const [vyapariCustomers, setVyapariCustomers] = useState<VyapariCustomer[]>([]);
  const [vyapariLoans, setVyapariLoans] = useState<Loan[]>([]);
  const [yearlyData, setYearlyData] = useState<VyapariYearlyData>({});
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all loans
      const loansResponse = await loanApi.getAll();
      const allLoans = loansResponse.data;
      
      // Filter vyapari loans
      const vyapariLoansData = allLoans.filter(
        (loan) => loan.customer_type?.toUpperCase().trim() === 'VYAPARI'
      );
      setVyapariLoans(vyapariLoansData);

      // Get unique vyapari customers
      const customersMap = new Map<string, VyapariCustomer>();
      vyapariLoansData.forEach((loan) => {
        if (loan.customer_name && loan.customer_id) {
          customersMap.set(loan.customer_name, {
            customer_id: loan.customer_id,
            customer_name: loan.customer_name,
            customer_type: loan.customer_type || 'Vyapari',
          });
        }
      });
      const customers = Array.from(customersMap.values()).sort((a, b) =>
        a.customer_name.localeCompare(b.customer_name)
      );
      setVyapariCustomers(customers);

      // Calculate yearly data per customer
      const yearly: VyapariYearlyData = {};
      const yearSet = new Set<string>();

      vyapariLoansData.forEach((loan) => {
        if (loan.customer_name && loan.date_of_disbursement) {
          const customerName = loan.customer_name;
          const year = new Date(loan.date_of_disbursement).getFullYear().toString();
          
          yearSet.add(year);

          if (!yearly[customerName]) {
            yearly[customerName] = {};
          }
          if (!yearly[customerName][year]) {
            yearly[customerName][year] = { amount: 0, count: 0 };
          }

          yearly[customerName][year].amount += loan.loan_amount || 0;
          yearly[customerName][year].count += 1;
        }
      });

      setYearlyData(yearly);
      setYears(Array.from(yearSet).sort());
      setError(null);
    } catch (err) {
      setError('Failed to fetch loan data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'vyapari-wise-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  const calculateCustomerTotal = (customerName: string, type: 'amount' | 'count') => {
    if (!yearlyData[customerName]) return 0;
    return Object.values(yearlyData[customerName]).reduce((sum, year) => sum + year[type], 0);
  };

  const calculateYearTotal = (year: string, type: 'amount' | 'count') => {
    return Object.values(yearlyData).reduce((sum, customerData) => {
      return sum + (customerData[year]?.[type] || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading vyapari-wise analysis...</div>
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
          <h1 className="text-4xl font-bold">🏢 Vyapari-Wise Analysis</h1>
          <p className="text-muted-foreground">
            Individual analysis of loans by Vyapari customer
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vyapari Customers</CardTitle>
            <Briefcase className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vyapariCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Unique business customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vyapari Loans</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vyapariLoans.length}</div>
            <p className="text-xs text-muted-foreground">All time loans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {vyapariLoans
                .reduce((sum, loan) => sum + (loan.loan_amount || 0), 0)
                .toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">To Vyapari customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Loan Amount Disbursed by Year */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>💰 Loan Amount Disbursed by Year (₹)</CardTitle>
            <CardDescription>Annual disbursement amounts per Vyapari customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Customer Name</TableHead>
                    {years.map((year) => (
                      <TableHead key={year} className="text-right">
                        {year}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vyapariCustomers.map((customer) => (
                    <TableRow key={customer.customer_name}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      {years.map((year) => (
                        <TableCell key={year} className="text-right">
                          {yearlyData[customer.customer_name]?.[year]?.amount
                            ? `₹${yearlyData[customer.customer_name][year].amount.toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        ₹{calculateCustomerTotal(customer.customer_name, 'amount').toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">Total</TableCell>
                    {years.map((year) => (
                      <TableCell key={year} className="text-right font-bold">
                        ₹{calculateYearTotal(year, 'amount').toLocaleString('en-IN')}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">
                      ₹
                      {vyapariLoans
                        .reduce((sum, loan) => sum + (loan.loan_amount || 0), 0)
                        .toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loan Quantity by Year */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>📊 Loan Quantity by Year</CardTitle>
            <CardDescription>Number of loans per Vyapari customer by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Customer Name</TableHead>
                    {years.map((year) => (
                      <TableHead key={year} className="text-right">
                        {year}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vyapariCustomers.map((customer) => (
                    <TableRow key={customer.customer_name}>
                      <TableCell className="font-medium">{customer.customer_name}</TableCell>
                      {years.map((year) => (
                        <TableCell key={year} className="text-right">
                          {yearlyData[customer.customer_name]?.[year]?.count || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {calculateCustomerTotal(customer.customer_name, 'count')}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">Total</TableCell>
                    {years.map((year) => (
                      <TableCell key={year} className="text-right font-bold">
                        {calculateYearTotal(year, 'count')}
                      </TableCell>
                    ))}
                    <TableCell className="text-right font-bold">{vyapariLoans.length}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
