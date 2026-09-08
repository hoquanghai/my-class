import type { ComponentProps } from 'react';
import { cn } from './cn';

const BASE =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100 aria-[invalid=true]:border-red-500';

/** React 19: `ref` là prop thường, được truyền thẳng xuống phần tử DOM. */
export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(BASE, 'h-10', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(BASE, 'py-2', className)} {...rest} />;
}
