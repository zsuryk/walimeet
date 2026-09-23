import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function Card({
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-card shadow-sm ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
