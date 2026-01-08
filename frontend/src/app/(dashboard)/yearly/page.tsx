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

  const calculateYearTotal = (year: string, field: string) => {
    return MONTHS.reduce((sum, month) => {
      return sum + (parseFloat(yearsData[year][month]?.[field]) || 0);
    }, 0);
  };

  const calculateYOYChange = (year: string, month: string, field: string) => {
    const currentYear = parseInt(year);
    const prevYear = (currentYear - 1).toString();
    
    const currentVal = parseFloat(yearsData[year][month]?.[field]) || 0;
    const prevVal = parseFloat(yearsData[prevYear]?.[month]?.[field]) || 0;

    // Don't show YoY if both current and previous values are 0
    if (currentVal === 0 && prevVal === 0) return null;
    // Don't show YoY if previous value is 0 (avoid division by zero)
    if (prevVal === 0) return null;
    
    const change = ((currentVal - prevVal) / prevVal) * 100;
    return change.toFixed(1);
  };

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
                    <TableHead className="text-right font-bold">Total</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{Math.round(calculateYearTotal(year, 'disbursedAmount')).toLocaleString('en-IN')}
                      </TableCell>
                      {MONTHS.map((month) => {
                        const yoy = calculateYOYChange(year, month, 'disbursedAmount');
                        return (
                          <TableCell key={month} className="text-right">
                            <div>
                              {yearsData[year][month]
                                ? `₹${Math.round(parseFloat(yearsData[year][month].disbursedAmount)).toLocaleString('en-IN')}`
                                : '-'}
                            </div>
                            {yoy && (
                              <div className={`text-[10px] ${parseFloat(yoy) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({yoy}%)
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
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
            <CardDescription>Monthly interest collected by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{Math.round(calculateYearTotal(year, 'interestReceived')).toLocaleString('en-IN')}
                      </TableCell>
                      {MONTHS.map((month) => {
                        const yoy = calculateYOYChange(year, month, 'interestReceived');
                        return (
                          <TableCell key={month} className="text-right">
                            <div>
                              {yearsData[year][month]
                                ? `₹${Math.round(parseFloat(yearsData[year][month].interestReceived)).toLocaleString('en-IN')}`
                                : '-'}
                            </div>
                            {yoy && (
                              <div className={`text-[10px] ${parseFloat(yoy) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({yoy}%)
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quantity of Loans Disbursed */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quantity of Loans Disbursed</CardTitle>
            <CardDescription>Monthly count of loans disbursed by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-right font-bold">
                        {Math.round(calculateYearTotal(year, 'disbursedCount')).toLocaleString('en-IN')}
                      </TableCell>
                      {MONTHS.map((month) => {
                        const yoy = calculateYOYChange(year, month, 'disbursedCount');
                        return (
                          <TableCell key={month} className="text-right">
                            <div>
                              {yearsData[year][month]
                                ? Math.round(parseFloat(yearsData[year][month].disbursedCount)).toLocaleString('en-IN')
                                : '-'}
                            </div>
                            {yoy && (
                              <div className={`text-[10px] ${parseFloat(yoy) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({yoy}%)
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quantity of Loans Released */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Quantity of Loans Released</CardTitle>
            <CardDescription>Monthly count of loans released by year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    <TableHead className="text-right font-bold">Total</TableHead>
                    {MONTHS.map((month) => (
                      <TableHead key={month} className="text-right">{month}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-right font-bold">
                        {Math.round(calculateYearTotal(year, 'releasedCount')).toLocaleString('en-IN')}
                      </TableCell>
                      {MONTHS.map((month) => {
                        const yoy = calculateYOYChange(year, month, 'releasedCount');
                        return (
                          <TableCell key={month} className="text-right">
                            <div>
                              {yearsData[year][month]
                                ? Math.round(parseFloat(yearsData[year][month].releasedCount)).toLocaleString('en-IN')
                                : '-'}
                            </div>
                            {yoy && (
                              <div className={`text-[10px] ${parseFloat(yoy) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({yoy}%)
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
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
