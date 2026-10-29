import type { EmailEditorRef } from '@react-email/editor';
import { Suspense, useState } from 'react';
import { MdOutlineDesktopWindows, MdOutlineRemoveRedEye } from 'react-icons/md';
import { PiCodeBold } from 'react-icons/pi';
import { useAppContext } from '@/providers/AppContextProvider';
import { DEFAULT_VIEWPORT_SIZE, viewportSizes } from '@/types/viewports';
import { Button, ButtonGroup } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Switch } from '@/ui/Switch';
import { Typography } from '@/ui/Typography';
import { EmailEditor } from './components/EmailEditor';
import { EmailHtmlCode } from './components/EmailHtmlCode';
import { EmailPreview } from './components/EmailPreview';

const MODES = [
  { id: 'editor', label: 'Editor', Icon: MdOutlineDesktopWindows },
  { id: 'code', label: 'HTML code', Icon: PiCodeBold },
] as const;
type Mode = (typeof MODES)[number]['id'];

export const EmailEditorPanel = () => {
  const { editorRef } = useAppContext();
  const [mode, setMode] = useState<Mode>('editor');
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<Promise<string> | null>(null); // Created once per switch away from editing so `use()` receives a stable promise.
  const [activeViewport, setActiveViewport] = useState(DEFAULT_VIEWPORT_SIZE);
  const [showEmailClientFrame, setShowEmailClientFrame] = useState(true);
  const isEditing = mode === 'editor' && !preview;

  // Methods
  const changeView = (nextMode: Mode, nextPreview: boolean) => {
    const willEdit = nextMode === 'editor' && !nextPreview;
    if (isEditing && !willEdit) {
      setPreviewHtml(editorRef.current?.getEmailHTML() ?? null);
    }
    setMode(nextMode);
    setPreview(nextPreview);
  };
  const handleEditorReady = (ref: EmailEditorRef) => {
    if (!isEditing) setPreviewHtml(ref.getEmailHTML());
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
        <Stack className="flex-row items-center gap-3">
          {mode === 'editor' && (
            <Switch
              checked={preview}
              title="Show the rendered email instead of the editor"
              label={
                <span className="flex items-center gap-1.5">
                  <MdOutlineRemoveRedEye />
                  Preview
                </span>
              }
              onChange={(checked) => {
                changeView(mode, checked);
              }}
            />
          )}
          <ButtonGroup activeItem={MODES.findIndex((m) => m.id === mode)}>
            {MODES.map(({ id, label, Icon }) => (
              <Button
                key={id}
                variant="ghost"
                aria-label={label}
                title={label}
                onClick={() => {
                  changeView(id, preview);
                }}
              >
                <Icon />
              </Button>
            ))}
          </ButtonGroup>
        </Stack>
      </Stack>
      <Stack className="flex-1 p-2">
        <Stack className={isEditing ? 'flex-1' : 'hidden'}>
          <EmailEditor
            editorRef={editorRef}
            viewportWidth={activeViewport.width}
            onReady={handleEditorReady}
          />
        </Stack>
        {previewHtml && !isEditing && (
          <Suspense
            fallback={
              <Typography variant="caption" tone="info">
                Loading preview...
              </Typography>
            }
          >
            {mode === 'editor' ? (
              <EmailPreview
                html={previewHtml}
                viewport={activeViewport}
                showEmailClientFrame={showEmailClientFrame}
                onShowEmailClientFrameChange={setShowEmailClientFrame}
              />
            ) : (
              <EmailHtmlCode html={previewHtml} />
            )}
          </Suspense>
        )}
      </Stack>
    </Stack>
  );
};
