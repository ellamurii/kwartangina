# Kwartangina - Quick Start Guide

## 🚀 Getting Started in 2 Minutes

### 1. Start the Dev Server
```bash
cd /Users/ellamurii/Desktop/Dev/kwartangina
npm run dev
```

The app will open at `http://localhost:3000`

### 2. Default Data Loaded Automatically
When you first open the app, sample accounts and categories are pre-loaded:

**Accounts:**
- Checking: $5,000
- Savings: $10,000
- Credit Card: $2,500

**Income Categories:**
- Salary
- Bonus
- Freelance

**Expense Categories:**
- Food & Dining
- Transportation
- Shopping
- Entertainment
- Utilities
- Health

### 3. Try These Actions

#### Add a Transaction
1. Go to **Transactions** tab
2. Click "Add Transaction"
3. Fill in: Type (Expense), Account (Checking), Category (Food & Dining), Amount (25.50)
4. Click "Add Transaction"
5. Watch the account balance update!

#### View Analytics
1. Go to **Dashboard**
2. See summary cards updating with your transaction
3. Try different time periods (Week/Month/Year)
4. Use custom date range picker

#### Set a Budget
1. Go to **Budgets** tab
2. Click "Set Budget"
3. Select category and enter amount (e.g., $500 for Food & Dining)
4. Click "Create Budget"
5. Watch the progress bar as you add expenses

#### Export Your Data
1. Go to **Settings**
2. Click "Export Data"
3. Your financial data downloads as JSON

## 📁 Project Files to Know

### Main Pages
- `src/pages/Dashboard.tsx` - Charts and summary
- `src/pages/Transactions.tsx` - Transaction management
- `src/pages/Budgets.tsx` - Budget tracking
- `src/pages/Settings.tsx` - Data import/export

### Core Logic
- `src/lib/database.ts` - All data operations (create, read, update, delete)
- `src/hooks/useData.ts` - React Query hooks for data fetching
- `src/utils/analyticsUtils.ts` - Chart data generation
- `src/utils/dateUtils.ts` - Date manipulation helpers

## 🎨 Customization Tips

### Add New Expense Category
Edit `src/lib/database.ts` in the `createDefaultCategories()` function:

```javascript
{
  id: 'cat_XX',
  name: 'Your Category',
  type: 'expense',
  icon: '🎯',
  color: '#your-color'
}
```

### Change Colors
Update `tailwind.config.js`:
```javascript
colors: {
  primary: '#2563eb',      // Button color
  secondary: '#10b981',    // Success color
  danger: '#ef4444',       // Error color
}
```

### Modify Starting Balance
Edit `src/lib/database.ts` in `createDefaultAccounts()`:
```javascript
balance: 5000  // Change this number
```

## 🔧 Build for Production

```bash
# Build optimized version
npm run build

# Preview production build locally
npm run preview
```

Output will be in `dist/` folder ready to deploy.

## 📊 Supported Features

✅ Multiple account types
✅ Transaction tracking with categories
✅ Budget management with alerts
✅ Beautiful charts and analytics
✅ Weekly/Monthly/Yearly views
✅ Custom date ranges
✅ Data export/import
✅ Local data persistence
✅ Mobile responsive

## 🚫 Known Limitations (For Now)

- ⏳ No Google Drive sync yet
- 🔐 No user authentication
- 🔄 No real-time sync across devices
- 📱 No native mobile app yet

These are planned for future releases!

## 🐛 Troubleshooting

### Port 3000 Already in Use?
```bash
# Kill the process on port 3000
lsof -ti:3000 | xargs kill -9

# Then run dev again
npm run dev
```

### Data Not Saving?
- Check browser console (F12) for errors
- Clear browser cache and reload
- Try exporting data and deleting all to reset

### Slow Performance?
- Clear localStorage in browser dev tools
- Restart dev server
- Try building and previewing production version

## 📚 Learning Resources

- [React Docs](https://react.dev)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Recharts Docs](https://recharts.org)

## 🎯 Next Steps

1. ✅ Explore the Dashboard and add some test transactions
2. ✅ Try all the features (Budgets, Export, etc.)
3. ✅ Customize colors, categories, and default amounts
4. ✅ Read through the code to understand the structure
5. ✅ Plan your enhancements or features

Happy tracking! 💰
