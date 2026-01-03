import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

export interface LoanStats {
  totalLoans: number;
  activeLoans: number;
  releasedLoans: number;
  totalDisbursed: number;
  totalOutstanding: number;
  totalInterestReceived: number;
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  cashExpenses: number;
  bankExpenses: number;
}

// Loan API calls
export const loanApi = {
  getAll: () => api.get<Loan[]>('/loans'),
  getById: (id: number) => api.get<Loan>(`/loans/${id}`),
  getActive: () => api.get<Loan[]>('/loans/active'),
  getReleased: () => api.get<Loan[]>('/loans/released'),
  getByCustomerType: (type: string) => api.get<Loan[]>(`/loans/customer-type/${type}`),
  getStats: () => api.get<LoanStats>('/loans/stats'),
  downloadCSV: () => api.get('/loans/download/csv', { responseType: 'blob' }),
};

// Expense API calls
export const expenseApi = {
  getAll: () => api.get<Expense[]>('/expenses'),
  getById: (id: number) => api.get<Expense>(`/expenses/${id}`),
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
