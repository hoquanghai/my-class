import type { ComponentProps } from 'react';
import { cn } from './cn';

const BASE =
  'w-full rounded-lg border border-hairline bg-canvas px-3 text-base text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:bg-surface-soft aria-[invalid=true]:border-danger';

/** React 19: `ref` là prop thường, được truyền thẳng xuống phần tử DOM. */
export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(BASE, 'h-10', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(BASE, 'py-2', className)} {...rest} />;
}
