import { Loan } from './api';

/**
 * Calculate the number of days between disbursement and release dates
 * Returns 0 if release date is before disbursement date
 */
export function calculateDaysToRelease(disbursement: Date, release: Date): number {
  const diff = release.getTime() - disbursement.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days < 0 ? 0 : days;
}

/**
 * Calculate age bucket label based on number of days
 */
export function calculateAgeBucket(days: number): string {
  if (days <= 30) return '0-30 days';
  if (days <= 90) return '31-90 days';
  if (days <= 180) return '91-180 days';
  if (days <= 365) return '181-365 days';
  return '365+ days';
}

/**
 * Calculate weighted average for loans
 * @param loans - Array of loans to calculate weighted average for
 * @param getValue - Function that extracts the value to be weighted (e.g., days held, interest rate)
 * @param getWeight - Function that extracts the weight for each loan (typically loan amount)
 * @returns The weighted average value, or 0 if total weight is 0
 * 
 * Example: Calculate weighted average holding period
 * calculateWeightedAverage(loans, (loan) => holdingDays, (loan) => loan.loan_amount || 0)
 */
export function calculateWeightedAverage(
  loans: Loan[],
  getValue: (loan: Loan) => number,
  getWeight: (loan: Loan) => number
): number {
  const totalWeight = loans.reduce((sum, loan) => sum + getWeight(loan), 0);
  if (totalWeight === 0) return 0;
  
  const weightedSum = loans.reduce((sum, loan) => sum + getValue(loan) * getWeight(loan), 0);
  return weightedSum / totalWeight;
}

/**
 * Filter loans by status (active, released, or all)
 */
export function filterLoansByStatus(
  loans: Loan[],
  status: 'active' | 'released' | 'all'
): Loan[] {
  if (status === 'all') return loans;
  if (status === 'active') return loans.filter((loan) => loan.released !== 'TRUE');
  return loans.filter((loan) => loan.released === 'TRUE');
}

/**
 * Filter loans by customer type
 */
export function filterLoansByCustomerType(loans: Loan[], type: string): Loan[] {
  if (type.toLowerCase() === 'vyapari') {
    return loans.filter((loan) => loan.customer_type?.toUpperCase().trim() === 'VYAPARI');
  }
  if (type.toLowerCase() === 'private') {
    return loans.filter((loan) => loan.customer_type?.toUpperCase().trim() !== 'VYAPARI');
  }
  return loans;
}

/**
 * Filter loans by customer name
 */
export function filterLoansByCustomer(loans: Loan[], customerName: string): Loan[] {
  return loans.filter((loan) => loan.customer_name === customerName);
}

/**
 * Calculate the age of a loan in days from disbursement to today
 */
export function calculateLoanAge(disbursementDate: Date | undefined): number {
  if (!disbursementDate) return 0;
  const today = new Date();
  const disbursement = new Date(disbursementDate);
  return Math.floor((today.getTime() - disbursement.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a loan is considered long-term (>365 days)
 */
export function isLongTermLoan(disbursementDate: Date | undefined, releaseDate?: Date | undefined): boolean {
  if (!disbursementDate) return false;
  const endDate = releaseDate ? new Date(releaseDate) : new Date();
  const startDate = new Date(disbursementDate);
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return days > 365;
}

/**
 * Extract unique years from loan dates
 */
export function extractUniqueYears(loans: Loan[]): string[] {
  const yearSet = new Set<string>();
  loans.forEach((loan) => {
    if (loan.date_of_disbursement) {
      yearSet.add(new Date(loan.date_of_disbursement).getFullYear().toString());
    }
    if (loan.date_of_release) {
      yearSet.add(new Date(loan.date_of_release).getFullYear().toString());
    }
  });
  return Array.from(yearSet).sort();
}

/**
 * Group loans by a specified field
 */
export function groupLoansByField<T extends string | number>(
  loans: Loan[],
  getKey: (loan: Loan) => T
): Map<T, Loan[]> {
  const groups = new Map<T, Loan[]>();
  loans.forEach((loan) => {
    const key = getKey(loan);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(loan);
  });
  return groups;
}
