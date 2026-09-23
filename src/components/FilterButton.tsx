import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';
import Button from './ui/Button';
import { inputClasses, labelClasses } from './ui/Field';
import { twMerge } from '../lib/cn';

interface FilterButtonProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export default function FilterButton({ value, onChange }: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (popoverRef.current?.contains(document.activeElement)) {
          buttonRef.current?.focus();
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  useEffect(() => {
    if (!isOpen) setInputError(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (value !== null) setInputValue(String(value));
  }, [value]);

  const closeAndFocus = () => {
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  const handleApply = () => {
    if (!/^\d+$/.test(inputValue) || Number(inputValue) < 1) {
      setInputError('Enter a whole number ≥ 1');
      return;
    }
    setInputError(null);
    onChange(Number(inputValue));
    closeAndFocus();
  };

  const handleClear = () => {
    setInputError(null);
    onChange(null);
    setInputValue('');
    closeAndFocus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        ref={buttonRef}
        variant="secondary"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(!isOpen)}
        className={
          value !== null
            ? 'border border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30'
            : 'border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
        }
      >
        <Filter className="w-4 h-4" aria-hidden="true" />
        Filter{value !== null && ` ≥ ${value}`}
      </Button>

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Filter participants"
          className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-40"
        >
          <label
            htmlFor="filter-min-participants"
            className={twMerge(labelClasses, 'mb-2')}
          >
            Show slots with at least this many participants
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              id="filter-min-participants"
              min={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="e.g. 3"
              autoFocus
              className={`${inputClasses} flex-1`}
            />
            <Button variant="primary" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
          {inputError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">{inputError}</p>
          )}
          {value !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="mt-3 w-full px-0 py-0 min-h-0 font-normal text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-transparent dark:hover:bg-transparent"
            >
              Clear filter
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
