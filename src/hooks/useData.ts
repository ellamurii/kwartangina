import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/database';
import type { Account, Transaction, Budget } from '../types';


// Account Hooks
export const useAccounts = () => {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => db.getAccounts(),
  });
};

export const useAccount = (id: string) => {
  return useQuery({
    queryKey: ['account', id],
    queryFn: () => db.getAccount(id),
    enabled: !!id,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) =>
      db.createAccount(account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) =>
      db.updateAccount(id, updates),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account', id] });
    },
  });
};

// Category Hooks
export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => db.getCategories(),
  });
};

export const useCategoriesByType = (type: string) => {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => db.getCategoriesByType(type),
    enabled: !!type,
  });
};

// Transaction Hooks
export const useTransactions = (filters?: {
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => db.getTransactions(filters),
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) =>
      db.createTransaction(transaction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Transaction> }) =>
      db.updateTransaction(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => {
      db.deleteTransaction(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
};

// Budget Hooks
export const useBudgets = () => {
  return useQuery({
    queryKey: ['budgets'],
    queryFn: () => db.getBudgets(),
  });
};

export const useCreateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (budget: Omit<Budget, 'id' | 'createdAt'>) => db.createBudget(budget),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Budget> }) =>
      db.updateBudget(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};
