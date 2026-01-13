'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, downloadCSV } from '@/lib/api';
import { useLoanStats } from '@/lib/queries';
import { Download, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/formatting-utils';
import { calculateCollectionRate, calculateInterestToPrincipalRatio } from '@/lib/aggregation-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';
import { Breadcrumb } from '@/components/Breadcrumb';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { data: stats, isLoading: loading, error, refetch: fetchStats } = useLoanStats();

  const handleDownloadCSV = async () => {
    try {
      toast.loading('Preparing CSV download...');
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'loans.csv');
      toast.success('CSV downloaded successfully!');
    } catch (err) {
      console.error('Error downloading CSV:', err);
      toast.error('Failed to download CSV. Please try again.');
    }
  };

  // Memoize computed values to prevent unnecessary recalculations
  const errorMessage = useMemo(() => {
    if (!error) return null;
    return 'Failed to fetch statistics. Please ensure the backend server is running.';
  }, [error]);

  const collectionRate = useMemo(() => {
    if (!stats) return 0;
    return calculateCollectionRate(stats.totalDisbursed, stats.totalOutstanding);
  }, [stats]);

  const interestToPrincipalRatio = useMemo(() => {
    if (!stats) return 0;
    return calculateInterestToPrincipalRatio(stats.totalInterestReceived, stats.totalDisbursed);
  }, [stats]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={errorMessage || 'An error occurred'} onRetry={() => fetchStats()} />;
  }

  return (
    <div className="p-8">
      <Breadcrumb />
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Executive Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights and KPI tracking for City Central
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeLoans || 0} active, {stats?.releasedLoans || 0} released
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalDisbursed)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime disbursement</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalOutstanding)}
            </div>
            <p className="text-xs text-muted-foreground">Current pending amount</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interest Received</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalInterestReceived)}
            </div>
            <p className="text-xs text-muted-foreground">Total interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalLoans
                ? formatPercentage((stats.activeLoans / stats.totalLoans) * 100, 1)
                : '0%'}
              {' of total loans'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(collectionRate, 1)}
            </div>
            <p className="text-xs text-muted-foreground">Principal recovery rate</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>
              Quick overview of your loan portfolio performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Average Loan Amount</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.totalLoans
                    ? formatCurrency(stats.totalDisbursed / stats.totalLoans)
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Average Outstanding</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.activeLoans
                    ? formatCurrency(stats.totalOutstanding / stats.activeLoans)
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interest to Principal Ratio</span>
                <span className="text-sm text-muted-foreground">
                  {formatPercentage(interestToPrincipalRatio)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
