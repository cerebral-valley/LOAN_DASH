'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoans } from '@/lib/queries';
import { useDownloadLoanCSV } from '@/lib/hooks';
import { Download, Calendar } from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

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
  const { data: loans = [], isLoading, error, refetch } = useLoans();
  const { download: downloadCSV } = useDownloadLoanCSV();

  // Process disbursed and released data
  const { disbursedData, releasedData, interestData, years } = useMemo(() => {
    const disbursed: MonthlyData = {};
    const released: MonthlyData = {};
    const interest: MonthlyData = {};
    const yearSet = new Set<string>();

    loans.forEach((loan) => {
      // Process disbursement
      if (loan.date_of_disbursement) {
        const date = new Date(loan.date_of_disbursement);
        const year = date.getFullYear().toString();
        const month = MONTHS[date.getMonth()];
        
        // Only include data from 2020 onwards
        if (parseInt(year) >= 2020) {
          yearSet.add(year);
          
          if (!disbursed[year]) disbursed[year] = {};
          if (!disbursed[year][month]) disbursed[year][month] = { amount: 0, count: 0 };
          
          disbursed[year][month].amount += loan.loan_amount || 0;
          disbursed[year][month].count += 1;
        }
      }

      // Process release
      if (loan.date_of_release && loan.released === 'TRUE') {
        const date = new Date(loan.date_of_release);
        const year = date.getFullYear().toString();
        const month = MONTHS[date.getMonth()];
        
        // Only include data from 2020 onwards
        if (parseInt(year) >= 2020) {
          yearSet.add(year);
          
          if (!released[year]) released[year] = {};
          if (!released[year][month]) released[year][month] = { amount: 0, count: 0 };
          
          released[year][month].amount += loan.loan_amount || 0;
          released[year][month].count += 1;
          
          // Calculate interest received for released loans using correct formula
          // For released = true: use interest_amount
          if (!interest[year]) interest[year] = {};
          if (!interest[year][month]) interest[year][month] = { amount: 0, count: 0 };
          interest[year][month].amount += loan.interest_amount || 0;
        }
      }
      
      // For active loans (released != TRUE), add interest_deposited_till_date to current year/month
      if (loan.released !== 'TRUE' && loan.interest_deposited_till_date && loan.interest_deposited_till_date > 0) {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = MONTHS[now.getMonth()];
        
        if (parseInt(year) >= 2020) {
          yearSet.add(year);
          
          if (!interest[year]) interest[year] = {};
          if (!interest[year][month]) interest[year][month] = { amount: 0, count: 0 };
          interest[year][month].amount += loan.interest_deposited_till_date || 0;
        }
      }
    });

    return {
      disbursedData: disbursed,
      releasedData: released,
      interestData: interest,
      years: Array.from(yearSet).sort(),
    };
  }, [loans]);

  const calculateYearTotal = (data: MonthlyData, year: string, type: 'amount' | 'count') => {
    if (!data[year]) return 0;
    return Object.values(data[year]).reduce((sum, month) => sum + month[type], 0);
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch loan data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">📊 Yearly Breakdown</h1>
          <p className="text-muted-foreground">
            Monthly analysis of loan disbursements, releases, and interest received by year (data from 2020 onwards)
          </p>
        </div>
        <Button onClick={() => downloadCSV('yearly-breakdown.csv')} variant="outline">
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

      {/* Interest Received */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Interest Received (₹)</CardTitle>
            <CardDescription>
              Monthly interest received: For released loans use interest_amount, for active loans use interest_deposited_till_date
            </CardDescription>
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
                          {interestData[year]?.[month]?.amount
                            ? `₹${interestData[year][month].amount.toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-bold">
                        ₹{calculateYearTotal(interestData, year, 'amount').toLocaleString('en-IN')}
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
