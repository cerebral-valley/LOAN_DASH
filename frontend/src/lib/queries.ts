import { useQuery } from '@tanstack/react-query';
import { loanApi, expenseApi } from './api';

// Query keys for consistent caching
export const QUERY_KEYS = {
  loans: {
    all: ['loans'] as const,
    list: (page?: number, limit?: number) => ['loans', 'list', page, limit] as const,
    byId: (id: number) => ['loans', 'detail', id] as const,
    active: (page?: number, limit?: number) => ['loans', 'active', page, limit] as const,
    released: (page?: number, limit?: number) => ['loans', 'released', page, limit] as const,
    byType: (type: string, page?: number, limit?: number) => ['loans', 'type', type, page, limit] as const,
    byCustomer: (customerName: string, page?: number, limit?: number) => ['loans', 'customer', customerName, page, limit] as const,
    vyapariCustomers: () => ['loans', 'vyapari', 'customers'] as const,
    stats: () => ['loans', 'stats'] as const,
    overviewStats: () => ['loans', 'overview', 'stats'] as const,
    yieldStats: () => ['loans', 'yield', 'stats'] as const,
    yearlyBreakdown: () => ['loans', 'yearly', 'breakdown'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
    list: (page?: number, limit?: number) => ['expenses', 'list', page, limit] as const,
    byId: (id: number) => ['expenses', 'detail', id] as const,
    stats: () => ['expenses', 'stats'] as const,
  },
};

// Loan hooks
export function useLoans(page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.list(page, limit),
    queryFn: async () => {
      const response = await loanApi.getAll(page, limit);
      return response.data;
    },
  });
}

export function useLoan(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.byId(id),
    queryFn: async () => {
      const response = await loanApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useActiveLoans(page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.active(page, limit),
    queryFn: async () => {
      const response = await loanApi.getActive(page, limit);
      return response.data;
    },
  });
}

export function useReleasedLoans(page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.released(page, limit),
    queryFn: async () => {
      const response = await loanApi.getReleased(page, limit);
      return response.data;
    },
  });
}

export function useLoansByCustomerType(type: string, page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.byType(type, page, limit),
    queryFn: async () => {
      const response = await loanApi.getByCustomerType(type, page, limit);
      return response.data;
    },
    enabled: !!type,
  });
}

export function useLoansByCustomer(customerName: string, page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.loans.byCustomer(customerName, page, limit),
    queryFn: async () => {
      const response = await loanApi.getByCustomer(customerName, page, limit);
      return response.data;
    },
    enabled: !!customerName,
  });
}

export function useVyapariCustomers() {
  return useQuery({
    queryKey: QUERY_KEYS.loans.vyapariCustomers(),
    queryFn: async () => {
      const response = await loanApi.getVyapariCustomers();
      return response.data;
    },
  });
}

export function useLoanStats() {
  return useQuery({
    queryKey: QUERY_KEYS.loans.stats(),
    queryFn: async () => {
      const response = await loanApi.getStats();
      return response.data;
    },
    // Stats are cached longer since they change less frequently
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useOverviewStats() {
  return useQuery({
    queryKey: QUERY_KEYS.loans.overviewStats(),
    queryFn: async () => {
      const response = await loanApi.getOverviewStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useYieldStats() {
  return useQuery({
    queryKey: QUERY_KEYS.loans.yieldStats(),
    queryFn: async () => {
      const response = await loanApi.getYieldStats();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useYearlyBreakdown() {
  return useQuery({
    queryKey: QUERY_KEYS.loans.yearlyBreakdown(),
    queryFn: async () => {
      const response = await loanApi.getYearlyBreakdown();
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Expense hooks
export function useExpenses(page = 1, limit = 100) {
  return useQuery({
    queryKey: QUERY_KEYS.expenses.list(page, limit),
    queryFn: async () => {
      const response = await expenseApi.getAll(page, limit);
      return response.data;
    },
  });
}

export function useExpense(id: number) {
  return useQuery({
    queryKey: QUERY_KEYS.expenses.byId(id),
    queryFn: async () => {
      const response = await expenseApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useExpenseStats() {
  return useQuery({
    queryKey: QUERY_KEYS.expenses.stats(),
    queryFn: async () => {
      const response = await expenseApi.getStats();
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
