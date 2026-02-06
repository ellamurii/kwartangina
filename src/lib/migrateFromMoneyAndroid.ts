import initSqlJs from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { db } from './database';
import { getCurrencyInfo } from './currency';

let idCounter = 0;

/**
 * Generate unique IDs with timestamp and counter to avoid collisions
 */
function generateUniqueId(prefix: string): string {
  idCounter++;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

interface MoneyAndroidAsset {
  uid: string;
  NIC_NAME: string;
  currencyUid: string;
  [key: string]: any;
}

interface MoneyAndroidCategory {
  uid: string;
  NAME: string;
  TYPE: number;
  [key: string]: any;
}

interface MoneyAndroidTransaction {
  uid: string;
  assetUid: string;
  ctgUid: string;
  ZMONEY: string;
  ZDATE: string;
  DO_TYPE: string;
  ZCONTENT: string;
  [key: string]: any;
}

interface MoneyAndroidBudget {
  uid: string;
  targetUid: string;
  PERIOD_TYPE: number;
  [key: string]: any;
}

/**
 * Migrate data from Money Android SQLite database to Kwartangina SQLite
 */
export async function migrateFromMoneyAndroid(
  androidDbFile: File,
  onProgress?: (progress: { current: number; total: number; status: string }) => void,
  abortSignal?: AbortSignal
): Promise<{ success: boolean; message: string; stats?: { accounts: number; categories: number; transactions: number; budgets: number } }> {
  try {
    if (abortSignal?.aborted) {
      return {
        success: false,
        message: 'Migration was cancelled',
      };
    }

    if (!androidDbFile.name.toLowerCase().endsWith('.sqlite') && !androidDbFile.name.toLowerCase().endsWith('.db')) {
      return {
        success: false,
        message: 'Invalid file format. Please select a .sqlite or .db file.',
      };
    }

    const arrayBuffer = await androidDbFile.arrayBuffer();
    
    if (arrayBuffer.byteLength < 16) {
      return {
        success: false,
        message: 'File is too small to be a valid SQLite database.',
      };
    }

    const header = new Uint8Array(arrayBuffer.slice(0, 16));
    const headerStr = new TextDecoder().decode(header.slice(0, 13));
    if (headerStr !== 'SQLite format') {
      return {
        success: false,
        message: 'File does not appear to be a valid SQLite database.',
      };
    }

    const SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (file === 'sql-wasm.wasm') {
          return wasmUrl;
        }
        return file;
      },
    });
    const androidDb = new SQL.Database(new Uint8Array(arrayBuffer));

    const stats = {
      accounts: 0,
      categories: 0,
      transactions: 0,
      budgets: 0,
    };

    console.log('Clearing existing data...');
    await db.clearAll();
    
    idCounter = 0;

    console.log('Starting migration...');
    console.log('Migrating assets (accounts)...');
    const assetsResult = androidDb.exec(
      'SELECT uid, NIC_NAME, currencyUid, ID, ZDATA, groupUid FROM ASSETS WHERE uid IS NOT NULL AND ZDATA = \'0\''
    );
    
    const assetUidToNewId: Record<string, string> = {};
    const assetUidToType: Record<string, 'checking' | 'credit_card'> = {};
    
    if (assetsResult.length > 0) {
      const columns = assetsResult[0].columns;  
      const rows = assetsResult[0].values;

      for (const row of rows) {
        const asset: any = {};
        columns.forEach((col, idx) => {
          asset[col] = row[idx];
        });

        try {
          const currencyInfo = getCurrencyInfo(asset.currencyUid);
          const isCreditCard = String(asset.groupUid) === '2';
          const accountType: 'checking' | 'credit_card' = isCreditCard ? 'credit_card' : 'checking';
          const newAccount = await db.createAccount({
            name: asset.NIC_NAME || 'Unnamed Account',
            type: accountType,
            balance: 0,
            currency: currencyInfo.code,
          });
          
          if (newAccount?.id) {
            assetUidToNewId[asset.uid] = newAccount.id;
            assetUidToType[asset.uid] = accountType;
            console.log(`✓ Created account: ${asset.NIC_NAME} (currency: ${currencyInfo.code} ${currencyInfo.symbol})`);
          }
          stats.accounts++;
        } catch (err) {
          console.error(`✗ Failed to create account ${asset.NIC_NAME}:`, err);
        }
      }
    }
    console.log('Account mapping:', assetUidToNewId);

    console.log('Migrating categories...');
    const categoriesResult = androidDb.exec(
      'SELECT uid, NAME, TYPE FROM ZCATEGORY WHERE uid IS NOT NULL AND C_IS_DEL != 1'
    );

    const categoryMapping: Record<string, string> = {};

    if (categoriesResult.length > 0) {
      const columns = categoriesResult[0].columns;
      const rows = categoriesResult[0].values;

      for (const row of rows) {
        const category: any = {};
        columns.forEach((col, idx) => {
          category[col] = row[idx];
        });

        const categoryType = category.TYPE === 0 ? 'income' : 'expense';
        try {
          const newCategory = await db.createCategory({
            name: category.NAME || 'Uncategorized',
            type: categoryType,
            icon: '📁',
            color: categoryType === 'income' ? '#10b981' : '#ef4444',
          });

          if (newCategory?.id) {
            categoryMapping[category.uid] = newCategory.id;
            console.log(`Created category: ${category.NAME} (${category.uid} -> ${newCategory.id})`);
          }
          stats.categories++;
        } catch (err) {
          console.error(`Failed to create category ${category.NAME}:`, err);
        }
      }
    }

    let transferCategoryId = '';
    let uncategorizedCategoryId = '';
    try {
      const transferCategory = await db.createCategory({
        name: 'Transfer',
        type: 'expense',
        icon: '➡️',
        color: '#3b82f6',
      });
      if (transferCategory?.id) {
        transferCategoryId = transferCategory.id;
      }
    } catch (err) {
      console.error('Failed to create Transfer category:', err);
    }

    try {
      const uncategorizedCategory = await db.createCategory({
        name: 'Uncategorized',
        type: 'expense',
        icon: '📝',
        color: '#8b5cf6',
      });
      if (uncategorizedCategory?.id) {
        uncategorizedCategoryId = uncategorizedCategory.id;
      }
    } catch (err) {
      console.error('Failed to create Uncategorized category:', err);
    }

    const accountsFromDb = await db.getAccounts();
    const accountIdToName: Record<string, string> = {};
    accountsFromDb.forEach((acc) => {
      accountIdToName[acc.id] = acc.name;
    });

    console.log('Migrating transactions...');
    console.log('Using account mapping:', assetUidToNewId);
    const transactionsResult = androidDb.exec(
      `SELECT uid, assetUid, toAssetUid, ctgUid, ZMONEY, ZDATE, DO_TYPE, ZCONTENT, CATEGORY_NAME, ASSET_NIC
       FROM INOUTCOME 
       WHERE uid IS NOT NULL`
    );

    if (transactionsResult.length > 0) {
      const columns = transactionsResult[0].columns;
      const rows = transactionsResult[0].values;
      console.log(`Found ${rows.length} transactions to migrate`);
      
      // Pre-fetch all categories to avoid querying in the loop
      const allCategories = await db.getCategories();
      const categoryMap: Record<string, any> = {};
      allCategories.forEach((c: any) => {
        categoryMap[c.id] = c;
      });

      // First pass: parse all transactions and build transaction objects
      const transactionsToCreate: Array<{ main: any; reverse?: any }> = [];
      const BATCH_SIZE = 100;
      let skippedCount = 0;
      const missingAccounts = new Set();
      const missingCategories = new Set();

      console.log('Parsing transactions...');
      for (const row of rows) {
        const txn: any = {};
        columns.forEach((col, idx) => {
          txn[col] = row[idx];
        });

        // Skip DO_TYPE 4 transfers (will be created from DO_TYPE 3)
        if (txn.DO_TYPE === '4' && txn.toAssetUid && assetUidToNewId[txn.toAssetUid]) {
          continue;
        }

        let accountId: string | null = null;
        if (txn.assetUid && assetUidToNewId[txn.assetUid]) {
          accountId = assetUidToNewId[txn.assetUid];
        }

        let categoryId: string | null = null;
        if (txn.ctgUid && categoryMapping[txn.ctgUid]) {
          categoryId = categoryMapping[txn.ctgUid];
        }

        let toAccountId: string | null = null;
        if (txn.DO_TYPE === '3' && txn.toAssetUid && assetUidToNewId[txn.toAssetUid]) {
          toAccountId = assetUidToNewId[txn.toAssetUid];
        }

        // Assign category: transfer category for transfers, uncategorized for others
        if (!categoryId) {
          if (toAccountId && transferCategoryId) {
            categoryId = transferCategoryId;
          } else if (uncategorizedCategoryId) {
            categoryId = uncategorizedCategoryId;
          }
        }

        if (accountId && categoryId) {
          const amount = Math.abs(parseFloat(txn.ZMONEY) || 0);
          
          const category = categoryMap[categoryId];
          let txnType: 'income' | 'expense' | 'transfer' = 'expense';

          if (txn.DO_TYPE !== undefined && txn.DO_TYPE !== null) {
            const doType = String(txn.DO_TYPE);
            if (doType === '0') txnType = 'income';
            else if (doType === '1') txnType = 'expense';
            else if (doType === '3') txnType = 'expense';
            else if (doType === '4') txnType = 'income';
          } else if (category?.type) {
            txnType = category.type;
          }

          let txnDate = new Date();
          if (txn.ZDATE) {
            let parsedDate = new Date(txn.ZDATE);
            
            if (isNaN(parsedDate.getTime())) {
              const timestamp = parseInt(txn.ZDATE);
              if (!isNaN(timestamp)) {
                parsedDate = new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
              }
            }
            
            if (!isNaN(parsedDate.getTime())) {
              txnDate = parsedDate;
            }
          }

          let transactionDescription = txn.ZCONTENT || '';
          if (toAccountId) {
            transactionDescription = `Transfer To ${accountIdToName[toAccountId] || toAccountId}: ${txn.ZCONTENT || ''}`;
          }

          // Build main transaction object
          const mainTxn = {
            accountId,
            categoryId,
            type: txnType,
            amount,
            description: transactionDescription,
            date: txnDate,
            toAccountId: toAccountId || undefined,
          };

          // Build reverse transaction if needed
          let reverseTxn = undefined;
          if (toAccountId && txnType === 'expense') {
            reverseTxn = {
              accountId: toAccountId,
              categoryId,
              type: 'income' as const,
              amount,
              description: `Transfer From ${accountIdToName[accountId] || accountId}: ${txn.ZCONTENT || ''}`,
              date: txnDate,
              toAccountId: accountId,
            };
          }

          transactionsToCreate.push({ main: mainTxn, reverse: reverseTxn });
        } else {
          skippedCount++;
          if (!accountId && txn.assetUid) missingAccounts.add(txn.assetUid);
          if (!categoryId && txn.ctgUid) missingCategories.add(txn.ctgUid);
        }
      }

      console.log(`Parsed ${transactionsToCreate.length} transactions (${skippedCount} skipped)`);

      // Second pass: create transactions in batches using a single SQL transaction per batch
      console.log('Creating transactions in batches...');
      let processedCount = 0;

      for (let batchStart = 0; batchStart < transactionsToCreate.length; batchStart += BATCH_SIZE) {
        if (abortSignal?.aborted) {
          throw new Error('Migration was cancelled by user');
        }

        const batchEnd = Math.min(batchStart + BATCH_SIZE, transactionsToCreate.length);
        const batch = transactionsToCreate.slice(batchStart, batchEnd);

        const batchTransactions = batch.flatMap((txnPair) => {
          const list = [txnPair.main];
          if (txnPair.reverse) list.push(txnPair.reverse);
          return list;
        });

        let createdCount = 0;
        try {
          createdCount = await db.createTransactionsBulk(batchTransactions);
          stats.transactions += createdCount;
          processedCount += batch.length;
        } catch (err) {
          console.error(`✗ Failed to create batch at index ${batchStart}:`, err);
        }

        // Log progress after each batch
        console.log(`✓ Batch ${Math.ceil(batchEnd / BATCH_SIZE)}/${Math.ceil(transactionsToCreate.length / BATCH_SIZE)}`);
        
        // Update progress callback
        if (onProgress) {
          onProgress({
            current: batchEnd,
            total: transactionsToCreate.length,
            status: `Creating transactions...`
          });
        }

        // Yield to the UI thread between batches
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      
      if (missingAccounts.size > 0) {
        console.warn(`⚠️ Missing accounts: ${Array.from(missingAccounts).join(', ')}`);
        console.warn(`Account mapping available:`, Object.keys(assetUidToNewId));
      }
      if (missingCategories.size > 0) {
        console.warn(`⚠️ Missing categories: ${Array.from(missingCategories).join(', ')}`);
        console.warn(`Category mapping available:`, Object.keys(categoryMapping));
      }
    }

    console.log('Migrating budgets...');
    const budgetsResult = androidDb.exec(
      `SELECT uid, targetUid, PERIOD_TYPE FROM BUDGET WHERE uid IS NOT NULL AND IS_DEL != 1`
    );

    if (budgetsResult.length > 0) {
      const columns = budgetsResult[0].columns;
      const rows = budgetsResult[0].values;

      for (const row of rows) {
        const budget: any = {};
        columns.forEach((col, idx) => {
          budget[col] = row[idx];
        });

        const categoryId = categoryMapping[budget.targetUid];
        if (categoryId) {
          const periodType = budget.PERIOD_TYPE === 1 ? 'yearly' : 'monthly';

          try {
            await db.createBudget({
              name: `Budget ${new Date().toLocaleDateString()}`,
              categoryId,
              limit: 1000,
              period: periodType,
              startDate: new Date(),
            });
            stats.budgets++;
            console.log(`✓ Created budget for category ${categoryId}`);
          } catch (err) {
            console.error(`✗ Failed to create budget:`, err);
          }
        } else {
          console.warn(`⊘ Skipped budget: missing category ${budget.targetUid}`);
        }
      }
    }

    androidDb.close();

    return {
      success: true,
      message: `Migration completed successfully!`,
      stats,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Migration error:', error);
    return {
      success: false,
      message: `Migration failed: ${errorMessage}`,
    };
  }
}

export function createMigrationFileInput(
  onSuccess: (stats: { accounts: number; categories: number; transactions: number; budgets: number }) => void,
  onError: (message: string) => void,
  onProgress?: (progress: { current: number; total: number; status: string }) => void,
  abortSignal?: AbortController
) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.sqlite,.db';
  fileInput.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      try {
        const confirmed = confirm(
          '⚠️ This will clear all existing data and replace it with data from your Money Android database.\n\nContinue?'
        );
        if (!confirmed) {
          onError('Migration cancelled');
          return;
        }

        const result = await migrateFromMoneyAndroid(file, onProgress, abortSignal?.signal);
        if (result.success && result.stats) {
          onSuccess(result.stats);
        } else {
          onError(result.message);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        onError(`Migration error: ${errorMsg}`);
      }
    }
  };
  fileInput.click();
}
