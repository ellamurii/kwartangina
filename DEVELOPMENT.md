# Kwartangina - Development Guide

## Architecture Overview

Kwartangina follows a modular, component-based architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         UI Components (Pages)            │
│  Dashboard, Transactions, Budgets, etc   │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Custom Hooks (useData.ts)           │
│  React Query for data fetching/mutations │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│     Database Layer (database.ts)         │
│  CRUD operations, business logic         │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Browser LocalStorage                │
│  Data persistence                        │
└──────────────────────────────────────────┘
```

## File Structure Explained

### `/src/pages` - Page Components
Each file represents a full page route:

- **RootLayout.tsx** - Main layout with sidebar navigation
- **Dashboard.tsx** - Financial overview and charts
- **Transactions.tsx** - CRUD operations for transactions
- **Budgets.tsx** - Budget management interface
- **Settings.tsx** - Data import/export/clear

### `/src/hooks` - Custom React Hooks

**useData.ts** - Database hooks using React Query:
- `useAccounts()` - Fetch all accounts
- `useTransactions()` - Fetch transactions with filters
- `useCreateTransaction()` - Add new transaction mutation
- `useDeleteTransaction()` - Delete transaction mutation
- `useBudgets()` - Fetch budgets
- `useCreateBudget()` - Create budget mutation

Benefits:
- Automatic caching and synchronization
- Built-in loading/error states
- Easy invalidation on mutations
- Optimistic updates support

### `/src/lib` - Core Libraries

**database.ts** - In-memory database with localStorage:
- Uses a singleton pattern
- Implements CRUD operations
- Auto-saves to localStorage on changes
- Pre-loads data from storage on init

**router.tsx** - TanStack Router setup:
- Defines all routes
- Types router for TypeScript support
- No nested route files needed (flat structure)

### `/src/utils` - Helper Functions

**dateUtils.ts** - Date manipulation:
- `getStartOfDay/Week/Month/Year`
- `getEndOfDay/Week/Month/Year`
- `formatDate()` - Format dates for display
- `formatCurrency()` - Currency formatting
- `getMonthName()`, `getDayName()` - Names from numbers

**analyticsUtils.ts** - Data analysis:
- `calculateTotalIncome/Expense` - Sum transactions
- `generateMonthlyStatistics()` - Chart data
- `generateWeeklyStatistics()` - Chart data
- `calculateBudgetVsActual()` - Budget tracking

### `/src/types` - TypeScript Definitions

Core types:
```typescript
Account {
  id, name, type, balance, currency, createdAt, updatedAt
}

Transaction {
  id, accountId, categoryId, type, amount, description, 
  date, tags, createdAt, updatedAt
}

Category {
  id, name, type, icon, color, createdAt
}

Budget {
  id, categoryId, amount, period, startDate, endDate, createdAt
}
```

## Data Flow Examples

### Adding a Transaction

```
User clicks "Add Transaction"
    ↓
Form component renders
    ↓
User fills form and submits
    ↓
handleSubmit calls createMutation.mutate()
    ↓
useCreateTransaction hook executes
    ↓
database.createTransaction() called
    ↓
Transaction added to store
    ↓
Account balance updated
    ↓
Data saved to localStorage
    ↓
React Query invalidates 'transactions' and 'accounts' queries
    ↓
Components re-fetch data and re-render
    ↓
UI updates with new transaction and balance
```

### Viewing Dashboard Charts

```
Dashboard component mounts
    ↓
useTransactions() hook fetches data
    ↓
React Query caches the data
    ↓
generateMonthlyStatistics() processes transactions
    ↓
Recharts component receives chart data
    ↓
Chart renders on screen
    ↓
User changes date range
    ↓
useTransactions re-runs with new date filters
    ↓
Chart data regenerated and chart updates
```

## Adding a New Feature

### Step 1: Define Types
Add new type to `/src/types/index.ts`:
```typescript
export interface Invoice {
  id: string;
  transactionId: string;
  vendorName: string;
  invoiceNumber: string;
  dueDate: Date;
  status: 'pending' | 'paid';
  createdAt: Date;
}
```

### Step 2: Add Database Operations
Add methods to `database.ts`:
```typescript
getInvoices() {
  return Object.values(this.store.invoices);
}

