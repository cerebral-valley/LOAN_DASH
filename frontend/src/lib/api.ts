import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to parse numeric fields from string (TypeORM returns decimals as strings)
export const parseNumeric = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? undefined : parsed;
};

// Helper to check if a loan is released (handles inconsistent boolean field values: TRUE, True, FALSE, False)
export const isLoanReleased = (released: string | undefined | null): boolean => {
  if (released === null || released === undefined) return false;
  if (typeof released !== 'string') return false;
  return released.toUpperCase() === 'TRUE';
};

// Transform loan data to ensure numeric fields are numbers
const transformLoan = (loan: Record<string, unknown>): Loan => ({
  loan_number: Number(loan.loan_number),
  customer_type: loan.customer_type as string | undefined,
  customer_name: loan.customer_name as string | undefined,
  customer_id: loan.customer_id as string | undefined,
  item_list: loan.item_list as string | undefined,
  gross_wt: parseNumeric(loan.gross_wt),
  net_wt: parseNumeric(loan.net_wt),
  gold_rate: parseNumeric(loan.gold_rate),
  purity: parseNumeric(loan.purity),
  valuation: parseNumeric(loan.valuation),
  loan_amount: parseNumeric(loan.loan_amount),
  ltv_given: parseNumeric(loan.ltv_given),
  date_of_disbursement: loan.date_of_disbursement ? new Date(loan.date_of_disbursement as string) : undefined,
  mode_of_disbursement: loan.mode_of_disbursement as string | undefined,
  date_of_release: loan.date_of_release ? new Date(loan.date_of_release as string) : undefined,
  released: loan.released as string | undefined,
  expiry: loan.expiry ? new Date(loan.expiry as string) : undefined,
  interest_rate: parseNumeric(loan.interest_rate),
  interest_amount: parseNumeric(loan.interest_amount),
  transfer_mode: loan.transfer_mode as string | undefined,
  scheme: loan.scheme as string | undefined,
  last_intr_pay: loan.last_intr_pay ? new Date(loan.last_intr_pay as string) : undefined,
  data_entry: loan.data_entry as string | undefined,
  pending_loan_amount: parseNumeric(loan.pending_loan_amount),
  interest_deposited_till_date: parseNumeric(loan.interest_deposited_till_date),
  last_date_of_interest_deposit: loan.last_date_of_interest_deposit ? new Date(loan.last_date_of_interest_deposit as string) : undefined,
  comments: loan.comments as string | undefined,
  last_partial_principal_pay: parseNumeric(loan.last_partial_principal_pay),
  receipt_pending: loan.receipt_pending as string | undefined,
  form_printing: loan.form_printing as string | undefined,
});

export interface Loan {
  loan_number: number;
  customer_type?: string;
  customer_name?: string;
  customer_id?: string;
  item_list?: string;
  gross_wt?: number;
  net_wt?: number;
  gold_rate?: number;
  purity?: number;
  valuation?: number;
  loan_amount?: number;
  ltv_given?: number;
  date_of_disbursement?: Date;
  mode_of_disbursement?: string;
  date_of_release?: Date;
  released?: string;
  expiry?: Date;
  interest_rate?: number;
  interest_amount?: number;
  transfer_mode?: string;
  scheme?: string;
  last_intr_pay?: Date;
  data_entry?: string;
  pending_loan_amount?: number;
  interest_deposited_till_date?: number;
  last_date_of_interest_deposit?: Date;
  comments?: string;
  last_partial_principal_pay?: number;
  receipt_pending?: string;
  form_printing?: string;
}

export interface Expense {
  id: number;
  date?: Date;
  item?: string;
  amount?: number;
  payment_mode?: string;
  bank?: string;
  ledger?: string;
  invoice_no?: string;
  receipt?: string;
  user?: string;
}

// Transform expense data to ensure numeric fields are numbers
const transformExpense = (expense: Record<string, unknown>): Expense => ({
  id: Number(expense.id),
  date: expense.date ? new Date(expense.date as string) : undefined,
  item: expense.item as string | undefined,
  amount: parseNumeric(expense.amount),
  payment_mode: expense.payment_mode as string | undefined,
  bank: expense.bank as string | undefined,
  ledger: expense.ledger as string | undefined,
  invoice_no: expense.invoice_no as string | undefined,
  receipt: expense.receipt as string | undefined,
  user: expense.user as string | undefined,
});

export interface LoanStats {
  totalLoans: number;
  activeLoans: number;
  releasedLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalInterestReceived: number;
}

export interface OverviewStats {
  totalDisbursed: number;
  totalOutstanding: number;
  totalInterestReceived: number;
  totalLoans: number;
  activeLoans: number;
  loansByDate: Record<string, { disbursed: number; count: number }>;
}

export interface VyapariCustomer {
  customer_id: string;
  customer_name: string;
  customer_type: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  cashExpenses: number;
  bankExpenses: number;
}

// Loan API calls
export const loanApi = {
  getAll: async () => {
    const response = await api.get<Record<string, unknown>[]>('/loans');
    return { ...response, data: response.data.map(transformLoan) };
  },
  getById: async (id: number) => {
    const response = await api.get<Record<string, unknown>>(`/loans/${id}`);
    return { ...response, data: transformLoan(response.data) };
  },
  getActive: async () => {
    const response = await api.get<Record<string, unknown>[]>('/loans/active');
    return { ...response, data: response.data.map(transformLoan) };
  },
  getReleased: async () => {
    const response = await api.get<Record<string, unknown>[]>('/loans/released');
    return { ...response, data: response.data.map(transformLoan) };
  },
  getByCustomerType: async (type: string) => {
    const response = await api.get<Record<string, unknown>[]>(`/loans/customer-type/${type}`);
    return { ...response, data: response.data.map(transformLoan) };
  },
  getByCustomer: async (customerName: string) => {
    const response = await api.get<Record<string, unknown>[]>(`/loans/customer/${customerName}`);
    return { ...response, data: response.data.map(transformLoan) };
  },
  getVyapariCustomers: async () => {
    const response = await api.get<VyapariCustomer[]>('/loans/vyapari/customers');
    return response;
  },
  getStats: () => api.get<LoanStats>('/loans/stats'),
  getOverviewStats: () => api.get<OverviewStats>('/loans/overview/stats'),
  downloadCSV: () => api.get('/loans/download/csv', { responseType: 'blob' }),
};

// Expense API calls
export const expenseApi = {
  getAll: async () => {
    const response = await api.get<Record<string, unknown>[]>('/expenses');
    return { ...response, data: response.data.map(transformExpense) };
  },
  getById: async (id: number) => {
    const response = await api.get<Record<string, unknown>>(`/expenses/${id}`);
    return { ...response, data: transformExpense(response.data) };
  },
  getStats: () => api.get<ExpenseStats>('/expenses/stats'),
  downloadCSV: () => api.get('/expenses/download/csv', { responseType: 'blob' }),
};

// CSV Download helper
export const downloadCSV = (data: Blob, filename: string) => {
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
