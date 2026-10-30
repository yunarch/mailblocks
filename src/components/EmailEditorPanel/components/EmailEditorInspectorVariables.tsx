import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { useCurrentEditor, useEditorState } from '@tiptap/react';
import { useState } from 'react';
import { MdAdd, MdDeleteOutline, MdOutlineDataObject } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import { BlockerModal } from '@/components/BlockerModal/BlockerModal';
import { deleteVariable, LEAF_TEXT } from '@/extensions/variables';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';
import { countVariables, sanitizeVariableName } from '@/utils/helpers';

const INPUT_CLASS = cx(
  'h-7 w-full min-w-0 rounded-md border border-gray-200 bg-white px-2 text-xs outline-none',
  'placeholder:text-gray-400 focus:border-gray-400',
  'dark:border-white/15 dark:bg-white/5 dark:placeholder:text-neutral-500 dark:focus:border-white/40',
  'read-only:bg-gray-50 read-only:font-mono read-only:text-gray-600 dark:read-only:bg-transparent dark:read-only:text-neutral-400'
);

/**
 * @param doc - The email document.
 * @returns The texts that can hold placeholders: the text of each block and
 * the string attributes of nodes and marks (link URLs, image sources...).
 */
function getDocumentTexts(doc: ProseMirrorNode) {
  const texts: string[] = [];
  const addAttributes = (attrs: Record<string, unknown>) => {
    for (const value of Object.values(attrs)) {
      if (typeof value === 'string') texts.push(value);
    }
  };
  doc.descendants((node) => {
    // Block text is read as a whole, so placeholders split by formatting are
    // still found; leaf nodes read like in `deleteVariable`, so both agree
    if (node.isTextblock) {
      texts.push(node.textBetween(0, node.content.size, undefined, LEAF_TEXT));
    }
    addAttributes(node.attrs);
    for (const mark of node.marks) addAttributes(mark.attrs);
  });
  return texts;
}

// Component
export const EmailEditorInspectorVariables = () => {
  const { editor } = useCurrentEditor();
  const { variables, setVariables, markEmailDirty } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const [draft, setDraft] = useState({ name: '', sample: '' });
  const [pendingDelete, setPendingDelete] = useState<{
    name: string;
    count: number;
  } | null>(null);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const { selection, doc } = current.state;
      return {
        used: [...countVariables(getDocumentTexts(doc))],
        canInsert:
          selection instanceof TextSelection &&
          selection.$from.parent.isTextblock,
      };
    },
  });
  if (!editor || !state) return null;
  const used = new Map(state.used);
  const samples = new Map(variables.map(({ name, sample }) => [name, sample]));
  const names = [
    ...used.keys(),
    ...variables.map(({ name }) => name).filter((name) => !used.has(name)),
  ];

  // Methods
  const setSample = (name: string, sample: string) => {
    setVariables((current) =>
      current.some((variable) => variable.name === name)
        ? current.map((variable) =>
            variable.name === name ? { ...variable, sample } : variable
          )
        : [...current, { name, sample }]
    );
    markEmailDirty();
  };
  const addVariable = () => {
    const { name, sample } = draft;
    if (!name) return;
    setDraft({ name: '', sample: '' });
    if (names.includes(name)) {
      if (sample) setSample(name, sample);
      return;
    }
    setVariables((current) => [...current, { name, sample }]);
    markEmailDirty();
  };
  const removeVariable = (name: string) => {
    deleteVariable(editor, name);
    setVariables((current) =>
      current.filter((variable) => variable.name !== name)
    );
    markEmailDirty();
  };

  // Render
  return (
    <div className="flex flex-col gap-2 border-b border-gray-200 py-4 last:border-b-0 dark:border-white/10">
      <button
        type="button"
        className="cursor-pointer self-start text-xs font-semibold"
        onClick={() => {
          setCollapsed((value) => !value);
        }}
      >
        Variables
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          <form
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              addVariable();
            }}
          >
            <input
              aria-label="New variable name"
              placeholder="Name"
              value={draft.name}
              className={INPUT_CLASS}
              onChange={(event) => {
                const name = sanitizeVariableName(event.currentTarget.value);
                setDraft((current) => ({ ...current, name }));
              }}
            />
            <input
              aria-label="New variable sample value"
              placeholder="Sample value"
              value={draft.sample}
              className={INPUT_CLASS}
              onChange={(event) => {
                const sample = event.currentTarget.value;
                setDraft((current) => ({ ...current, sample }));
              }}
            />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-7 px-1.5"
              aria-label="Add variable"
              title="Add variable"
              disabled={!draft.name}
            >
              <MdAdd />
            </Button>
          </form>
          <p className="text-xs leading-5 text-gray-500 dark:text-neutral-500">
            Type <code>{'{{name}}'}</code> in the email or add a variable above.
            Sample values only show in the preview.
          </p>
          <div className="flex flex-col gap-1.5 border-t border-dashed border-gray-200 pt-2 dark:border-white/15">
            {names.map((name) => {
              const count = used.get(name) ?? 0;
              return (
                <div
                  key={name}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-1.5"
                >
                  <input
                    readOnly
                    aria-label={`Variable ${name}`}
                    value={`{{${name}}}`}
                    title={`{{${name}}}`}
                    className={INPUT_CLASS}
                  />
                  <input
                    aria-label={`Sample value for ${name}`}
                    placeholder="Sample value"
                    value={samples.get(name) ?? ''}
                    className={INPUT_CLASS}
                    onChange={(event) => {
                      setSample(name, event.currentTarget.value);
                    }}
                  />
                  <div className="flex items-center">
                    <span
                      className="w-7 text-center text-[11px] text-gray-500 tabular-nums dark:text-neutral-500"
                      title={`Used ${String(count)} times in the email`}
                    >
                      {count}x
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5"
                      aria-label={`Insert ${name}`}
                      title={
                        state.canInsert
                          ? 'Insert at the text cursor'
                          : 'Place the cursor in a text to insert'
                      }
                      disabled={!state.canInsert}
                      onClick={() => {
                        editor
                          .chain()
                          .focus()
                          .insertContent(`{{${name}}}`)
                          .run();
                      }}
                    >
                      <MdOutlineDataObject />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5"
                      aria-label={`Remove ${name}`}
                      title={
                        count > 0
                          ? 'Remove the variable and its uses in the email'
                          : 'Remove variable'
                      }
                      onClick={() => {
                        if (count > 0) {
                          setPendingDelete({ name, count });
                          return;
                        }
                        removeVariable(name);
                      }}
                    >
                      <MdDeleteOutline size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {pendingDelete ? (
        <BlockerModal
          title="Remove variable"
          message={`{{${pendingDelete.name}}} is used ${pendingDelete.count === 1 ? 'once' : `${String(pendingDelete.count)} times`} in the email. Removing it deletes every use.`}
          confirmText="Remove"
          onCancel={() => {
            setPendingDelete(null);
          }}
          onConfirm={() => {
            removeVariable(pendingDelete.name);
            setPendingDelete(null);
          }}
        />
      ) : null}
    </div>
  );
};
