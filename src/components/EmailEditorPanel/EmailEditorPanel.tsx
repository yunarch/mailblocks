import type { EmailEditorRef } from '@react-email/editor';
import { Suspense, useRef, useState } from 'react';
import { MdOutlineDesktopWindows } from 'react-icons/md';
import { PiCodeBold } from 'react-icons/pi';
import { viewportSizes } from '@/types/viewports';
import { Button, ButtonGroup } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { EmailEditor } from './components/EmailEditor';
import { EmailPreview } from './components/EmailPreview';

export const EmailEditorPanel = () => {
  const editorRef = useRef<EmailEditorRef>(null);
  const [mode, setMode] = useState<'editor' | 'preview'>('editor');
  const [activeViewport, setActiveViewport] = useState(viewportSizes[0]);
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
              {viewport.label}
            </Button>
          ))}
        </ButtonGroup>
        <ButtonGroup activeItem={mode === 'editor' ? 0 : 1}>
          <Button
            variant="ghost"
            onClick={() => {
              setMode('editor');
            }}
          >
            <MdOutlineDesktopWindows />
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setMode('preview');
            }}
          >
            <PiCodeBold />
          </Button>
        </ButtonGroup>
      </Stack>
      <Stack className="flex-1 p-2">
        <Stack className={mode === 'editor' ? 'flex-1' : 'hidden'}>
          <EmailEditor
            editorRef={editorRef}
            viewportWidth={activeViewport.width}
          />
        </Stack>
        {editorRef.current && mode === 'preview' && (
          <Suspense
            fallback={
              <Typography variant="caption" tone="info">
                Loading preview...
              </Typography>
            }
          >
            <EmailPreview editorRef={editorRef.current} />
          </Suspense>
        )}
      </Stack>
    </Stack>
  );
};
