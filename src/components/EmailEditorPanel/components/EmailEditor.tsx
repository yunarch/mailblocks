import {
  EmailEditor as ReactEmailEditor,
  type EmailEditorRef,
} from '@react-email/editor';
import { StarterKit } from '@react-email/editor/extensions';
import {
  EmailTheming,
  extendTheme,
  type EditorThemeInput,
} from '@react-email/editor/plugins';
import { Inspector } from '@react-email/editor/ui';
import Placeholder from '@tiptap/extension-placeholder';
import { useMemo } from 'react';
import { cx } from 'tailwind-variants';
import { buildReactEmailSlashCommands } from '@/extensions/commands';
import { createLinkedImageExtension } from '@/extensions/linkedImageExtension';
import { useAppContext } from '@/providers/AppContextProvider';
import type { EmailTemplate } from '@/types/templates';
import type { ViewportSize } from '@/types/viewports';
import { Stack } from '@/ui/Stack';

// Build react-email slash commands
buildReactEmailSlashCommands();

/**
 * Imported templates are fully styled, so they use the minimal theme (the basic
 * theme adds its own paragraph padding, image radius and white body on top).
 * The template's own body background becomes the email body background, and the
 * editor container is transparent so it doesn't paint over it.
 *
 * @param template - The template loaded in the editor.
 * @returns The editor theme for the template.
 */
function getTemplateTheme(template: EmailTemplate): EditorThemeInput {
  if (template.category === 'Local') return 'basic';
  const { body } = new DOMParser().parseFromString(
    template.content,
    'text/html'
  );
  return extendTheme('minimal', {
    body: {
      backgroundColor:
        body.style.backgroundColor ||
        (body.getAttribute('bgcolor') ?? '#ffffff'),
    },
    // The root container only wraps the template: no background or width of its own
    container: {
      backgroundColor: 'transparent',
      align: 'center',
      width: '100%',
    },
  });
}

/**
 * Prepares imported template HTML so the editor keeps its styling:
 * - The editor imports React Email `Container` tables as its own container
 *   node, which drops their inline styles (max-width, margins, background).
 *   Removing `role` keeps them as regular tables so those styles are preserved;
 *   the editor still wraps the whole email in a single root container.
 * - React Email writes `text-decoration-line`, but the theme adds the
 *   `text-decoration` shorthand after it, which would override it. Using the
 *   shorthand lets the template's own value win.
 *
 * @param template - The template loaded in the editor.
 * @param content - The HTML content to load.
 * @returns The HTML content to load into the editor.
 */
function prepareTemplateContent(template: EmailTemplate, content: string) {
  if (template.category === 'Local') return content;
  const document = new DOMParser().parseFromString(content, 'text/html');
  for (const table of document.querySelectorAll<HTMLTableElement>(
    'table[role="presentation"]'
  )) {
    const isContainer =
      table.style.maxWidth &&
      table.querySelector(':scope > tbody > tr:only-child > td:only-child');
    if (isContainer) table.removeAttribute('role');
  }
  for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
    const line = el.style.textDecorationLine;
    if (line) el.style.textDecoration = line;
  }
  return document.documentElement.outerHTML;
}

// Component
export const EmailEditor = ({
  editorRef,
  viewportWidth,
}: {
  editorRef: React.RefObject<EmailEditorRef | null>;
  viewportWidth: ViewportSize['width'];
}) => {
  const { selectedTemplate, emailContent, markEmailDirty, markEditorReady } =
    useAppContext();
  const theme = useMemo(
    () => getTemplateTheme(selectedTemplate),
    [selectedTemplate]
  );
  const content = useMemo(
    () => prepareTemplateContent(selectedTemplate, emailContent),
    [selectedTemplate, emailContent]
  );
  const editorExtensions = useMemo(
    () => [
      StarterKit.configure(),
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === 'heading')
            return `Heading ${node.attrs.level}`;
          return "Press '/' for commands";
        },
      }),
      EmailTheming.configure({ theme }),
      createLinkedImageExtension({
        uploadImage: async (file) => {
          await Promise.resolve();
          return {
            url: URL.createObjectURL(file),
          };
        },
      }),
    ],
    [theme]
  );

  // Render
  return (
    <Stack className="relative flex-1">
      <div className="absolute h-full w-full">
        <div
          className={cx(
            'mailblocks-edit-grid',
            'flex-1 h-full grid grid-cols-[minmax(0,1fr)_320px]'
          )}
          style={{
            '--mailblocks-canvas-width': `${viewportWidth}px`,
            '--mailblocks-canvas-label': `"Email · ${String(viewportWidth)}px"`,
          }}
        >
          <ReactEmailEditor
            key={`${selectedTemplate.id}-1`}
            ref={editorRef}
            className={cx(
              'mailblocks-workspace mailblocks-editor-canvas',
              'mr-2 overflow-auto'
            )}
            content={content}
            extensions={editorExtensions}
            onUpdate={markEmailDirty}
            onReady={markEditorReady}
          >
            <Inspector.Root
              className={cx(
                'mailblocks-inspector',
                'w-[320px] flex flex-col overflow-auto border-l border-gray-200 dark:border-white/10'
              )}
            >
              <div className="flex h-12 shrink-0 items-center border-b border-gray-200 px-4 dark:border-white/10">
                <div>
                  <p className="text-sm font-semibold text-gray-950 dark:text-white">
                    Inspector
                  </p>
                  <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-neutral-500">
                    <Inspector.Breadcrumb />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto px-4 py-2 text-sm text-gray-900 dark:text-neutral-200">
                <Inspector.Text>
                  {(context) => {
                    return (
                      <>
                        <Inspector.Typography {...context} />
                        <Inspector.Link {...context} />
                      </>
                    );
                  }}
                </Inspector.Text>
                <Inspector.Node>
                  {(context) => {
                    return (
                      <>
                        <Inspector.Attributes {...context} />
                        <Inspector.Background {...context} />
                        <Inspector.Size {...context} />
                        <Inspector.Padding {...context} />
                        <Inspector.Border {...context} />
                        <Inspector.ColumnSpacing {...context} />
                      </>
                    );
                  }}
                </Inspector.Node>
                <div className="border-t border-gray-200 py-4 text-xs leading-5 text-gray-500 dark:border-white/10 dark:text-neutral-500">
                  Select an element or highlight text to edit its properties
                  here.
                </div>
              </div>
            </Inspector.Root>
          </ReactEmailEditor>
        </div>
      </div>
    </Stack>
  );
};
