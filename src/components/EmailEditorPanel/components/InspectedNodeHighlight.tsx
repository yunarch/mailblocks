import { useCurrentEditor } from '@tiptap/react';
import { useEffect } from 'react';
import { setInspectedNode } from '@/extensions/hoverHighlightExtension';

/**
 * Keeps the node shown in the inspector highlighted on the canvas. Rendered
 * inside `Inspector.Node`, so the highlight is cleared when the inspector
 * switches to the body or to a text selection.
 *
 * @param props - The inspected node, as provided by `Inspector.Node`.
 * @param props.nodeType - The editor node name, e.g. `paragraph` or `tableCell`.
 * @param props.pos - The position right before the inspected node.
 * @returns Nothing, the highlight is drawn by the editor extension.
 */
export const InspectedNodeHighlight = ({
  nodeType,
  pos,
}: {
  nodeType: string;
  pos: number;
}) => {
  const { editor } = useCurrentEditor();
  useEffect(() => {
    if (!editor) return;
    const { view } = editor;
    setInspectedNode(view, { nodeType, pos });
    return () => {
      setInspectedNode(view, null);
    };
  }, [editor, nodeType, pos]);
  return null;
};
