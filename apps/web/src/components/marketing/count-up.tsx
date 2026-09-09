'use client';

import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './use-reduced-motion';

/** Số đếm lên từ 0 khi cuộn tới, 900 ms ease-out; giảm chuyển động → hiện số cuối ngay. */
export function CountUp({
  value,
  suffix = '',
  className,
}: {
  value: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 900);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (typeof IntersectionObserver === 'undefined') {
      run();
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        run();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, reduced]);

  // Giảm chuyển động: hiện số cuối ngay, không đếm
  const displayed = reduced ? value : shown;

  return (
    <span ref={ref} className={className}>
      <span className="tabular">{displayed}</span>
      {suffix}
    </span>
  );
}
