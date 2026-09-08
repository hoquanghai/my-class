'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';
import { formatRemaining, useNow } from '@/lib/use-now';

function useExpire(expired: boolean, onExpire?: () => void) {
  const fired = useRef(false);
  useEffect(() => {
    if (!expired) {
      fired.current = false;
      return;
    }
    if (fired.current) return;
    fired.current = true;
    onExpire?.();
  }, [expired, onExpire]);
}

/**
 * Đếm ngược tới `endsAt` (ms epoch theo giờ server). `offsetMs` = serverTime - giờ máy.
 * Gọi `onExpire` một lần khi về 0.
 */
export function Countdown({
  endsAt,
  offsetMs,
  totalMs,
  onExpire,
  className,
  size = 'md',
}: {
  endsAt: number;
  offsetMs: number;
  totalMs?: number;
  onExpire?: () => void;
  className?: string;
  size?: 'md' | 'lg';
}) {
  const now = useNow(true, 200) + offsetMs;
  const remaining = endsAt - now;
  const expired = remaining <= 0;
  const ratio = totalMs ? Math.max(0, Math.min(1, remaining / totalMs)) : null;

  useExpire(expired, onExpire);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <span
        className={cn(
          'tabular-nums font-bold',
          size === 'lg' ? 'text-5xl' : 'text-2xl',
          expired ? 'text-red-600' : remaining < 5_000 ? 'text-amber-600' : 'text-slate-900',
        )}
      >
        {formatRemaining(remaining)}
      </span>
      {ratio !== null && (
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-200',
              remaining < 5_000 ? 'bg-amber-500' : 'bg-brand-600',
            )}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
