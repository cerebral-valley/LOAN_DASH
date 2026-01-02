'use client';

import { useEffect, useState } from 'react';
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
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, AlertTriangle, Shield, TrendingDown } from 'lucide-react';

interface RiskMetrics {
  loanNumber: number;
  customerName: string;
  loanAmount: number;
  outstanding: number;
  daysOverdue: number;
  ltvRatio: number;
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export default function RiskAssessmentPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const response = await loanApi.getActive();
      setLoans(response.data);
    } catch (err) {
      console.error('Error fetching loans:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate risk metrics for active loans
  const calculateRisk = (loan: Loan): RiskMetrics => {
    const today = new Date();
    const expiry = loan.expiry ? new Date(loan.expiry) : null;
    const daysOverdue = expiry
      ? Math.max(0, Math.floor((today.getTime() - expiry.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const ltvRatio = loan.ltv_given || 0;
    const outstanding = loan.pending_loan_amount || 0;
    const loanAmount = loan.loan_amount || 1;
    const outstandingRatio = (outstanding / loanAmount) * 100;

    // Risk score calculation (0-100)
    let riskScore = 0;

    // Days overdue factor (0-40 points)
    if (daysOverdue > 0) {
      riskScore += Math.min(40, daysOverdue / 3);
    }

    // LTV factor (0-30 points)
    if (ltvRatio > 85) {
      riskScore += 30;
    } else if (ltvRatio > 70) {
      riskScore += 20;
    } else if (ltvRatio > 50) {
      riskScore += 10;
    }

    // Outstanding ratio factor (0-30 points)
    if (outstandingRatio > 90) {
      riskScore += 30;
    } else if (outstandingRatio > 75) {
      riskScore += 20;
    } else if (outstandingRatio > 50) {
      riskScore += 10;
    }

    // Determine risk level
    let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
    if (riskScore >= 70) {
      riskLevel = 'Critical';
    } else if (riskScore >= 50) {
      riskLevel = 'High';
    } else if (riskScore >= 30) {
      riskLevel = 'Medium';
    } else {
      riskLevel = 'Low';
    }

    return {
      loanNumber: loan.loan_number,
      customerName: loan.customer_name || 'Unknown',
      loanAmount: loan.loan_amount || 0,
      outstanding: outstanding,
      daysOverdue,
      ltvRatio,
      riskScore: Math.round(riskScore),
      riskLevel,
    };
  };

  const riskMetrics = loans.map(calculateRisk);
  const sortedByRisk = riskMetrics.sort((a, b) => b.riskScore - a.riskScore);

  // Risk distribution
  const riskDistribution = {
    critical: riskMetrics.filter((r) => r.riskLevel === 'Critical').length,
    high: riskMetrics.filter((r) => r.riskLevel === 'High').length,
    medium: riskMetrics.filter((r) => r.riskLevel === 'Medium').length,
    low: riskMetrics.filter((r) => r.riskLevel === 'Low').length,
  };

  const totalAtRisk = riskDistribution.critical + riskDistribution.high;
  const overdueLoans = riskMetrics.filter((r) => r.daysOverdue > 0).length;
  const highLtvLoans = riskMetrics.filter((r) => r.ltvRatio > 80).length;

  const handleDownloadCSV = async () => {
    try {
      const csvData = sortedByRisk.map((r) => ({
        'Loan Number': r.loanNumber,
        'Customer Name': r.customerName,
        'Loan Amount': r.loanAmount,
        'Outstanding': r.outstanding,
        'Days Overdue': r.daysOverdue,
        'LTV Ratio': r.ltvRatio,
        'Risk Score': r.riskScore,
        'Risk Level': r.riskLevel,
      }));

      const csvString =
        Object.keys(csvData[0]).join(',') +
        '\n' +
        csvData.map((row) => Object.values(row).join(',')).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      downloadCSV(blob, 'risk-assessment.csv');
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
        return 'text-red-500';
      case 'High':
        return 'text-orange-500';
      case 'Medium':
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading risk assessment...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Risk Assessment</h1>
          <p className="text-muted-foreground">
            Portfolio risk analysis and monitoring for active loans
          </p>
        </div>
        <Button onClick={handleDownloadCSV} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Loans</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAtRisk}</div>
            <p className="text-xs text-muted-foreground">
              {((totalAtRisk / loans.length) * 100).toFixed(1)}% of active portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Loans</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueLoans}</div>
            <p className="text-xs text-muted-foreground">
              Past expiry date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High LTV Loans</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highLtvLoans}</div>
            <p className="text-xs text-muted-foreground">LTV &gt; 80%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(
                riskMetrics.reduce((sum, r) => sum + r.riskScore, 0) / riskMetrics.length
              ).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">Out of 100</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>Breakdown of active loans by risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk Level</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Percentage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-red-500">Critical</TableCell>
                  <TableCell className="text-right">{riskDistribution.critical}</TableCell>
                  <TableCell className="text-right">
                    {((riskDistribution.critical / loans.length) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-orange-500">High</TableCell>
                  <TableCell className="text-right">{riskDistribution.high}</TableCell>
                  <TableCell className="text-right">
                    {((riskDistribution.high / loans.length) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-yellow-500">Medium</TableCell>
                  <TableCell className="text-right">{riskDistribution.medium}</TableCell>
                  <TableCell className="text-right">
                    {((riskDistribution.medium / loans.length) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-green-500">Low</TableCell>
                  <TableCell className="text-right">{riskDistribution.low}</TableCell>
                  <TableCell className="text-right">
                    {((riskDistribution.low / loans.length) * 100).toFixed(1)}%
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Risk Indicators</CardTitle>
            <CardDescription>Portfolio health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Critical Loans</span>
                <span className="text-sm text-red-500 font-bold">
                  {riskDistribution.critical}
                </span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium">Avg Days Overdue</span>
                <span className="text-sm text-muted-foreground">
                  {overdueLoans > 0
                    ? (
                        riskMetrics
                          .filter((r) => r.daysOverdue > 0)
                          .reduce((sum, r) => sum + r.daysOverdue, 0) / overdueLoans
                      ).toFixed(0)
                    : 0}{' '}
                  days
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Portfolio Health Score</span>
                <span className="text-sm text-green-500 font-bold">
                  {(100 - riskMetrics.reduce((sum, r) => sum + r.riskScore, 0) / riskMetrics.length).toFixed(0)}
                  /100
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Top 20 High Risk Loans</CardTitle>
            <CardDescription>
              Loans requiring immediate attention sorted by risk score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loan #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Loan Amount</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-right">Days Overdue</TableHead>
                  <TableHead className="text-right">LTV %</TableHead>
                  <TableHead className="text-right">Risk Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedByRisk.slice(0, 20).map((risk) => (
                  <TableRow key={risk.loanNumber}>
                    <TableCell className="font-medium">{risk.loanNumber}</TableCell>
                    <TableCell>{risk.customerName}</TableCell>
                    <TableCell className="text-right">
                      ₹{risk.loanAmount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{risk.outstanding.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">{risk.daysOverdue}</TableCell>
                    <TableCell className="text-right">{risk.ltvRatio.toFixed(1)}%</TableCell>
                    <TableCell className="text-right font-bold">{risk.riskScore}</TableCell>
                    <TableCell>
                      <span className={`font-medium ${getRiskColor(risk.riskLevel)}`}>
                        {risk.riskLevel}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
