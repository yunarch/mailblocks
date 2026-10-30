import type { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { renderEditorPanel } from '@/__tests__/test-utils';

const dividerContent =
  '<p>Intro</p><hr style="border-width:0;border-style:solid;border-top-width:2px;border-top-color:#111827"><p>Outro</p>';

// Renders the editor and selects its divider, so the inspector shows its fields.
const renderWithDivider = async (content = dividerContent) => {
  const result = await renderEditorPanel(content);
  await page
    .elementLocator(result.editor.view.dom.querySelector('hr') as Element)
    .click();
  return result;
};

// Returns the inline style stored on the divider node.
const dividerStyle = (editor: Editor) => {
  let style: unknown;
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'horizontalRule') style = node.attrs.style;
  });
  return style;
};

describe('divider inspector', () => {
  it('styles the line of the exported divider', async () => {
    const { screen, exportEmail } = await renderWithDivider();
    const color = screen.getByLabelText('Color', { exact: true });
    const thickness = screen.getByLabelText('Thickness');
    await expect.element(color).toHaveValue('#111827');
    await expect.element(thickness).toHaveValue(2);
    await color.fill('#ff0000');
    await thickness.fill('4');
    await screen.getByLabelText('Style').selectOptions('dashed');
    const email = await exportEmail();
    expect(email.querySelector('hr')?.style).toMatchObject({
      borderTopColor: 'rgb(255, 0, 0)',
      borderTopWidth: '4px',
      borderTopStyle: 'dashed',
    });
  });

  it('shows the default line of a divider without styles', async () => {
    const { screen } = await renderWithDivider('<p>Intro</p><hr>');
    await expect
      .element(screen.getByLabelText('Color', { exact: true }))
      .toHaveValue('#eaeaea');
    await expect.element(screen.getByLabelText('Style')).toHaveValue('solid');
  });

  it.each([
    ['#f00', '#ff0000'],
    ['red', '#000000'],
  ])(
    'shows the %s line color in the color picker as %s',
    async (color, picked) => {
      const { screen } = await renderWithDivider(
        `<p>Intro</p><hr style="border-top-color:${color}">`
      );
      await expect
        .element(screen.getByLabelText('Color picker'))
        .toHaveValue(picked);
    }
  );

  it('sets the line color from the color picker', async () => {
    const { screen, editor } = await renderWithDivider();
    await screen.getByLabelText('Color picker').fill('#00ff00');
    expect(dividerStyle(editor)).toContain('border-top-color:#00ff00');
  });

  it('ignores thicknesses below 1px and restores the value on blur', async () => {
    const { screen, editor } = await renderWithDivider();
    const thickness = screen.getByLabelText('Thickness');
    await thickness.fill('0');
    await thickness.fill('');
    await expect.element(thickness).toHaveValue(null);
    await screen.getByLabelText('Style').click();
    await expect.element(thickness).toHaveValue(2);
    expect(dividerStyle(editor)).toContain('border-top-width:2px');
  });

  it('collapses and expands the divider section', async () => {
    const { screen } = await renderWithDivider();
    const toggle = screen.getByRole('button', { name: 'Divider' }).last(); // Last because the breadcrumb also has a "Divider" button
    await toggle.click();
    await expect
      .element(screen.getByLabelText('Thickness'))
      .not.toBeInTheDocument();
    await toggle.click();
    await expect.element(screen.getByLabelText('Thickness')).toBeVisible();
  });

  it('keeps the uniform border mode of the next selected element', async () => {
    const { screen } = await renderWithDivider();
    await expect.element(screen.getByText('Border color')).not.toBeVisible();
    await screen.getByText('Outro').click();
    await expect.element(screen.getByText('Border color')).toBeVisible();
    await expect
      .element(screen.getByRole('button', { name: 'Clear top border' }))
      .not.toBeInTheDocument();
  });
});
