'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { cn } from './cn';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  /** `lg` cho form nhiều trường (max-w-2xl). */
  size?: 'md' | 'lg';
}

/** Hộp thoại dùng thẻ <dialog> gốc: ESC và bấm nền đều đóng. */
export function Dialog({ open, onClose, title, children, className, size = 'md' }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      // showModal() đặt focus vào nút Đóng; chuyển sang ô nhập đầu tiên nếu có
      el.querySelector<HTMLElement>('input, textarea, select')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        'w-full rounded-xl bg-white p-0 shadow-xl backdrop:bg-slate-900/40 open:animate-in',
        size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        'm-auto',
        className,
      )}
    >
      <div className="p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
