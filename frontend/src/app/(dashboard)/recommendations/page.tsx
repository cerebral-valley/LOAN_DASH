'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { loanApi, Loan, downloadCSV } from '@/lib/api';
import { Download, Lightbulb, AlertCircle, TrendingUp, Users, DollarSign, Target } from 'lucide-react';

interface Recommendation {
  id: string;
  category: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  currentState: string;
  impact: string;
  actions: string[];
}

interface PortfolioMetrics {
  totalLoans: number;
  activeLoans: number;
  totalOutstanding: number;
  collectionEfficiency: number;
  portfolioYield: number;
  averageLTV: number;
}

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
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

      // Calculate metrics
      const activeLoans = loansData.filter((loan) => loan.released !== 'TRUE');
      const totalDisbursed = loansData.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
      const totalOutstanding = activeLoans.reduce((sum, loan) => sum + (loan.pending_loan_amount || 0), 0);
      const collectionEfficiency = totalDisbursed > 0 
        ? ((totalDisbursed - totalOutstanding) / totalDisbursed) * 100 
        : 0;

      const portfolioMetrics: PortfolioMetrics = {
        totalLoans: loansData.length,
        activeLoans: activeLoans.length,
        totalOutstanding,
        collectionEfficiency,
        portfolioYield: 0, // Simplified for now
        averageLTV: 0, // Simplified for now
      };

      setMetrics(portfolioMetrics);

      // Generate recommendations based on metrics
      generateRecommendations(portfolioMetrics, loansData, activeLoans);

      setError(null);
    } catch (err) {
      setError('Failed to fetch loan data. Please ensure the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = (metrics: PortfolioMetrics, allLoans: Loan[], activeLoans: Loan[]) => {
    const recs: Recommendation[] = [];

    // Collection Efficiency Recommendation
    if (metrics.collectionEfficiency < 85) {
      recs.push({
        id: 'collection-1',
        category: 'Loan Quality',
        priority: 'HIGH',
        title: 'Improve Collection Efficiency',
        currentState: `Current collection efficiency is ${metrics.collectionEfficiency.toFixed(1)}% (Target: 92%+)`,
        impact: 'Improving collection to 92% could free up ₹' + ((metrics.totalOutstanding * 0.07) / 1000000).toFixed(2) + 'M in capital',
        actions: [
          'Implement automated payment reminders 7 days before due date',
          'Offer early payment incentives (0.5% interest discount)',
          'Review and tighten lending criteria for new loans',
          'Focus collection efforts on largest outstanding loans',
          'Consider restructuring chronic delayed accounts'
        ]
      });
    } else if (metrics.collectionEfficiency < 92) {
      recs.push({
        id: 'collection-2',
        category: 'Loan Quality',
        priority: 'MEDIUM',
        title: 'Optimize Collection Process',
        currentState: `Collection efficiency is ${metrics.collectionEfficiency.toFixed(1)}% (Good, but can improve to 92%+)`,
        impact: 'Reaching 92% efficiency target improves cash flow and reduces risk',
        actions: [
          'Analyze which customer segments have best repayment rates',
          'Implement tiered follow-up strategy based on loan size',
          'Provide online/app-based repayment options',
          'Track and reward loan officers with best collection rates'
        ]
      });
    }

    // Active Loans Monitoring
    if (activeLoans.length > 0) {
      const avgOutstanding = metrics.totalOutstanding / activeLoans.length;
      recs.push({
        id: 'active-monitoring',
        category: 'Portfolio Management',
        priority: 'MEDIUM',
        title: 'Active Loan Portfolio Monitoring',
        currentState: `${activeLoans.length} active loans with average outstanding of ₹${avgOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
        impact: 'Regular monitoring prevents defaults and identifies at-risk accounts early',
        actions: [
          'Weekly review of all loans approaching maturity (within 30 days)',
          'Monthly aging analysis to flag overdue accounts',
          'Contact customers 15 days before loan expiry for renewal or release',
          'Set up dashboard alerts for high-value loans (>₹2L)',
          'Quarterly review of overall portfolio health metrics'
        ]
      });
    }

    // Customer Diversification
    const customerMap = new Map<string, number>();
    allLoans.forEach((loan) => {
      if (loan.customer_name) {
        const current = customerMap.get(loan.customer_name) || 0;
        customerMap.set(loan.customer_name, current + (loan.loan_amount || 0));
      }
    });

    const totalCapital = allLoans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
    const topCustomers = Array.from(customerMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const top5Concentration = topCustomers.reduce((sum, [, amount]) => sum + amount, 0);
    const concentrationPct = totalCapital > 0 ? (top5Concentration / totalCapital) * 100 : 0;

    if (concentrationPct > 50) {
      recs.push({
        id: 'diversification-1',
        category: 'Risk Management',
        priority: 'HIGH',
        title: 'Reduce Customer Concentration Risk',
        currentState: `Top 5 customers represent ${concentrationPct.toFixed(1)}% of portfolio (High risk concentration)`,
        impact: 'Diversification reduces portfolio volatility by 40-50%',
        actions: [
          'Set maximum exposure limits per customer (e.g., 10% of portfolio)',
          'Launch customer acquisition campaign to onboard 20+ new customers',
          'Gradually reduce exposure to top customers by capping new loans',
          'Develop different customer segments (gold, silver, diamond)',
          'Target concentration below 40% within 6 months'
        ]
      });
    } else if (concentrationPct > 30) {
      recs.push({
        id: 'diversification-2',
        category: 'Risk Management',
        priority: 'MEDIUM',
        title: 'Monitor Customer Concentration',
        currentState: `Top 5 customers represent ${concentrationPct.toFixed(1)}% of portfolio (Moderate concentration)`,
        impact: 'Maintaining diversification protects against single customer defaults',
        actions: [
          'Track concentration metrics monthly',
          'Continue balanced customer acquisition',
          'Set alerts if any customer exceeds 15% of portfolio',
          'Maintain current diversification levels'
        ]
      });
    }

    // Interest Yield Optimization
    recs.push({
      id: 'yield-optimization',
      category: 'Interest Yield',
      priority: 'MEDIUM',
      title: 'Optimize Interest Rate Strategy',
      currentState: 'Review current interest rate positioning against portfolio performance',
      impact: 'Even 1% yield improvement adds ₹' + ((totalCapital * 0.01) / 1000000).toFixed(2) + 'M annual revenue',
      actions: [
        'Analyze yield by customer type, loan size, and holding period',
        'Implement risk-based pricing (higher rates for longer tenures)',
        'Review competitor rates and adjust positioning',
        'Consider tiered rates: Standard (12%), Premium (14%), Express (16%)',
        'Add processing fees for small loans to improve effective yield'
      ]
    });

    // Customer Retention
    const uniqueCustomersAll = new Set(allLoans.filter((l) => l.customer_name).map((l) => l.customer_name));

    // Simple retention: customers who took another loan after release
    const customersWithMultipleLoans = new Map<string, number>();
    allLoans.forEach((loan) => {
      if (loan.customer_name) {
        const count = customersWithMultipleLoans.get(loan.customer_name) || 0;
        customersWithMultipleLoans.set(loan.customer_name, count + 1);
      }
    });

    const repeatCustomers = Array.from(customersWithMultipleLoans.values()).filter((count) => count > 1).length;
    const repeatRate = uniqueCustomersAll.size > 0 
      ? (repeatCustomers / uniqueCustomersAll.size) * 100 
      : 0;

    if (repeatRate < 40) {
      recs.push({
        id: 'retention-1',
        category: 'Customer Retention',
        priority: 'HIGH',
        title: 'Improve Customer Loyalty and Retention',
        currentState: `Only ${repeatRate.toFixed(1)}% of customers take repeat loans (Low retention)`,
        impact: 'Increasing retention to 60% can boost profits by 25-50%',
        actions: [
          'Launch loyalty program: 0.5% rate discount for returning customers',
          'Survey customers who did not return to understand reasons',
          'Simplify renewal process with pre-approved amounts',
          'Send automated follow-ups at 30, 60, 90 days post-release',
          'Offer festive season special rates to existing customers',
          'Target: 50%+ repeat customer rate within 9 months'
        ]
      });
    } else if (repeatRate < 60) {
      recs.push({
        id: 'retention-2',
        category: 'Customer Retention',
        priority: 'MEDIUM',
        title: 'Strengthen Customer Relationships',
        currentState: `${repeatRate.toFixed(1)}% customer retention rate (Good, can improve to 60%+)`,
        impact: 'Higher retention increases customer lifetime value',
        actions: [
          'Maintain regular contact with released customers',
          'Send birthday/festival greetings to build relationships',
          'Offer exclusive benefits for loyal customers',
          'Track customer satisfaction and address concerns promptly'
        ]
      });
    }

    setRecommendations(recs);
  };

  const handleDownloadRecommendations = () => {
    if (recommendations.length === 0) {
      console.warn('No recommendations to export');
      return;
    }

    const csvContent = recommendations.map((rec) => ({
      Category: rec.category,
      Priority: rec.priority,
      Title: rec.title,
      'Current State': rec.currentState,
      Impact: rec.impact,
      Actions: rec.actions.join('; ')
    }));

    const csvString = [
      Object.keys(csvContent[0]).join(','),
      ...csvContent.map((row) =>
        Object.values(row).map((val) => `"${val}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    downloadCSV(blob, 'smart-recommendations.csv');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
      default:
        return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading smart recommendations...</div>
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
          <h1 className="text-4xl font-bold">🧠 Smart Recommendations</h1>
          <p className="text-muted-foreground">
            AI-powered insights for portfolio optimization and risk management
          </p>
        </div>
        <Button onClick={handleDownloadRecommendations} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Recommendations
        </Button>
      </div>

      {/* Portfolio Health Snapshot */}
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Portfolio Health Snapshot
            </CardTitle>
            <CardDescription>Current portfolio performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Loans</p>
                  <p className="text-2xl font-bold">{metrics?.activeLoans}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Outstanding</p>
                  <p className="text-2xl font-bold">
                    ₹{((metrics?.totalOutstanding || 0) / 1000000).toFixed(2)}M
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Collection Efficiency</p>
                  <p className="text-2xl font-bold">{metrics?.collectionEfficiency.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="space-y-6">
        {recommendations.map((rec) => (
          <Card key={rec.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <CardTitle>{rec.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{rec.category}</span>
                    <span className={`rounded-md border px-2 py-0.5 text-xs font-semibold ${getPriorityColor(rec.priority)}`}>
                      {getPriorityIcon(rec.priority)} {rec.priority}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-1 font-semibold text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Current State
                  </h4>
                  <p className="text-sm text-muted-foreground">{rec.currentState}</p>
                </div>
                <div>
                  <h4 className="mb-1 font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Expected Impact
                  </h4>
                  <p className="text-sm text-muted-foreground">{rec.impact}</p>
                </div>
                <div>
                  <h4 className="mb-2 font-semibold text-sm">Action Steps</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {rec.actions.map((action, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>About Smart Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These recommendations are generated based on your current portfolio performance. Priorities are assigned based on 
              potential impact and urgency. Review these suggestions monthly and track implementation progress to improve 
              portfolio health and profitability.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
