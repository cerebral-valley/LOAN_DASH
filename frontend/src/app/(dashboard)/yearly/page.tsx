'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, Calendar } from 'lucide-react';

interface MonthlyData {
  [year: string]: {
    [month: string]: {
      amount: number;
      count: number;
    };
  };
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function YearlyPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [disbursedData, setDisbursedData] = useState<MonthlyData>({});
  const [releasedData, setReleasedData] = useState<MonthlyData>({});
  const [years, setYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getAll();
      const loansData = response.data;
      setLoans(loansData);

      // Process disbursed data
      const disbursed: MonthlyData = {};
      const released: MonthlyData = {};
      const yearSet = new Set<string>();

      loansData.forEach((loan) => {
        // Process disbursement
        if (loan.date_of_disbursement) {
          const date = new Date(loan.date_of_disbursement);
          const year = date.getFullYear().toString();
          const month = MONTHS[date.getMonth()];
          
          yearSet.add(year);
          
          if (!disbursed[year]) disbursed[year] = {};
          if (!disbursed[year][month]) disbursed[year][month] = { amount: 0, count: 0 };
          
          disbursed[year][month].amount += loan.loan_amount || 0;
          disbursed[year][month].count += 1;
        }

        // Process release
        if (loan.date_of_release && loan.released === 'TRUE') {
          const date = new Date(loan.date_of_release);
          const year = date.getFullYear().toString();
          const month = MONTHS[date.getMonth()];
          
          yearSet.add(year);
          
          if (!released[year]) released[year] = {};
          if (!released[year][month]) released[year][month] = { amount: 0, count: 0 };
          
          released[year][month].amount += loan.loan_amount || 0;
          released[year][month].count += 1;
        }
      });

      setDisbursedData(disbursed);
      setReleasedData(released);
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
      downloadCSV(response.data, 'yearly-breakdown.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  const calculateYearTotal = (data: MonthlyData, year: string, type: 'amount' | 'count') => {
    if (!data[year]) return 0;
    return Object.values(data[year]).reduce((sum, month) => sum + month[type], 0);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading yearly breakdown...</div>
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
          <h1 className="text-4xl font-bold">📊 Yearly Breakdown</h1>
          <p className="text-muted-foreground">
            Monthly analysis of loan disbursements and releases by year
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Disbursed Loans */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Disbursed Loans - Amount (₹)
            </CardTitle>
            <CardDescription>Monthly disbursement amounts by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {disbursedData[year]?.[month]?.amount
                            ? `₹${disbursedData[year][month].amount.toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        ₹{calculateYearTotal(disbursedData, year, 'amount').toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disbursed Loans - Quantity */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Disbursed Loans - Quantity</CardTitle>
            <CardDescription>Number of loans disbursed per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {disbursedData[year]?.[month]?.count || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {calculateYearTotal(disbursedData, year, 'count')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Released Loans - Amount */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Released Loans - Amount (₹)</CardTitle>
            <CardDescription>Monthly release amounts by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {releasedData[year]?.[month]?.amount
                            ? `₹${releasedData[year][month].amount.toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        ₹{calculateYearTotal(releasedData, year, 'amount').toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Released Loans - Quantity */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Released Loans - Quantity</CardTitle>
            <CardDescription>Number of loans released per month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">
                        {month}
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {releasedData[year]?.[month]?.count || '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        {calculateYearTotal(releasedData, year, 'count')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
