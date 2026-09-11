'use client';

import { mediaRefKey } from '@lophoc/shared';
import type { ComponentProps } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/components/ui/cn';
import { apiUrl } from '@/lib/api';
import 'katex/dist/katex.min.css';

/**
 * Ảnh trong đề được lưu dạng `media:<key>` (xem `packages/shared/src/media.ts`); địa chỉ thật
 * dựng lúc hiển thị qua `GET /api/media/f/<key>`. Ảnh có URL tuyệt đối (nội dung cũ, ảnh dán từ
 * nơi khác) giữ nguyên.
 */
function MarkdownImage({ src, alt, ...rest }: ComponentProps<'img'>) {
  const key = typeof src === 'string' ? mediaRefKey(src) : null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- kích thước ảnh do giáo viên nhập, host có thể đổi nên không dùng next/image
    <img src={key ? apiUrl(`/media/f/${key}`) : src} alt={alt ?? ''} loading="lazy" {...rest} />
  );
}

const COMPONENTS = { img: MarkdownImage };

/** react-markdown chặn mọi giao thức lạ; cho `media:` đi qua, phần còn lại giữ nguyên bộ lọc mặc định. */
function urlTransform(url: string): string {
  return mediaRefKey(url) ? url : defaultUrlTransform(url);
}

/** Render Markdown + LaTeX (`$…$`, `$$…$$`) dùng cho đề bài, phương án, lời giải. */
export function MarkdownLatex({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        // `md-latex` (globals.css): dòng cao hơn để phân số/lũy thừa không đè dòng khác, công thức dài xuống dòng được
        'md-latex max-w-none [&_img]:my-2 [&_img]:max-h-64 [&_img]:rounded-md [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={urlTransform}
        components={COMPONENTS}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
