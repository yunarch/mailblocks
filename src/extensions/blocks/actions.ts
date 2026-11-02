import { createNodeFromContent, type Editor, type Range } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { Fragment } from '@tiptap/pm/model';
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state';

export type BlockAction = 'moveUp' | 'moveDown' | 'duplicate' | 'delete';

/**
 * @param editor - The editor instance.
 * @param pos - The position right before the block.
 * @returns The block node with its parent and index, when found.
 */
function getBlock(editor: Editor, pos: number) {
  const { doc } = editor.state;
  if (pos < 0 || pos >= doc.content.size) return null;
  const node = doc.nodeAt(pos);
  if (!node) return null;
  const resolved = doc.resolve(pos);
  return { node, parent: resolved.parent, index: resolved.index() };
}

/**
 * Checks which actions keep the document valid for the block at `pos`, so
 * schema constraints (e.g. a row needs at least one cell, a two-column layout
 * has exactly two columns) are respected.
 *
 * @param editor - The editor instance.
 * @param pos - The position right before the block.
 * @returns The availability of each block action.
 */
export function getBlockActionsState(
  editor: Editor,
  pos: number
): Record<BlockAction, boolean> {
  const block = getBlock(editor, pos);
  if (!block) {
    return { moveUp: false, moveDown: false, duplicate: false, delete: false };
  }
  const { node, parent, index } = block;
  const previous = index > 0 ? parent.child(index - 1) : null;
  const next = index < parent.childCount - 1 ? parent.child(index + 1) : null;
  return {
    moveUp:
      previous !== null &&
      parent.canReplace(index - 1, index + 1, Fragment.from([node, previous])),
    moveDown:
      next !== null &&
      parent.canReplace(index, index + 2, Fragment.from([next, node])),
    duplicate: parent.canReplace(index + 1, index + 1, Fragment.from(node)),
    delete: parent.canReplace(index, index + 1),
  };
}

/**
 * Inserts a block where the slash command was typed: it replaces the line
 * when that line is empty, otherwise it goes right after it. The cursor then
 * moves to the line after the block (created when needed), so blocks can be
 * chained one after another instead of nesting inside the previous block.
 *
 * @param editor - The editor instance.
 * @param range - The range of the typed slash command.
 * @param html - The block markup.
 */
export function insertBlock(editor: Editor, range: Range, html: string) {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .command(({ tr, state }) => {
      const { $from } = tr.selection;
      if (!$from.parent.isTextblock) return false;
      const content = createNodeFromContent(html, state.schema);
      const block =
        content instanceof Fragment ? content : Fragment.from(content);
      const lineStart = $from.before();
      const lineEnd = $from.after();
      const isEmptyLine = $from.parent.content.size === 0;
      if (isEmptyLine) {
        tr.replaceWith(lineStart, lineEnd, block);
      } else {
        tr.insert(lineEnd, block);
      }
      const blockEnd = (isEmptyLine ? lineStart : lineEnd) + block.size;
      if (!tr.doc.resolve(blockEnd).nodeAfter?.isTextblock) {
        tr.insert(blockEnd, state.schema.nodes.paragraph.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, blockEnd + 1));
      return true;
    })
    .scrollIntoView()
    .run();
}

/**
 * Moves, duplicates or deletes the block at `pos`. The moved or duplicated
 * block stays selected so the inspector keeps showing it.
 *
 * @param editor - The editor instance.
 * @param pos - The position right before the block.
 * @param action - The action to run.
 * @returns Whether the action was applied.
 */
export function runBlockAction(
  editor: Editor,
  pos: number,
  action: BlockAction
) {
  const block = getBlock(editor, pos);
  if (!block || !getBlockActionsState(editor, pos)[action]) return false;
  const { node, parent, index } = block;
  const end = pos + node.nodeSize;
  const { tr } = editor.state;
  let selectPos: number | null = null;
  switch (action) {
    case 'moveUp': {
      const previous = parent.child(index - 1);
      selectPos = pos - previous.nodeSize;
      tr.replaceWith(selectPos, end, Fragment.from([node, previous]));
      break;
    }
    case 'moveDown': {
      const next = parent.child(index + 1);
      tr.replaceWith(pos, end + next.nodeSize, Fragment.from([next, node]));
      selectPos = pos + next.nodeSize;
      break;
    }
    case 'duplicate': {
      tr.insert(end, node);
      selectPos = end;
      break;
    }
    case 'delete': {
      tr.delete(pos, end);
      break;
    }
  }
  tr.setSelection(
    selectPos === null
      ? Selection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)))
      : NodeSelection.create(tr.doc, selectPos)
  );
  editor.view.dispatch(closeHistory(tr).scrollIntoView()); // Each action is its own undo step, even when run in quick succession
  editor.view.focus();
  return true;
}
