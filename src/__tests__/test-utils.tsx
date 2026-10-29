import type { Editor } from '@tiptap/core';
import { useEffect } from 'react';
import { expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';
import { EmailEditorPanel } from '@/components/EmailEditorPanel/EmailEditorPanel';
import {
  AppContextProvider,
  useAppContext,
} from '@/providers/AppContextProvider';

type AppContext = ReturnType<typeof useAppContext>;

// A helper component that exposes the app context to tests via a callback.
const ContextProbe = ({
  onContext,
}: {
  onContext: (context: AppContext) => void;
}) => {
  const context = useAppContext();
  useEffect(() => {
    onContext(context);
  }, [context, onContext]);
  return null;
};

/**
 * Renders the given UI (the whole app by default) inside the app context and
 * waits until the email editor is ready.
 *
 * @param ui - The UI to render inside the app context.
 * @returns The render result, accessors for the live editor and context, and
 * `exportEmail()` to parse the HTML the editor would export.
 */
export async function renderApp(ui: React.ReactNode = <App />) {
  const state: { context?: AppContext } = {};
  const screen = await render(
    <AppContextProvider>
      <ContextProbe
        onContext={(context) => {
          state.context = context;
        }}
      />
      {ui}
    </AppContextProvider>
  );
  const getContext = () => {
    if (!state.context) throw new Error('The app context is not available');
    return state.context;
  };
  const getEditor = (): Editor => {
    const editor = getContext().editorRef.current?.editor;
    if (!editor) throw new Error('The email editor is not ready');
    return editor;
  };
  const exportEmail = async () => {
    const html = await getContext().editorRef.current?.getEmailHTML();
    if (!html) throw new Error('The email could not be exported');
    return new DOMParser().parseFromString(html, 'text/html');
  };
  await expect.poll(() => getContext().editorVersion).toBeGreaterThan(0);
  return { screen, getContext, getEditor, exportEmail };
}

/**
 * Renders the editor panel on its own, filling the page like in the app
 * layout, optionally starting from the given email content.
 *
 * @param html - The email body to start from.
 * @returns The `renderApp` result, plus the live editor.
 */
export async function renderEditorPanel(html?: string) {
  const result = await renderApp(
    <div className="flex h-svh flex-col">
      <EmailEditorPanel />
    </div>
  );
  const editor = result.getEditor();
  if (html) editor.commands.setContent(html);
  return { ...result, editor };
}

/**
 * Intercepts file pickers opened with `input.click()`, so tests can choose a
 * file instead of the browser showing a dialog. Restore it with
 * `vi.restoreAllMocks()`.
 *
 * @returns Helpers to inspect the opened pickers and choose a file.
 */
export function interceptFilePicker() {
  const click = vi
    .spyOn(HTMLInputElement.prototype, 'click')
    .mockImplementation(vi.fn());
  return {
    /**
     * @param file - The file to choose.
     * @throws {Error} When no file picker was opened.
     */
    choose(file: File) {
      const picker = click.mock.contexts.at(-1) as HTMLInputElement | undefined;
      if (!picker) throw new Error('No file picker was opened');
      const transfer = new DataTransfer();
      transfer.items.add(file);
      picker.files = transfer.files;
      picker.dispatchEvent(new Event('change'));
    },
  };
}
