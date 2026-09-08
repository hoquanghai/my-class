'use client';

import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { cn } from '@/components/ui/cn';
import 'katex/dist/katex.min.css';

/** Render Markdown + LaTeX (`$…$`, `$$…$$`) dùng cho đề bài, phương án, lời giải. */
export function MarkdownLatex({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        'max-w-none break-words [&_img]:my-2 [&_img]:max-h-64 [&_img]:rounded-md [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
