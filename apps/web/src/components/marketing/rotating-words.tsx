'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/components/ui/cn';
import { usePrefersReducedMotion } from './use-reduced-motion';

/**
 * Cụm từ xoay vòng trong tiêu đề: từ hiện tại trượt lên và mờ đi, từ kế tiếp trượt vào từ dưới.
 * Bề rộng theo từ dài nhất để dòng không giật. Giảm chuyển động → giữ từ đầu tiên.
 */
export function RotatingWords({
  words,
  intervalMs = 2600,
  className,
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), intervalMs);
    return () => clearInterval(id);
  }, [reduced, words.length, intervalMs]);

  const prev = (index - 1 + words.length) % words.length;

  return (
    <span
      className={cn(
        'relative inline-grid overflow-hidden rounded-lg bg-block-lime px-2 align-baseline',
        className,
      )}
      aria-live="polite"
    >
      {words.map((word, i) => (
        <span
          key={word}
          aria-hidden={i !== index}
          className={cn(
            'col-start-1 row-start-1 whitespace-nowrap transition-[transform,opacity] duration-500 [transition-timing-function:var(--ease-out-soft)]',
            i === index
              ? 'translate-y-0 opacity-100'
              : i === prev
                ? '-translate-y-full opacity-0'
                : 'translate-y-full opacity-0',
          )}
        >
          {word}
        </span>
      ))}
    </span>
  );
}
