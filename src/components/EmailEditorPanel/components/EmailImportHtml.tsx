import { useEffect, useRef, useState } from 'react';
import { MdOutlineFileUpload } from 'react-icons/md';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { decodeHtml, importHtmlEmail } from '@/utils/importHtmlEmail';

/**
 * Opens the browser file picker for an HTML file.
 *
 * @param onFile - Called with the picked file.
 */
function pickHtmlFile(onFile: (file: File) => void) {
  const input = document.createElement('input');
  input.accept = '.html,.htm,text/html';
  input.type = 'file';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) onFile(file);
  });
  input.click();
}

// Component
export const EmailImportHtml = () => {
  const { selectTemplate } = useAppContext();
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState('');
  const sessionRef = useRef(0);

  // Methods
  const close = () => {
    sessionRef.current++;
    setOpen(false);
    setHtml('');
  };
  const importHtml = (content: string, fileName?: string) => {
    close();
    selectTemplate(importHtmlEmail(content, fileName));
  };
  const chooseFile = () => {
    pickHtmlFile((file) => {
      const fileSession = ++sessionRef.current;
      void file.arrayBuffer().then((buffer) => {
        if (sessionRef.current !== fileSession) return;
        importHtml(decodeHtml(buffer), file.name);
      });
    });
  };

  // Incremented whenever the dialog closes, so pending file reads are ignored
  useEffect(
    () => () => {
      sessionRef.current++;
    },
    []
  );

  // Render
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Import HTML"
        title="Import HTML"
        onClick={() => {
          setOpen(true);
        }}
      >
        <MdOutlineFileUpload />
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
            aria-label="Import HTML"
            className="w-full max-w-2xl gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-950"
          >
            <Typography as="h2" variant="h5" className="font-semibold">
              Import HTML
            </Typography>
            <Typography variant="body" tone="muted">
              Paste the HTML of an email or choose an HTML file. Styles are
              inlined, and scripts and unsupported markup are removed.
            </Typography>
            <textarea
              aria-label="HTML"
              placeholder="<html>…</html>"
              spellCheck={false}
              autoFocus
              value={html}
              className="mt-2 h-64 w-full resize-y rounded-md border border-gray-200 bg-white p-2 font-mono text-xs text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:border-white/10 dark:bg-black dark:text-neutral-200 dark:focus-visible:ring-white/30"
              onChange={(event) => {
                setHtml(event.target.value);
              }}
            />
            <Stack className="mt-4 flex-row justify-between gap-2">
              <Button variant="outline" size="md" onClick={chooseFile}>
                Choose file…
              </Button>
              <Stack className="flex-row gap-2">
                <Button variant="outline" size="md" onClick={close}>
                  Cancel
                </Button>
                <Button
                  variant="solid"
                  size="md"
                  disabled={!html.trim()}
                  onClick={() => {
                    importHtml(html);
                  }}
                >
                  Import
                </Button>
              </Stack>
            </Stack>
          </Stack>
        </Stack>
      ) : null}
    </>
  );
};
