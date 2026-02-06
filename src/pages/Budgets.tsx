import { useState } from 'react';
import { Plus, Trash2, TrendingUp } from 'lucide-react';
import { useBudgets, useCreateBudget, useCategories, useTransactions, useAccounts } from '../hooks/useData';
import { formatCurrency, getStartOfMonth, getEndOfMonth } from '../utils/dateUtils';
import { calculateBudgetVsActual } from '../utils/analyticsUtils';

export default function Budgets() {
  const [showForm, setShowForm] = useState(false);
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const createMutation = useCreateBudget();

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    period: 'monthly',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categoryId && formData.amount) {
      const startDate = getStartOfMonth();
      const endDate = getEndOfMonth();

      createMutation.mutate({
        categoryId: formData.categoryId,
        amount: parseFloat(formData.amount),
        period: formData.period as 'weekly' | 'monthly' | 'yearly',
        startDate,
        endDate: formData.period === 'yearly' ? new Date(startDate.getFullYear() + 1, 0, 1) : endDate,
      });

      setFormData({
        categoryId: '',
        amount: '',
        period: 'monthly',
      });
      setShowForm(false);
    }
  };

  const getCategoryName = (id: string) => {
    return (categories as any[]).find((c) => c.id === id)?.name || 'Unknown';
  };

  const getCategoryIcon = (id: string) => {
    return (categories as any[]).find((c) => c.id === id)?.icon || '📊';
  };

  const calculateSpent = (categoryId: string) => {
    return (transactions as any[])
      .filter((t) => t.categoryId === categoryId && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getProgressPercentage = (spent: number, budget: number) => {
    return Math.min((spent / budget) * 100, 100);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-500">Set and track your spending budgets</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Create Budget
        </button>
      </div>

      {/* Create Budget Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Create New Budget</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                >
                  <option value="">Select Category</option>
                  {(categories as any[])
                    .filter((c) => c.type === 'expense')
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
                <select
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Create Budget
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Budgets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.length > 0 ? (
          (budgets as any[]).map((budget) => {
            const spent = calculateSpent(budget.categoryId);
            const progress = getProgressPercentage(spent, budget.amount);
            const remaining = budget.amount - spent;
            const isOverBudget = spent > budget.amount;

            return (
              <div key={budget.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCategoryIcon(budget.categoryId)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getCategoryName(budget.categoryId)}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                    </p>
                  </div>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Budget</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(budget.amount, (accounts[0] as any)?.currency || 'PHP')}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Spent</span>
                    <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatCurrency(spent, (accounts[0] as any)?.currency || 'PHP')}
                    </span>
                  </div>

                  {!isOverBudget && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Remaining</span>
                      <span className="font-semibold text-green-600">{formatCurrency(remaining, (accounts[0] as any)?.currency || 'PHP')}</span>
                    </div>
                  )}

                  {isOverBudget && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Over Budget</span>
                      <span className="font-semibold text-red-600">-{formatCurrency(Math.abs(remaining), (accounts[0] as any)?.currency || 'PHP')}</span>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          progress > 100 ? 'bg-red-500' : progress > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">
                      {progress.toFixed(0)}% used
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No budgets yet. Create one to start tracking!</p>
          </div>
        )}
      </div>
    </div>
  );
}
