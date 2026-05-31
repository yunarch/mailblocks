import { MdOutlineShield } from 'react-icons/md';
import { twJoin } from 'tailwind-merge';

export type SpamCheckingResult = {
  checks: {
    name: string;
    description: string;
    points: number;
  }[];
  isSpam: boolean;
  points: number;
};

function sanitize(str: string): string {
  return str.replaceAll(/_/g, ' ');
}

function getScoreColor(points: number): string {
  if (points >= 5) return 'text-red-400';
  if (points > 3) return 'text-orange-400';
  if (points > 1.5) return 'text-yellow-200';
  if (points === 0) return 'text-emerald-400';
  return '';
}

function getCheckColor(points: number): string {
  if (points > 3) return 'text-red-400';
  if (points > 2) return 'text-orange-400';
  if (points > 1) return 'text-yellow-200';
  return '';
}

interface SpamProps {
  result: SpamCheckingResult;
}

export const Spam = ({ result }: SpamProps) => {
  const score = 10 - result.points;
  const sortedChecks = [...result.checks].toSorted(
    (a, b) => b.points - a.points
  );

  return (
    <table className="w-full border-collapse text-left text-xs">
      <tbody>
        <tr className="sticky top-0 border-b border-gray-200 bg-white dark:border-white/10 dark:bg-black">
          <td className="py-1.5 pr-4 align-middle uppercase">
            <span
              className={twJoin(
                'flex items-center gap-2',
                getScoreColor(result.points)
              )}
            >
              <MdOutlineShield size={14} />
              Score
            </span>
          </td>
          <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
            {result.points === 0
              ? 'Congratulations! Your email is clean of abuse indicators.'
              : 'Higher scores are better'}
          </td>
          <td className="py-1.5 text-right align-middle font-bold tracking-tighter">
            <span className={twJoin('text-2xl', getScoreColor(result.points))}>
              {score.toFixed(1)}
            </span>{' '}
            <span className="text-base text-gray-400 dark:text-neutral-500">
              / 10
            </span>
          </td>
        </tr>
        {sortedChecks.map((check) => (
          <tr
            key={check.name}
            className="border-b border-transparent transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
          >
            <td className="py-1.5 pr-4 align-middle">
              <span
                className={twJoin(
                  'flex items-center gap-2 uppercase tracking-wide',
                  getCheckColor(check.points)
                )}
              >
                <MdOutlineShield
                  size={14}
                  className={getCheckColor(check.points)}
                />
                {sanitize(check.name)}
              </span>
            </td>
            <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
              {check.description}
            </td>
            <td
              className={twJoin(
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
  );
};
