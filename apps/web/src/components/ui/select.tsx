import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
