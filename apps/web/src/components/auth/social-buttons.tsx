'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/components/ui/cn';
import { apiUrl } from '@/lib/api';
import { useAuthProviders } from '@/lib/auth';

type Provider = 'google' | 'facebook';

/**
 * Nút đăng nhập Google / Facebook cho giáo viên. Luôn hiển thị để giao diện nhất quán;
 * nhà cung cấp chưa cấu hình ở API (`GET /auth/providers`) thì bấm vào sẽ báo chưa bật
 * thay vì chuyển sang trang lỗi của API.
 */
export function SocialButtons({
  className,
  next,
}: {
  className?: string;
  /** Trang trong app cần quay lại sau khi đăng nhập (API giữ trong cookie của luồng OAuth). */
  next?: string | null;
}) {
  const t = useTranslations('Auth');
  const providers = useAuthProviders();
  const [notice, setNotice] = useState<string | null>(null);

  const enabled = (p: Provider) => providers.data?.[p] ?? false;
  const startUrl = (p: Provider) =>
    next ? `${apiUrl(`/auth/${p}`)}?next=${encodeURIComponent(next)}` : apiUrl(`/auth/${p}`);
  const base =
    'flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-full border border-hairline bg-canvas font-semibold text-ink transition-colors hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

  function onClick(p: Provider, e: React.MouseEvent<HTMLAnchorElement>) {
    if (providers.isPending || enabled(p)) return;
    e.preventDefault();
    const label = p === 'google' ? 'Google' : 'Facebook';
    const hint =
      process.env.NODE_ENV === 'development'
        ? ` (${p === 'google' ? 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' : 'FACEBOOK_APP_ID / FACEBOOK_APP_SECRET'} trong apps/api/.env)`
        : '';
    setNotice(t('providerDisabled', { provider: label }) + hint);
  }

  return (
    <div className={cn('space-y-3', className)}>
      {notice && <Alert variant="warning">{notice}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={startUrl('google')}
          className={base}
          data-enabled={String(enabled('google'))}
          data-pending={String(providers.isPending)}
          onClick={(e) => onClick('google', e)}
        >
          <GoogleIcon />
          Google
        </a>
        <a
          href={startUrl('facebook')}
          className={base}
          data-enabled={String(enabled('facebook'))}
          data-pending={String(providers.isPending)}
          onClick={(e) => onClick('facebook', e)}
        >
          <FacebookIcon />
          Facebook
        </a>
      </div>
      <p className="text-center text-xs text-ink-muted">{t('socialTermsNote')}</p>
    </div>
  );
}

/** Đường kẻ "hoặc dùng email" đặt giữa nút mạng xã hội và form. */
export function OrDivider() {
  const t = useTranslations('Auth');
  return (
    <div className="type-eyebrow flex items-center gap-3 text-ink-muted">
      <span className="h-px flex-1 bg-hairline" />
      {t('orEmail')}
      <span className="h-px flex-1 bg-hairline" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.875 11.854v-8.385H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.874V12h3.328l-.532 3.469h-2.796v8.385A12.002 12.002 0 0 0 24 12z"
      />
    </svg>
  );
}
