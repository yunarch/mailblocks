import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { interceptFilePicker, renderEditorPanel } from '@/__tests__/test-utils';

type Locator = ReturnType<typeof page.elementLocator>;

const imageContent =
  '<p>Intro</p><img src="https://example.com/a.png" alt="Logo" width="300" height="200">';

// Returns the text content of all paragraphs in the editor.
const paragraphs = (editor: Editor) => {
  return [...editor.view.dom.querySelectorAll('p')].map((p) => p.textContent);
};

// Selects the first image of the email, so the inspector shows its fields.
const selectImage = async (editor: Editor) => {
  await page
    .elementLocator(editor.view.dom.querySelector('img') as Element)
    .click();
};

// The exported page cell (body styles) and the container table inside it.
const getLayout = (email: Document) => {
  const pageCell = email.body.querySelector<HTMLElement>(
    ':scope > table td[lang]'
  );
  const container = pageCell?.querySelector<HTMLElement>(':scope > table');
  if (!pageCell || !container) throw new Error('Unexpected email layout');
  return { pageCell, container };
};

// Locates the text field of a labelled row ("Color", "Padding"...) in a
// titled group ("Page" or "Container") of the document inspector.
const inspectorField = (group: 'Page' | 'Container', label: string) => {
  const heading = [
    ...document.querySelectorAll('.mailblocks-inspector p'),
  ].find((element) => element.textContent === group);
  const row = [
    ...(heading?.parentElement?.querySelectorAll(
      ':scope [data-re-inspector-prop-row]'
    ) ?? []),
  ].find((element) => element.querySelector('label')?.textContent === label);
  const field = row?.querySelector(':scope input:not([type="color"])');
  if (!field) throw new Error(`Missing ${group} ${label} field`);
  return page.elementLocator(field);
};

