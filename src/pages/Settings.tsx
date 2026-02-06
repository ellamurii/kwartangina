import { useState, useRef } from 'react';
import { Download, Upload, Trash2, FileUp } from 'lucide-react';
import { db } from '../lib/database';
import { createMigrationFileInput } from '../lib/migrateFromMoneyAndroid';
import MigrationOverlay from '../components/MigrationOverlay';

export default function Settings() {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string>('');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0, status: '' });
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleExport = async () => {
    const data = await db.exportData();
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
    element.setAttribute('download', `kwartangina-backup-${new Date().toISOString().split('T')[0]}.json`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    setShowExportConfirm(false);
  };

  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const content = event.target?.result as string;
          const success = await db.importData(content);
          if (success) {
            alert('Data imported successfully!');
            window.location.reload();
          } else {
            alert('Failed to import data. Invalid file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
    setShowImportConfirm(false);
  };

  const handleClearAll = async () => {
    await db.clearAll();
    alert('All data has been cleared!');
    window.location.reload();
  };

  const handleMigrateFromMoneyAndroid = () => {
    abortControllerRef.current = new AbortController();
    setIsMigrating(true);
    setMigrationProgress({ current: 0, total: 0, status: 'Preparing migration...' });
    
    createMigrationFileInput(
      (stats) => {
        setMigrationStatus(
          `✅ Migration completed!\n\n` +
          `📊 Data imported:\n` +
          `• Accounts: ${stats.accounts}\n` +
          `• Categories: ${stats.categories}\n` +
          `• Transactions: ${stats.transactions}\n` +
          `• Budgets: ${stats.budgets}`
        );
        setIsMigrating(false);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      },
      (error) => {
        setMigrationStatus(`❌ ${error}`);
        setIsMigrating(false);
      },
      (progress) => {
        setMigrationProgress(progress);
      },
      abortControllerRef.current
    );
  };

  const handleStopMigration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsMigrating(false);
      setMigrationStatus('Migration stopped by user');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your application settings and data</p>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>

        <div className="space-y-4">
          {/* Export */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b">
            <div>
              <h3 className="font-semibold text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-500">Download your data as a JSON file for backup</p>
            </div>
            {!showExportConfirm ? (
              <button
                onClick={() => setShowExportConfirm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-4 md:mt-0"
              >
                <Download size={20} />
                Export
              </button>
            ) : (
              <div className="flex gap-2 mt-4 md:mt-0">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowExportConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Import */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b">
            <div>
              <h3 className="font-semibold text-gray-900">Import Data</h3>
              <p className="text-sm text-gray-500">Restore your data from a JSON backup file</p>
            </div>
            {!showImportConfirm ? (
              <button
                onClick={() => setShowImportConfirm(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-4 md:mt-0"
              >
                <Upload size={20} />
                Import
              </button>
            ) : (
              <div className="flex gap-2 mt-4 md:mt-0">
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowImportConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Migrate from Money Android */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b">
            <div>
              <h3 className="font-semibold text-gray-900">Migrate from Money Android</h3>
              <p className="text-sm text-gray-500">Import your accounts, transactions, and categories from Money Android app</p>
            </div>
            <button
              onClick={handleMigrateFromMoneyAndroid}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors mt-4 md:mt-0"
            >
              <FileUp size={20} />
              Import Money Android
            </button>
          </div>

          {migrationStatus && (
            <div className={`p-4 rounded-lg whitespace-pre-line ${migrationStatus.includes('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {migrationStatus}
            </div>
          )}

          {/* Clear All */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between pt-4">
            <div>
              <h3 className="font-semibold text-gray-900">Clear All Data</h3>
              <p className="text-sm text-gray-500 text-red-600">This action cannot be undone</p>
            </div>
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors mt-4 md:mt-0"
              >
                <Trash2 size={20} />
                Clear All
              </button>
            ) : (
              <div className="flex gap-2 mt-4 md:mt-0">
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, Clear All
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">About</h2>

        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Application</span>
            <span className="font-semibold text-gray-900">Kwartangina</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Version</span>
            <span className="font-semibold text-gray-900">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Type</span>
            <span className="font-semibold text-gray-900">Finance Manager</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Data Storage</span>
            <span className="font-semibold text-gray-900">Local (IndexedDB)</span>
          </div>
        </div>
      </div>

      {/* Future Features */}
      <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Coming Soon</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-center gap-2">
            <span className="text-blue-600">✓</span> Google Drive Sync
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">✓</span> Multi-currency Support
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">✓</span> Recurring Transactions
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">✓</span> Receipt Scanning
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-600">✓</span> Advanced Analytics
          </li>
        </ul>
      </div>

      {/* Migration Overlay */}
      <MigrationOverlay 
        isOpen={isMigrating}
        progress={migrationProgress}
        onStop={handleStopMigration}
      />
    </div>
  );
}
