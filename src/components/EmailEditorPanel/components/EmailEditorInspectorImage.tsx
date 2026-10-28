import type { InspectorNodeContext } from '@react-email/editor/ui';
import { useCurrentEditor } from '@tiptap/react';
import { useState } from 'react';
import { MdOutlineFileUpload, MdWarningAmber } from 'react-icons/md';
import { replaceImage } from '@/extensions/linkedImageExtension';
import { isLocalhostUrl } from '@/utils/helpers';

// Full-width bordered fields, so long values like URLs stay readable
const FIELD_CLASS_NAME = [
  'w-full rounded-md border border-gray-200 bg-transparent px-2 py-1.5 text-xs',
  'text-gray-950 placeholder:text-gray-400 outline-none transition-colors',
  'hover:border-gray-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500',
  'dark:border-white/10 dark:text-white dark:placeholder:text-neutral-500',
  'dark:hover:border-white/20 dark:focus:border-sky-400 dark:focus:ring-sky-400',
].join(' ');

/**
 * Image source panel for the inspector: the image URL, its alt text and a
 * button to replace the image with an uploaded file. The section header uses
 * the inspector's own markup; the fields are full width so URLs stay readable.
 *
 * @param props - The inspector context of the selected image.
 * @returns The image panel.
 */
export const EmailEditorInspectorImage = ({
  nodePos,
  getAttr,
  setAttr,
}: Pick<InspectorNodeContext, 'nodePos' | 'getAttr' | 'setAttr'>) => {
  const { editor } = useCurrentEditor();
  const [collapsed, setCollapsed] = useState(false);
  const srcAttr = getAttr('src');
  const altAttr = getAttr('alt');
  const src = typeof srcAttr === 'string' ? srcAttr : '';
  const alt = typeof altAttr === 'string' ? altAttr : '';
  const isLocalOnly = src.startsWith('blob:') || isLocalhostUrl(src);

  // Render
  return (
    <div data-re-inspector-section="" data-has-title="">
      <div data-re-inspector-section-header="">
        <button
          type="button"
          data-re-inspector-section-toggle=""
          onClick={() => {
            setCollapsed((value) => !value);
          }}
        >
          <span data-re-inspector-text="">Image</span>
        </button>
      </div>
      {!collapsed && (
        <div data-re-inspector-section-body="" className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label data-re-inspector-label="" htmlFor="mailblocks-image-src">
                Image URL
              </label>
              <button
                type="button"
                className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-950 dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white"
                disabled={!editor}
                onClick={() => {
                  if (editor) replaceImage(editor, nodePos.pos);
                }}
              >
                <MdOutlineFileUpload aria-hidden />
                Upload…
              </button>
            </div>
            <input
              id="mailblocks-image-src"
              className={FIELD_CLASS_NAME}
              type="url"
              placeholder="https://example.com/image.png"
              spellCheck={false}
              value={src}
              onChange={(event) => {
                setAttr('src', event.target.value);
              }}
            />
            {isLocalOnly && (
              <p
                role="alert"
                className="flex gap-1.5 text-xs leading-5 text-amber-600 dark:text-amber-400"
              >
                <MdWarningAmber aria-hidden className="mt-0.5 shrink-0" />
                This image is only saved in your browser, so it will not show in
                the exported email. Paste a public link in the field above.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label data-re-inspector-label="" htmlFor="mailblocks-image-alt">
              Alt text
            </label>
            <input
              id="mailblocks-image-alt"
              className={FIELD_CLASS_NAME}
              type="text"
              placeholder="Describe the image"
              value={alt}
              onChange={(event) => {
                setAttr('alt', event.target.value);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
