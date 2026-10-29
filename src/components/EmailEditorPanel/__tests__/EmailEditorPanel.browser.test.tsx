import type { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { interceptFilePicker, renderApp } from '@/__tests__/test-utils';
import { EmailEditorPanel } from '../EmailEditorPanel';

const paragraphs = (editor: Editor) => {
  return [...editor.view.dom.querySelectorAll('p')].map((p) => p.textContent);
};

// Renders the editor panel with the given email content.
const renderPanel = async (html?: string) => {
  const result = await renderApp(
    <div className="flex h-svh flex-col">
      <EmailEditorPanel />
    </div>
  );
  const editor = result.getEditor();
  if (html) editor.commands.setContent(html);
  return { ...result, editor };
};

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

describe('editing blocks from the inspector', () => {
  it('moves, duplicates and deletes the selected block', async () => {
    const { screen, editor } = await renderPanel(
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
    const { screen } = await renderPanel('<p>First</p><p>Last</p>');
    await screen.getByText('First').click();
    await expect
      .element(screen.getByRole('button', { name: 'Move up' }))
      .toBeDisabled();
    await expect
      .element(screen.getByRole('button', { name: 'Move down' }))
      .toBeEnabled();
  });

  it('undoes each action separately', async () => {
    const { screen, editor } = await renderPanel(
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

describe('slash commands', () => {
  it('inserts a pre-styled block and continues on a new line below it', async () => {
    const { editor } = await renderPanel('<p>Intro</p><p></p>');
    await runSlashCommand(editor, 'hero');
    await userEvent.keyboard('After');
    const text = editor.view.dom.textContent;
    expect(text).toContain('Your headline here');
    expect(text.indexOf('After')).toBeGreaterThan(text.indexOf('Get started'));
    expect(text).not.toContain('/');
  });

  it('uploads an image picked from the Image command', async () => {
    const picker = interceptFilePicker();
    const { editor } = await renderPanel('<p>Intro</p><p></p>');
    await runSlashCommand(editor, 'image');
    picker.choose(new File(['x'], 'photo.png', { type: 'image/png' }));
    await expect
      .poll(() => editor.view.dom.querySelector('img')?.src)
      .toMatch(/^blob:/);
    expect(editor.view.dom.textContent).not.toContain('/');
  });
});

describe('image inspector', () => {
  it('replaces the selected image and warns that it is only local', async () => {
    const picker = interceptFilePicker();
    const { screen, editor } = await renderPanel(
      '<p>Intro</p><img src="https://example.com/a.png" alt="Logo" width="300" height="200">'
    );
    await page
      .elementLocator(editor.view.dom.querySelector('img') as Element)
      .click();
    const url = screen.getByLabelText('Image URL');
    await expect.element(url).toHaveValue('https://example.com/a.png');
    await expect.element(screen.getByLabelText('Alt text')).toHaveValue('Logo');
    await expect
      .element(screen.getByText(/only saved in your browser/))
      .not.toBeInTheDocument();
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

describe('editor canvas', () => {
  it('does not follow links when they are clicked', async () => {
    const { screen } = await renderPanel(
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
    const { screen, editor } = await renderPanel('<p>Hover me</p>');
    const outline = editor.view.dom.parentElement?.querySelector<HTMLElement>(
      '.mailblocks-hover-overlay--hovered'
    );
    await screen.getByText('Hover me').hover();
    await expect.poll(() => outline?.hidden).toBe(false);
    expect(outline?.dataset.label).toBe('Text');
  });

  it('resizes the canvas to the selected viewport', async () => {
    const { screen, editor } = await renderPanel();
    const canvasWidth = () =>
      editor.view.dom
        .closest<HTMLElement>('.mailblocks-edit-grid')
        ?.style.getPropertyValue('--mailblocks-canvas-width');
    expect(canvasWidth()).toBe('650px');
    await screen.getByRole('button', { name: /^S\s*\(375px\)$/ }).click();
    expect(canvasWidth()).toBe('375px');
  });
});

describe('preview and HTML code', () => {
  it('previews the rendered email including the latest edits', async () => {
    const { screen, editor } = await renderPanel('<p>Original</p>');
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
    const { screen } = await renderPanel('<p>Copy me</p>');
    await screen.getByRole('button', { name: 'HTML code' }).click();
    await expect.element(screen.getByText('Email HTML code')).toBeVisible();
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
});
