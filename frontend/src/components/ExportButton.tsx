'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileJson, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { exportToCSV, exportToJSON, exportToExcel, printData } from '@/lib/export-utils';
import { toast } from 'sonner';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  title?: string;
}

export function ExportButton({ data, filename = 'export', title = 'Report' }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'json' | 'excel' | 'print') => {
    if (!data || data.length === 0) {
      toast.error('No data available to export');
      return;
    }

    setIsExporting(true);
    try {
      switch (format) {
        case 'csv':
          exportToCSV(data, `${filename}.csv`);
          toast.success('CSV exported successfully');
          break;
        case 'json':
          exportToJSON(data, `${filename}.json`);
          toast.success('JSON exported successfully');
          break;
        case 'excel':
          exportToExcel(data, `${filename}.xlsx`);
          toast.success('Excel file exported successfully');
          break;
        case 'print':
          printData(data, title);
          toast.success('Print dialog opened');
          break;
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting || !data || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleExport('csv')}>
          <Download className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('excel')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('json')}>
          <FileJson className="mr-2 h-4 w-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport('print')}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
