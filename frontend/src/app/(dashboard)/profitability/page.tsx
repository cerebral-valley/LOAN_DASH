'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, Loan, expenseApi, Expense, downloadCSV } from '@/lib/api';
import { Download, TrendingUp, DollarSign, PieChart, Target } from 'lucide-react';

export default function ProfitabilityPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [loansRes, expensesRes] = await Promise.all([
        loanApi.getAll(),
        expenseApi.getAll(),
      ]);
      setLoans(loansRes.data);
      setExpenses(expensesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate profitability metrics
  const totalInterestReceived = loans.reduce(
    (sum, loan) => sum + (loan.interest_deposited_till_date || 0),
    0
  );

  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const grossProfit = totalInterestReceived;
  const netProfit = totalInterestReceived - totalExpenses;
  const profitMargin = totalInterestReceived > 0 
    ? ((netProfit / totalInterestReceived) * 100) 
    : 0;

  const totalDisbursed = loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
  const roi = totalDisbursed > 0 
    ? ((totalInterestReceived / totalDisbursed) * 100) 
    : 0;

  // Monthly breakdown
  const currentYear = new Date().getFullYear();
  const monthlyData = [];
  
  for (let month = 0; month < 12; month++) {
    const monthLoans = loans.filter((loan) => {
      const date = loan.last_date_of_interest_deposit
        ? new Date(loan.last_date_of_interest_deposit)
        : null;
      return date && date.getFullYear() === currentYear && date.getMonth() === month;
    });

    const monthExpenses = expenses.filter((expense) => {
      const date = expense.date ? new Date(expense.date) : null;
      return date && date.getFullYear() === currentYear && date.getMonth() === month;
    });

    const monthInterest = monthLoans.reduce(
      (sum, loan) => sum + (loan.interest_deposited_till_date || 0),
      0
    );

    const monthExpense = monthExpenses.reduce(
      (sum, expense) => sum + (expense.amount || 0),
      0
    );

    monthlyData.push({
      month: new Date(currentYear, month).toLocaleDateString('en-US', { month: 'short' }),
      interest: monthInterest,
      expenses: monthExpense,
      profit: monthInterest - monthExpense,
    });
  }

  const handleDownloadCSV = async () => {
    try {
      const csvData = {
        'Total Interest Received': totalInterestReceived,
        'Total Expenses': totalExpenses,
        'Gross Profit': grossProfit,
        'Net Profit': netProfit,
        'Profit Margin': `${profitMargin.toFixed(2)}%`,
        'ROI': `${roi.toFixed(2)}%`,
      };

      const csvString =
        Object.keys(csvData).join(',') + '\n' + Object.values(csvData).join(',');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'profitability-analysis.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading profitability data...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Profitability Analysis</h1>
          <p className="text-muted-foreground">
            Revenue, expenses, and profit tracking
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
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{grossProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Total interest received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{totalExpenses.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">Operating costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{netProfit.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground">After expenses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI</CardTitle>
            <PieChart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roi.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">Return on investment</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Key Performance Indicators</CardTitle>
            <CardDescription>Financial health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Profit Margin</span>
                <span className="text-sm font-bold text-green-500">
                  {profitMargin.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Expense Ratio</span>
                <span className="text-sm text-muted-foreground">
                  {totalInterestReceived > 0
                    ? ((totalExpenses / totalInterestReceived) * 100).toFixed(2)
                    : 0}
                  %
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Average Interest per Loan</span>
                <span className="text-sm text-muted-foreground">
                  ₹{(totalInterestReceived / loans.length).toLocaleString('en-IN', {
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interest to Principal Ratio</span>
                <span className="text-sm text-muted-foreground">
                  {((totalInterestReceived / totalDisbursed) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