// Replaces the value of a field and commits it, like a user pressing Enter.
const commit = async (field: Locator, value: string) => {
  await field.fill(value);
  await userEvent.keyboard('{Enter}');
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('block actions', () => {
  it('moves, duplicates and deletes the selected block', async () => {
    const { screen, editor } = await renderEditorPanel(
      '<p>First</p><p>Second</p><p>Third</p>'
    );
    await screen.getByText('Second').click();
    await expect
      .element(screen.getByRole('toolbar', { name: 'Element actions' }))
      .toBeVisible();
    await screen.getByRole('button', { name: 'Move up' }).click();
    expect(paragraphs(editor)).toEqual(['Second', 'First', 'Third']);
    await screen.getByRole('button', { name: 'Move down' }).click();
    expect(paragraphs(editor)).toEqual(['First', 'Second', 'Third']);
    await screen.getByRole('button', { name: 'Duplicate' }).click();
    expect(paragraphs(editor)).toEqual(['First', 'Second', 'Second', 'Third']);
    await screen.getByRole('button', { name: 'Delete' }).click();
    expect(paragraphs(editor)).toEqual(['First', 'Second', 'Third']);
  });

  it('disables moves past the ends of the email', async () => {
    const { screen } = await renderEditorPanel('<p>First</p><p>Last</p>');
    await screen.getByText('First').click();
    await expect
      .element(screen.getByRole('button', { name: 'Move up' }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole('button', { name: 'Move down' }))
      .toBeEnabled();
  });

  it('undoes each action separately', async () => {
    const { screen, editor } = await renderEditorPanel(
      '<p>First</p><p>Second</p><p>Third</p>'
    );
    await screen.getByText('First').click();
    await screen.getByRole('button', { name: 'Move down' }).click();
    await screen.getByRole('button', { name: 'Move down' }).click();
    expect(paragraphs(editor)).toEqual(['Second', 'Third', 'First']);
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(paragraphs(editor)).toEqual(['Second', 'First', 'Third']);
  });
});

describe('image inspector', () => {
  it('updates the source, alt text and link of the exported image', async () => {
    const { screen, editor, exportEmail } =
      await renderEditorPanel(imageContent);
    await selectImage(editor);
    await screen
      .getByLabelText('Image URL')
      .fill('https://cdn.example.com/b.png');
    await screen.getByLabelText('Alt text').fill('Company logo');
    await screen.getByLabelText('Link').fill('https://example.com');
    const linkedEmail = await exportEmail();
    const linked = linkedEmail.querySelector('img');
    expect(linked?.getAttribute('src')).toBe('https://cdn.example.com/b.png');
    expect(linked?.getAttribute('alt')).toBe('Company logo');
    expect(linked?.parentElement?.getAttribute('href')).toBe(
      'https://example.com'
    );
    await screen.getByLabelText('Link').fill('');
    const unlinkedEmail = await exportEmail();
    expect(unlinkedEmail.querySelector('img')?.closest('a')).toBeNull();
  });

  it('warns when the image URL only works on this computer', async () => {
    const { screen, editor } = await renderEditorPanel(imageContent);
    await selectImage(editor);
    const warning = screen.getByText(/only saved in your browser/);
    await expect.element(warning).not.toBeInTheDocument();
    await screen
      .getByLabelText('Image URL')
      .fill('http://localhost:3000/a.png');
    await expect.element(warning).toBeVisible();
  });

  it('replaces the selected image with an uploaded file', async () => {
    const picker = interceptFilePicker();
    const { screen, editor } = await renderEditorPanel(imageContent);
    await selectImage(editor);
    const url = screen.getByLabelText('Image URL');
    await expect.element(url).toHaveValue('https://example.com/a.png');
    await expect.element(screen.getByLabelText('Alt text')).toHaveValue('Logo');
    await screen.getByRole('button', { name: 'Upload…' }).click();
    picker.choose(new File(['x'], 'photo.png', { type: 'image/png' }));
    await expect
      .poll(() => (url.element() as HTMLInputElement).value)
      .toMatch(/^blob:/);
    await expect
      .element(screen.getByText(/only saved in your browser/))
      .toBeVisible();
  });
});

describe('page and container inspector', () => {
  it('styles the page background and spacing', async () => {
    const { exportEmail } = await renderEditorPanel();
    const background = inspectorField('Page', 'Color');
    const padding = inspectorField('Page', 'Padding');
    await expect.element(background).toHaveValue('#f3f4f6');
    await expect.element(padding).toHaveValue('32');
    await commit(background, '#112233');
    await commit(padding, '12');
    const { pageCell } = getLayout(await exportEmail());
    expect(pageCell.style.backgroundColor).toBe('rgb(17, 34, 51)');
    expect(pageCell.style.padding).toBe('12px');
  });

  it('sizes the container in pixels or percent, or automatically', async () => {
    const { screen, exportEmail } = await renderEditorPanel();
    const width = screen.getByRole('spinbutton', { name: 'Width' });
    const percent = screen
      .getByRole('group', { name: 'Width unit' })
      .getByRole('button', { name: '%' });
    const containerWidth = async () => {
      const email = await exportEmail();
      return getLayout(email).container.style.maxWidth;
    };
    await expect.element(width).toHaveValue(600);
    await commit(width, '480');
    expect(await containerWidth()).toBe('480px');
    await percent.click();
    await expect.element(percent).toHaveAttribute('aria-pressed', 'true');
    expect(await containerWidth()).toBe('480%');
    await commit(width, '');
    await expect.element(width).toHaveValue(null);
    expect(await containerWidth()).not.toContain('480');
  });

  it('styles the container background and spacing', async () => {
    const { exportEmail } = await renderEditorPanel();
    await commit(inspectorField('Container', 'Color'), '#fafafa');
    await commit(inspectorField('Container', 'Padding'), '24');
    const { container } = getLayout(await exportEmail());
    expect(container.style.backgroundColor).toBe('rgb(250, 250, 250)');
    // The container padding is applied to its content cell
    expect(
      container.querySelector<HTMLElement>(':scope td')?.style.padding
    ).toBe('24px');
  });
});

describe('variables', () => {
  it('lists placeholders typed in the email with their usage count', async () => {
    const { screen } = await renderEditorPanel(
      '<p>Hi {{name}}, your <a href="https://a.dev/{{name}}">plan</a></p>'
    );
    await expect.element(screen.getByText('2x')).toBeVisible();
    await expect
      .element(screen.getByRole('textbox', { name: 'Sample value for name' }))
      .toBeVisible();
  });

  it('adds a variable with its sample and inserts it at the text cursor', async () => {
    const { screen, editor } = await renderEditorPanel('<p>Hello</p>');
    await screen
      .getByRole('textbox', { name: 'New variable name' })
      .fill('first name!');
    await screen
      .getByRole('textbox', { name: 'New variable sample value' })
      .fill('Ada');
    await userEvent.keyboard('{Enter}');
    await expect
      .element(
        screen.getByRole('textbox', { name: 'Sample value for firstname' })
      )
      .toHaveValue('Ada');
    editor.commands.focus('end');
    await screen.getByRole('button', { name: 'Insert firstname' }).click();
    expect(paragraphs(editor)).toEqual(['Hello{{firstname}}']);
  });

  it('removes variables that are not used in the email', async () => {
    const { screen } = await renderEditorPanel('<p>Hello</p>');
    await screen
      .getByRole('textbox', { name: 'New variable name' })
      .fill('plan');
    await userEvent.keyboard('{Enter}');
    await screen.getByRole('button', { name: 'Remove plan' }).click();
    await expect
      .element(screen.getByRole('textbox', { name: 'Sample value for plan' }))
      .not.toBeInTheDocument();
  });

  it('asks before removing a used variable, then removes every use', async () => {
    const { screen, editor } = await renderEditorPanel(
      '<p>Hi {{name}}, your <a href="https://a.dev/{{name}}">plan</a></p>'
    );
    await screen.getByRole('button', { name: 'Remove name' }).click();
    const dialog = screen.getByRole('dialog', { name: 'Remove variable' });
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    expect(paragraphs(editor)).toEqual(['Hi {{name}}, your plan']);
    await screen.getByRole('button', { name: 'Remove name' }).click();
    await dialog.getByRole('button', { name: 'Remove' }).click();
    expect(paragraphs(editor)).toEqual(['Hi , your plan']);
    expect(editor.view.dom.querySelector('a')?.getAttribute('href')).toBe(
      'https://a.dev/'
    );
    await expect
      .element(screen.getByRole('textbox', { name: 'Sample value for name' }))
      .not.toBeInTheDocument();
  });
});
