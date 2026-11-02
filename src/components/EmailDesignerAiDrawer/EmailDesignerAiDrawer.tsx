import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdClose } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import {
  describeDesignChange,
  generateEmailDesign,
  getEmailBody,
  readEmailDesign,
  renderEmailDesign,
  setEmailBody,
  type AiConversation,
} from '@/extensions/ai/design';
import { aiEngine } from '@/extensions/ai/engine';
import { useAiEngine } from '@/hooks/useAiEngine';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { Conversation, type PendingPrompt } from './components/Conversation';
import { ModelStatus } from './components/ModelStatus';
import { PromptComposer } from './components/PromptComposer';

export const EmailDesignerAiDrawer = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const { editorRef, variables, selectedTemplate } = useAppContext();
  const [conversation, setConversation] = useState<
    (AiConversation & { templateId: string }) | null
  >(null);
  const aiConversation =
    conversation?.templateId === selectedTemplate.id ? conversation : null;
  const setAiConversation = (value: AiConversation | null) => {
    setConversation(value && { ...value, templateId: selectedTemplate.id });
  };
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingPrompt | null>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const { state, load } = useAiEngine(open);
  const turns = aiConversation?.turns ?? [];
  const current = aiConversation?.current ?? -1;

  // Methods
  const send = async () => {
    const text = prompt.trim();
    const editor = editorRef.current?.editor;
    if (state.status !== 'ready' || busy || !text || !editor) return;
    const kept = turns.slice(0, current + 1); // Later turns are dropped, so the conversation continues from the restored one.
    const before = readEmailDesign(getEmailBody(editor)); // The editor is the source of truth, so manual edits are part of what the model changes.
    setBusy(true);
    setPending({ prompt: text });
    setPrompt('');
    try {
      const design = await generateEmailDesign(state.engine, {
        prompt: text,
        current: before,
        history: kept.map((turn) => turn.prompt),
        variables,
      });
      if (!design) {
        setPending(null);
        setPrompt(text);
        return;
      }
      setEmailBody(editor, renderEmailDesign(design, before));
      setAiConversation({
        turns: [
          ...kept,
          {
            id: crypto.randomUUID(),
            prompt: text,
            changes: describeDesignChange(before.design, design),
            body: getEmailBody(editor).map(({ json }) => json),
          },
        ],
        current: kept.length,
      });
      setPending(null);
    } catch (error) {
      setPending({
        prompt: text,
        error:
          error instanceof Error ? error.message : 'The generation failed.',
      });
      setPrompt(text);
    } finally {
      setBusy(false);
      promptRef.current?.focus(); // Send becomes Stop while generating, so focus would otherwise be lost.
    }
  };
  const restore = (index: number) => {
    const editor = editorRef.current?.editor;
    if (!editor || !aiConversation) return;
    setEmailBody(editor, turns[index].body);
    setAiConversation({ ...aiConversation, current: index });
  };

  // Keeps the latest message in view, like a chat.
  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [turns.length, pending]);

  // Render
  if (!open) return null;
  return createPortal(
    <Stack
      role="dialog"
      aria-label="Design with AI"
      className={cx(
        'fixed inset-y-0 left-0 z-50 w-100 max-w-full border-r transition-transform duration-200 starting:-translate-x-full',
        'border-gray-200 bg-white shadow-2xl shadow-black/10',
        'dark:border-white/10 dark:bg-neutral-950 dark:shadow-black/40'
      )}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <Stack className="flex-row items-center justify-between gap-2 border-b border-gray-200 px-4 py-3 dark:border-white/10">
        <Typography as="h2" variant="h6">
          Design with AI
        </Typography>
        <Stack className="flex-row items-center gap-1">
          {state.status === 'ready' && (turns.length > 0 || pending) && (
            <Button
              variant="ghost"
              disabled={busy}
              title="Clear the conversation. The email stays as it is."
              onClick={() => {
                setAiConversation(null);
                setPending(null);
              }}
            >
              New chat
            </Button>
          )}
          <Button variant="ghost" aria-label="Close" onClick={onClose}>
            <MdClose />
          </Button>
        </Stack>
      </Stack>
      <Stack ref={threadRef} className="flex-1 gap-3 overflow-auto p-4">
        {state.status === 'ready' ? (
          <Conversation
            turns={turns}
            current={current}
            pending={pending}
            busy={busy}
            onRestore={restore}
          />
        ) : (
          <ModelStatus
            state={state}
            onLoad={() => {
              void load();
            }}
          />
        )}
      </Stack>
      {state.status === 'ready' && (
        <PromptComposer
          ref={promptRef}
          value={prompt}
          onChange={setPrompt}
          busy={busy}
          refining={turns.length > 0}
          restored={current < turns.length - 1}
          onSend={() => {
            void send();
          }}
          onStop={() => {
            aiEngine.interruptGeneration();
          }}
        />
      )}
    </Stack>,
    document.body
  );
};
