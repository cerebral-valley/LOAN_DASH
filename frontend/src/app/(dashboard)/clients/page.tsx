'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, Users, PieChart } from 'lucide-react';

interface CustomerTypeData {
  type: string;
  totalAmount: number;
  totalCount: number;
  averageAmount: number;
}

interface YearlyCustomerData {
  [year: string]: {
    Private: number;
    Vyapari: number;
  };
}

export default function ClientsPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [customerTypeData, setCustomerTypeData] = useState<CustomerTypeData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyCustomerData>({});
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

      // Normalize customer type
      const normalizedLoans = loansData.map((loan) => ({
        ...loan,
        normalizedType: loan.customer_type?.toUpperCase().trim() === 'VYAPARI' ? 'Vyapari' : 'Private',
      }));

      // Calculate customer type aggregates
      const typeMap: Record<string, { amount: number; count: number }> = {};
      
      normalizedLoans.forEach((loan) => {
        const type = loan.normalizedType;
        if (!typeMap[type]) {
          typeMap[type] = { amount: 0, count: 0 };
        }
        typeMap[type].amount += loan.loan_amount || 0;
        typeMap[type].count += 1;
      });

      const typeData: CustomerTypeData[] = Object.entries(typeMap).map(([type, data]) => ({
        type,
        totalAmount: data.amount,
        totalCount: data.count,
        averageAmount: data.count > 0 ? data.amount / data.count : 0,
      }));

      setCustomerTypeData(typeData);

      // Calculate yearly breakdown by customer type
      const yearlyMap: YearlyCustomerData = {};
      const yearSet = new Set<string>();

      normalizedLoans.forEach((loan) => {
        if (loan.date_of_disbursement) {
          const year = new Date(loan.date_of_disbursement).getFullYear().toString();
          yearSet.add(year);

          if (!yearlyMap[year]) {
            yearlyMap[year] = { Private: 0, Vyapari: 0 };
          }

          const type = loan.normalizedType as 'Private' | 'Vyapari';
          yearlyMap[year][type] += loan.loan_amount || 0;
        }
      });

      setYearlyData(yearlyMap);
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
      downloadCSV(response.data, 'client-wise-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  const calculatePercentage = (amount: number) => {
    const total = customerTypeData.reduce((sum, item) => sum + item.totalAmount, 0);
    return total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading client-wise analysis...</div>
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
          <h1 className="text-4xl font-bold">👥 Client-Wise Analysis</h1>
          <p className="text-muted-foreground">
            Loan analysis by customer type (Private vs Vyapari)
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Customer Type Summary */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {customerTypeData.map((data) => (
          <Card key={data.type}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {data.type} Customers
              </CardTitle>
              <CardDescription>
                {calculatePercentage(data.totalAmount)}% of total portfolio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Total Amount</span>
                  <span className="text-lg font-bold">
                    ₹{data.totalAmount.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Number of Loans</span>
                  <span className="text-lg font-bold">{data.totalCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Average Loan Size</span>
                  <span className="text-lg font-bold">
                    ₹{data.averageAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Yearly Distribution by Customer Type */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Yearly Loan Amount Distribution by Customer Type
            </CardTitle>
            <CardDescription>Annual breakdown of disbursements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Year</TableHead>
                    <TableHead className="text-right">Private (₹)</TableHead>
                    <TableHead className="text-right">Vyapari (₹)</TableHead>
                    <TableHead className="text-right">Total (₹)</TableHead>
                    <TableHead className="text-right">Private %</TableHead>
                    <TableHead className="text-right">Vyapari %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {years.map((year) => {
                    const privateAmount = yearlyData[year]?.Private || 0;
                    const vyapariAmount = yearlyData[year]?.Vyapari || 0;
                    const total = privateAmount + vyapariAmount;
                    const privatePercent = total > 0 ? ((privateAmount / total) * 100).toFixed(1) : '0.0';
                    const vyapariPercent = total > 0 ? ((vyapariAmount / total) * 100).toFixed(1) : '0.0';

                    return (
                      <TableRow key={year}>
                        <TableCell className="font-medium">{year}</TableCell>
                        <TableCell className="text-right">
                          ₹{privateAmount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{vyapariAmount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{total.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-right">{privatePercent}%</TableCell>
                        <TableCell className="text-right">{vyapariPercent}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Type Comparison */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Customer Type Comparison</CardTitle>
            <CardDescription>Detailed metrics by customer type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Metric</TableHead>
                    <TableHead className="text-right">Private</TableHead>
                    <TableHead className="text-right">Vyapari</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Total Loans</TableCell>
                    <TableCell className="text-right">
                      {customerTypeData.find((d) => d.type === 'Private')?.totalCount || 0}
                    </TableCell>
                    <TableCell className="text-right">
                      {customerTypeData.find((d) => d.type === 'Vyapari')?.totalCount || 0}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Amount (₹)</TableCell>
                    <TableCell className="text-right">
                      ₹
                      {(
                        customerTypeData.find((d) => d.type === 'Private')?.totalAmount || 0
                      ).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹
                      {(
                        customerTypeData.find((d) => d.type === 'Vyapari')?.totalAmount || 0
                      ).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Average Loan Size (₹)</TableCell>
                    <TableCell className="text-right">
                      ₹
                      {(
                        customerTypeData.find((d) => d.type === 'Private')?.averageAmount || 0
                      ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹
                      {(
                        customerTypeData.find((d) => d.type === 'Vyapari')?.averageAmount || 0
                      ).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
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
