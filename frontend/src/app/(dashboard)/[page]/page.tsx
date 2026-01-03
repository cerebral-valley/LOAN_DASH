'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PageConfig = {
  title: string;
  description: string;
  highlights: string[];
};

const PAGE_CONFIG: Record<string, PageConfig> = {
  overview: {
    title: 'Overview',
    description: 'High-level snapshot of your loan portfolio with quick stats.',
    highlights: [
      'Portfolio health summary',
      'Latest disbursement and collection insights',
      'Quick navigation to deeper dashboards',
    ],
  },
  yearly: {
    title: 'Yearly Breakdown',
    description: 'Year-over-year lending and recovery performance.',
    highlights: [
      'Annual disbursement totals',
      'Interest collected by financial year',
      'Outstanding trends across years',
    ],
  },
  clients: {
    title: 'Client Wise',
    description: 'Client-wise aggregation backed by existing loan data.',
    highlights: [
      'Customer level balances',
      'Disbursement vs. collection by client',
      'Aging flags for at-risk customers',
    ],
  },
  vyapari: {
    title: 'Vyapari Wise',
    description: 'Performance segmented by Vyapari to mirror backend reports.',
    highlights: [
      'Vyapari performance comparison',
      'Outstanding vs. released loans per partner',
      'Interest yield by segment',
    ],
  },
  'active-loans': {
    title: 'Active Loans',
    description: 'List of active loans fetched from the backend.',
    highlights: [
      'Live loan inventory',
      'Outstanding principal tracking',
      'Direct link to loan level details',
    ],
  },
  granular: {
    title: 'Granular Analysis',
    description: 'Row-level explorer for detailed loan inspection.',
    highlights: [
      'Advanced filters for loan attributes',
      'Drill-down for customer and item level data',
      'CSV export powered by backend endpoints',
    ],
  },
  expenses: {
    title: 'Expense Tracker',
    description: 'Operational expense ledger aligned with expense APIs.',
    highlights: [
      'Expense list and search',
      'Payment mode and ledger level breakdowns',
      'CSV export for accounting reviews',
    ],
  },
  yield: {
    title: 'Interest Yield',
    description: 'Interest yield monitoring with backend formulas.',
    highlights: [
      'Interest to principal ratios',
      'Released vs. active yield comparison',
      'Identify underperforming segments',
    ],
  },
  recommendations: {
    title: 'Smart Recommendations',
    description: 'AI-assisted suggestions for collections and renewals.',
    highlights: [
      'Priority list for follow-ups',
      'Renewal and release suggestions',
      'Signals powered by portfolio data',
    ],
  },
  rates: {
    title: 'Gold & Silver Rates',
    description: 'Rate management screen to sync with imported prices.',
    highlights: [
      'Latest gold and silver prices',
      'Historical view for rate changes',
      'Hooks for automated rate ingestion',
    ],
  },
  projections: {
    title: 'Revenue Projections',
    description: 'Forward-looking revenue and cash flow projections.',
    highlights: [
      'Projected interest inflows',
      'Scenario planning for collections',
      'What-if analysis for rate movements',
    ],
  },
};

export default function PlaceholderPage({ params }: { params: { page: string } }) {
  const config = PAGE_CONFIG[params.page];

  const title = config?.title ?? 'Coming Soon';
  const description =
    config?.description ??
    'This route is ready in the frontend and can be wired to backend data as needed.';
  const highlights =
    config?.highlights ??
    ['Plug in backend responses to render insights.', 'Use this page as a starting point for UI wiring.'];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frontend placeholder</CardTitle>
          <CardDescription>
            The backend endpoints for this area already exist. Use this screen to surface them without breaking
            navigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-4 text-sm text-muted-foreground">
            {highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
