'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type ComponentProps, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Ô mật khẩu có nút hiện/ẩn; cao 48px cho ngón tay, chữ 16px để iOS không tự phóng to. */
export function PasswordInput({ className, ...rest }: Omit<ComponentProps<'input'>, 'type'>) {
  const t = useTranslations('Auth');
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className={`h-12 pr-12 ${className ?? ''}`}
        {...rest}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? t('hidePassword') : t('showPassword')}
        aria-pressed={show}
        className="absolute right-1 top-1 flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
