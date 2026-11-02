import { useState } from 'react';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { generateEmailDesign, renderEmailDesign } from '@/extensions/ai/design';
import { aiEngine } from '@/extensions/ai/engine';
import { useAiEngine } from '@/hooks/useAiEngine';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button, ButtonGroup } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

const MODES = [
  { id: 'generate', label: 'New design' },
  { id: 'edit', label: 'Edit current design' },
] as const;
type Mode = (typeof MODES)[number]['id'];

// Component
export const EmailEditorAiDesignerButton = () => {
  const { editorRef, variables, aiDesign, setAiDesign } = useAppContext();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('edit');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { state, load } = useAiEngine(open);

  // Only the last AI design can be refined, and only while the email still matches it.
  const canEdit =
    open &&
    aiDesign !== null &&
    editorRef.current?.editor?.getHTML() === aiDesign.html;
  const editing = canEdit && mode === 'edit';

  // Methods
  const reset = () => {
    setOpen(false);
    setPrompt('');
    setError('');
  };
  const close = () => {
    if (busy) aiEngine.interruptGeneration();
    reset();
  };
  const run = async () => {
    if (state.status !== 'ready') return;
    setBusy(true);
    setError('');
    try {
      const design = await generateEmailDesign(state.engine, {
        prompt: prompt.trim(),
        current: editing ? aiDesign.design : undefined,
        variables,
      });
      const editor = editorRef.current?.editor;
      if (!design || !editor) return;
      editor.commands.setContent(renderEmailDesign(design));
      setAiDesign({ design, html: editor.getHTML() });
      reset();
    } catch (error_) {
      setError(
        error_ instanceof Error ? error_.message : 'The generation failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Render
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Design with AI"
        title="Design with AI"
        onClick={() => {
          setOpen(true);
        }}
      >
        <MdOutlineAutoAwesome />
      </Button>
      {open ? (
        <Stack
          className="fixed inset-0 z-50 items-center justify-center bg-black/60 p-4"
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
        >
          <Stack
            role="dialog"
            aria-modal="true"
            aria-label="Design with AI"
            className="w-full max-w-2xl gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950"
          >
            <Typography as="h2" variant="h5" className="font-semibold">
              Design with AI
            </Typography>
            {state.status === 'unsupported' && (
              <Typography variant="body" tone="muted">
                This needs WebGPU, which this browser or device does not
                support.
              </Typography>
            )}
            {state.status === 'checking' && (
              <Typography variant="body" tone="muted">
                Checking for the model…
              </Typography>
            )}
            {state.status === 'download' && (
              <>
                <Typography variant="body" tone="muted">
                  The AI runs entirely in your browser: nothing you write leaves
                  your device. It needs to download a small language model
                  (about 1 GB) once, which is then stored in your browser.
                </Typography>
                <Stack className="mt-4 flex-row justify-end gap-2">
                  <Button variant="outline" size="md" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    size="md"
                    onClick={() => {
                      void load();
                    }}
                  >
                    Download model
                  </Button>
                </Stack>
              </>
            )}
            {state.status === 'loading' && (
              <>
                <Typography variant="body" tone="muted">
                  Loading the model. This can take a few minutes the first time.
                </Typography>
                <progress
                  aria-label="Model download progress"
                  value={state.progress}
                  max={1}
                  className="h-2 w-full accent-sky-500"
                />
                <Typography variant="caption" tone="muted">
                  {state.text}
                </Typography>
              </>
            )}
            {state.status === 'error' && (
              <>
                <Typography variant="body" tone="danger">
                  {state.message}
                </Typography>
                <Stack className="mt-4 flex-row justify-end gap-2">
                  <Button variant="outline" size="md" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    size="md"
                    onClick={() => {
                      void load();
                    }}
                  >
                    Try again
                  </Button>
                </Stack>
              </>
            )}
            {state.status === 'ready' && (
              <>
                {canEdit && (
                  <ButtonGroup
                    className="self-start"
                    activeItem={MODES.findIndex((m) => m.id === mode)}
                  >
                    {MODES.map(({ id, label }) => (
                      <Button
                        key={id}
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setMode(id);
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </ButtonGroup>
                )}
                <Typography variant="body" tone="muted">
                  {editing
                    ? 'Describe what to change in the current design.'
                    : 'Describe the email you want. It replaces the current content, and you can undo it.'}
                </Typography>
                <textarea
                  aria-label="Prompt"
                  placeholder={
                    editing
                      ? 'Make the tone friendlier and add a divider before the footer'
                      : 'A welcome email for new subscribers of a coffee roastery, with a 10% discount button'
                  }
                  autoFocus
                  disabled={busy}
                  value={prompt}
                  className="mt-2 h-32 w-full resize-y rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 dark:border-white/10 dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-white/30"
                  onChange={(event) => {
                    setPrompt(event.target.value);
                  }}
                />
                {busy && (
                  <Typography variant="caption" tone="info">
                    Designing… this runs on your device and can take a minute.
                  </Typography>
                )}
                {error && (
                  <Typography variant="caption" tone="danger" role="alert">
                    {error}
                  </Typography>
                )}
                <Stack className="mt-4 flex-row justify-end gap-2">
                  <Button variant="outline" size="md" onClick={close}>
                    Cancel
                  </Button>
                  <Button
                    variant="solid"
                    size="md"
                    disabled={busy || !prompt.trim()}
                    onClick={() => {
                      void run();
                    }}
                  >
                    {editing ? 'Apply changes' : 'Generate'}
                  </Button>
                </Stack>
              </>
            )}
            {(state.status === 'unsupported' ||
              state.status === 'checking' ||
              state.status === 'loading') && (
              <Stack className="mt-4 flex-row justify-end gap-2">
                <Button variant="outline" size="md" onClick={close}>
                  {state.status === 'unsupported' ? 'Close' : 'Cancel'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      ) : null}
    </>
  );
};
