'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, LoanStats, downloadCSV } from '@/lib/api';
import { Download, TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<LoanStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch statistics. Please ensure the backend server is running.');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, 'loans.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
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
            <Button onClick={fetchStats}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
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
              ₹{stats?.totalDisbursed.toLocaleString('en-IN') || 0}
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
              ₹{stats?.totalOutstanding.toLocaleString('en-IN') || 0}
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
              ₹{stats?.totalInterestReceived.toLocaleString('en-IN') || 0}
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
                ? ((stats.activeLoans / stats.totalLoans) * 100).toFixed(1)
                : 0}
              % of total loans
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
              {stats?.totalDisbursed
                ? (
                    ((stats.totalDisbursed - stats.totalOutstanding) /
                      stats.totalDisbursed) *
                    100
                  ).toFixed(1)
                : 0}
              %
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
                  ₹
                  {stats?.totalLoans
                    ? (stats.totalDisbursed / stats.totalLoans).toLocaleString(
                        'en-IN',
                        { maximumFractionDigits: 0 }
                      )
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Average Outstanding</span>
                <span className="text-sm text-muted-foreground">
                  ₹
                  {stats?.activeLoans
                    ? (stats.totalOutstanding / stats.activeLoans).toLocaleString(
                        'en-IN',
                        { maximumFractionDigits: 0 }
                      )
                    : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interest to Principal Ratio</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.totalDisbursed
                    ? ((stats.totalInterestReceived / stats.totalDisbursed) * 100).toFixed(
                        2
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
