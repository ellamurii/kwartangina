import type { Transaction, StatisticData } from '../types';
import { getMonthName } from './dateUtils';

export const calculateTotalIncome = (transactions: Transaction[]): number => {
  return transactions
    .filter((t) => t.type === 'income')
    .reduce((total, t) => total + t.amount, 0);
};

export const calculateTotalExpense = (transactions: Transaction[]): number => {
  return transactions
    .filter((t) => t.type === 'expense')
    .reduce((total, t) => total + t.amount, 0);
};

export const calculateNetBalance = (transactions: Transaction[]): number => {
  const income = calculateTotalIncome(transactions);
  const expense = calculateTotalExpense(transactions);
  return income - expense;
};

export const groupTransactionsByCategory = (
  transactions: Transaction[]
): Record<string, number> => {
  return transactions.reduce(
    (acc, t) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    },
    {} as Record<string, number>
  );
};

export const groupTransactionsByDate = (
  transactions: Transaction[],
  period: 'day' | 'week' | 'month' | 'year' = 'month'
): Record<string, Transaction[]> => {
  return transactions.reduce(
    (acc, t) => {
      let key: string;
      const date = new Date(t.date);

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week':
          const weekStart = new Date(date);
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day;
          weekStart.setDate(diff);
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'year':
          key = String(date.getFullYear());
          break;
      }

      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<string, Transaction[]>
  );
};

export const generateMonthlyStatistics = (
  transactions: Transaction[],
  months: number = 12
): StatisticData[] => {
  const now = new Date();
  const data: StatisticData[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(date);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);
    monthEnd.setHours(23, 59, 59, 999);

    const monthTransactions = transactions.filter(
      (t) => new Date(t.date) >= monthStart && new Date(t.date) <= monthEnd
    );

    const income = calculateTotalIncome(monthTransactions);
    const expense = calculateTotalExpense(monthTransactions);

    data.push({
      period: getMonthName(date.getMonth()),
      income,
      expense,
      net: income - expense,
    });
  }

  return data;
};

export const generateWeeklyStatistics = (
  transactions: Transaction[],
  weeks: number = 12
): StatisticData[] => {
  const now = new Date();
  const data: StatisticData[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day - i * 7;
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekTransactions = transactions.filter(
      (t) => new Date(t.date) >= weekStart && new Date(t.date) <= weekEnd
    );

    const income = calculateTotalIncome(weekTransactions);
    const expense = calculateTotalExpense(weekTransactions);

    data.push({
      period: `Week of ${weekStart.toLocaleDateString()}`,
      income,
      expense,
      net: income - expense,
    });
  }

  return data;
};

export const calculateBudgetVsActual = (
  budget: number,
  spent: number
): { percentage: number; remaining: number } => {
  return {
    percentage: (spent / budget) * 100,
    remaining: budget - spent,
  };
};
