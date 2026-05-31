import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

export function BlockerModal({
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Stack className="fixed inset-0 z-50 items-center justify-center bg-black/60 p-4">
      <Stack
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950"
      >
        <Typography as="h2" variant="h5" className="font-semibold">
          {title}
        </Typography>
        <Typography variant="body" tone="muted">
          {message}
        </Typography>
        <Stack className="mt-4 flex flex-row justify-end gap-2">
          <Button variant="outline" size="md" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button variant="solid" size="md" onClick={onConfirm}>
            {confirmText}
          </Button>
        </Stack>
      </Stack>
    </Stack>
  );
}
