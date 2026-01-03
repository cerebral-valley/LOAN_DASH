'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Users,
  Briefcase,
  Building,
  Search,
  Receipt,
  TrendingUp,
  Lightbulb,
  DollarSign,
  PieChart,
  BarChart3,
  Activity,
  CreditCard,
  TrendingDown,
  Target,
  FileSpreadsheet,
  Calculator,
  Scale,
} from 'lucide-react';

const navigation = [
  {
    name: 'Executive Dashboard',
    href: '/',
    icon: LayoutDashboard,
    badge: 'New',
  },
  {
    name: 'Overview',
    href: '/overview',
    icon: FileText,
  },
  {
    name: 'Yearly Breakdown',
    href: '/yearly',
    icon: Calendar,
  },
  {
    name: 'Client Wise',
    href: '/clients',
    icon: Users,
  },
  {
    name: 'Vyapari Wise',
    href: '/vyapari',
    icon: Briefcase,
  },
  {
    name: 'Active Loans',
    href: '/active-loans',
    icon: Building,
  },
  {
    name: 'Granular Analysis',
    href: '/granular',
    icon: Search,
  },
  {
    name: 'Expense Tracker',
    href: '/expenses',
    icon: Receipt,
  },
  {
    name: 'Interest Yield',
    href: '/yield',
    icon: TrendingUp,
  },
  {
    name: 'Smart Recommendations',
    href: '/recommendations',
    icon: Lightbulb,
  },
  {
    name: 'Gold & Silver Rates',
    href: '/rates',
    icon: DollarSign,
  },
];

const newPages = [
  {
    name: 'Portfolio Summary',
    href: '/portfolio',
    icon: PieChart,
  },
  {
    name: 'Customer Analytics',
    href: '/customer-analytics',
    icon: BarChart3,
  },
  {
    name: 'Risk Assessment',
    href: '/risk-assessment',
    icon: Activity,
  },
  {
    name: 'Profitability Analysis',
    href: '/profitability',
    icon: CreditCard,
  },
  {
    name: 'Aging Analysis',
    href: '/aging',
    icon: TrendingDown,
  },
  {
    name: 'Payment History',
    href: '/payment-history',
    icon: Target,
  },
  {
    name: 'LTV Trends',
    href: '/ltv-trends',
    icon: Scale,
  },
  {
    name: 'Revenue Projections',
    href: '/projections',
    icon: Calculator,
  },
  {
    name: 'Performance Dashboard',
    href: '/performance',
    icon: FileSpreadsheet,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold">🏙️ City Central</h1>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <div className="mb-4">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              Main Dashboards
            </h2>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-6">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
              Advanced Analytics
            </h2>
            {newPages.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          © 2026 City Central Web App
        </p>
      </div>
    </div>
  );
}
