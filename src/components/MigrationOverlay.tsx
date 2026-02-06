import { AlertCircle, Loader, X } from 'lucide-react';

interface MigrationOverlayProps {
  isOpen: boolean;
  progress?: {
    current: number;
    total: number;
    status: string;
  };
  onStop?: () => void;
}

export default function MigrationOverlay({ isOpen, progress, onStop }: MigrationOverlayProps) {
  if (!isOpen) return null;

  const percentage = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Spinner */}
        <div className="flex justify-center mb-6">
          <Loader className="w-12 h-12 text-blue-600 animate-spin" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          Importing Transactions
        </h2>

        {/* Progress */}
        {progress && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-600">{progress.status}</p>
              <p className="text-sm font-semibold text-gray-900">{percentage}%</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            {progress.total > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {progress.current} / {progress.total} transactions
              </p>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 mb-1">Do not close this window</p>
              <p className="text-xs text-amber-700">
                Refreshing or closing the page will stop the import process and may result in incomplete data.
              </p>
            </div>
          </div>
        </div>

        {/* Stop Button */}
        {onStop && (
          <button
            onClick={onStop}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <X size={20} />
            Stop Import
          </button>
        )}
      </div>
    </div>
  );
}
