import type { ReactNode } from 'react';

export const inputClasses =
  'w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-control px-3 py-2 text-base focus:ring-2 focus:ring-brand-500 focus:border-brand-500';

export const labelClasses =
  'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export default function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
    </div>
  );
}
