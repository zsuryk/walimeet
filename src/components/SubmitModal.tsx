interface SubmitModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  defaultName: string;
  onNameChange: (name: string) => void;
  onCancelEdit: () => void;
}

export default function SubmitModal({
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
  defaultName,
  onNameChange,
  onCancelEdit,
}: SubmitModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Submit availability
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enter your name to confirm and submit your availability.
        </p>

        <input
          type="text"
          value={defaultName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && defaultName.trim()) {
              onConfirm(defaultName);
            }
          }}
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelEdit}
            className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            Discard changes
          </button>
          <button
            type="button"
            onClick={() => onConfirm(defaultName)}
            disabled={!defaultName.trim() || isSubmitting}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