createInvoice(invoice: any) {
  const id = `inv_${Date.now()}`;
  this.store.invoices[id] = { ...invoice, id };
  this.saveToLocalStorage();
  return this.store.invoices[id];
}
```

### Step 3: Create Custom Hooks
Add to `useData.ts`:
```typescript
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => db.getInvoices(),
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoice: any) => db.createInvoice(invoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
```

### Step 4: Create Page Component
Create `src/pages/Invoices.tsx`:
```typescript
import { useInvoices, useCreateInvoice } from '../hooks/useData';

export default function Invoices() {
  const { data: invoices = [] } = useInvoices();
  const createMutation = useCreateInvoice();
  
  // Build your UI...
}
```

### Step 5: Add Route
Update `src/lib/router.tsx`:
```typescript
const invoicesRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/invoices',
  component: Invoices,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  transactionsRoute,
  invoicesRoute,
  // ...
]);
```

### Step 6: Add Navigation
Update `RootLayout.tsx`:
```typescript
const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Transactions', href: '/transactions' },
  { label: 'Invoices', href: '/invoices' },  // Add this
  // ...
];
```

## Performance Optimization Tips

### 1. Lazy Load Routes
```typescript
const Invoices = lazy(() => import('../pages/Invoices'));
```

### 2. Use React Query Selectors
```typescript
useQuery({
  queryKey: ['transactions'],
  queryFn: () => db.getTransactions(),
  select: (data) => data.filter(t => t.type === 'income')
});
```

### 3. Memoize Components
```typescript
export default memo(TransactionRow, (prev, next) => {
  return prev.transaction.id === next.transaction.id;
});
```

### 4. Virtualize Long Lists
Install `react-window` for large transaction lists:
```bash
npm install react-window
```

### 5. Code Splitting
Let Vite handle this automatically - it's built-in!

## Testing

Add testing with Vitest and React Testing Library:

```bash
npm install -D vitest @testing-library/react @testing-library/user-event
```

Example test:
```typescript
import { render, screen } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';

test('displays total balance', () => {
  render(<Dashboard />);
  expect(screen.getByText('Total Balance')).toBeInTheDocument();
});
```

## Debugging

### 1. React DevTools
Install React DevTools browser extension to inspect components.

### 2. React Query DevTools
Add for debugging:
```bash
npm install @tanstack/react-query-devtools
```

```typescript
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

### 3. Browser DevTools
- **Console** - Check for errors
- **Application → LocalStorage** - Inspect saved data
- **Network** - Check if API calls are made
- **Performance** - Profile render times

## Building & Deployment

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

Output in `dist/` folder.

### Preview Production Build
```bash
npm run preview
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
Drag `dist/` folder to Netlify drop zone, or:
```bash
npm install -g netlify-cli
netlify deploy
```

## Environment Variables

Create `.env.local`:
```
VITE_API_URL=https://api.example.com
VITE_GOOGLE_CLIENT_ID=your_client_id
```

Use in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL;
```

## Common Issues & Solutions

### Issue: State not persisting
**Solution**: Check localStorage in DevTools → Application tab

### Issue: Queries not updating
**Solution**: Ensure queryClient.invalidateQueries is called in mutation callbacks

### Issue: Styles not applying
**Solution**: Check if Tailwind classes are spelled correctly and in purge config

### Issue: TypeScript errors
**Solution**: Run `npm run build` to see actual errors, not just IDE warnings

## Contributing Guidelines

1. Create a feature branch: `git checkout -b feature/invoice-support`
2. Make changes following the architecture
3. Test your changes locally
4. Update README if needed
5. Commit with clear messages: `git commit -m "feat: add invoice support"`

## Resources

- [React Documentation](https://react.dev)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Recharts Documentation](https://recharts.org)
- [Vite Documentation](https://vitejs.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
