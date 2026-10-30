import { afterEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { interceptFilePicker, renderApp } from '@/__tests__/test-utils';

type App = Awaited<ReturnType<typeof renderApp>>;

const HTML = `<html><head><title>Spring sale</title>
  <style>.headline { color: #ff0000; }</style></head>
  <body><h1 class="headline">Spring sale is here</h1><p>Save 20% today.</p>
  <script>alert(1)</script></body></html>`;

// Utility functions
const editorText = (app: App) => app.getEditor().view.dom.textContent;
const openImport = async ({ screen }: App) => {
  await screen.getByRole('button', { name: 'Import HTML' }).click();
  return screen.getByRole('dialog', { name: 'Import HTML' });
};

// Tests
describe('import HTML', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads pasted HTML with its styles inlined and scripts removed', async () => {
    const app = await renderApp();
    const dialog = await openImport(app);
    const importButton = dialog.getByRole('button', { name: 'Import' });
    await expect.element(importButton).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'HTML' }).fill(HTML);
    await importButton.click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.poll(() => editorText(app)).toContain('Spring sale is here');
    expect(app.getContext().selectedTemplate).toMatchObject({
      name: 'Spring sale',
      category: 'Imported',
    });
    const email = await app.exportEmail();
    expect(email.querySelector('script')).toBeNull();
    expect(email.querySelector<HTMLElement>('h1')?.style.color).toBe(
      'rgb(255, 0, 0)'
    );
  });

  it('loads a chosen HTML file', async () => {
    const app = await renderApp();
    const picker = interceptFilePicker();
    const dialog = await openImport(app);
    await dialog.getByRole('button', { name: 'Choose file…' }).click();
    picker.choose(new File([HTML], 'spring.html', { type: 'text/html' }));
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.poll(() => editorText(app)).toContain('Spring sale is here');
    expect(app.getContext().selectedTemplate.description).toBe(
      'Imported from spring.html.'
    );
    const email = await app.exportEmail();
    expect(email.querySelector('h1')?.textContent.trim()).toBe(
      'Spring sale is here'
    );
  });

  it('closes without importing when cancelled or on Escape', async () => {
    const app = await renderApp();
    let dialog = await openImport(app);
    await dialog.getByRole('textbox', { name: 'HTML' }).fill(HTML);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    dialog = await openImport(app);
    await expect
      .element(dialog.getByRole('textbox', { name: 'HTML' }))
      .toHaveValue('');
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog).not.toBeInTheDocument();
    expect(editorText(app)).toContain('Welcome to Mailblocks');
  });

  it('asks before replacing unsaved edits', async () => {
    const app = await renderApp();
    await app.screen.getByText('Welcome to Mailblocks').click();
    await userEvent.keyboard('{End} edited');
    const dialog = await openImport(app);
    await dialog.getByRole('textbox', { name: 'HTML' }).fill(HTML);
    await dialog.getByRole('button', { name: 'Import' }).click();
    await app.screen.getByRole('button', { name: 'Discard & switch' }).click();
    await expect.poll(() => editorText(app)).toContain('Spring sale is here');
    const email = await app.exportEmail();
    expect(email.body.textContent).not.toContain('edited');
  });
});
