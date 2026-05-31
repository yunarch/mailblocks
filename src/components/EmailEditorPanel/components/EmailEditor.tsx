import {
  EmailEditor as ReactEmailEditor,
  type EmailEditorRef,
} from '@react-email/editor';
import { Inspector } from '@react-email/editor/ui';
import { cx } from 'tailwind-variants';
import { useAppContext } from '@/providers/AppContextProvider';
import type { ViewportSize } from '@/types/viewports';
import { Stack } from '@/ui/Stack';

export const EmailEditor = ({
  editorRef,
  viewportWidth,
}: {
  editorRef: React.RefObject<EmailEditorRef | null>;
  viewportWidth: ViewportSize['width'];
}) => {
  const { selectedTemplate, emailContent } = useAppContext();
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
            key={`${selectedTemplate.id}-${1}`}
            ref={editorRef}
            className={cx('mailblocks-editor-canvas', 'overflow-auto')}
            content={emailContent}
            theme="basic"
            onUploadImage={async (file) => ({
              url: URL.createObjectURL(file),
            })}
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
