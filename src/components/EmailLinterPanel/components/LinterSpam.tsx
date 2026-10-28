import { MdOutlineShield } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import type { SpamCheckingResult } from '@/types/linter';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

// Utility functions
const getScoreLevel = (points: number) => {
  if (points === 0) return { label: 'Clean', text: 'text-emerald-400' };
  if (points <= 1.5) return { label: 'Low risk', text: 'text-emerald-400' };
  if (points <= 3) return { label: 'Some risk', text: 'text-yellow-200' };
  if (points < 5) return { label: 'High risk', text: 'text-orange-400' };
  return { label: 'Likely spam', text: 'text-red-400' };
};
const getCheckColor = (points: number): string => {
  if (points > 3) return 'text-red-400';
  if (points > 2) return 'text-orange-400';
  if (points > 1) return 'text-yellow-200';
  return '';
};

// Internal components
const SpamScoreSummary = ({ result }: { result: SpamCheckingResult }) => {
  const score = Math.max(0, 10 - result.points);
  const level = getScoreLevel(result.points);
  const checkCount = result.checks.length;
  return (
    <Stack className="shrink-0 flex-row items-center gap-4 rounded-md border border-gray-200 bg-gray-50/70 px-3 py-2 dark:border-white/10 dark:bg-white/4">
      <span className="shrink-0 font-bold tracking-tighter">
        <span className={cx('text-2xl', level.text)}>{score.toFixed(1)}</span>
        <span className="text-base text-gray-400 dark:text-neutral-500">
          /10
        </span>
      </span>
      <Stack className="min-w-0 flex-1 gap-0.5">
        <Stack className="flex-row items-center gap-2">
          <Typography variant="label">Spam score</Typography>
          <span
            className={cx(
              'flex items-center gap-1 text-xs uppercase',
              level.text
            )}
          >
            <MdOutlineShield size={12} />
            {level.label}
          </span>
        </Stack>
        <Typography variant="caption" tone="muted">
          {checkCount === 0
            ? 'No abuse indicators found.'
            : `${String(checkCount)} ${checkCount === 1 ? 'check' : 'checks'} triggered. Estimated from client-side heuristics, higher is better.`}
        </Typography>
      </Stack>
    </Stack>
  );
};

// Component
export const LinterSpam = ({
  result,
  loading = false,
}: {
  result: SpamCheckingResult | undefined;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Typography variant="caption" tone="info">
        Running client-side spam checks...
      </Typography>
    );
  }
  if (result === undefined) {
    return (
      <Typography variant="label" tone="muted">
        Open or refresh spam checks to score the current email.
      </Typography>
    );
  }
  const sortedChecks = [...result.checks].toSorted(
    (a, b) => b.points - a.points
  );
  return (
    <Stack className="gap-2">
      <SpamScoreSummary result={result} />
      {sortedChecks.length > 0 && (
        <table className="w-full border-collapse text-left text-xs">
          <tbody>
            {sortedChecks.map((check) => (
              <tr
                key={check.name}
                className="border-b border-transparent transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
              >
                <td className="py-1.5 pr-4 align-middle">
                  <span
                    className={cx(
                      'flex items-center gap-2 uppercase tracking-wide',
                      getCheckColor(check.points)
                    )}
                  >
                    <MdOutlineShield size={14} />
                    {check.name}
                  </span>
                </td>
                <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
                  {check.description}
                </td>
                <td
                  className={cx(
                    'py-1.5 text-right align-middle font-mono tracking-tighter',
                    getCheckColor(check.points)
                  )}
                >
                  -{check.points.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Stack>
  );
};
