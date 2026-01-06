import { useState } from 'react';
import { loanApi, expenseApi, downloadCSV } from './api';

/**
 * Hook for downloading loan data as CSV
 */
export function useDownloadLoanCSV() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async (filename = 'loans.csv') => {
    try {
      setIsDownloading(true);
      setError(null);
      const response = await loanApi.downloadCSV();
      downloadCSV(response.data, filename);
    } catch (err) {
      setError('Failed to download loan CSV');
      console.error('Error downloading loan CSV:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading, error };
}

/**
 * Hook for downloading expense data as CSV
 */
export function useDownloadExpenseCSV() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async (filename = 'expenses.csv') => {
    try {
      setIsDownloading(true);
      setError(null);
      const response = await expenseApi.downloadCSV();
      downloadCSV(response.data, filename);
    } catch (err) {
      setError('Failed to download expense CSV');
      console.error('Error downloading expense CSV:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return { download, isDownloading, error };
}
