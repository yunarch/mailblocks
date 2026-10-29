import { describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { renderApp } from '@/__tests__/test-utils';

type App = Awaited<ReturnType<typeof renderApp>>;

// Utility functions
const editorText = (app: App) => app.getEditor().view.dom.textContent;
const pickTemplate = async ({ screen }: App, name: string) => {
  const toggle = screen.getByRole('button', { name: /templates$/ });
  if (toggle.element().getAttribute('aria-label') === 'Open templates') {
    await toggle.click();
  }
  await screen
    .getByRole('button', { name: new RegExp(name) })
    .first()
    .click();
};
const editHeading = async ({ screen }: App) => {
  await screen.getByText('Welcome to Mailblocks').click();
  await userEvent.keyboard('{End} edited');
};

// Tests
describe('templates drawer', () => {
  it('opens and closes from the header', async () => {
    const { screen } = await renderApp();
    await screen.getByRole('button', { name: 'Open templates' }).click();
    await expect
      .element(screen.getByRole('heading', { name: 'Templates' }))
      .toBeVisible();
    await expect
      .element(screen.getByRole('heading', { name: 'Local' }))
      .toBeVisible();
    await screen.getByRole('button', { name: 'Close templates' }).click();
    await expect
      .element(screen.getByRole('button', { name: 'Open templates' }))
      .toBeVisible();
  });

  it('loads a picked template right away when there are no edits', async () => {
    const app = await renderApp();
    await pickTemplate(app, 'Password Reset');
    await expect.poll(() => editorText(app)).toContain('Reset your password');
    expect(editorText(app)).not.toContain('Welcome to Mailblocks');
    await expect
      .element(app.screen.getByRole('dialog'))
      .not.toBeInTheDocument();
  });

  it('keeps unsaved edits when switching is cancelled', async () => {
    const app = await renderApp();
    await editHeading(app);
    await pickTemplate(app, 'Password Reset');
    const dialog = app.screen.getByRole('dialog', { name: 'Unsaved Changes' });
    await expect
      .element(dialog.getByText(/will discard your current edits/))
      .toBeVisible();
    await app.screen.getByRole('button', { name: 'Keep editing' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(editorText(app)).toContain('Welcome to Mailblocks edited');
  });

  it('discards unsaved edits when switching is confirmed', async () => {
    const app = await renderApp();
    await editHeading(app);
    await pickTemplate(app, 'Password Reset');
    await app.screen.getByRole('button', { name: 'Discard & switch' }).click();
    await expect
      .element(app.screen.getByRole('dialog'))
      .not.toBeInTheDocument();
    await expect.poll(() => editorText(app)).toContain('Reset your password');
    expect(editorText(app)).not.toContain('edited');
  });

  it('keeps edits when picking the template that is already open', async () => {
    const app = await renderApp();
    await editHeading(app);
    await pickTemplate(app, 'Mailblocks starter');
    await expect
      .element(app.screen.getByRole('dialog'))
      .not.toBeInTheDocument();
    expect(editorText(app)).toContain('Welcome to Mailblocks edited');
  });
});
