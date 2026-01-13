'use client';

import { useState } from 'react';
import { Search, X, Filter, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface SearchFilters {
  query: string;
  customerType?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  className?: string;
}

export function AdvancedSearch({ onSearch, className }: AdvancedSearchProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
  });

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleReset = () => {
    const resetFilters: SearchFilters = { query: '' };
    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const hasActiveFilters = Object.entries(filters).some(
    ([key, value]) => key !== 'query' && value !== undefined && value !== ''
  );

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search loans, customers, or loan numbers..."
            className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          {filters.query && (
            <button
              onClick={() => setFilters({ ...filters, query: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              {Object.entries(filters).filter(([k, v]) => k !== 'query' && v).length}
            </span>
          )}
        </Button>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">Customer Type</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={filters.customerType || ''}
                  onChange={(e) =>
                    setFilters({ ...filters, customerType: e.target.value || undefined })
                  }
                >
                  <option value="">All Types</option>
                  <option value="Vyapari">Vyapari</option>
                  <option value="Consumer">Consumer</option>
                  <option value="Corporate">Corporate</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={filters.status || ''}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value || undefined })}
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="released">Released</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Date From</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filters.dateFrom || ''}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value || undefined })
                    }
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Date To</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Min Amount</label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Max Amount</label>
                <input
                  type="number"
                  placeholder="∞"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Reset Filters
              </Button>
              <Button onClick={handleSearch}>Apply Filters</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
