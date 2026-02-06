import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

export interface DatabaseStore {
  accounts: Record<string, any>;
  categories: Record<string, any>;
  transactions: Record<string, any>;
  budgets: Record<string, any>;
}

let idCounter = 0;

function generateUniqueId(prefix: string): string {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

class Database {
  private db: SqlJsDatabase | null = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (file === "sql-wasm.wasm") {
            return wasmUrl;
          }
          return file;
        },
      });
      const stored = localStorage.getItem("kwartangina_db");

      if (stored) {
        try {
          // Convert base64 string to Uint8Array
          const binaryString = atob(stored);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          this.db = new SQL.Database(bytes);
          // Always update schema to ensure we have the latest structure
          this.updateSchema();
        } catch (decodeError) {
          // If decoding fails, clear the corrupted data and create new database
          console.warn(
            "Stored database data is corrupted, creating new database:",
            decodeError,
          );
          localStorage.removeItem("kwartangina_db");
          this.db = new SQL.Database();
          this.createTables();
        }
      } else {
        this.db = new SQL.Database();
        this.createTables();
      }

      this.initializeDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize SQLite database:", error);
    }
  }

  private createTables() {
    if (!this.db) return;

    // Create accounts table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL NOT NULL,
        currency TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME
      )
    `);

    // Create categories table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Drop and recreate transactions table to ensure schema is up to date
    this.db.run("DROP TABLE IF EXISTS transactions");
    this.db.run(`
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY,
        accountId TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        date DATETIME NOT NULL,
        toAccountId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME,
        FOREIGN KEY (accountId) REFERENCES accounts(id),
        FOREIGN KEY (categoryId) REFERENCES categories(id),
        FOREIGN KEY (toAccountId) REFERENCES accounts(id)
      )
    `);

    // Drop and recreate budgets table
    this.db.run("DROP TABLE IF EXISTS budgets");
    this.db.run(`
      CREATE TABLE budgets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        limitAmount REAL NOT NULL,
        period TEXT NOT NULL,
        startDate DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoryId) REFERENCES categories(id)
      )
    `);

    this.saveToLocalStorage();
  }

  private updateSchema() {
    if (!this.db) return;

    // Check if toAccountId column exists in transactions table
    try {
      const result = this.db.exec("PRAGMA table_info(transactions)");
      if (result.length > 0) {
        const columns = result[0].values.map(row => row[1]); // column name is at index 1
        if (!columns.includes('toAccountId')) {
          // Column doesn't exist, we need to recreate the table
          // First, backup existing transactions
          const backupResult = this.db.exec('SELECT * FROM transactions');
          const transactions = this.mapRowsToObjects(backupResult);
          
          // Drop and recreate transactions table
          this.db.run('DROP TABLE IF EXISTS transactions');
          this.db.run(`
            CREATE TABLE transactions (
              id TEXT PRIMARY KEY,
              accountId TEXT NOT NULL,
              categoryId TEXT NOT NULL,
              type TEXT NOT NULL,
              amount REAL NOT NULL,
              description TEXT,
              date DATETIME NOT NULL,
              toAccountId TEXT,
              createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
              updatedAt DATETIME,
              FOREIGN KEY (accountId) REFERENCES accounts(id),
              FOREIGN KEY (categoryId) REFERENCES categories(id),
              FOREIGN KEY (toAccountId) REFERENCES accounts(id)
            )
          `);
          
          // Restore transactions
          for (const txn of transactions) {
            this.db.run(
              'INSERT INTO transactions (id, accountId, categoryId, type, amount, description, date, toAccountId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [txn.id, txn.accountId, txn.categoryId, txn.type, txn.amount, txn.description || '', txn.date, null, txn.createdAt, txn.updatedAt]
            );
          }
          
          console.log('✓ Updated transactions table schema with toAccountId column');
        }
      }
    } catch (err) {
      console.log('Note: Could not update schema:', err);
    }

    this.saveToLocalStorage();
  }

  private async waitForInitialization() {
    while (!this.initialized) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  private saveToLocalStorage() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      // Use a more reliable method to convert Uint8Array to base64
      let binary = "";
      const bytes = new Uint8Array(data);
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const encoded = btoa(binary);
      localStorage.setItem("kwartangina_db", encoded);
    } catch (error) {
      console.error("Failed to save database to localStorage:", error);
    }
  }

  private initializeDefaultData() {
    if (!this.db) return;

    // Check if data was intentionally cleared (don't recreate defaults)
    if (localStorage.getItem("kwartangina_cleared")) {
      return;
    }

    const result = this.db.exec("SELECT COUNT(*) as count FROM accounts");
    if (result.length > 0 && result[0].values.length > 0) {
      const count = result[0].values[0][0];
      if (typeof count === "number" && count > 0) {
        return;
      }
    }

    this.createDefaultAccounts();
    this.createDefaultCategories();
  }

  private createDefaultAccounts() {
    if (!this.db) return;

    const defaultAccounts = [
      {
        id: "acc_1",
        name: "Checking",
        type: "checking",
        balance: 5000,
        currency: "USD",
      },
      {
        id: "acc_2",
        name: "Savings",
        type: "savings",
        balance: 10000,
        currency: "USD",
      },
      {
        id: "acc_3",
        name: "Credit Card",
        type: "credit_card",
        balance: 2500,
        currency: "USD",
      },
    ];

    defaultAccounts.forEach((acc) => {
      this.db!.run(
        "INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)",
        [acc.id, acc.name, acc.type, acc.balance, acc.currency],
      );
    });
    this.saveToLocalStorage();
  }

  private createDefaultCategories() {
    if (!this.db) return;

    const defaultCategories = [
      {
        id: "cat_1",
        name: "Salary",
        type: "income",
        icon: "💰",
        color: "#10b981",
      },
      {
        id: "cat_2",
        name: "Bonus",
        type: "income",
        icon: "🎉",
        color: "#10b981",
      },
      {
        id: "cat_3",
        name: "Freelance",
        type: "income",
        icon: "💻",
        color: "#10b981",
      },
      {
        id: "cat_4",
        name: "Food & Dining",
        type: "expense",
        icon: "🍔",
        color: "#ef4444",
      },
      {
        id: "cat_5",
        name: "Transportation",
        type: "expense",
        icon: "🚗",
        color: "#ef4444",
      },
      {
        id: "cat_6",
        name: "Shopping",
        type: "expense",
        icon: "🛍️",
        color: "#ef4444",
      },
      {
        id: "cat_7",
        name: "Entertainment",
        type: "expense",
        icon: "🎬",
        color: "#ef4444",
      },
      {
        id: "cat_8",
        name: "Utilities",
        type: "expense",
        icon: "💡",
        color: "#ef4444",
      },
      {
        id: "cat_9",
        name: "Health",
        type: "expense",
        icon: "🏥",
        color: "#ef4444",
      },
      {
        id: "cat_10",
        name: "Transfer Out",
        type: "transfer",
        icon: "➡️",
        color: "#3b82f6",
      },
    ];

    defaultCategories.forEach((cat) => {
      this.db!.run(
        "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
        [cat.id, cat.name, cat.type, cat.icon, cat.color],
      );
    });
    this.saveToLocalStorage();
  }

  // Account operations
  async getAccounts() {
    await this.waitForInitialization();
    if (!this.db) return [];
    const result = this.db.exec("SELECT * FROM accounts");
    const accounts = this.mapRowsToObjects(result);
    
    // Recalculate balance for each account based on transactions up to end of current month
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0); // Last day of current month
    endOfMonth.setHours(23, 59, 59, 999);
    const endOfMonthISO = endOfMonth.toISOString();
    
    for (const account of accounts) {
      // Get all transactions for this account up to end of month
      const txnResult = this.db!.exec(
        "SELECT type, amount FROM transactions WHERE accountId = ? AND date <= ? ORDER BY date",
        [account.id, endOfMonthISO]
      );
      
      if (txnResult.length > 0 && txnResult[0].values.length > 0) {
        let balance = 0;
        
        for (const row of txnResult[0].values) {
          const type = row[0] as string;
          const amount = row[1] as number;
          
          if (type === 'income') {
            balance += amount;
          } else if (type === 'expense') {
            balance -= amount;
          }
        }
        
        // Round to 2 decimal places to avoid floating point errors
        account.balance = Math.round(balance * 100) / 100;
      } else {
        account.balance = 0;
      }
    }
    
    return accounts;
  }

  async getAccount(id: string) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const result = this.db.exec("SELECT * FROM accounts WHERE id = ?", [id]);
    const rows = this.mapRowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  }

  async createAccount(account: any) {
    await this.waitForInitialization();
    if (!this.db) return null;
    // Clear the "cleared" flag when user creates new data
    localStorage.removeItem("kwartangina_cleared");
    const id = generateUniqueId("acc");
    this.db.run(
      "INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)",
      [id, account.name, account.type, account.balance, account.currency],
    );
    this.saveToLocalStorage();
    return this.getAccount(id);
  }

  async updateAccount(id: string, updates: any) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const current = await this.getAccount(id);
    if (!current) return null;

    const updated = { ...current, ...updates };
    this.db.run(
      "UPDATE accounts SET name = ?, type = ?, balance = ?, currency = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [updated.name, updated.type, updated.balance, updated.currency, id],
    );
    this.saveToLocalStorage();
    return this.getAccount(id);
  }

  async deleteAccount(id: string) {
    await this.waitForInitialization();
    if (!this.db) return;
    this.db.run("DELETE FROM accounts WHERE id = ?", [id]);
    this.saveToLocalStorage();
  }

  // Category operations
  async getCategories() {
    await this.waitForInitialization();
    if (!this.db) return [];
    const result = this.db.exec("SELECT * FROM categories");
    return this.mapRowsToObjects(result);
  }

  async getCategoriesByType(type: string) {
    await this.waitForInitialization();
    if (!this.db) return [];
    const result = this.db.exec("SELECT * FROM categories WHERE type = ?", [
      type,
    ]);
    return this.mapRowsToObjects(result);
  }

  async createCategory(category: any) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const id = generateUniqueId("cat");
    this.db.run(
      "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
      [id, category.name, category.type, category.icon, category.color],
    );
    this.saveToLocalStorage();
    return this.getCategory(id);
  }

  async getCategory(id: string) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const result = this.db.exec("SELECT * FROM categories WHERE id = ?", [id]);
    const rows = this.mapRowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  }

  async deleteCategory(id: string) {
    await this.waitForInitialization();
    if (!this.db) return;
    this.db.run("DELETE FROM categories WHERE id = ?", [id]);
    this.saveToLocalStorage();
  }

  // Transaction operations
  async getTransactions(filters?: {
    accountId?: string;
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    await this.waitForInitialization();
    if (!this.db) return [];

    let query = "SELECT * FROM transactions WHERE 1=1";
    const params: any[] = [];

    if (filters?.accountId) {
      query += " AND accountId = ?";
      params.push(filters.accountId);
    }
    if (filters?.categoryId) {
      query += " AND categoryId = ?";
      params.push(filters.categoryId);
    }
    if (filters?.startDate) {
      query += " AND date >= ?";
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      // User explicitly filtered - respect their choice
      query += " AND date <= ?";
      params.push(filters.endDate.toISOString());
    } else {
      // No explicit endDate filter - show transactions up to end of current month
      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0); // Last day of current month
      endOfMonth.setHours(23, 59, 59, 999);
      query += " AND date <= ?";
      params.push(endOfMonth.toISOString());
    }

    query += " ORDER BY date DESC";

    const result = this.db.exec(query, params);
    const mapped = this.mapRowsToObjects(result);
    console.log(`[DB] getTransactions returned ${mapped.length} transactions`, { query, filters, sampleDates: mapped.slice(0, 3).map((t: any) => t.date) });
    return mapped;
  }

  async createTransaction(transaction: any) {
    await this.waitForInitialization();
    if (!this.db) return null;

    const id = generateUniqueId("txn");
    this.db.run(
      "INSERT INTO transactions (id, accountId, categoryId, type, amount, description, date, toAccountId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        transaction.accountId,
        transaction.categoryId,
        transaction.type,
        transaction.amount,
        transaction.description || "",
        transaction.date.toISOString(),
        transaction.toAccountId || null,
      ],
    );

    // Update account balance
    const account = await this.getAccount(transaction.accountId);
    if (account) {
      let newBalance = account.balance;
      if (transaction.type === "income") {
        newBalance += transaction.amount;
      } else if (transaction.type === "expense") {
        newBalance -= transaction.amount;
      }
      await this.updateAccount(transaction.accountId, { balance: newBalance });
    }

    // If this is a transfer, update the destination account balance
    if (transaction.toAccountId) {
      const toAccount = await this.getAccount(transaction.toAccountId);
      if (toAccount) {
        let newBalance = toAccount.balance;
        // Transfer OUT from source = expense (already handled above)
        // Transfer IN to destination = add the amount
        if (transaction.type === "expense") {
          newBalance += transaction.amount;
        }
        await this.updateAccount(transaction.toAccountId, {
          balance: newBalance,
        });
      }
    }

    this.saveToLocalStorage();
    return this.getTransaction(id);
  }

  async createTransactionsBulk(transactions: any[]) {
    await this.waitForInitialization();
    if (!this.db) return 0;
    if (!transactions.length) return 0;

    const accounts = await this.getAccounts();
    const accountBalances: Record<string, number> = {};
    accounts.forEach((account: any) => {
      accountBalances[account.id] = account.balance || 0;
    });

    const balanceDeltas: Record<string, number> = {};

    try {
      this.db.run("BEGIN");
      const stmt = this.db.prepare(
        "INSERT INTO transactions (id, accountId, categoryId, type, amount, description, date, toAccountId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      );

      let count = 0;
      for (const transaction of transactions) {
        const id = generateUniqueId("txn");
        stmt.run([
          id,
          transaction.accountId,
          transaction.categoryId,
          transaction.type,
          transaction.amount,
          transaction.description || "",
          transaction.date.toISOString(),
          transaction.toAccountId || null,
        ]);

        count++;

        if (transaction.type === "income") {
          balanceDeltas[transaction.accountId] =
            (balanceDeltas[transaction.accountId] || 0) + transaction.amount;
        } else if (transaction.type === "expense") {
          balanceDeltas[transaction.accountId] =
            (balanceDeltas[transaction.accountId] || 0) - transaction.amount;
        }

        // Note: transfer destination balance is handled by the reverse
        // transaction we create during migration. Avoid double-counting here.
      }

      stmt.free();

      Object.entries(balanceDeltas).forEach(([accountId, delta]) => {
        const currentBalance = accountBalances[accountId] || 0;
        const newBalance = currentBalance + delta;
        this.db?.run(
          "UPDATE accounts SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
          [newBalance, accountId]
        );
      });

      this.db.run("COMMIT");
      this.saveToLocalStorage();
      return count;
    } catch (err) {
      try {
        this.db.run("ROLLBACK");
      } catch {
        // ignore rollback errors
      }
      throw err;
    }
  }

  async getTransaction(id: string) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const result = this.db.exec("SELECT * FROM transactions WHERE id = ?", [
      id,
    ]);
    const rows = this.mapRowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  }

  async updateTransaction(id: string, updates: any) {
    await this.waitForInitialization();
    if (!this.db) return null;

    const current = await this.getTransaction(id);
    if (!current) return null;

    const updated = { ...current, ...updates };
    this.db.run(
      "UPDATE transactions SET accountId = ?, categoryId = ?, type = ?, amount = ?, description = ?, date = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?",
      [
        updated.accountId,
        updated.categoryId,
        updated.type,
        updated.amount,
        updated.description || "",
        updated.date,
        id,
      ],
    );
    this.saveToLocalStorage();
    return this.getTransaction(id);
  }

  async deleteTransaction(id: string) {
    await this.waitForInitialization();
    if (!this.db) return;

    const txn = await this.getTransaction(id);
    if (txn) {
      // Reverse account balance
      const account = await this.getAccount(txn.accountId);
      if (account) {
        let newBalance = account.balance;
        if (txn.type === "income") {
          newBalance -= txn.amount;
        } else if (txn.type === "expense") {
          newBalance += txn.amount;
        }
        await this.updateAccount(txn.accountId, { balance: newBalance });
      }
    }

    this.db.run("DELETE FROM transactions WHERE id = ?", [id]);
    this.saveToLocalStorage();
  }

  // Budget operations
  async getBudgets() {
    await this.waitForInitialization();
    if (!this.db) return [];
    const result = this.db.exec("SELECT * FROM budgets");
    return this.mapRowsToObjects(result);
  }

  async createBudget(budget: any) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const id = generateUniqueId("bud");
    this.db.run(
      "INSERT INTO budgets (id, name, categoryId, limitAmount, period, startDate) VALUES (?, ?, ?, ?, ?, ?)",
      [
        id,
        budget.name,
        budget.categoryId,
        budget.limit || budget.limitAmount,
        budget.period,
        budget.startDate?.toISOString() || new Date().toISOString(),
      ],
    );
    this.saveToLocalStorage();
    return this.getBudget(id);
  }

  async getBudget(id: string) {
    await this.waitForInitialization();
    if (!this.db) return null;
    const result = this.db.exec("SELECT * FROM budgets WHERE id = ?", [id]);
    const rows = this.mapRowsToObjects(result);
    return rows.length > 0 ? rows[0] : null;
  }

  async updateBudget(id: string, updates: any) {
    await this.waitForInitialization();
    if (!this.db) return null;

    const current = await this.getBudget(id);
    if (!current) return null;

    const updated = { ...current, ...updates };
    this.db.run(
      "UPDATE budgets SET name = ?, categoryId = ?, limitAmount = ?, period = ?, startDate = ? WHERE id = ?",
      [
        updated.name,
        updated.categoryId,
        updated.limitAmount || updated.limit,
        updated.period,
        updated.startDate,
        id,
      ],
    );
    this.saveToLocalStorage();
    return this.getBudget(id);
  }

  async deleteBudget(id: string) {
    await this.waitForInitialization();
    if (!this.db) return;
    this.db.run("DELETE FROM budgets WHERE id = ?", [id]);
    this.saveToLocalStorage();
  }

  // Utility methods
  private mapRowsToObjects(result: any[]): any[] {
    if (result.length === 0) return [];

    const columns = result[0].columns;
    return result[0].values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, idx: number) => {
        obj[col] = row[idx];
      });
      return obj;
    });
  }

  async exportData() {
    await this.waitForInitialization();
    if (!this.db) return "";

    const accounts = await this.getAccounts();
    const categories = await this.getCategories();
    const transactions = await this.getTransactions();
    const budgets = await this.getBudgets();

    return JSON.stringify(
      { accounts, categories, transactions, budgets },
      null,
      2,
    );
  }

  async importData(data: string) {
    try {
      await this.waitForInitialization();
      const parsed = JSON.parse(data);
      if (!this.db) return false;

      // Clear existing data
      this.db.run("DELETE FROM transactions");
      this.db.run("DELETE FROM budgets");
      this.db.run("DELETE FROM categories");
      this.db.run("DELETE FROM accounts");

      // Import accounts
      if (parsed.accounts) {
        for (const acc of parsed.accounts) {
          this.db.run(
            "INSERT INTO accounts (id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?)",
            [acc.id, acc.name, acc.type, acc.balance, acc.currency],
          );
        }
      }

      // Import categories
      if (parsed.categories) {
        for (const cat of parsed.categories) {
          this.db.run(
            "INSERT INTO categories (id, name, type, icon, color) VALUES (?, ?, ?, ?, ?)",
            [cat.id, cat.name, cat.type, cat.icon, cat.color],
          );
        }
      }

      // Import transactions
      if (parsed.transactions) {
        for (const txn of parsed.transactions) {
          this.db.run(
            "INSERT INTO transactions (id, accountId, categoryId, type, amount, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
              txn.id,
              txn.accountId,
              txn.categoryId,
              txn.type,
              txn.amount,
              txn.description || "",
              txn.date,
            ],
          );
        }
      }

      // Import budgets
      if (parsed.budgets) {
        for (const bud of parsed.budgets) {
          this.db.run(
            "INSERT INTO budgets (id, name, categoryId, limit, period, startDate) VALUES (?, ?, ?, ?, ?, ?)",
            [
              bud.id,
              bud.name,
              bud.categoryId,
              bud.limit,
              bud.period,
              bud.startDate,
            ],
          );
        }
      }

      this.saveToLocalStorage();
      return true;
    } catch {
      return false;
    }
  }

  async clearAll() {
    await this.waitForInitialization();
    if (!this.db) return;
    this.db.run("DELETE FROM transactions");
    this.db.run("DELETE FROM budgets");
    this.db.run("DELETE FROM categories");
    this.db.run("DELETE FROM accounts");
    this.saveToLocalStorage();
    // Set flag to prevent default data recreation on reload
    localStorage.setItem("kwartangina_cleared", "true");
  }
}

// Create singleton instance
export const db = new Database();
