import { MdErrorOutline, MdWarningAmber } from 'react-icons/md';
import { twJoin } from 'tailwind-merge';

export type LintingRow =
  | {
      source: 'image';
      result: {
        status: 'error' | 'warning';
        src: string;
        failingCheck: {
          type:
            | 'accessibility'
            | 'image_size'
            | 'fetch_attempt'
            | 'security'
            | 'syntax';
        };
        byteCount?: number;
        fetchStatusCode?: number;
        codeLocation: { line: number; column: number };
      };
    }
  | {
      source: 'link';
      result: {
        status: 'error' | 'warning';
        link: string;
        failingCheck: {
          type: 'security' | 'fetch_attempt' | 'syntax';
        };
        fetchStatusCode?: number;
        codeLocation: { line: number; column: number };
      };
    };

const descriptions: Record<string, Record<string, string>> = {
  link: {
    security: 'Insecure URL, use HTTPS instead of HTTP',
    fetch_attempt: 'The link could not be reached',
    syntax: 'The link is broken due to invalid syntax',
  },
  image: {
    accessibility: 'Missing alt text',
    image_size: 'This image is too large, keep it under 1mb',
    security: 'Insecure URL, use HTTPS instead of HTTP',
    fetch_attempt: 'The image could not be reached',
    syntax: 'The image is broken due to an invalid source',
  },
};

function getDescription(row: LintingRow): string {
  const desc = descriptions[row.source]?.[row.result.failingCheck.type];
  if (row.source === 'link') {
    if (
      row.result.failingCheck.type === 'fetch_attempt' &&
      row.result.fetchStatusCode
    ) {
      if (
        row.result.fetchStatusCode >= 300 &&
        row.result.fetchStatusCode < 400
      ) {
        return 'There was a redirect, the content may have been moved';
      }
      if (row.result.fetchStatusCode >= 400) {
        return 'The link is broken';
      }
    }
  }
  if (row.source === 'image') {
    if (
      row.result.failingCheck.type === 'fetch_attempt' &&
      row.result.fetchStatusCode
    ) {
      if (
        row.result.fetchStatusCode >= 300 &&
        row.result.fetchStatusCode < 400
      ) {
        return 'There was a redirect, the image may have been moved';
      }
      if (row.result.fetchStatusCode >= 400) {
        return 'The image is broken';
      }
    }
  }
  return desc ?? '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitize(str: string): string {
  return str.replaceAll(/_/g, ' ');
}

const StatusIcon = ({ status }: { status: 'error' | 'warning' }) => {
  if (status === 'error') return <MdErrorOutline size={14} />;
  return <MdWarningAmber size={14} />;
};

interface LinterProps {
  rows: LintingRow[];
}

export const Linter = ({ rows }: LinterProps) => {
  if (rows.length === 0) {
    return (
      <p className="px-1 py-3 text-xs text-gray-400 dark:text-neutral-500">
        No linting issues found.
      </p>
    );
  }

  return (
    <table className="w-full border-collapse text-left text-xs">
      <tbody>
        {rows.map((row, i) => {
          const description = getDescription(row);
          const metadata: string[] = [];

          if (row.source === 'image' && row.result.byteCount) {
            metadata.push(formatBytes(row.result.byteCount));
          }

          if (row.result.fetchStatusCode) {
            metadata.push(`HTTP ${row.result.fetchStatusCode}`);
          }

          metadata.push(
            `html:${row.result.codeLocation.line}:${row.result.codeLocation.column}`
          );

          const sourceLabel =
            row.source === 'link' ? row.result.link : row.result.src;

          return (
            <tr
              key={i}
              className="group/result border-b border-transparent transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
            >
              <td className="py-1.5 pr-4 align-middle">
                <span
                  className={twJoin(
                    'flex items-center gap-2 uppercase tracking-wide',
                    row.result.status === 'error'
                      ? 'text-red-400'
                      : 'text-orange-300'
                  )}
                >
                  <StatusIcon status={row.result.status} />
                  {sanitize(row.result.failingCheck.type)}
                </span>
              </td>
              <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
                {description}
                <span className="ml-2 max-w-[30ch] overflow-hidden text-nowrap text-ellipsis text-gray-400 dark:text-neutral-500">
                  {sourceLabel}
                </span>
              </td>
              <td className="py-1.5 text-right align-middle font-mono text-gray-400 dark:text-neutral-500">
                {metadata.join(' · ')}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
