'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useTranslations('Common');
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard bị chặn: bỏ qua
        }
      }}
      aria-label={label ?? t('copy')}
      title={label ?? t('copy')}
    >
      {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
      {copied ? t('copied') : (label ?? t('copy'))}
    </Button>
  );
}
