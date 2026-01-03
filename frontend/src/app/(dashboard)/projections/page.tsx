'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, TrendingUp, Calculator, DollarSign, Calendar } from 'lucide-react';

interface MonthlyProjection {
  month: string;
  projectedInterest: number;
  projectedPrincipalCollection: number;
  projectedNewDisbursements: number;
  expectedOutstanding: number;
}

export default function ProjectionsPage() {
  const [projections, setProjections] = useState<MonthlyProjection[]>([]);
  const [totalProjectedRevenue, setTotalProjectedRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getAll();
      const loansData = response.data;

      // Calculate projections
      calculateProjections(loansData);

      setError(null);
    } catch (err) {
      setError('Failed to fetch loan data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjections = (loansData: Loan[]) => {
    const activeLoans = loansData.filter((loan) => loan.released !== 'TRUE');
    
    // Calculate current metrics
    const currentOutstanding = activeLoans.reduce(
      (sum, loan) => sum + (loan.pending_loan_amount || 0),
      0
    );

    // Calculate average interest rate from active loans
    const loansWithRate = activeLoans.filter((loan) => loan.interest_rate && loan.interest_rate > 0);
    const avgInterestRate = loansWithRate.length > 0
      ? loansWithRate.reduce((sum, loan) => sum + (loan.interest_rate || 0), 0) / loansWithRate.length
      : 12; // Default 12% if no rates available

    // Calculate historical monthly averages for projections
    const releasedLoans = loansData.filter((loan) => loan.released === 'TRUE');
    const avgMonthlyCollections = releasedLoans.length > 0
      ? releasedLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0) / 12
      : currentOutstanding * 0.1; // Assume 10% monthly collection if no history

    const avgMonthlyDisbursements = loansData.length > 0
      ? loansData.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0) / 12
      : currentOutstanding * 0.15; // Assume 15% monthly growth if no history

    // Generate 6-month projections
    const months = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'];
    let runningOutstanding = currentOutstanding;
    const projectionData: MonthlyProjection[] = [];

    months.forEach((month, idx) => {
      // Project interest: Monthly interest on outstanding balance
      const monthlyInterestRate = avgInterestRate / 12 / 100;
      const projectedInterest = runningOutstanding * monthlyInterestRate;

      // Project principal collection (with 5% monthly growth trend)
      const growthFactor = 1 + (idx * 0.05);
      const projectedPrincipalCollection = avgMonthlyCollections * growthFactor;

      // Project new disbursements (with 10% monthly growth)
      const disbursementGrowthFactor = 1 + (idx * 0.10);
      const projectedNewDisbursements = avgMonthlyDisbursements * disbursementGrowthFactor;

      // Calculate expected outstanding
      runningOutstanding = runningOutstanding - projectedPrincipalCollection + projectedNewDisbursements;

      projectionData.push({
        month,
        projectedInterest,
        projectedPrincipalCollection,
        projectedNewDisbursements,
        expectedOutstanding: runningOutstanding,
      });
    });

    setProjections(projectionData);
    setTotalProjectedRevenue(projectionData.reduce((sum, p) => sum + p.projectedInterest, 0));
  };

  const handleDownloadCSV = () => {
    const csvContent = projections.map((proj) => ({
      Month: proj.month,
      'Projected Interest': proj.projectedInterest.toFixed(2),
      'Projected Principal Collection': proj.projectedPrincipalCollection.toFixed(2),
      'Projected New Disbursements': proj.projectedNewDisbursements.toFixed(2),
      'Expected Outstanding': proj.expectedOutstanding.toFixed(2),
    }));

    const csvString = [
      Object.keys(csvContent[0]).join(','),
      ...csvContent.map((row) =>
        Object.values(row).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    downloadCSV(blob, 'revenue-projections.csv');
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading revenue projections...</div>
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
          <h1 className="text-4xl font-bold">📊 Revenue Projections</h1>
          <p className="text-muted-foreground">
            Forward-looking revenue and cash flow projections
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Metrics */}
      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">6-Month Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalProjectedRevenue / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">Projected interest income</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Monthly</CardTitle>
            <Calculator className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(totalProjectedRevenue / 6 / 1000000).toFixed(2)}M
            </div>
            <p className="text-xs text-muted-foreground">Average per month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {(
                projections.reduce((sum, p) => sum + p.projectedPrincipalCollection, 0) / 1000000
              ).toFixed(2)}
              M
            </div>
            <p className="text-xs text-muted-foreground">Principal recovery expected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Disbursements</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹
              {(
                projections.reduce((sum, p) => sum + p.projectedNewDisbursements, 0) / 1000000
              ).toFixed(2)}
              M
            </div>
            <p className="text-xs text-muted-foreground">Expected new loans</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Projections Table */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              6-Month Financial Projections
            </CardTitle>
            <CardDescription>
              Projected interest income, collections, and outstanding balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Projected Interest</TableHead>
                    <TableHead className="text-right">Principal Collection</TableHead>
                    <TableHead className="text-right">New Disbursements</TableHead>
                    <TableHead className="text-right">Expected Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projections.map((proj) => (
                    <TableRow key={proj.month}>
                      <TableCell className="font-medium">{proj.month}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        ₹{proj.projectedInterest.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{proj.projectedPrincipalCollection.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        ₹{proj.projectedNewDisbursements.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{proj.expectedOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{projections.reduce((sum, p) => sum + p.projectedInterest, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{projections.reduce((sum, p) => sum + p.projectedPrincipalCollection, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-blue-600">
                      ₹{projections.reduce((sum, p) => sum + p.projectedNewDisbursements, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{(projections[projections.length - 1]?.expectedOutstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assumptions Card */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Projection Assumptions</CardTitle>
            <CardDescription>Key assumptions used in the projection model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <p className="font-medium text-sm">Interest Calculation</p>
                  <p className="text-sm text-muted-foreground">
                    Based on average interest rate from active loans, applied monthly to outstanding balance
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <p className="font-medium text-sm">Principal Collections</p>
                  <p className="text-sm text-muted-foreground">
                    Historical monthly collection average with 5% monthly growth factor
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <p className="font-medium text-sm">New Disbursements</p>
                  <p className="text-sm text-muted-foreground">
                    Historical monthly disbursement average with 10% monthly growth factor
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <div>
                  <p className="font-medium text-sm">Outstanding Balance</p>
                  <p className="text-sm text-muted-foreground">
                    Previous outstanding - collections + new disbursements
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>About Revenue Projections</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These projections are based on current portfolio performance and historical trends. They provide 
              an estimate of expected interest income, principal collections, and new loan disbursements over 
              the next 6 months. Actual results may vary based on market conditions, customer behavior, and 
              business decisions. Review and update projections monthly for accuracy.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-4 border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Tip:</strong> Use these projections for budgeting, cash flow planning, and setting 
                business targets. Compare actual results against projections monthly to refine the model.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
