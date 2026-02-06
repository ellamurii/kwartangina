import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAccounts, useTransactions, useCategories } from '../hooks/useData';
import { generateMonthlyStatistics, generateWeeklyStatistics } from '../utils/analyticsUtils';
import { formatCurrency, getStartOfMonth, getEndOfMonth, getStartOfYear, getEndOfYear } from '../utils/dateUtils';
import { Calendar } from 'lucide-react';

export default function Dashboard() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: getStartOfMonth().toISOString().split('T')[0],
    end: getEndOfMonth().toISOString().split('T')[0],
  });

  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions({
    startDate: new Date(dateRange.start),
    endDate: new Date(dateRange.end),
  });
  const { data: monthTransactions = [] } = useTransactions({
    startDate: getStartOfMonth(),
    endDate: getEndOfMonth(),
  });

  // Calculate totals
  const income = transactions
    .filter((t: any) => {
      // Only count actual income (not transfers or credit card payments)
      if (t.type === 'income') {
        const account = (accounts as any[]).find(a => a.id === t.accountId);
        // Exclude income to credit cards (payments) and transfers
        return account?.type !== 'credit_card' && !t.toAccountId;
      }
      return false;
    })
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const expenses = transactions
    .filter((t: any) => {
      if (t.type !== 'expense') return false;
      // Exclude all transfers and payments (any transaction with toAccountId)
      if (t.toAccountId) return false;
      return true;
    })
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalBalance = (accounts as any[]).reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Chart data
  const monthlyData = generateMonthlyStatistics(transactions, 12);
  const weeklyData = generateWeeklyStatistics(transactions, 12);

  const expenseByCategory = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: Record<string, number>, t: any) => {
      acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount;
      return acc;
    }, {});

  const categoryChartData = Object.entries(expenseByCategory).map(([id, amount]) => ({
    name: id,
    value: amount,
  }));

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6'];

  const handlePeriodChange = (newPeriod: 'week' | 'month' | 'year') => {
    setPeriod(newPeriod);
    const now = new Date();
    let start, end;

    switch (newPeriod) {
      case 'week':
        const weekStart = new Date(now);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day;
        weekStart.setDate(diff);
        weekStart.setHours(0, 0, 0, 0);
        start = weekStart;
        end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        break;
      case 'month':
        start = getStartOfMonth();
        end = getEndOfMonth();
        break;
      case 'year':
        start = getStartOfYear();
        end = getEndOfYear();
        break;
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const getCreditCardMonthTotal = (accountId: string) => {
    return (monthTransactions as any[])
      .filter((t) => t.accountId === accountId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const accountGroupLabels: Record<string, string> = {
    checking: 'Bank Accounts',
    savings: 'Savings',
    investment: 'Investments',
    credit_card: 'Credit Cards',
    other: 'Other',
  };

  const accountGroups = (accounts as any[]).reduce((acc: Record<string, any[]>, account) => {
    const key = account.type || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(account);
    return acc;
  }, {} as Record<string, any[]>);

  const accountGroupOrder = ['checking', 'savings', 'investment', 'credit_card', 'other'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Overview of your finances</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Income</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(income, (accounts[0] as any)?.currency || 'PHP')}</p>
          <p className="text-xs text-gray-400 mt-2">This period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Expenses</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(expenses, (accounts[0] as any)?.currency || 'PHP')}</p>
          <p className="text-xs text-gray-400 mt-2">This period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-sm">Net</p>
          <p className={`text-3xl font-bold mt-2 ${income - expenses >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(income - expenses, (accounts[0] as any)?.currency || 'PHP')}
          </p>
          <p className="text-xs text-gray-400 mt-2">Income - Expenses</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => handlePeriodChange('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'week'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => handlePeriodChange('month')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'month'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => handlePeriodChange('year')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === 'year'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Year
            </button>
          </div>

          <div className="flex gap-2 items-center">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-1 border border-gray-300 rounded text-sm bg-white text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expense Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={period === 'month' ? monthlyData : weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number, (accounts[0] as any)?.currency || 'PHP')} />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" />
              <Bar dataKey="expense" fill="#ef4444" name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net Income Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Net Income Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={period === 'month' ? monthlyData : weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value as number, (accounts[0] as any)?.currency || 'PHP')} />
              <Legend />
              <Line type="monotone" dataKey="net" stroke="#3b82f6" name="Net Income" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ value }) => `${value > 0 ? formatCurrency(value, (accounts[0] as any)?.currency || 'PHP') : ''}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number, (accounts[0] as any)?.currency || 'PHP')} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No expense data available</p>
          )}
        </div>

        {/* Accounts by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
            <p className="text-sm font-semibold text-gray-600">
              Total: {formatCurrency(totalBalance, (accounts[0] as any)?.currency || 'PHP')}
            </p>
          </div>
          <div className="space-y-6">
            {accountGroupOrder
              .filter((key) => accountGroups[key]?.length)
              .map((key) => (
                <div key={key}>
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
                    {accountGroupLabels[key] || key}
                  </h3>
                  <div className="space-y-3">
                    {accountGroups[key].map((account: any) => {
                      const displayBalance = account.type === 'credit_card' ? -Math.abs(account.balance) : account.balance;
                      return (
                        <div key={account.id} className="flex justify-between items-center pb-3 border-b last:border-b-0">
                          <div>
                            <p className="font-medium text-gray-900">{account.name}</p>
                            <p className="text-sm text-gray-500">{account.type}</p>
                          </div>
                          <p className={`font-semibold ${displayBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(displayBalance, account.currency || 'PHP')}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
