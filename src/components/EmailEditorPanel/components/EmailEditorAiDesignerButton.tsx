import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { applyEmailDesign, generateEmailDesign } from '@/extensions/ai/design';
import { aiEngine } from '@/extensions/ai/engine';
import { useAiEngine } from '@/hooks/useAiEngine';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

// Component displaying the status of the AI model and handling its loading.
const ModelStatus = ({
  state,
  onLoad,
}: {
  state: ReturnType<typeof useAiEngine>['state'];
  onLoad: () => void;
}) => {
  switch (state.status) {
    case 'unsupported': {
      return (
        <Typography variant="body" tone="muted">
          This needs WebGPU, which this browser or device does not support.
        </Typography>
      );
    }
    case 'checking': {
      return (
        <Typography variant="body" tone="muted">
          Checking for the model…
        </Typography>
      );
    }
    case 'download': {
      return (
        <>
          <Typography variant="body" tone="muted">
            The AI runs entirely in your browser: nothing you write leaves your
            device. It needs to download a small language model (about 1 GB)
            once, which is then stored in your browser.
          </Typography>
          <Button
            variant="solid"
            size="md"
            className="self-start"
            onClick={onLoad}
          >
            Download model
          </Button>
        </>
      );
    }
    case 'loading': {
      return (
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
      );
    }
    case 'error': {
      return (
        <>
          <Typography variant="body" tone="danger">
            {state.message}
          </Typography>
          <Button
            variant="solid"
            size="md"
            className="self-start"
            onClick={onLoad}
          >
            Try again
          </Button>
        </>
      );
    }
    case 'ready': {
      return null;
    }
  }
};

// Component
export const EmailEditorAiDesignerButton = () => {
  const { editorRef, variables } = useAppContext();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef(0);
  const runningRef = useRef(false);
  const { state, load } = useAiEngine(open);

  // Methods
  // Bumping the session makes a generation still running ignore its result.
  const close = useCallback(() => {
    sessionRef.current++;
    if (runningRef.current) aiEngine.interruptGeneration();
    runningRef.current = false;
    setOpen(false);
    setPrompt('');
    setError('');
    setBusy(false);
  }, []);
  const run = async () => {
    const editor = editorRef.current?.editor;
    if (
      state.status !== 'ready' ||
      runningRef.current ||
      !prompt.trim() ||
      !editor
    ) {
      return;
    }
    const session = sessionRef.current;
    const before = editor.getHTML();
    runningRef.current = true;
    setBusy(true);
    setError('');
    try {
      const design = await generateEmailDesign(state.engine, {
        prompt: prompt.trim(),
        variables,
      });
      if (sessionRef.current !== session || !design) return;
      if (editor.isDestroyed || editor.getHTML() !== before) {
        throw new Error(
          'The email changed while generating. Close this dialog and try again.'
        );
      }
      applyEmailDesign(editor, design);
      runningRef.current = false;
      close();
    } catch (error_) {
      if (sessionRef.current === session) {
        setError(
          error_ instanceof Error ? error_.message : 'The generation failed.'
        );
      }
    } finally {
      if (sessionRef.current === session) {
        runningRef.current = false;
        setBusy(false);
      }
    }
  };

  // Escape closes the dialog even when focus left the disabled prompt while generating.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, close]);

  useEffect(
    () => () => {
      sessionRef.current++;
      if (runningRef.current) aiEngine.interruptGeneration();
    },
    []
  );

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
      {open
        ? createPortal(
            <Stack className="fixed inset-0 z-50 items-center justify-center bg-black/60 p-4">
              <Stack
                role="dialog"
                aria-modal="true"
                aria-label="Design with AI"
                className="max-h-full w-full max-w-2xl gap-3 overflow-auto rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950"
              >
                <Typography as="h2" variant="h5" className="font-semibold">
                  Design with AI
                </Typography>
                {state.status === 'ready' ? (
                  <>
                    <Typography variant="body" tone="muted">
                      Describe the email you want, such as its purpose, audience
                      and tone.
                    </Typography>
                    <textarea
                      aria-label="Prompt"
                      placeholder="A welcome email for a coffee shop business"
                      autoFocus
                      disabled={busy}
                      value={prompt}
                      className="h-32 w-full resize-y rounded-md border border-gray-200 bg-white p-2 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 dark:border-white/10 dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-white/30"
                      onChange={(event) => {
                        setPrompt(event.target.value);
                      }}
                    />
                    <Typography variant="caption" tone="muted">
                      The design replaces the current email. Press Ctrl+Z (⌘Z on
                      Mac) in the editor to go back.
                    </Typography>
                    {busy && (
                      <Typography variant="caption" tone="info" role="status">
                        Designing... this runs on your device and can take a
                        minute.
                      </Typography>
                    )}
                    {error && (
                      <Typography variant="caption" tone="danger" role="alert">
                        {error}
                      </Typography>
                    )}
                  </>
                ) : (
                  <ModelStatus
                    state={state}
                    onLoad={() => {
                      void load();
                    }}
                  />
                )}
                <Stack className="mt-2 flex-row justify-end gap-2">
                  <Button variant="outline" size="md" onClick={close}>
                    Cancel
                  </Button>
                  {state.status === 'ready' && (
                    <Button
                      variant="solid"
                      size="md"
                      disabled={busy || !prompt.trim()}
                      onClick={() => {
                        void run();
                      }}
                    >
                      Generate
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Stack>,
            document.body
          )
        : null}
    </>
  );
};
