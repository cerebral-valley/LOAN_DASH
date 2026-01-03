'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, TrendingUp, TrendingDown, DollarSign, Activity, FileText } from 'lucide-react';

interface AggregatedStats {
  totalDisbursedAmount: number;
  totalOutstanding: number;
  totalInterestReceived: number;
  totalLoans: number;
  activeLoans: number;
  averageLoanSize: number;
  collectionRate: number;
  interestToPrincipalRatio: number;
}

export default function OverviewPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [stats, setStats] = useState<AggregatedStats | null>(null);
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

      // Calculate statistics
      const totalDisbursedAmount = loansData.reduce(
        (sum, loan) => sum + (loan.loan_amount || 0),
        0
      );
      
      const activeLoansData = loansData.filter(loan => loan.released !== 'TRUE');
      const totalOutstanding = activeLoansData.reduce(
        (sum, loan) => sum + (loan.pending_loan_amount || 0),
        0
      );
      
      const totalInterestReceived = loansData.reduce(
        (sum, loan) => sum + (loan.interest_deposited_till_date || 0),
        0
      );

      const calculatedStats: AggregatedStats = {
        totalDisbursedAmount,
        totalOutstanding,
        totalInterestReceived,
        totalLoans: loansData.length,
        activeLoans: activeLoansData.length,
        averageLoanSize: loansData.length > 0 ? totalDisbursedAmount / loansData.length : 0,
        collectionRate: totalDisbursedAmount > 0 
          ? ((totalDisbursedAmount - totalOutstanding) / totalDisbursedAmount) * 100 
          : 0,
        interestToPrincipalRatio: totalDisbursedAmount > 0 
          ? (totalInterestReceived / totalDisbursedAmount) * 100 
          : 0,
      };

      setStats(calculatedStats);
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
      downloadCSV(response.data, 'overview-loans.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading overview data...</div>
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
          <h1 className="text-4xl font-bold">👋 Overview Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive loan portfolio overview with key performance indicators
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats?.totalDisbursedAmount.toLocaleString('en-IN') || 0}
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
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeLoans || 0} active loans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Average Loan Size</span>
                <span className="text-sm text-muted-foreground">
                  ₹{stats?.averageLoanSize.toLocaleString('en-IN', { maximumFractionDigits: 0 }) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Collection Rate</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.collectionRate.toFixed(2) || 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interest to Principal Ratio</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.interestToPrincipalRatio.toFixed(2) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Distribution</CardTitle>
            <CardDescription>Active vs Released loans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Active Loans</span>
                <span className="text-sm font-semibold text-green-600">
                  {stats?.activeLoans || 0}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Released Loans</span>
                <span className="text-sm font-semibold text-blue-600">
                  {stats ? stats.totalLoans - stats.activeLoans : 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Loan Percentage</span>
                <span className="text-sm text-muted-foreground">
                  {stats?.totalLoans 
                    ? ((stats.activeLoans / stats.totalLoans) * 100).toFixed(1) 
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              About Overview Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This dashboard provides a comprehensive overview of your loan portfolio with key performance indicators. 
              All metrics are calculated in real-time from the database. The data shows cumulative totals for 
              disbursements, outstanding amounts, and interest received. Use the Export CSV button to download 
              the complete loan dataset for further analysis.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
