import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

// Component
export const PromptComposer = ({
  ref,
  value,
  onChange,
  busy,
  refining,
  restored,
  onSend,
  onStop,
}: {
  ref?: React.Ref<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
  busy: boolean;
  refining: boolean; // Whether the conversation already has turns.
  restored: boolean; // Whether an earlier version is restored, so sending drops the later ones.
  onSend: () => void;
  onStop: () => void;
}) => {
  return (
    <Stack className="gap-2 border-t border-gray-200 p-4 dark:border-white/10">
      {restored && (
        <Typography variant="caption" tone="muted">
          Sending a prompt continues from the restored version and drops the
          later ones.
        </Typography>
      )}
      <textarea
        ref={ref}
        aria-label="Prompt"
        placeholder={
          refining
            ? 'Describe what to change, e.g. make the tone friendlier'
            : 'e.g. A welcome email for a coffee roastery with a 10% discount button'
        }
        rows={3}
        autoFocus
        value={value}
        className="w-full resize-y rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-white/10 dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-white/30"
        onChange={(event) => {
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSend();
          }
        }}
      />
      <Stack className="flex-row items-center justify-between gap-2">
        <Typography variant="caption" tone="muted">
          Changes the email in the editor. Undo with Ctrl+Z.
        </Typography>
        {busy ? (
          <Button variant="outline" size="md" onClick={onStop}>
            Stop
          </Button>
        ) : (
          <Button
            variant="solid"
            size="md"
            disabled={!value.trim()}
            onClick={onSend}
          >
            Send
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
