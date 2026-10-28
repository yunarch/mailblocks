import { Suspense, useState } from 'react';
import { MdOutlineEdit, MdOutlineRemoveRedEye } from 'react-icons/md';
import { PiCodeBold } from 'react-icons/pi';
import { useAppContext } from '@/providers/AppContextProvider';
import { viewportSizes } from '@/types/viewports';
import { Button, ButtonGroup } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { EmailEditor } from './components/EmailEditor';
import { EmailPreview } from './components/EmailPreview';
import { EmailRender } from './components/EmailRender';

const MODES = [
  { id: 'editor', label: 'Edit', Icon: MdOutlineEdit },
  { id: 'render', label: 'Rendered email', Icon: MdOutlineRemoveRedEye },
  { id: 'code', label: 'HTML code', Icon: PiCodeBold },
] as const;
type Mode = (typeof MODES)[number]['id'];

export const EmailEditorPanel = () => {
  const { editorRef } = useAppContext();
  const [mode, setMode] = useState<Mode>('editor');
  const [previewHtml, setPreviewHtml] = useState<Promise<string> | null>(null); // Created once per switch away from the editor so `use()` receives a stable promise.
  const [activeViewport, setActiveViewport] = useState(viewportSizes[0]);

  // Methods
  const changeMode = (next: Mode) => {
    if (next !== 'editor' && mode === 'editor') {
      setPreviewHtml(editorRef.current?.getEmailHTML() ?? null);
    }
    setMode(next);
  };

  // Render
  return (
    <Stack className="flex-1 rounded-lg border border-gray-200 dark:border-white/10">
      <Stack className="flex-row items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-white/10">
        <ButtonGroup
          activeItem={viewportSizes.findIndex(
            (v) => v.id === activeViewport.id
          )}
        >
          {viewportSizes.map((viewport) => (
            <Button
              key={viewport.id}
              variant="ghost"
              onClick={() => {
                setActiveViewport(viewport);
              }}
            >
              {<viewport.Icon />}
              <Stack className="flex-row gap-1">
                <Typography variant="bodySm" tone="subtle">
                  {viewport.label}
                </Typography>
                <Typography variant="caption" tone="muted">
                  ({viewport.width}px)
                </Typography>
              </Stack>
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup activeItem={MODES.findIndex((m) => m.id === mode)}>
          {MODES.map(({ id, label, Icon }) => (
            <Button
              key={id}
              variant="ghost"
              aria-label={label}
              title={label}
              onClick={() => {
                changeMode(id);
              }}
            >
              <Icon />
            </Button>
          ))}
        </ButtonGroup>
      </Stack>
      <Stack className="flex-1 p-2">
        <Stack className={mode === 'editor' ? 'flex-1' : 'hidden'}>
          <EmailEditor
            editorRef={editorRef}
            viewportWidth={activeViewport.width}
          />
        </Stack>
        {previewHtml && mode !== 'editor' && (
          <Suspense
            fallback={
              <Typography variant="caption" tone="info">
                Loading preview...
              </Typography>
            }
          >
            {mode === 'render' ? (
              <EmailRender
                html={previewHtml}
                viewportWidth={activeViewport.width}
              />
            ) : (
              <EmailPreview html={previewHtml} />
            )}
          </Suspense>
        )}
      </Stack>
    </Stack>
  );
};
