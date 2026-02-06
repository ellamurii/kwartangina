# Kwartangina - Finance Manager

A beautiful, mobile-first web application for managing your personal finances. Track income, expenses, transfers, savings, and credit card transactions with powerful visualizations and budgeting tools.

## Features

✨ **Core Features**
- 📊 **Dashboard** - Overview of your financial summary with beautiful charts
- 💰 **Expense Tracking** - Track daily expenses across multiple categories
- 📈 **Income Management** - Monitor income from various sources
- 💳 **Account Management** - Manage checking, savings, and credit card accounts
- 🎯 **Budget Planning** - Set budgets for categories with visual progress tracking
- 🔄 **Account Transfers** - Transfer money between accounts
- 💾 **Savings Goals** - Track and manage savings goals

📊 **Analytics & Visualization**
- Monthly, weekly, and annual income/expense charts
- Expense breakdown by category with pie charts
- Net income trend analysis
- Budget vs actual spending comparison
- Custom date range analysis

💾 **Data Management**
- Local data persistence using browser storage
- Export financial data as JSON
- Import data from backup files
- Clear all data option with confirmation
- Future support for Google Drive sync

📱 **User Experience**
- Fully responsive mobile-first design
- Clean, intuitive interface
- Dark/Light theme support (coming soon)
- Smooth animations and transitions
- Optimized for all screen sizes

## Tech Stack

- **Frontend Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: TanStack Query (React Query)
- **Routing**: TanStack Router
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Database**: Browser LocalStorage (SQLite coming soon)

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app will be available at `http://localhost:3000`

## Project Structure

```
kwartangina/
├── src/
│   ├── components/        # Reusable UI components
│   ├── pages/            # Page components
│   │   ├── RootLayout.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Transactions.tsx
│   │   ├── Budgets.tsx
│   │   └── Settings.tsx
│   ├── hooks/            # Custom React hooks
│   │   └── useData.ts    # Data management hooks
│   ├── lib/              # Library utilities
│   │   ├── database.ts   # Database operations
│   │   └── router.tsx    # TanStack Router setup
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/            # Utility functions
│   │   ├── dateUtils.ts  # Date manipulation
│   │   └── analyticsUtils.ts  # Data analysis
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── public/               # Static assets
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Key Components

### Dashboard
- Summary cards showing total balance, income, expenses, and net
- Interactive charts for income/expense analysis
- Account overview
- Customizable date range filters

### Transactions
- Add, edit, and delete transactions
- Filter by type and account
- View transaction history with details
- Support for multiple transaction types

### Budgets
- Create budgets for expense categories
- Visual progress tracking with color-coded indicators
- Budget period selection (weekly, monthly, yearly)
- Remaining budget calculations

### Settings
- Export financial data as JSON file
- Import data from backup files
- Clear all data with confirmation
- Future integration with Google Drive sync

## Usage

### Adding a Transaction

1. Navigate to **Transactions** tab
2. Click "Add Transaction"
3. Select transaction type (Income/Expense/Transfer/Savings)
4. Choose account and category
5. Enter amount, date, and description
6. Click "Add Transaction"

### Setting a Budget

1. Navigate to **Budgets** tab
2. Click "Set Budget"
3. Select expense category
4. Enter budget amount
5. Choose period (Weekly/Monthly/Yearly)
6. Click "Create Budget"

### Viewing Analytics

1. Go to **Dashboard**
2. Select time period (Week/Month/Year)
3. Use custom date range if needed
4. View charts and statistics

### Exporting Data

1. Navigate to **Settings**
2. Click "Export Data"
3. Your financial data will be downloaded as JSON

## Data Structure

### Accounts
```typescript
{
  id: string;
  name: string;
  type: 'checking' | 'savings' | 'credit_card' | 'investment';
  balance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Transactions
```typescript
{
  id: string;
  accountId: string;
  categoryId: string;
  type: 'income' | 'expense' | 'transfer' | 'savings' | 'credit_card';
  amount: number;
  description: string;
  date: Date;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Categories
```typescript
{
  id: string;
  name: string;
  type: 'income' | 'expense' | 'transfer';
  icon?: string;
  color?: string;
  createdAt: Date;
}
```

## Future Enhancements

- 🔐 User authentication and cloud sync
- ☁️ Google Drive integration
- 📲 Mobile app (React Native)
- 🌓 Dark mode
- 💬 Multi-language support
- 📱 PWA support for offline access
- 🔔 Notifications for budget alerts
- 📊 Advanced reporting and tax summaries
- 🎓 Financial insights and recommendations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### TypeScript Configuration

Unused variables are treated as warnings (not errors) to prevent development friction. This can be adjusted in `tsconfig.app.json` if needed.

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
