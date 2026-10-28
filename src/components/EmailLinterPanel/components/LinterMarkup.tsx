import { MdErrorOutline, MdInfoOutline, MdWarningAmber } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import type { LintCheck, LintingRow, LintStatus } from '@/types/linter';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { formatBytes } from '@/utils/helpers';

const DESCRIPTIONS: Record<LintCheck['type'], string> = {
  accessibility: 'Missing alt text',
  client_limit: 'Cannot verify this from a browser-only GitHub Pages app',
  email_best_practice: 'Email client support issue',
  image_size: 'This image is too large, keep it under 1mb',
  security: 'Security or delivery risk',
  syntax: 'Invalid or missing value',
};

/**
 * @param row - The linting row to extract metadata from
 * @returns A string representation of the metadata
 */
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

/**
 * @param row - The linting row to extract the source label from
 * @returns A string representation of the source label
 */
function getSourceLabel(row: LintingRow) {
  if (row.source === 'link') return row.result.link;
  if (row.source === 'image') return row.result.source;
  return row.result.label;
}

/**
 * @param row - The linting row to find the failing check for
 * @returns The first failing lint check, or undefined if all checks passed
 */
function getFailingCheck(row: LintingRow) {
  return row.result.checks.find((check) => !check.passed);
}

/**
 * @param check - The lint check to get the description for
 * @returns A string representation of the description
 */
function getDescription(check: LintCheck | undefined) {
  if (!check) return '';
  return check.metadata?.detail ?? DESCRIPTIONS[check.type];
}

// Icons for different linting statuses
const StatusIcon = ({ status }: { status: Exclude<LintStatus, 'success'> }) => {
  if (status === 'error') return <MdErrorOutline size={14} />;
  if (status === 'info') return <MdInfoOutline size={14} />;
  return <MdWarningAmber size={14} />;
};

// Component
export const LinterMarkup = ({
  results,
  loading = false,
}: {
  results: LintingRow[] | undefined;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Typography variant="caption" tone="info">
        Running checks...
      </Typography>
    );
  }
  if (results === undefined) {
    return (
      <Typography variant="label" tone="muted">
        Open or refresh the linter to check the current email.
      </Typography>
    );
  }
  if (results.length === 0) {
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
        {results.map((row, i) => {
          const failingCheck = getFailingCheck(row);
          const sourceLabel = getSourceLabel(row);
          const status =
            row.result.status === 'success' ? 'info' : row.result.status;
          return (
            <tr
              key={`${row.source}-${sourceLabel}-${String(i)}`}
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
                  {failingCheck?.type ?? row.source}
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
