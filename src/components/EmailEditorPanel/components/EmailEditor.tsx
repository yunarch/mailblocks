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
import { HoverHighlight } from '@/extensions/hoverHighlightExtension';
import { LinkClickGuard } from '@/extensions/linkClickGuardExtension';
import { createLinkedImageExtension } from '@/extensions/linkedImageExtension';
import { useAppContext } from '@/providers/AppContextProvider';
import type { EmailTemplate } from '@/types/templates';
import type { ViewportSize } from '@/types/viewports';
import { ResizablePanel } from '@/ui/ResizablePanel';
import { Stack } from '@/ui/Stack';
import { InspectedNodeHighlight } from './InspectedNodeHighlight';

// Build react-email slash commands
buildReactEmailSlashCommands();

/**
 * Computes the maximum inspector width so the canvas keeps usable space.
 *
 * @returns The maximum inspector width in pixels.
 */
function getMaxInspectorWidth() {
  return Math.min(640, window.innerWidth * 0.45);
}

/**
 * Browsers serialize inline colors as `rgb()`, but the inspector color inputs
 * expect hex values.
 *
 * @param color - The CSS color value.
 * @returns The color as hex when it is an opaque `rgb()` value, otherwise unchanged.
 */
function toHexColor(color: string) {
  const match = /^rgb\(\s*(?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)\s*\)$/.exec(
    color
  );
  if (!match?.groups) return color;
  const { r, g, b } = match.groups;
  return `#${[r, g, b]
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * Local templates start from the basic theme laid out as a white card on a light
 * page, so the page (body) and card (container) are visibly distinct and both
 * can be styled from the inspector.
 *
 * Imported templates are fully styled, so they use the minimal theme (the basic
 * theme adds its own paragraph padding, image radius and white body on top).
 * The template's own body background becomes the email body background, and the
 * editor container is transparent so it doesn't paint over it.
 *
 * @param template - The template loaded in the editor.
 * @returns The editor theme for the template.
 */
function getTemplateTheme(template: EmailTemplate): EditorThemeInput {
  if (template.category === 'Local') {
    return extendTheme('basic', {
      body: { backgroundColor: '#f3f4f6', padding: '32px' },
    });
  }
  const { body } = new DOMParser().parseFromString(
    template.content,
    'text/html'
  );
  return extendTheme('minimal', {
    body: {
      backgroundColor: toHexColor(
        body.style.backgroundColor ||
          (body.getAttribute('bgcolor') ?? '#ffffff')
      ),
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
  onReady,
}: {
  editorRef: React.RefObject<EmailEditorRef | null>;
  viewportWidth: ViewportSize['width'];
  onReady?: (ref: EmailEditorRef) => void;
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
      LinkClickGuard,
      HoverHighlight,
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
            'flex-1 h-full grid grid-cols-[minmax(0,1fr)_auto]'
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
            onReady={(ref) => {
              markEditorReady();
              onReady?.(ref);
            }}
          >
            <ResizablePanel
              edge="left"
              defaultSize={320}
              minSize={260}
              maxSize={getMaxInspectorWidth}
              handleLabel="Resize inspector"
              className="min-h-0"
            >
              <Inspector.Root
                className={cx(
                  'mailblocks-inspector',
                  'h-full flex flex-col overflow-auto border-l border-gray-200 dark:border-white/10'
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
                  <Inspector.Document />
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
                          <InspectedNodeHighlight
                            nodeType={context.nodeType}
                            pos={context.nodePos.pos}
                          />
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
                    here. Click outside the email, or on Body in the breadcrumb,
                    to edit the page background and container.
                  </div>
                </div>
              </Inspector.Root>
            </ResizablePanel>
          </ReactEmailEditor>
        </div>
      </div>
    </Stack>
  );
};
