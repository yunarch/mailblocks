import type { Editor } from '@tiptap/core';
import { findVariableRanges, removeVariableFromText } from '@/utils/helpers';

// Leaf nodes (images, line breaks) read as one character, so text offsets match document positions.
const LEAF_TEXT = '\u{FFFC}';

/**
 * @param attrs - Node or mark attributes, such as a link `href`.
 * @param name - Placeholder to remove, e.g. `first_name` for `{{first_name}}`.
 * @returns The attributes without the placeholder, or `null` when none had it.
 */
function removeVariableFromAttributes(
  attrs: Record<string, unknown>,
  name: string
) {
  const next = Object.fromEntries(
    Object.entries(attrs).map(([key, value]) => [
      key,
      typeof value === 'string' ? removeVariableFromText(value, name) : value,
    ])
  );
  return Object.keys(next).some((key) => next[key] !== attrs[key])
    ? next
    : null;
}

/**
 * Removes every `{{name}}` placeholder from the email, in the text and in
 * attributes such as link URLs and image sources, as a single undoable step.
 *
 * @param editor - The email editor to update.
 * @param name - Placeholder to remove, e.g. `first_name` for `{{first_name}}`.
 */
export function deleteVariable(editor: Editor, name: string) {
  const { tr, doc } = editor.state;
  const textRanges: [number, number][] = [];
  doc.descendants((node, pos) => {
    const attrs = removeVariableFromAttributes(node.attrs, name);
    if (attrs) tr.setNodeMarkup(pos, undefined, attrs, node.marks);
    for (const mark of node.marks) {
      const markAttrs = removeVariableFromAttributes(mark.attrs, name);
      if (!markAttrs) continue;
      tr.removeMark(pos, pos + node.nodeSize, mark);
      tr.addMark(pos, pos + node.nodeSize, mark.type.create(markAttrs));
    }
    if (node.isTextblock) {
      const text = node.textBetween(0, node.content.size, undefined, LEAF_TEXT);
      for (const [start, end] of findVariableRanges(text, name)) {
        textRanges.push([pos + 1 + start, pos + 1 + end]);
      }
    }
  });
  for (const [from, to] of textRanges.toReversed()) tr.delete(from, to);
  if (tr.docChanged) editor.view.dispatch(tr);
}
