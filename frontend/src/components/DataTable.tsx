'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-utils';
import { formatCurrency, formatDate, formatPercentage } from '@/lib/formatting-utils';

export interface ColumnDefinition<T = Record<string, unknown>> {
  key: string;
  label: string;
  format?: 'text' | 'currency' | 'date' | 'percentage' | 'number';
  formatter?: (value: unknown, row: T) => string | number | React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T = Record<string, unknown>> {
  data: T[];
  columns: ColumnDefinition<T>[];
  exportFilename?: string;
  showExport?: boolean;
  emptyMessage?: string;
  className?: string;
  stickyHeader?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  exportFilename,
  showExport = true,
  emptyMessage = 'No data available',
  className = '',
  stickyHeader = false,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      // Handle null/undefined values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // Handle numbers
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleExport = () => {
    if (!exportFilename) return;

    // Prepare data for CSV export
    const csvData = sortedData.map((row) => {
      const csvRow: Record<string, unknown> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        
        if (col.formatter) {
          csvRow[col.label] = col.formatter(value, row);
        } else if (col.format === 'currency' && typeof value === 'number') {
          csvRow[col.label] = value;
        } else if (col.format === 'date' && value instanceof Date) {
          csvRow[col.label] = formatDate(value);
        } else if (col.format === 'percentage' && typeof value === 'number') {
          csvRow[col.label] = value;
        } else {
          csvRow[col.label] = value ?? '';
        }
      });
      return csvRow;
    });

    exportToCSV(csvData, exportFilename);
  };

  const formatCellValue = (value: unknown, column: ColumnDefinition<T>, row: T) => {
    // Use custom formatter if provided
    if (column.formatter) {
      return column.formatter(value, row);
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return '—';
    }

    // Apply format based on type
    switch (column.format) {
      case 'currency':
        return formatCurrency(value);
      case 'date':
        return value instanceof Date ? formatDate(value) : String(value);
      case 'percentage':
        return formatPercentage(value);
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'text':
      default:
        return String(value);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className={className}>
      {showExport && exportFilename && (
        <div className="mb-4 flex justify-end">
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      )}

      <div className={`rounded-md border ${stickyHeader ? 'max-h-[600px] overflow-auto' : ''}`}>
        <Table>
          <TableHeader className={stickyHeader ? 'sticky top-0 bg-background z-10' : ''}>
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.key}
                  style={{ width: column.width }}
                  className={`${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''} ${column.sortable !== false ? 'cursor-pointer select-none' : ''}`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                    >
                      {formatCellValue(row[column.key], column, row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
