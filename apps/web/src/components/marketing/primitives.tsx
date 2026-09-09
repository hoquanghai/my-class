import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

type PillVariant = 'primary' | 'secondary' | 'inverse';

const PILL: Record<PillVariant, string> = {
  primary: 'bg-ink text-white hover:bg-ink/85',
  secondary: 'border border-hairline bg-canvas text-ink hover:bg-surface-soft',
  inverse: 'bg-white text-ink hover:bg-white/90',
};

/** Nút viên thuốc 48px cho marketing và trang xác thực (DESIGN.md §6). */
export function PillLink({
  variant = 'primary',
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: PillVariant }) {
  return (
    <Link
      className={cn(
        'inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]',
        PILL[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

/** Nhãn mono in hoa mở đầu section. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('type-eyebrow', className)}>{children}</p>;
}

type Block = 'lime' | 'lilac' | 'cream' | 'mint' | 'coral' | 'navy';

const BLOCK: Record<Block, string> = {
  lime: 'bg-block-lime text-ink',
  lilac: 'bg-block-lilac text-ink',
  cream: 'bg-block-cream text-ink',
  mint: 'bg-block-mint text-ink',
  coral: 'bg-block-coral text-ink',
  navy: 'bg-block-navy text-white',
};

/** Khối màu chiếm trọn bề rộng nội dung, bo 28px; dưới 768px bo nhỏ hơn và ôm lề. */
export function ColorBlock({
  tone,
  id,
  children,
  className,
}: {
  tone: Block;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn('rounded-card p-6 sm:rounded-block sm:p-10 lg:p-12', BLOCK[tone], className)}
    >
      {children}
    </section>
  );
}

/** Giấy nhớ: xoay nhẹ, dùng để ghim một mẩu giao diện thật lên khối màu hoặc ảnh. */
export function StickyNote({
  tone = 'cream',
  rotate = -2,
  className,
  children,
}: {
  tone?: 'cream' | 'lime' | 'mint' | 'lilac' | 'white';
  rotate?: number;
  className?: string;
  children: ReactNode;
}) {
  const bg = {
    cream: 'bg-block-cream',
    lime: 'bg-block-lime',
    mint: 'bg-block-mint',
    lilac: 'bg-block-lilac',
    white: 'bg-canvas',
  }[tone];
  return (
    <div
      className={cn('rounded-lg p-4 text-ink shadow-soft', bg, className)}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  );
}
