import { useState, useRef, useEffect } from 'react';

interface FilterButtonProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export default function FilterButton({ value, onChange }: FilterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value !== null) setInputValue(String(value));
  }, [value]);

  const handleApply = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num > 0) {
      onChange(num);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setInputValue('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-lg transition-colors text-sm border ${
          value !== null
            ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filter{value !== null && ` ≥ ${value}`}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-40">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Show slots with ≥ participants
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApply()}
              placeholder="e.g. 3"
              autoFocus
              className="flex-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleApply}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-2 rounded-lg transition-colors text-sm"
            >
              Apply
            </button>
          </div>
          {value !== null && (
            <button
              type="button"
              onClick={handleClear}
              className="mt-3 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}
