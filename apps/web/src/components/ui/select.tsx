import type { SelectHTMLAttributes } from 'react';
import { cn } from './cn';

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 rounded-lg border border-hairline bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:bg-surface-soft aria-[invalid=true]:border-danger',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
