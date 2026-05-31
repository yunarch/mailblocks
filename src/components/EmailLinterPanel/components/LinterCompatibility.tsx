import { MdErrorOutline } from 'react-icons/md';

export type CompatibilityResult = {
  title: string;
  unsupportedClients: string[];
  url: string;
  location: { line: number; column: number };
};

function sanitize(str: string): string {
  return str.replaceAll('_', ' ');
}

interface CompatibilityProps {
  results: CompatibilityResult[];
}

export const LinterCompatibility = ({ results }: CompatibilityProps) => {
  if (results.length === 0) {
    return (
      <p className="px-1 py-3 text-xs text-gray-400 dark:text-neutral-500">
        No compatibility issues found.
      </p>
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
                <span className="flex items-center gap-2 tracking-wide text-red-400 uppercase">
                  <MdErrorOutline size={14} />
                  {sanitize(result.title)}
                </span>
              </td>
              <td className="py-1.5 pr-4 align-middle text-gray-700 dark:text-neutral-300">
                {unsupportedStr.length > 0
                  ? `Not supported in ${unsupportedStr}`
                  : null}
                <a
                  href={result.url}
                  className="ml-2 text-gray-400 underline decoration-gray-300 decoration-1 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:decoration-neutral-600 dark:hover:text-neutral-300"
                  rel="noreferrer"
                  target="_blank"
                >
                  More ↗
                </a>
              </td>
              <td className="py-1.5 text-right align-middle font-mono text-gray-400 dark:text-neutral-500">
                react:{result.location.line}:{result.location.column}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
