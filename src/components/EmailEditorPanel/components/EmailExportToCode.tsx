import { use, useEffect, useRef, useState } from 'react';
import {
  MdCheck,
  MdContentCopy,
  MdDownload,
  MdOutlineForwardToInbox,
} from 'react-icons/md';
import type { EmailVariable } from '@/types/variables';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Tabs } from '@/ui/Tabs';
import { composeEmailDraft } from '@/utils/composeEmailDraft';
import { applyVariables } from '@/utils/helpers';

const FORMATS = [
  {
    label: 'HTML',
    copyLabel: 'Copy HTML',
    downloadLabel: 'Download HTML',
    fileName: 'email.html',
    mimeType: 'text/html',
  },
  {
    label: 'Plain text',
    copyLabel: 'Copy plain text',
    downloadLabel: 'Download plain text',
    fileName: 'email.txt',
    mimeType: 'text/plain',
  },
  {
    label: 'React Email',
    copyLabel: 'Copy React Email',
    downloadLabel: 'Download React Email',
    fileName: 'email.jsx',
    mimeType: 'text/plain',
  },
];

/**
 * Saves the content as a file through a temporary link.
 *
 * @param content - The text to save.
 * @param fileName - The name of the downloaded file.
 * @param mimeType - The media type of the saved text, e.g. `text/html`.
 */
function downloadFile(content: string, fileName: string, mimeType: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: `${mimeType};charset=utf-8` })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Download button component for exporting email content as a file
const DownloadButton = ({
  content,
  label,
  fileName,
  mimeType,
}: {
  content: string;
  label: string;
  fileName: string;
  mimeType: string;
}) => {
  return (
    <Button
      variant="ghost"
      aria-label={label}
      title={label}
      onClick={() => {
        downloadFile(content, fileName, mimeType);
      }}
    >
      <MdDownload />
    </Button>
  );
};

// Draft button component for opening the email in a mail client to send a test
const DraftButton = ({
  html,
  text,
  variables,
}: {
  html: string;
  text: string;
  variables: EmailVariable[];
}) => {
  const handleDownload = () => {
    const filledHtml = applyVariables(html, variables);
    const subject = new DOMParser()
      .parseFromString(filledHtml, 'text/html')
      .title.trim();
    downloadFile(
      composeEmailDraft({
        subject,
        html: filledHtml,
        text: applyVariables(text, variables, { escape: false }),
      }),
      'email.eml',
      'message/rfc822'
    );
  };
  return (
    <Button
      variant="ghost"
      aria-label="Download email draft"
      title="Download as an email draft (.eml) to send a test from your mail app"
      onClick={handleDownload}
    >
      <MdOutlineForwardToInbox />
    </Button>
  );
};

// Copy button component for copying email content to the clipboard
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

// Component
export const EmailExportToCode = ({
  html,
  text,
  reactEmail,
  variables,
}: {
  html: Promise<string>;
  text: Promise<string>;
  reactEmail: Promise<string>;
  variables: EmailVariable[];
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
        <Stack className="flex-row items-center gap-1">
          <CopyButton content={content} label={FORMATS[format].copyLabel} />
          <DownloadButton
            content={content}
            label={FORMATS[format].downloadLabel}
            fileName={FORMATS[format].fileName}
            mimeType={FORMATS[format].mimeType}
          />
          <DraftButton
            html={contents[0]}
            text={contents[1]}
            variables={variables}
          />
        </Stack>
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
