'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-utils';
import LoadingState from '@/components/LoadingState';
import { ratesApi, type GoldSilverRate, type MovingAverageData } from '@/lib/api';

export default function RatesPage() {
  const [rates, setRates] = useState<GoldSilverRate[]>([]);
  const [latestRate, setLatestRate] = useState<GoldSilverRate | null>(null);
  const [movingAvg, setMovingAvg] = useState<MovingAverageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch latest 30 rates
      const ratesResponse = await ratesApi.getLatest(30);
      setRates(ratesResponse.data);
      
      if (ratesResponse.data.length > 0) {
        setLatestRate(ratesResponse.data[0]);
      }

      // Fetch 90-day moving average
      try {
        const avgResponse = await ratesApi.getMovingAverage(90);
        setMovingAvg(avgResponse.data);
      } catch (err) {
        console.warn('Moving average not available:', err);
      }
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } } | undefined;
      console.error('Error fetching rates:', err);
      setError(e?.response?.data?.error || 'Failed to load gold and silver rates. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const handleDownloadCSV = () => {
    const csvContent = rates.map((rate) => ({
      Date: rate.rate_date,
      'Time': rate.rate_time,
      'Gold (Hazir)': rate.ngp_hazir_gold,
      'Silver (Hazir)': rate.ngp_hazir_silver,
      'Gold (GST)': rate.ngp_gst_gold,
      'Silver (GST)': rate.ngp_gst_silver,
      'USD/INR': rate.usd_inr,
      'COMEX Gold (USD)': rate.cmx_gold_usd,
      'COMEX Silver (USD)': rate.cmx_silver_usd,
    }));

    exportToCSV(csvContent, 'gold-silver-rates.csv');
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700">Connection Error</CardTitle>
            <CardDescription className="text-red-600">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (rates.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>
              No gold and silver rates found in the database. Please import the rates data first.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Run: <code className="rounded bg-muted px-2 py-1">python insert_gold_silver_rates.py</code>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const goldChange = rates.length >= 2 
    ? calculateChange(rates[0].ngp_gst_gold, rates[1].ngp_gst_gold) 
    : 0;
  const silverChange = rates.length >= 2 
    ? calculateChange(rates[0].ngp_gst_silver, rates[1].ngp_gst_silver) 
    : 0;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">💰 Gold & Silver Rates</h1>
          <p className="text-muted-foreground">
            Current market rates for Nagpur with GST
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Latest Rates */}
      {latestRate && (
        <>
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Latest Rates - {new Date(latestRate.rate_date).toLocaleDateString('en-IN')}
                </CardTitle>
                <CardDescription>
                  Current gold and silver rates in Nagpur market
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="mb-8 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gold (with GST)</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{latestRate.ngp_gst_gold.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">Per 10 grams</p>
                <div className={`mt-2 flex items-center text-sm ${goldChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`mr-1 h-4 w-4 ${goldChange < 0 ? 'rotate-180' : ''}`} />
                  {goldChange >= 0 ? '+' : ''}{goldChange.toFixed(2)}% from yesterday
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Silver (with GST)</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{latestRate.ngp_gst_silver.toLocaleString('en-IN')}
                </div>
                <p className="text-xs text-muted-foreground">Per kilogram</p>
                <div className={`mt-2 flex items-center text-sm ${silverChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`mr-1 h-4 w-4 ${silverChange < 0 ? 'rotate-180' : ''}`} />
                  {silverChange >= 0 ? '+' : ''}{silverChange.toFixed(2)}% from yesterday
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Rate Breakdown */}
      {latestRate && (
        <div className="mb-8 grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Gold Rate Breakdown</CardTitle>
              <CardDescription>Nagpur market rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Hazir (Spot) Rate</span>
                  <span className="text-sm font-bold">₹{latestRate.ngp_hazir_gold.toLocaleString('en-IN')}/10g</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">With GST</span>
                  <span className="text-sm font-bold">₹{latestRate.ngp_gst_gold.toLocaleString('en-IN')}/10g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GST Amount</span>
                  <span className="text-sm text-muted-foreground">
                    ₹{(latestRate.ngp_gst_gold - latestRate.ngp_hazir_gold).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Silver Rate Breakdown</CardTitle>
              <CardDescription>Nagpur market rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">Hazir (Spot) Rate</span>
                  <span className="text-sm font-bold">₹{latestRate.ngp_hazir_silver.toLocaleString('en-IN')}/kg</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-medium">With GST</span>
                  <span className="text-sm font-bold">₹{latestRate.ngp_gst_silver.toLocaleString('en-IN')}/kg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">GST Amount</span>
                  <span className="text-sm text-muted-foreground">
                    ₹{(latestRate.ngp_gst_silver - latestRate.ngp_hazir_silver).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 3-Month Moving Average */}
      {movingAvg && latestRate && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>📈 3-Month Moving Average Analysis</CardTitle>
              <CardDescription>
                Comparison of current rates with 90-day moving average
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-4 text-lg font-semibold text-yellow-600">Gold</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Rate</span>
                      <span className="font-bold">₹{movingAvg.current?.gold?.toLocaleString('en-IN') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">90-Day Average</span>
                      <span className="font-medium">₹{movingAvg.average?.gold?.toLocaleString('en-IN') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm font-medium">Difference</span>
                      <span className={`font-bold ${parseFloat(movingAvg.percentChange?.gold || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(movingAvg.percentChange?.gold || '0') >= 0 ? '+' : ''}
                        ₹{movingAvg.difference?.gold?.toLocaleString('en-IN') || 'N/A'} ({movingAvg.percentChange?.gold || '0'}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-4 text-lg font-semibold text-gray-600">Silver</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Current Rate</span>
                      <span className="font-bold">₹{movingAvg.current?.silver?.toLocaleString('en-IN') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">90-Day Average</span>
                      <span className="font-medium">₹{movingAvg.average?.silver?.toLocaleString('en-IN') || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-3">
                      <span className="text-sm font-medium">Difference</span>
                      <span className={`font-bold ${parseFloat(movingAvg.percentChange?.silver || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(movingAvg.percentChange?.silver || '0') >= 0 ? '+' : ''}
                        ₹{movingAvg.difference?.silver?.toLocaleString('en-IN') || 'N/A'} ({movingAvg.percentChange?.silver || '0'}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Historical Rates */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Rate History</CardTitle>
            <CardDescription>
              Gold and silver rates for the last {rates.length} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Gold (Hazir)</TableHead>
                    <TableHead className="text-right">Gold (GST)</TableHead>
                    <TableHead className="text-right">Silver (Hazir)</TableHead>
                    <TableHead className="text-right">Silver (GST)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rates.map((rate) => (
                    <TableRow key={rate.rate_date}>
                      <TableCell className="font-medium">
                        {new Date(rate.rate_date).toLocaleDateString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{rate.ngp_hazir_gold.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{rate.ngp_gst_gold.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{rate.ngp_hazir_silver.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{rate.ngp_gst_silver.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>About Gold & Silver Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              These rates reflect the Nagpur market prices for gold (per 10 grams) and silver (per kilogram). 
              Both spot (Hazir) and GST-inclusive rates are shown. Rates are updated daily based on market 
              conditions and can be used for loan valuation and LTV calculations.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Hazir Rate:</strong> Spot/ready delivery price</p>
              <p><strong>GST Rate:</strong> Rate including Goods & Services Tax (3% for gold, 5% for silver)</p>
              <p><strong>Data Source:</strong> Nagpur market daily rates</p>
              <p><strong>International Rates:</strong> COMEX gold and silver prices in USD, plus USD/INR exchange rate</p>
            </div>
            {rates.length > 0 && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 border border-green-200">
                <p className="text-sm text-green-800">
                  <strong>✅ Live Data:</strong> Currently displaying {rates.length} days of historical rates from 
                  the database. Data range: September 2021 - October 2025.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
