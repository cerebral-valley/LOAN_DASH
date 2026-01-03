'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, DollarSign, TrendingUp, Calendar } from 'lucide-react';

interface GoldSilverRate {
  rate_date: string;
  ngp_hazir_gold: number;
  ngp_hazir_silver: number;
  ngp_gst_gold: number;
  ngp_gst_silver: number;
}

// Mock data for gold and silver rates
// In production, this would be fetched from the backend API
const MOCK_GOLD_SILVER_RATES: GoldSilverRate[] = [
  {
    rate_date: new Date().toISOString().split('T')[0],
    ngp_hazir_gold: 74500,
    ngp_hazir_silver: 88500,
    ngp_gst_gold: 78630,
    ngp_gst_silver: 93390
  },
  {
    rate_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    ngp_hazir_gold: 74300,
    ngp_hazir_silver: 88200,
    ngp_gst_gold: 78420,
    ngp_gst_silver: 93072
  },
  {
    rate_date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
    ngp_hazir_gold: 74800,
    ngp_hazir_silver: 88800,
    ngp_gst_gold: 78946,
    ngp_gst_silver: 93696
  }
];

export default function RatesPage() {
  const [rates, setRates] = useState<GoldSilverRate[]>([]);
  const [latestRate, setLatestRate] = useState<GoldSilverRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Mock data since we don't have a backend endpoint for this yet
      // In production, this would call an API endpoint
      const mockRates = MOCK_GOLD_SILVER_RATES;

      setRates(mockRates);
      setLatestRate(mockRates[0]);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rate data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const handleDownloadCSV = () => {
    const csvContent = rates.map((rate) => ({
      Date: rate.rate_date,
      'Gold (Hazir)': rate.ngp_hazir_gold,
      'Silver (Hazir)': rate.ngp_hazir_silver,
      'Gold (GST)': rate.ngp_gst_gold,
      'Silver (GST)': rate.ngp_gst_silver
    }));

    const csvString = [
      Object.keys(csvContent[0]).join(','),
      ...csvContent.map((row) =>
        Object.values(row).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gold-silver-rates.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading gold & silver rates...</div>
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
            <p className="text-sm text-muted-foreground">
              These rates reflect the Nagpur market prices for gold (per 10 grams) and silver (per kilogram). 
              Both spot (Hazir) and GST-inclusive rates are shown. Rates are updated daily based on market 
              conditions and can be used for loan valuation and LTV calculations.
            </p>
            <div className="mt-4 rounded-lg bg-yellow-50 p-4 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This page currently displays sample data. In production, rates would be 
                imported from the backend database (gold_silver_rates table) which contains historical data 
                from 2021 onwards.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
