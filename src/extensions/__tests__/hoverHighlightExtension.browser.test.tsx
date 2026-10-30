import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderEditorPanel } from '@/__tests__/test-utils';

const sectionContent =
  '<p>Intro</p><section data-type="section" style="padding:24px"><p>Inside</p></section>';

// The node type of the current node selection, if any.
const selectedNodeType = (editor: Editor) => {
  const { selection } = editor.state;
  return selection instanceof NodeSelection
    ? selection.node.type.name
    : undefined;
};

describe('click selection', () => {
  it('selects a container clicked on its padding', async () => {
    const { screen, editor } = await renderEditorPanel(sectionContent);
    const section = editor.view.dom.querySelector('[data-type="section"]');
    if (!section) throw new Error('Missing section');
    await page.elementLocator(section).click({ position: { x: 4, y: 4 } });
    expect(selectedNodeType(editor)).toBe('section');
    await expect
      .element(screen.getByRole('button', { name: 'Section' }))
      .toBeVisible();
  });

  it('places the cursor in text clicked inside a container', async () => {
    const { screen, editor } = await renderEditorPanel(sectionContent);
    await screen.getByText('Inside').click();
    expect(selectedNodeType(editor)).toBeUndefined();
    expect(editor.state.selection.$from.parent.textContent).toBe('Inside');
  });

  it('selects a divider inside a section', async () => {
    const { editor } = await renderEditorPanel(
      '<p>Intro</p><section data-type="section" style="padding:24px"><hr></section>'
    );
    await page
      .elementLocator(editor.view.dom.querySelector('hr') as Element)
      .click();
    expect(selectedNodeType(editor)).toBe('horizontalRule');
  });
});
