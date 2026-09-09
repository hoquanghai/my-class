'use client';

import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import { cn } from '@/components/ui/cn';
import 'katex/dist/katex.min.css';

/**
 * Công thức LaTeX inline render bằng KaTeX qua remark-math/rehype-katex (không chèn HTML thô),
 * dùng cho mock và giao diện không đi qua Markdown đầy đủ.
 */
export function Tex({ tex, className }: { tex: string; className?: string }) {
  return (
    <span className={cn('inline-block align-middle', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{ p: ({ children }) => <>{children}</> }}
      >
        {`$${tex}$`}
      </ReactMarkdown>
    </span>
  );
}
