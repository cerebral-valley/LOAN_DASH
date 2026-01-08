'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useYieldStats } from '@/lib/queries';
import { Download, TrendingUp, Calendar } from 'lucide-react';
import { formatCurrencyInMillions, formatPercentage } from '@/lib/formatting-utils';
import LoadingState from '@/components/LoadingState';
import ErrorState from '@/components/ErrorState';

export default function YieldPage() {
  const { data: metrics, isLoading, error, refetch } = useYieldStats();

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to fetch yield data. Please ensure the backend server is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">📈 Interest Yield Analysis</h1>
          <p className="text-muted-foreground">
            Comprehensive yield analysis with server-side calculations
          </p>
        </div>
        <Button variant="outline" disabled>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="mb-8 grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Yield</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(metrics?.portfolioYield)}
            </div>
            <p className="text-xs text-muted-foreground">Annualized return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interest</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInMillions(metrics?.totalInterest)}
            </div>
            <p className="text-xs text-muted-foreground">Interest collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrencyInMillions(metrics?.totalCapital)}
            </div>
            <p className="text-xs text-muted-foreground">Principal deployed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Holding</CardTitle>
            <Calendar className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgDays}</div>
            <p className="text-xs text-muted-foreground">Days (weighted avg)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
