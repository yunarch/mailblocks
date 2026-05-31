import { MdErrorOutline } from 'react-icons/md';
import type { CompatibilityResult } from '@/types/linter';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

export const LinterCompatibility = ({
  results,
  loading = false,
}: {
  results: CompatibilityResult[] | undefined;
  loading?: boolean;
}) => {
  if (loading) {
    return (
      <Typography variant="caption" tone="info">
        Running compatibility checks...
      </Typography>
    );
  }
  if (results === undefined) {
    return (
      <Typography variant="label" tone="muted">
        Open or refresh compatibility to check the current email.
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
          No compatibility issues found.
        </Typography>
      </Stack>
    );
  }
  return (
    <table className="w-full border-collapse text-left text-xs">
      <tbody>
        {results.map((result, i) => {
          const unsupportedStr = result.unsupportedClients.join(', ');
          return (
            <tr
              key={i}
              className="border-b border-transparent transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
            >
              <td className="py-1.5 pr-4 align-middle">
                <Stack className="flex-row items-center gap-2 tracking-wide text-red-400 uppercase">
                  <MdErrorOutline size={14} />
                  <span>{result.title}</span>
                  <span className="text-gray-400 dark:text-neutral-500">
                    {result.category}
                  </span>
                </Stack>
              </td>
              <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
                {unsupportedStr.length > 0
                  ? `Not supported in ${unsupportedStr}`
                  : null}
                <a
                  href={result.url}
                  className="ml-2 text-gray-400 underline decoration-gray-300 decoration-1 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:decoration-neutral-600 dark:hover:text-neutral-300"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  More ↗
                </a>
              </td>
              <td className="py-1.5 text-right align-middle font-mono text-gray-400 dark:text-neutral-500">
                html:{result.location.line}:{result.location.column}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
