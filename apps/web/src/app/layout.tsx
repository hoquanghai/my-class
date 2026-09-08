import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Be_Vietnam_Pro } from 'next/font/google';
import { QueryProvider } from '@/lib/query';
import './globals.css';

const beVietnam = Be_Vietnam_Pro({
  variable: '--font-be-vietnam',
  subsets: ['vietnamese', 'latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Lớp Học – Điểm danh & kiểm tra đầu giờ',
  description:
    'Ứng dụng miễn phí cho giáo viên: điểm danh, ngân hàng câu hỏi, kiểm tra đầu giờ, máy chiếu.',
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${beVietnam.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans">
        <NextIntlClientProvider>
          <QueryProvider>{children}</QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
