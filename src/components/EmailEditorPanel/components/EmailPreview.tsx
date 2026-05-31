import type { EmailEditorRef } from '@react-email/editor';
import { use, useEffect, useRef, useState } from 'react';
import { MdCheck, MdContentCopy } from 'react-icons/md';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

const CopyButton = ({ content }: { content: string }) => {
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        globalThis.clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    if (copiedTimeoutRef.current) {
      globalThis.clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = globalThis.setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, 5000);
  };
  return (
    <Button
      variant="ghost"
      aria-label={copied ? 'Copied' : 'Copy HTML'}
      title={copied ? 'Copied' : 'Copy HTML'}
      onClick={handleCopy}
    >
      {copied ? <MdCheck /> : <MdContentCopy />}
    </Button>
  );
};

export function EmailPreview({ editorRef }: { editorRef: EmailEditorRef }) {
  const content = use(editorRef.getEmailHTML());
  return (
    <Stack className="flex-1 rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <Stack className="flex-row items-center justify-between border-b border-gray-200 px-4 py-1 dark:border-white/10">
        <Typography variant="caption" tone="muted">
          Email HTML code
        </Typography>
        <CopyButton content={content} />
      </Stack>
      <Stack className="relative flex-1">
        <div className="absolute h-full w-full overflow-auto">
          <pre className="p-4 text-sm leading-6 text-gray-800 dark:text-neutral-200">
            <code>{content}</code>
          </pre>
        </div>
      </Stack>
    </Stack>
  );
}
