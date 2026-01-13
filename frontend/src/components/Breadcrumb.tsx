'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeNames: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Executive Dashboard',
  'yearly': 'Yearly Breakdown',
  'clients': 'Client Wise',
  'vyapari': 'Vyapari Wise',
  'active-loans': 'Active Loans',
  'granular': 'Granular Analysis',
  'expenses': 'Expense Tracker',
  'yield': 'Interest Yield',
  'recommendations': 'Smart Recommendations',
  'rates': 'Gold & Silver Rates',
  'portfolio': 'Portfolio Summary',
  'customer-analytics': 'Customer Analytics',
  'risk-assessment': 'Risk Assessment',
  'profitability': 'Profitability Analysis',
  'aging': 'Aging Analysis',
  'ltv-trends': 'LTV Trends',
  'projections': 'Revenue Projections',
  'performance': 'Performance Dashboard',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const paths = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
      <Link
        href="/"
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      {paths.map((path, index) => {
        const href = '/' + paths.slice(0, index + 1).join('/');
        const isLast = index === paths.length - 1;
        const name = routeNames[path] || path;

        return (
          <div key={path} className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="font-medium text-foreground">{name}</span>
            ) : (
              <Link
                href={href}
                className="hover:text-foreground transition-colors"
              >
                {name}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
