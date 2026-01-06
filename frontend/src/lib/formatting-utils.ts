/**
 * Format a number as Indian Rupees with proper locale formatting
 */
export function formatCurrency(amount: number | undefined, options?: { showSymbol?: boolean }): string {
  if (amount === undefined || amount === null) return '₹0';
  const showSymbol = options?.showSymbol !== false;
  const formattedAmount = amount.toLocaleString('en-IN');
  return showSymbol ? `₹${formattedAmount}` : formattedAmount;
}

/**
 * Format a date in Indian locale (DD/MM/YYYY)
 */
export function formatDate(date: Date | undefined | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN');
}

/**
 * Format a number as a percentage with specified decimal places
 */
export function formatPercentage(value: number | undefined, decimals: number = 2): string {
  if (value === undefined || value === null) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a number with general options
 */
export function formatNumber(
  value: number | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value === undefined || value === null) return '0';
  return value.toLocaleString('en-IN', options);
}

/**
 * Format currency in millions (e.g., "₹2.5M")
 */
export function formatCurrencyInMillions(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '₹0M';
  const millions = amount / 1000000;
  return `₹${millions.toFixed(2)}M`;
}

/**
 * Format currency in lakhs (e.g., "₹2.5L")
 */
export function formatCurrencyInLakhs(amount: number | undefined): string {
  if (amount === undefined || amount === null) return '₹0L';
  const lakhs = amount / 100000;
  return `₹${lakhs.toFixed(2)}L`;
}

/**
 * Format a number of days as a readable string
 */
export function formatDays(days: number | undefined): string {
  if (days === undefined || days === null) return '-';
  if (days === 1) return '1 day';
  return `${days} days`;
}

/**
 * Format interest rate with percentage sign
 */
export function formatInterestRate(rate: number | undefined): string {
  if (rate === undefined || rate === null) return '-';
  return `${rate}%`;
}
