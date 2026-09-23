import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import Button from './ui/Button';

interface SubmitModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (name: string) => void;
  defaultName: string;
  onNameChange: (name: string) => void;
  onCancelEdit: () => void;
  error?: string | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
}

export default function SubmitModal({
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
  defaultName,
  onNameChange,
  onCancelEdit,
  error,
  returnFocusRef,
}: SubmitModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, isSubmitting, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      returnFocusRef?.current?.focus();
    };
  }, [isOpen, returnFocusRef]);

  if (!isOpen) return null;

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const modal = modalRef.current;
    if (!modal) return;
    const focusables = modal.querySelectorAll<HTMLElement>(
      'input, button:not([disabled])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !modal.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !modal.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-[env(safe-area-inset-bottom)]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          if (!isSubmitting) onClose();
        }}
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-modal-title"
        onKeyDown={handleKeyDown}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90dvh] overflow-y-auto"
      >
        <h2
          id="submit-modal-title"
          className="text-xl font-bold text-gray-900 dark:text-white mb-2"
        >
          Submit availability
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enter your name to confirm and submit your availability.
        </p>

        <label
          htmlFor="participant-name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Your name
        </label>
        <input
          type="text"
          id="participant-name"
          required
          aria-required="true"
          value={defaultName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Your name"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter' && defaultName.trim()) {
              onConfirm(defaultName);
            }
          }}
          className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
        />

        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 text-sm mb-3"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={onCancelEdit}
          >
            Discard changes
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => onConfirm(defaultName)}
            disabled={!defaultName.trim() || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
