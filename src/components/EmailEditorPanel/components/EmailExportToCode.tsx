import { use, useEffect, useRef, useState } from 'react';
import { MdCheck, MdContentCopy } from 'react-icons/md';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Tabs } from '@/ui/Tabs';

const FORMATS = [
  { label: 'HTML', copyLabel: 'Copy HTML' },
  { label: 'Plain text', copyLabel: 'Copy plain text' },
  { label: 'React Email', copyLabel: 'Copy React Email' },
];

const CopyButton = ({ content, label }: { content: string; label: string }) => {
  const copiedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
      copiedTimeoutRef.current = null;
    }, 5000);
  };
  return (
    <Button
      variant="ghost"
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      onClick={handleCopy}
    >
      {copied ? <MdCheck /> : <MdContentCopy />}
    </Button>
  );
};

export const EmailExportToCode = ({
  html,
  text,
  reactEmail,
}: {
  html: Promise<string>;
  text: Promise<string>;
  reactEmail: Promise<string>;
}) => {
  const [format, setFormat] = useState(0);
  const contents = [use(html), use(text), use(reactEmail)];
  const content = contents[format];
  return (
    <Stack className="flex-1 rounded-lg border border-gray-200 bg-white dark:border-white/10 dark:bg-neutral-900">
      <Stack className="flex-row items-center justify-between border-b border-gray-200 pr-4 dark:border-white/10">
        <Tabs
          activeItem={format}
          items={FORMATS}
          onChange={(index) => {
            setFormat(index);
          }}
        />
        <CopyButton content={content} label={FORMATS[format].copyLabel} />
      </Stack>
      <Stack className="relative flex-1">
        <div className="absolute h-full w-full overflow-auto">
          <pre className="p-4 text-sm leading-6">
            <code>
              {content.split('\n').map((line, i) => (
                <span key={`preview-line-${String(i)}`} className="flex">
                  <span className="inline-block w-12 shrink-0 pr-4 text-right text-gray-400 select-none dark:text-neutral-600">
                    {i + 1}
                  </span>
                  <span className="text-gray-800 dark:text-neutral-200">
                    {line}
                  </span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      </Stack>
    </Stack>
  );
};
