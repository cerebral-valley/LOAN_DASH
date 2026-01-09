'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePerformanceStats } from '@/lib/queries';
import { Download, BarChart3, TrendingUp, Award, Target } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export default function PerformancePage() {
  const { data: metrics, isLoading, error, refetch } = usePerformanceStats();

  const handleDownloadCSV = async () => {
    if (!metrics) return;
    
    try {
      const csvData = metrics.performanceData.map((perf) => ({
        'Customer Type': perf.type,
        'Loan Count': perf.count,
        'Total Disbursed': perf.disbursed,
        'Total Outstanding': perf.outstanding,
        'Interest Received': perf.interestReceived,
        'Collection Rate': `${perf.collectionRate.toFixed(2)}%`,
        'Yield Rate': `${perf.yieldRate.toFixed(2)}%`,
      }));

      exportToCSV(csvData, 'performance-dashboard.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch performance data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  if (!metrics) {
    return <LoadingState />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Comparative performance metrics across customer segments
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.collectionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Principal recovery rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.interestYield.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Interest to disbursed ratio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Active loans percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Health</CardTitle>
            <Award className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((metrics.collectionRate + metrics.interestYield) / 2).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Overall performance score</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Performance by Customer Type</CardTitle>
            <CardDescription>
              Comparative analysis across customer segments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Type</TableHead>
                  <TableHead className="text-right">Loans</TableHead>
                  <TableHead className="text-right">Disbursed</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Interest</TableHead>
                  <TableHead className="text-right">Collection %</TableHead>
                  <TableHead className="text-right">Yield %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.performanceData.map((perf) => (
                  <TableRow key={perf.type}>
                    <TableCell className="font-medium">{perf.type}</TableCell>
                    <TableCell className="text-right">{perf.count}</TableCell>
                    <TableCell className="text-right">
                      ₹{perf.disbursed.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{perf.outstanding.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{perf.interestReceived.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {perf.collectionRate.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {perf.yieldRate.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>Best performing customer types by yield</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.performanceData
                .slice()
                .sort((a, b) => b.yieldRate - a.yieldRate)
                .slice(0, 5)
                .map((perf, index) => (
                  <div key={perf.type} className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium">{perf.type}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {perf.yieldRate.toFixed(2)}% yield
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Performance highlights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Best Collection Rate</span>
                <span className="text-sm font-bold text-green-600">
                  {Math.max(...metrics.performanceData.map((p) => p.collectionRate)).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Best Yield Rate</span>
                <span className="text-sm font-bold text-blue-600">
                  {Math.max(...metrics.performanceData.map((p) => p.yieldRate)).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Total Customer Segments</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.performanceData.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Avg Loans per Segment</span>
                <span className="text-sm text-muted-foreground">
                  {((metrics.activeLoansCount + metrics.releasedLoansCount) / metrics.performanceData.length).toFixed(0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
