export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense',
  TRANSFER: 'transfer',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
} as const;

export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  CREDIT_CARD: 'credit_card',
  INVESTMENT: 'investment',
} as const;

export type TransactionTypeValues = typeof TransactionType[keyof typeof TransactionType];
export type AccountTypeValues = typeof AccountType[keyof typeof AccountType];

export interface Account {
  id: string;
  name: string;
  type: AccountTypeValues;
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionTypeValues;
  icon?: string;
  color?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string;
  type: TransactionTypeValues;
  amount: number;
  description: string;
  date: Date;
  toAccountId?: string;  // For transfer transactions
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface StatisticData {
  period: string;
  income: number;
  expense: number;
  net: number;
}
