import {
  EmailEditor as ReactEmailEditor,
  type EmailEditorRef,
} from '@react-email/editor';
import { StarterKit } from '@react-email/editor/extensions';
import { EmailTheming } from '@react-email/editor/plugins';
import { Inspector } from '@react-email/editor/ui';
import Placeholder from '@tiptap/extension-placeholder';
import { useMemo } from 'react';
import { cx } from 'tailwind-variants';
import { buildReactEmailSlashCommands } from '@/extensions/commands';
import { createLinkedImageExtension } from '@/extensions/linkedImageExtension';
import { useAppContext } from '@/providers/AppContextProvider';
import type { ViewportSize } from '@/types/viewports';
import { Stack } from '@/ui/Stack';

// Build react-email slash commands
buildReactEmailSlashCommands();

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
      EmailTheming.configure({ theme: 'basic' }),
      createLinkedImageExtension({
        uploadImage: async (file) => {
          await Promise.resolve();
          return {
            url: URL.createObjectURL(file),
          };
        },
      }),
    ],
    []
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
          style={{ '--mailblocks-canvas-width': `${viewportWidth}px` }}
        >
          <ReactEmailEditor
            key={`${selectedTemplate.id}-1`}
            ref={editorRef}
            className={cx('mailblocks-editor-canvas', 'mr-2 overflow-auto')}
            content={emailContent}
            extensions={editorExtensions}
            onUpdate={markEmailDirty}
            onReady={markEditorReady}
          >
            <Inspector.Root
              className={cx(
                'mailblocks-inspector',
                'w-[320px] flex flex-col overflow-auto border-l border-gray-200 bg-white dark:border-white/10 dark:bg-black'
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
