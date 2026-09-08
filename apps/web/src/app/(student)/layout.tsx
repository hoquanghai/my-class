import type { ReactNode } from 'react';

/** Khung tối giản cho học sinh: một cột, chữ to, không thanh điều hướng giáo viên. */
export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
