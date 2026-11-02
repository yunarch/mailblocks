import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '@/__tests__/test-utils';
import type { EmailDesign } from '@/extensions/ai/design';
import { aiEngine } from '@/extensions/ai/engine';

const design: EmailDesign = {
  accentColor: '#2563eb',
  blocks: [
    {
      type: 'hero',
      title: 'Welcome to Roastery',
      text: 'Fresh coffee, delivered.',
      buttonLabel: 'Shop now',
      buttonUrl: 'https://roastery.test',
    },
  ],
};

// Utility functions
type App = Awaited<ReturnType<typeof renderApp>>;
const openDialog = async ({ screen }: App) => {
  await screen.getByRole('button', { name: 'Design with AI' }).click();
  return screen.getByRole('dialog', { name: 'Design with AI' });
};

// Tests
describe('design with AI', () => {
  beforeEach(() => {
    vi.spyOn(aiEngine, 'hasWebGpu').mockReturnValue(true);
    vi.spyOn(aiEngine, 'getLoadedEngine').mockReturnValue(null);
    vi.spyOn(aiEngine, 'isModelCached').mockResolvedValue(true);
    vi.spyOn(aiEngine, 'loadEngine').mockResolvedValue(
      {} as MLCEngineInterface
    );
    vi.spyOn(aiEngine, 'generateJson').mockResolvedValue(
      JSON.stringify(design)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads the model from the dialog', async () => {
    vi.mocked(aiEngine.isModelCached).mockResolvedValue(false);
    const app = await renderApp();
    const dialog = await openDialog(app);
    await dialog.getByRole('button', { name: 'Download model' }).click();
    await expect
      .element(dialog.getByRole('textbox', { name: 'Prompt' }))
      .toBeInTheDocument();
  });

  it('generates a design into the editor, then edits it', async () => {
    const app = await renderApp();
    let dialog = await openDialog(app);
    const generate = dialog.getByRole('button', { name: 'Generate' });
    await expect.element(generate).toBeDisabled();
    await dialog
      .getByRole('textbox', { name: 'Prompt' })
      .fill('Welcome email for a coffee roastery');
    await generate.click();
    await expect.element(dialog).not.toBeInTheDocument();
    expect(aiEngine.generateJson).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        user: 'Request: Welcome email for a coffee roastery',
      })
    );
    await expect
      .poll(() => app.getEditor().view.dom.textContent)
      .toContain('Welcome to Roastery');

    dialog = await openDialog(app);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Add a footer');
    await dialog.getByRole('button', { name: 'Apply changes' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    const user = vi.mocked(aiEngine.generateJson).mock.lastCall?.[1].user;
    expect(user).toContain(JSON.stringify(design));
    expect(user).toContain('Request: Add a footer');
  });

  it('only offers to edit while the email still matches the AI design', async () => {
    const app = await renderApp();
    let dialog = await openDialog(app);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Make it');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .poll(() => app.getEditor().view.dom.textContent)
      .toContain('Welcome to Roastery');

    app.getEditor().commands.insertContentAt(0, '<p>Manual change</p>');
    dialog = await openDialog(app);
    await expect
      .element(dialog.getByRole('button', { name: 'Edit current design' }))
      .not.toBeInTheDocument();
    await expect
      .element(dialog.getByRole('button', { name: 'Generate' }))
      .toBeInTheDocument();
  });

  it('shows the error when the generation fails', async () => {
    vi.mocked(aiEngine.generateJson).mockRejectedValue(
      new Error('Model failed')
    );
    const app = await renderApp();
    const dialog = await openDialog(app);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Anything');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect
      .element(dialog.getByRole('alert'))
      .toHaveTextContent('Model failed');
  });
});
