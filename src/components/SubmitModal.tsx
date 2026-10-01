import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react';
import Button from './ui/Button';
import Field, { inputClasses } from './ui/Field';
import {
  isTurnstileEnabled,
  renderTurnstile,
  resetTurnstile,
} from '../lib/turnstile';
import type { ApiErrorKind } from '../lib/api';

const turnstileEnabled = isTurnstileEnabled();

interface SubmitModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: (name: string, turnstileToken: string | null) => void;
  defaultName: string;
  onNameChange: (name: string) => void;
  onCancelEdit: () => void;
  error?: string | null;
  errorKind?: ApiErrorKind | null;
  returnFocusRef?: RefObject<HTMLElement | null>;
  collisionName?: string | null;
  onEditExisting?: () => void;
  onChangeName?: () => void;
  editingName?: string | null;
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
  errorKind,
  returnFocusRef,
  collisionName = null,
  onEditExisting,
  onChangeName,
  editingName = null,
}: SubmitModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const changeNameBtnRef = useRef<HTMLButtonElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const wasColliding = useRef(false);
  const colliding = collisionName != null;

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

  useEffect(() => {
    if (colliding && !wasColliding.current) {
      changeNameBtnRef.current?.focus();
    } else if (!colliding && wasColliding.current) {
      nameInputRef.current?.focus();
    }
    wasColliding.current = colliding;
  }, [colliding]);

  useEffect(() => {
    if (!isOpen || !turnstileEnabled) return;
    setTurnstileToken(null);
    const el = widgetRef.current;
    if (!el) return;
    return renderTurnstile(el, setTurnstileToken, 'respond');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isSubmitting || !errorKind) return;
    if (errorKind === 'network') return;
    resetTurnstile();
    setTurnstileToken(null);
  }, [isOpen, isSubmitting, errorKind]);

  if (!isOpen) return null;

  const confirmingExisting = !colliding && editingName != null;

  const handleConfirm = (name: string) => {
    if (isSubmitting) return;
    onConfirm(name, turnstileToken);
  };

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
          {colliding
            ? 'Name already taken'
            : confirmingExisting
              ? 'Update availability'
              : 'Submit availability'}
        </h2>

        {colliding ? (
          <p
            role="alert"
            className="text-sm text-gray-500 dark:text-gray-400 mb-4"
          >
            A response already exists for this name.
          </p>
        ) : confirmingExisting ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Updating <strong>{editingName}</strong>’s availability.
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Enter your name to confirm and submit your availability.
          </p>
        )}

        {!colliding && !confirmingExisting && (
          <Field label="Your name" htmlFor="participant-name">
            <input
              ref={nameInputRef}
              type="text"
              id="participant-name"
              required
              aria-required="true"
              value={defaultName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Your name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && defaultName.trim() && !isSubmitting) {
                  handleConfirm(defaultName);
                }
              }}
              className={`${inputClasses} mb-4`}
            />
          </Field>
        )}

        {turnstileEnabled && (
          <div ref={widgetRef} className="flex justify-center mb-4" />
        )}

        {error && (
          <div
            role="alert"
            className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-3 py-2 text-sm mb-3"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          {colliding ? (
            <>
              <Button
                ref={changeNameBtnRef}
                variant="secondary"
                className="flex-1"
                onClick={onChangeName}
                disabled={isSubmitting}
              >
                Change name
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                onClick={onEditExisting}
                disabled={isSubmitting}
              >
                Edit existing
              </Button>
            </>
          ) : (
            <>
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
                onClick={() => handleConfirm(defaultName)}
                disabled={!defaultName.trim() || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
