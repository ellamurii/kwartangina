import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTransactions, useCreateTransaction, useDeleteTransaction, useAccounts, useCategories } from '../hooks/useData';
import { formatCurrency, formatDate } from '../utils/dateUtils';
import { Virtuoso } from 'react-virtuoso';

type ViewMode = 'daily' | 'weekly' | 'monthly';

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  
  // Date range navigation
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentYear = now.getFullYear();
  
  const [displayMonth, setDisplayMonth] = useState(currentMonth);
  const [displayYear, setDisplayYear] = useState(currentYear);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: transactions = [] } = useTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();

  const [formData, setFormData] = useState({
    accountId: (accounts[0] as any)?.id || '',
    categoryId: '',
    type: 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredTransactions = transactions.filter((t: any) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
    
    // Filter by date range based on view mode
    const txnDate = new Date(t.date);
    if (viewMode === 'daily' || viewMode === 'weekly') {
      // Daily and Weekly: only show transactions in current month
      if (txnDate.getFullYear() !== currentMonth.getFullYear() || 
          txnDate.getMonth() !== currentMonth.getMonth()) {
        return false;
      }
    } else if (viewMode === 'monthly') {
      // Monthly: only show transactions in current year
      if (txnDate.getFullYear() !== displayYear) {
        return false;
      }
    }
    
    return true;
  });

  const getCategoryName = (id: string) => {
    return (categories as any[]).find((c) => c.id === id)?.name || 'Unknown';
  };

  const getAccountName = (id: string) => {
    return (accounts as any[]).find((a) => a.id === id)?.name || 'Unknown';
  };

  const getAccountCurrency = (id: string) => {
    return (accounts as any[]).find((a) => a.id === id)?.currency || 'PHP';
  };

  // Group transactions by date period
  const groupTransactionsByPeriod = (txns: any[]) => {
    const groups: Record<string, any[]> = {};
    
    txns.forEach((txn) => {
      const date = new Date(txn.date);
      let key: string;
      
      if (viewMode === 'daily') {
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
      } else if (viewMode === 'weekly') {
        const weekStart = new Date(date);
        const day = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - day); // Start of week (Sunday)
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(txn);
    });
    
    return groups;
  };

  const getGroupLabel = (key: string) => {
    const date = new Date(key);
    
    if (viewMode === 'daily') {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (key === today.toISOString().split('T')[0]) {
        return 'Today';
      } else if (key === yesterday.toISOString().split('T')[0]) {
        return 'Yesterday';
      }
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (viewMode === 'weekly') {
      const weekEnd = new Date(date);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    }
  };

  const groupedTransactions = groupTransactionsByPeriod(filteredTransactions);
  const sortedGroups = Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)); // Most recent first

  // Initialize expanded groups based on view mode
  const [initializedGroups, setInitializedGroups] = useState(false);
  useMemo(() => {
    if (!initializedGroups && sortedGroups.length > 0) {
      // For monthly view, collapse all. For daily/weekly, expand all
      if (viewMode === 'monthly') {
        setExpandedGroups(new Set());
      } else {
        setExpandedGroups(new Set(sortedGroups));
      }
      setInitializedGroups(true);
    }
  }, [sortedGroups, viewMode, initializedGroups]);

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
  };

  const listItems = useMemo(() => {
    const items: Array<
      | {
          type: 'group';
          key: string;
          label: string;
          income: number;
          expense: number;
          isExpanded: boolean;
        }
      | { type: 'txn'; txn: any }
    > = [];

    sortedGroups.forEach((groupKey) => {
      const groupTransactions = groupedTransactions[groupKey];
      const totalIncome = groupTransactions
        .filter((t: any) => t.type === 'income')
        .reduce((sum: number, t: any) => sum + t.amount, 0);
      const totalExpense = groupTransactions
        .filter((t: any) => t.type === 'expense')
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const isExpanded = expandedGroups.has(groupKey);
      items.push({
        type: 'group',
        key: groupKey,
        label: getGroupLabel(groupKey),
        income: totalIncome,
        expense: totalExpense,
        isExpanded,
      });

      // Only include transactions if group is expanded
      if (isExpanded) {
        groupTransactions.forEach((txn: any) => {
          items.push({ type: 'txn', txn });
        });
      }
    });

    return items;
  }, [groupedTransactions, sortedGroups, viewMode, expandedGroups]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categoryId && formData.accountId && formData.amount) {
      createMutation.mutate({
        accountId: formData.accountId,
        categoryId: formData.categoryId,
        type: formData.type as any,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: new Date(formData.date),
      });
      setFormData({
        accountId: (accounts[0] as any)?.id || '',
        categoryId: '',
        type: 'expense',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    }
  };

  const expenseCategories = (categories as any[]).filter((c) => c.type === formData.type);

  return (
    <div className="p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500">Manage your income, expenses, and transfers</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors w-full md:w-auto justify-center"
        >
          <Plus size={20} />
          Add Transaction
        </button>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="border border-gray-200 rounded-md p-3">
          <h2 className="text-base font-semibold mb-3">Add New Transaction</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, categoryId: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="transfer">Transfer</option>
                  <option value="savings">Savings</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
                <select
                  value={formData.accountId}
                  onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  {(accounts as any[]).map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                >
                  <option value="">Select Category</option>
                  {expenseCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900"
                  placeholder="Enter description"
                />
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
                Add Transaction
              </button>
            </div>
          </form>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex gap-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'daily'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'weekly'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'monthly'
                ? 'bg-primary text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
        <button
          onClick={() => {
            if (viewMode === 'monthly') {
              setDisplayYear(displayYear - 1);
            } else {
              setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1));
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-center font-semibold text-gray-900">
          {viewMode === 'monthly' ? displayYear : displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
        
        <button
          onClick={() => {
            if (viewMode === 'monthly') {
              setDisplayYear(displayYear + 1);
            } else {
              setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1));
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
            <option value="savings">Savings</option>
            <option value="credit_card">Credit Card</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          >
            <option value="all">All Accounts</option>
            {(accounts as any[]).map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions List - Grouped by Period */}
      <div className="border border-gray-200 rounded-md overflow-hidden">
        {listItems.length > 0 ? (
          <div className="h-[70vh] md:h-[75vh]">
            <Virtuoso
              data={listItems}
              itemContent={(index, item) => {
                if (item.type === 'group') {
                  return (
                    <div
                      key={`group-${item.key}`}
                      className="border-b border-gray-200 dark:border-gray-200 px-3 py-3 sticky top-0"
                    >
                      <button
                        onClick={() => toggleGroup(item.key)}
                        className="accordion-btn w-full flex items-center justify-between gap-2 bg-gray-50 dark:bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-100 transition-colors rounded px-2 py-1 focus:outline-none focus:ring-0 focus:border-0 active:ring-0"
                      >
                        <div className="flex items-center gap-2 flex-1 text-left">
                          <ChevronDown
                            size={20}
                            className={`flex-shrink-0 transition-transform text-gray-900 ${
                              item.isExpanded ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                          <h3 className="text-lg font-bold text-gray-900">
                            {item.label}
                          </h3>
                        </div>
                        <div className="flex gap-3 text-sm">
                          {item.income > 0 && (
                            <span className="text-green-600 font-semibold">
                              +{formatCurrency(item.income, 'PHP')}
                            </span>
                          )}
                          {item.expense > 0 && (
                            <span className="text-red-600 font-semibold">
                              -{formatCurrency(item.expense, 'PHP')}
                            </span>
                          )}
                        </div>
                      </button>
                    </div>
                  );
                }

                const txn = item.txn;
                return (
                  <div key={txn.id} className="border-b px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {txn.description || 'No description'}
                        </div>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-1">
                          <span>{formatDate(new Date(txn.date))}</span>
                          <span>•</span>
                          <span>{getCategoryName(txn.categoryId)}</span>
                          <span>•</span>
                          <span>{getAccountName(txn.accountId)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`text-sm font-semibold ${
                            txn.type === 'income' ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {txn.type === 'income' ? '+' : '-'}
                          {formatCurrency(txn.amount, getAccountCurrency(txn.accountId))}
                        </div>
                        <button
                          onClick={() => deleteMutation.mutate(txn.id)}
                          className="text-red-600 hover:text-red-700 p-1 rounded-md bg-white/90 border border-gray-200 hover:bg-red-50 dark:bg-white dark:border-gray-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-sm text-gray-500">No transactions found. Start by adding one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
