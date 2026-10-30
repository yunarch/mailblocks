import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { interceptFilePicker, renderEditorPanel } from '@/__tests__/test-utils';

// Types a slash command on an empty line at the end of the email and picks it.
const runSlashCommand = async (editor: Editor, query: string) => {
  const emptyLine = [...editor.view.dom.querySelectorAll('p')].at(-1);
  if (!emptyLine) throw new Error('The email has no line to type in');
  await page.elementLocator(emptyLine).click();
  await userEvent.keyboard('/');
  await expect
    .poll(
      () => document.querySelectorAll('[data-re-slash-command-item]').length
    )
    .toBeGreaterThan(0);
  await userEvent.keyboard(query);
  await expect
    .element(page.getByRole('button', { name: new RegExp(query, 'i') }))
    .toBeVisible();
  await userEvent.keyboard('{Enter}');
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('slash commands', () => {
  it('inserts a pre-styled block and continues on a new line below it', async () => {
    const { editor } = await renderEditorPanel('<p>Intro</p><p></p>');
    await runSlashCommand(editor, 'hero');
    await userEvent.keyboard('After');
    const text = editor.view.dom.textContent;
    expect(text).toContain('Your headline here');
    expect(text.indexOf('After')).toBeGreaterThan(text.indexOf('Get started'));
    expect(text).not.toContain('/');
  });

  it('uploads an image picked from the Image command', async () => {
    const picker = interceptFilePicker();
    const { editor } = await renderEditorPanel('<p>Intro</p><p></p>');
    await runSlashCommand(editor, 'image');
    picker.choose(new File(['x'], 'photo.png', { type: 'image/png' }));
    await expect
      .poll(() => editor.view.dom.querySelector('img')?.src)
      .toMatch(/^blob:/);
    expect(editor.view.dom.textContent).not.toContain('/');
  });
});

describe('editor canvas', () => {
  it('does not follow links when they are clicked', async () => {
    const { screen } = await renderEditorPanel(
      '<p>Read <a href="https://example.com">the docs</a></p>'
    );
    const prevented: boolean[] = [];
    const record = (event: Event) => {
      prevented.push(event.defaultPrevented);
    };
    addEventListener('click', record);
    await screen.getByText('the docs').click();
    removeEventListener('click', record);
    expect(prevented).toEqual([true]);
  });

  it('outlines the hovered element with its type', async () => {
    const { screen, editor } = await renderEditorPanel('<p>Hover me</p>');
    const outline = editor.view.dom.parentElement?.querySelector<HTMLElement>(
      '.mailblocks-hover-overlay--hovered'
    );
    await screen.getByText('Hover me').hover();
    await expect.poll(() => outline?.hidden).toBe(false);
    expect(outline?.dataset.label).toBe('Text');
  });

  it('resizes the canvas to the selected viewport', async () => {
    const { screen, editor } = await renderEditorPanel();
    const canvasWidth = () =>
      editor.view.dom
        .closest<HTMLElement>('.mailblocks-edit-grid')
        ?.style.getPropertyValue('--mailblocks-canvas-width');
    expect(canvasWidth()).toBe('650px');
    await screen.getByRole('button', { name: /^S\s*\(375px\)$/ }).click();
    expect(canvasWidth()).toBe('375px');
  });
});

describe('preview and code', () => {
  it('previews the rendered email including the latest edits', async () => {
    const { screen, editor } = await renderEditorPanel('<p>Original</p>');
    editor.commands.setContent('<p>Edited text</p>');
    await screen.getByRole('switch', { name: /Preview/ }).click();
    const frame = screen.getByTitle('Rendered email');
    await expect.element(frame).toBeVisible();
    await expect
      .poll(
        () =>
          (frame.element() as HTMLIFrameElement).contentDocument?.body
            .textContent
      )
      .toContain('Edited text');
    await expect
      .element(page.elementLocator(editor.view.dom))
      .not.toBeVisible();
    await screen.getByRole('switch', { name: /Preview/ }).click();
    await expect.element(frame).not.toBeInTheDocument();
    await expect.element(page.elementLocator(editor.view.dom)).toBeVisible();
  });

  it('shows the email HTML and copies it to the clipboard', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    const { screen } = await renderEditorPanel('<p>Copy me</p>');
    await screen.getByRole('button', { name: 'Code' }).click();
    await expect
      .element(screen.getByRole('tab', { name: 'HTML' }))
      .toHaveAttribute('aria-selected', 'true');
    await expect
      .element(screen.getByRole('switch', { name: /Preview/ }))
      .not.toBeInTheDocument();
    await screen.getByRole('button', { name: 'Copy HTML' }).click();
    expect(writeText).toHaveBeenCalledOnce();
    const [html] = writeText.mock.calls[0];
    expect(html).toMatch(/^<!DOCTYPE html/i);
    expect(html).toContain('Copy me');
    await expect
      .element(screen.getByRole('button', { name: 'Copied' }))
      .toBeVisible();
  });

  it('shows the email plain text and copies it to the clipboard', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    const { screen } = await renderEditorPanel('<p>Copy me</p>');
    await screen.getByRole('button', { name: 'Code' }).click();
    await screen.getByRole('tab', { name: 'Plain text' }).click();
    await screen.getByRole('button', { name: 'Copy plain text' }).click();
    expect(writeText).toHaveBeenCalledOnce();
    const [text] = writeText.mock.calls[0];
    expect(text).toContain('Copy me');
    expect(text).not.toMatch(/<[a-z!]/i);
  });

  it('shows the email as React Email code and copies it to the clipboard', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    const { screen } = await renderEditorPanel('<p>Copy me</p>');
    await screen.getByRole('button', { name: 'Code' }).click();
    await screen.getByRole('tab', { name: 'React Email' }).click();
    await screen.getByRole('button', { name: 'Copy React Email' }).click();
    expect(writeText).toHaveBeenCalledOnce();
    const [source] = writeText.mock.calls[0];
    expect(source).toMatch(/^import \{[^}]+\} from 'react-email';/);
    expect(source).toContain('export default function Email()');
    expect(source).toContain('Copy me');
  });

  it('downloads the code of the selected format as a file', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(vi.fn());
    const { screen } = await renderEditorPanel('<p>Download me</p>');
    await screen.getByRole('button', { name: 'Code' }).click();
    await screen.getByRole('button', { name: 'Download HTML' }).click();
    await screen.getByRole('tab', { name: 'React Email' }).click();
    await screen.getByRole('button', { name: 'Download React Email' }).click();
    expect(
      click.mock.contexts.map((link) => (link as HTMLAnchorElement).download)
    ).toEqual(['email.html', 'email.jsx']);
    const [html, source] = await Promise.all(
      createObjectURL.mock.calls.map(([blob]) => (blob as Blob).text())
    );
    expect(html).toMatch(/^<!DOCTYPE html/i);
    expect(html).toContain('Download me');
    expect(source).toContain('export default function Email()');
  });

  it('previews variable samples while keeping placeholders in the code', async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    const { screen } = await renderEditorPanel('<p>Hello {{name}}</p>');
    await screen
      .getByRole('textbox', { name: 'Sample value for name' })
      .fill('Ada');
    await screen.getByRole('switch', { name: /Preview/ }).click();
    const frame = screen.getByTitle('Rendered email');
    await expect
      .poll(
        () =>
          (frame.element() as HTMLIFrameElement).contentDocument?.body
            .textContent
      )
      .toContain('Hello Ada');
    await screen.getByRole('button', { name: 'Code' }).click();
    await screen.getByRole('button', { name: 'Copy HTML' }).click();
    const [html] = writeText.mock.calls[0];
    expect(html).toContain('Hello {{name}}');
  });
});
