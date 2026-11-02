import { MdRestore } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import type { AiTurn } from '@/extensions/ai/design';
import { Button } from '@/ui/Button';
import { Typography } from '@/ui/Typography';

export type PendingPrompt = { prompt: string; error?: string };

const promptBubble =
  'max-w-[85%] self-end rounded-lg bg-gray-100 px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap text-gray-900 dark:bg-white/10 dark:text-neutral-200';

// Component
export const Conversation = ({
  turns,
  current,
  pending,
  busy,
  onRestore,
}: {
  turns: AiTurn[];
  current: number;
  pending: PendingPrompt | null;
  busy: boolean;
  onRestore: (index: number) => void;
}) => {
  if (turns.length === 0 && !pending) {
    return (
      <Typography variant="body" tone="muted">
        Describe the email you want, or what to change in the current one. Each
        prompt continues from what is in the editor, including your own edits.
      </Typography>
    );
  }
  return (
    <ol aria-label="Conversation" className="flex flex-col gap-5">
      {turns.map((turn, index) => (
        <li
          key={turn.id}
          className={cx('flex flex-col gap-2', index > current && 'opacity-50')}
        >
          <p className={promptBubble}>{turn.prompt}</p>
          <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-neutral-300">
            {turn.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          {index !== current && (
            <Button
              variant="outline"
              className="self-start"
              disabled={busy}
              aria-label={`Restore this version ("${turn.prompt}")`}
              onClick={() => {
                onRestore(index);
              }}
            >
              <MdRestore />
              Restore this version
            </Button>
          )}
        </li>
      ))}
      {pending && (
        <li className="flex flex-col gap-2">
          <p className={promptBubble}>{pending.prompt}</p>
          {pending.error ? (
            <Typography variant="body" tone="danger" role="alert">
              {pending.error}
            </Typography>
          ) : (
            <span
              role="status"
              aria-label="Thinking"
              className="flex items-center gap-1 py-2"
            >
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-gray-400 dark:bg-neutral-500"
                  style={{ animationDelay: `${String(delay)}ms` }}
                />
              ))}
            </span>
          )}
        </li>
      )}
    </ol>
  );
};
