'use client';

import type { ClassDetailDto } from '@lophoc/shared';
import { useTranslations } from 'next-intl';
import { apiUrl } from '@/lib/api';
import { useOrigin } from '@/lib/use-origin';

/** Trang in A4: chỉ hiện khi in (print), chứa tên lớp, mã và QR cỡ lớn. */
export function PrintSheet({ klass }: { klass: ClassDetailDto }) {
  const t = useTranslations('Settings');
  const origin = useOrigin();
  const joinUrl = origin ? `${origin}/join/${klass.code}` : '';
  return (
    <div className="hidden print:flex print:min-h-screen print:flex-col print:items-center print:justify-center print:gap-6 print:text-center">
      <p className="text-2xl text-slate-600">{t('printTitle')}</p>
      <h1 className="text-4xl font-bold">{klass.name}</h1>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${apiUrl(`/classes/${klass.id}/qr.png`)}?v=${klass.code}`}
        alt={`QR ${klass.code}`}
        className="size-[420px]"
      />
      <p className="font-mono text-6xl font-bold tracking-[0.35em]">{klass.code}</p>
      <p className="text-xl text-slate-700">{joinUrl}</p>
    </div>
  );
}
