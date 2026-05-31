import { MdErrorOutline, MdInfoOutline, MdWarningAmber } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import { LintCheck, LintingRow, LintStatus } from '@/types/linter';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { formatBytes } from '@/utils/helpers';

const descriptions: Record<LintCheck['type'], string> = {
  accessibility: 'Missing alt text',
  client_limit: 'Cannot verify this from a browser-only GitHub Pages app',
  email_best_practice: 'Email client support issue',
  image_size: 'This image is too large, keep it under 1mb',
  security: 'Security or delivery risk',
  syntax: 'Invalid or missing value',
};

function sanitize(str: string): string {
  return str.replaceAll('_', ' ');
}

function getSourceLabel(row: LintingRow) {
  if (row.source === 'link') return row.result.link;
  if (row.source === 'image') return row.result.source;
  return row.result.label;
}

function getFailingCheck(row: LintingRow) {
  return row.result.checks.find((check) => !check.passed);
}

function getDescription(check: LintCheck | undefined) {
  if (!check) return '';
  return check.metadata?.detail ?? descriptions[check.type];
}

function getMetadata(row: LintingRow) {
  const metadata = row.result.checks.flatMap((check) => {
    if (check.metadata?.byteCount) {
      return [formatBytes(check.metadata.byteCount)];
    }
    return [];
  });

  metadata.push(
    `html:${row.result.codeLocation.line}:${row.result.codeLocation.column}`
  );

  return metadata.join(' · ');
}

const StatusIcon = ({ status }: { status: Exclude<LintStatus, 'success'> }) => {
  if (status === 'error') return <MdErrorOutline size={14} />;
  if (status === 'info') return <MdInfoOutline size={14} />;
  return <MdWarningAmber size={14} />;
};

// Component
export const LinterMarkup = ({
  rows,
  loading = false,
}: {
  rows: LintingRow[] | undefined;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Typography variant="caption" tone="info">
        Running checks...
      </Typography>
    );
  }
  if (rows === undefined) {
    return (
      <Typography variant="label" tone="muted">
        Open or refresh the linter to check the current email.
      </Typography>
    );
  }
  if (rows.length === 0) {
    return (
      <Stack className="gap-1">
        <Typography variant="h3" tone="success">
          All good
        </Typography>
        <Typography variant="bodySm" tone="subtle">
          No linting issues found.
        </Typography>
      </Stack>
    );
  }
  return (
    <table className="w-full border-collapse text-left text-xs">
      <tbody>
        {rows.map((row, i) => {
          const failingCheck = getFailingCheck(row);
          const sourceLabel = getSourceLabel(row);
          const status =
            row.result.status === 'success' ? 'info' : row.result.status;
          return (
            <tr
              key={`${row.source}-${sourceLabel}-${i}`}
              className="group/result border-b border-transparent transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
            >
              <td className="py-1.5 pr-4 align-middle">
                <span
                  className={cx(
                    'flex items-center gap-2 uppercase tracking-wide',
                    status === 'error' && 'text-red-400',
                    status === 'warning' && 'text-orange-300',
                    status === 'info' && 'text-sky-400'
                  )}
                >
                  <StatusIcon status={status} />
                  {sanitize(failingCheck?.type ?? row.source)}
                </span>
              </td>
              <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
                {getDescription(failingCheck)}
                <span className="ml-2 max-w-[30ch] overflow-hidden text-nowrap text-ellipsis text-gray-400 dark:text-neutral-500">
                  {sourceLabel}
                </span>
              </td>
              <td className="py-1.5 text-right align-middle font-mono text-gray-400 dark:text-neutral-500">
                {getMetadata(row)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
