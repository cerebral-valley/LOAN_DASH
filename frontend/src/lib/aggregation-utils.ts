import { Loan } from './api';

/**
 * Sum the loan_amount field from an array of loans
 */
export function sumLoanAmounts(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + (loan.loan_amount || 0), 0);
}

/**
 * Sum the pending_loan_amount (outstanding) field from an array of loans
 */
export function sumOutstanding(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + (loan.pending_loan_amount || 0), 0);
}

/**
 * Sum the interest_deposited_till_date field from an array of loans
 */
export function sumInterest(loans: Loan[]): number {
  return loans.reduce((sum, loan) => {
    return sum + (loan.interest_amount || 0) + (loan.interest_deposited_till_date || 0);
  }, 0);
}

/**
 * Calculate the average loan amount
 */
export function calculateAverageAmount(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  return sumLoanAmounts(loans) / loans.length;
}

/**
 * Calculate the average outstanding amount per loan
 */
export function calculateAverageOutstanding(loans: Loan[]): number {
  if (loans.length === 0) return 0;
  return sumOutstanding(loans) / loans.length;
}

/**
 * Calculate the total valuation from loans
 */
export function sumValuation(loans: Loan[]): number {
  return loans.reduce((sum, loan) => sum + (loan.valuation || 0), 0);
}

/**
 * Calculate collection rate (percentage of principal recovered)
 */
export function calculateCollectionRate(totalDisbursed: number, totalOutstanding: number): number {
  if (totalDisbursed === 0) return 0;
  return ((totalDisbursed - totalOutstanding) / totalDisbursed) * 100;
}

/**
 * Calculate interest to principal ratio
 */
export function calculateInterestToPrincipalRatio(totalInterest: number, totalPrincipal: number): number {
  if (totalPrincipal === 0) return 0;
  return (totalInterest / totalPrincipal) * 100;
}

/**
 * Calculate portfolio yield (annualized return)
 * Formula: (Total Interest / Total Capital) × (365 / Weighted Avg Days) × 100
 */
export function calculatePortfolioYield(
  totalInterest: number,
  totalCapital: number,
  weightedAvgDays: number
): number {
  if (totalCapital === 0 || weightedAvgDays === 0) return 0;
  return (totalInterest / totalCapital) * (365 / weightedAvgDays) * 100;
}

/**
 * Calculate simple return (non-annualized)
 */
export function calculateSimpleReturn(totalInterest: number, totalCapital: number): number {
  if (totalCapital === 0) return 0;
  return (totalInterest / totalCapital) * 100;
}

/**
 * Calculate weighted average holding period
 * Formula: Σ(Loan Amount × Days) / Σ(Loan Amount)
 */
export function calculateWeightedAvgDays(
  loans: Loan[],
  getDays: (loan: Loan) => number
): number {
  const totalCapital = sumLoanAmounts(loans);
  if (totalCapital === 0) return 0;
  
  const weightedDays = loans.reduce((sum, loan) => {
    const days = getDays(loan);
    return sum + (loan.loan_amount || 0) * days;
  }, 0);
  
  return weightedDays / totalCapital;
}

/**
 * Calculate LTV (Loan to Value) ratio
 */
export function calculateLTV(loanAmount: number, valuation: number): number {
  if (valuation === 0) return 0;
  return (loanAmount / valuation) * 100;
}

/**
 * Calculate average LTV across multiple loans
 */
export function calculateAverageLTV(loans: Loan[]): number {
  const loansWithValuation = loans.filter(
    (loan) => loan.valuation && loan.valuation > 0 && loan.loan_amount
  );
  if (loansWithValuation.length === 0) return 0;
  
  const totalValuation = sumValuation(loansWithValuation);
  const totalLoanAmount = sumLoanAmounts(loansWithValuation);
  
  return calculateLTV(totalLoanAmount, totalValuation);
}
