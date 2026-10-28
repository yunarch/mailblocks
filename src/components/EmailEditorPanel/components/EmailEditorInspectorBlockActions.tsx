import { useCurrentEditor, useEditorState } from '@tiptap/react';
import {
  MdArrowDownward,
  MdArrowUpward,
  MdContentCopy,
  MdDeleteOutline,
} from 'react-icons/md';
import {
  getBlockActionsState,
  runBlockAction,
  type BlockAction,
} from '@/extensions/blockActions';
import { Button } from '@/ui/Button';

// Constants
const ACTIONS: {
  action: BlockAction;
  label: string;
  icon: React.ReactNode;
}[] = [
  { action: 'moveUp', label: 'Move up', icon: <MdArrowUpward /> },
  { action: 'moveDown', label: 'Move down', icon: <MdArrowDownward /> },
  { action: 'duplicate', label: 'Duplicate', icon: <MdContentCopy /> },
  { action: 'delete', label: 'Delete', icon: <MdDeleteOutline size={16} /> },
];

// Component
export const EmailEditorInspectorBlockActions = ({
  nodePos,
}: {
  nodePos: number;
}) => {
  const { editor } = useCurrentEditor();
  const available = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current ? getBlockActionsState(current, nodePos) : null,
  });
  if (!editor || !available) return null;

  // Render
  return (
    <div
      role="toolbar"
      aria-label="Element actions"
      className="flex items-center gap-1 border-b border-gray-200 py-2 dark:border-white/10"
    >
      {ACTIONS.map(({ action, label, icon }) => (
        <Button
          key={action}
          variant="ghost"
          size="sm"
          aria-label={label}
          title={label}
          disabled={!available[action]}
          onClick={() => {
            runBlockAction(editor, nodePos, action);
          }}
        >
          {icon}
        </Button>
      ))}
    </div>
  );
};
