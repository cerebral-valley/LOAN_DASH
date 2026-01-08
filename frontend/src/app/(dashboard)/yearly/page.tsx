'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useYearlyBreakdown } from '@/lib/queries';
import { Calendar } from 'lucide-react';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export default function YearlyPage() {
  const { data: breakdown = [], isLoading, error, refetch } = useYearlyBreakdown();

  // Group data by year for rendering
  const yearsData = breakdown.reduce((acc: any, curr: any) => {
    if (!acc[curr.year]) acc[curr.year] = {};
    acc[curr.year][MONTHS[curr.month - 1]] = curr;
    return acc;
  }, {});

  const years = Object.keys(yearsData).sort((a, b) => parseInt(b) - parseInt(a));

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch yearly data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">📊 Yearly Breakdown</h1>
        <p className="text-muted-foreground">
          Monthly analysis of loan disbursements and interest received (Server-side aggregated)
        </p>
      </div>

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
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {yearsData[year][month]
                            ? `₹${parseFloat(yearsData[year][month].disbursedAmount).toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Interest Received (₹)</CardTitle>
            <CardDescription>Monthly interest collected by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      {MONTHS.map((month) => (
                        <TableCell key={month} className="text-right">
                          {yearsData[year][month]
                            ? `₹${parseFloat(yearsData[year][month].interestReceived).toLocaleString('en-IN')}`
                            : '-'}
                        </TableCell>
                      ))}
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
