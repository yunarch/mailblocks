import { MdArrowDropDown, MdInfoOutline, MdWarningAmber } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import type { CompatibilityResult } from '@/types/linter';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { EMAIL_CLIENTS } from '@/utils/lintEmailCompatibility';

// Internal components
const EmailClientBadge = ({ label }: { label: string }) => {
  return (
    <span
      className={cx(
        'inline-flex h-6 max-w-36 items-center rounded-full border px-2 text-[11px] leading-none',
        'border-gray-200 text-gray-500 dark:border-white/10 dark:text-neutral-500'
      )}
      title={label}
    >
      <span className="truncate">{label}</span>
    </span>
  );
};
const EmailClientsSelect = ({
  selectedEmailClients,
  onToggleEmailClient,
}: {
  selectedEmailClients: Set<string>;
  onToggleEmailClient: (key: string) => void;
}) => {
  const selectedEmailClientLabels = EMAIL_CLIENTS.filter((client) =>
    selectedEmailClients.has(client.key)
  ).map((client) => client.label);
  const selectedPreview = selectedEmailClientLabels.slice(0, 4);
  const selectedOverflow =
    selectedEmailClientLabels.length - selectedPreview.length;
  return (
    <details className="group rounded-md border border-gray-200 bg-gray-50/70 dark:border-white/10 dark:bg-white/4">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-2 select-none [&::-webkit-details-marker]:hidden">
        <Stack className="flex-1 gap-1">
          <Stack className="flex-row items-center gap-2">
            <Typography variant="label">Email clients</Typography>
            <Typography variant="caption" tone="muted">
              {selectedEmailClientLabels.length} selected
            </Typography>
          </Stack>
          <Stack className="min-w-0 flex-row flex-wrap gap-1">
            {selectedPreview.map((label) => (
              <EmailClientBadge key={label} label={label} />
            ))}
            {selectedOverflow > 0 && (
              <EmailClientBadge label={`+${selectedOverflow} more`} />
            )}
            {selectedPreview.length === 0 && (
              <Typography variant="caption" tone="warning">
                Select at least one client to run compatibility checks.
              </Typography>
            )}
          </Stack>
        </Stack>
        <span className="shrink-0 text-xs text-gray-400 transition-transform group-open:rotate-180 dark:text-neutral-500">
          <MdArrowDropDown size={20} />
        </span>
      </summary>
      <div className="grid grid-cols-2 gap-1.5 border-t border-gray-200 p-2 sm:grid-cols-4 lg:grid-cols-6 dark:border-white/10">
        {EMAIL_CLIENTS.map((client) => {
          const active = selectedEmailClients.has(client.key);
          return (
            <button
              key={client.key}
              type="button"
              onClick={() => {
                onToggleEmailClient(client.key);
              }}
              className={cx(
                'flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md border px-2 text-left text-xs transition-colors',
                active
                  ? 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-100'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-white dark:border-white/10 dark:text-neutral-500 dark:hover:border-white/20 dark:hover:bg-white/5'
              )}
            >
              <span className="truncate">{client.label}</span>
              <span
                className={cx(
                  'size-2 shrink-0 rounded-full',
                  active
                    ? 'bg-sky-500 dark:bg-sky-300'
                    : 'bg-gray-200 dark:bg-white/15'
                )}
              />
            </button>
          );
        })}
      </div>
    </details>
  );
};

const CompatibilityResults = ({
  results,
  loading,
}: {
  results: CompatibilityResult[] | undefined;
  loading: boolean;
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
    <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-x-4 gap-y-0 text-xs">
      {results.map((result, i) => {
        const isWarning = result.severity === 'warning';
        return (
          <div
            key={`${result.title}-${String(i)}`}
            className="col-span-4 grid grid-cols-subgrid border-b border-transparent py-1.5 transition-colors last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/3"
          >
            <div>
              <Typography
                variant="label"
                tone={isWarning ? 'warning' : 'info'}
                uppercase
                className="flex flex-row items-center gap-2"
              >
                {isWarning ? (
                  <MdWarningAmber size={14} />
                ) : (
                  <MdInfoOutline size={14} />
                )}
                <span>{result.title}</span>
              </Typography>
            </div>
            <Typography variant="label" tone="subtle" uppercase>
              {result.category}
            </Typography>
            <Stack className="gap-0.5">
              <Typography variant="bodySm">
                {result.unsupportedClients.length > 0 && (
                  <span className="block">
                    Not supported in {result.unsupportedClients.join(', ')}
                  </span>
                )}
                {result.partialClients.length > 0 && (
                  <span className="block">
                    Partially supported in {result.partialClients.join(', ')}
                  </span>
                )}
              </Typography>
              {result.notes.length > 0 && (
                <Typography variant="caption" tone="muted">
                  {result.notes.join(' ')}
                </Typography>
              )}
            </Stack>
            <Stack className="items-end gap-0.5">
              <a
                href={result.url}
                className="text-gray-400 underline decoration-gray-300 decoration-1 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:decoration-neutral-600 dark:hover:text-neutral-300"
                rel="noopener noreferrer"
                target="_blank"
              >
                More ↗
              </a>
              <Typography variant="caption" tone="muted">
                html:{result.location.line}:{result.location.column}
              </Typography>
            </Stack>
          </div>
        );
      })}
    </div>
  );
};

// Component
export const LinterCompatibility = ({
  results,
  loading = false,
  selectedEmailClients,
  onToggleEmailClient,
}: {
  results: CompatibilityResult[] | undefined;
  loading?: boolean;
  selectedEmailClients: Set<string>;
  onToggleEmailClient: (key: string) => void;
}) => {
  return (
    <Stack className="gap-2">
      <EmailClientsSelect
        selectedEmailClients={selectedEmailClients}
        onToggleEmailClient={onToggleEmailClient}
      />
      <CompatibilityResults results={results} loading={loading} />
    </Stack>
  );
};
