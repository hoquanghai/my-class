'use client';

import type { TeacherDto } from '@lophoc/shared';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { initials } from '@/lib/teachers';

/** Ảnh đại diện tròn; không có ảnh thì hiện chữ cái đầu trên nền accent nhạt. */
export function Avatar({ teacher, size = 32 }: { teacher: TeacherDto; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (teacher.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- ảnh từ object storage, kích thước nhỏ
      <img
        src={teacher.avatarUrl}
        alt=""
        style={style}
        className="shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <span
      style={style}
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent"
    >
      {initials(teacher.name)}
    </span>
  );
}

/** Menu tài khoản ở header app: ảnh + tên → Hồ sơ giáo viên, Đăng xuất. */
export function AccountMenu({
  teacher,
  onLogout,
  loggingOut,
}: {
  teacher: TeacherDto;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const t = useTranslations('Shell');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('accountMenu')}
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-2 rounded-full pl-1 pr-2 text-sm font-medium text-ink hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Avatar teacher={teacher} />
        <span className="hidden max-w-40 truncate sm:inline">{teacher.name}</span>
        <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
      </button>
      <div
        role="menu"
        className={cn(
          'absolute right-0 top-12 z-50 w-56 rounded-card border border-hairline bg-canvas p-1.5 shadow-modal',
          !open && 'hidden',
        )}
      >
        <div className="px-3 py-2">
          <p className="truncate text-sm font-semibold text-ink">{teacher.name}</p>
          <p className="truncate text-xs text-ink-muted">{teacher.email}</p>
        </div>
        <Link
          href="/app/profile"
          role="menuitem"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink hover:bg-surface-soft"
        >
          <UserRound className="size-4" aria-hidden="true" />
          {t('profile')}
        </Link>
        <button
          type="button"
          role="menuitem"
          disabled={loggingOut}
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-surface-soft disabled:opacity-50"
        >
          <LogOut className="size-4" aria-hidden="true" />
          {tc('logout')}
        </button>
      </div>
    </div>
  );
}
