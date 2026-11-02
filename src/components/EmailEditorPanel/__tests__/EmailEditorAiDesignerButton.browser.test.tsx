import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { renderEditorPanel } from '@/__tests__/test-utils';
import type { EmailDesign } from '@/extensions/ai/design';
import { aiEngine } from '@/extensions/ai/engine';

const engine = {} as MLCEngineInterface;
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

const openDialog = async (
  screen: Awaited<ReturnType<typeof renderEditorPanel>>['screen']
) => {
  await screen.getByRole('button', { name: 'Design with AI' }).click();
  return screen.getByRole('dialog', { name: 'Design with AI' });
};

describe('email editor AI designer button', () => {
  beforeEach(() => {
    vi.spyOn(aiEngine, 'hasWebGpu').mockReturnValue(true);
    vi.spyOn(aiEngine, 'getLoadedEngine').mockReturnValue(null);
    vi.spyOn(aiEngine, 'isModelCached').mockResolvedValue(true);
    vi.spyOn(aiEngine, 'loadEngine').mockResolvedValue(engine);
    vi.spyOn(aiEngine, 'generateJson').mockResolvedValue(
      JSON.stringify(design)
    );
    vi.spyOn(aiEngine, 'interruptGeneration');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains when WebGPU is unavailable', async () => {
    vi.mocked(aiEngine.hasWebGpu).mockReturnValue(false);
    const { screen } = await renderEditorPanel();
    const dialog = await openDialog(screen);
    await expect
      .element(
        dialog.getByText(
          'This needs WebGPU, which this browser or device does not support.'
        )
      )
      .toBeInTheDocument();
    await expect
      .element(dialog.getByRole('button', { name: 'Generate' }))
      .not.toBeInTheDocument();
  });

  it('shows model download progress, errors and retry', async () => {
    vi.mocked(aiEngine.isModelCached).mockResolvedValue(false);
    const download = Promise.withResolvers<MLCEngineInterface>();
    vi.mocked(aiEngine.loadEngine).mockImplementationOnce(
      async (onProgress) => {
        onProgress({ progress: 0.5, text: 'Fetching weights' });
        return download.promise;
      }
    );
    const { screen } = await renderEditorPanel();
    const dialog = await openDialog(screen);
    await dialog.getByRole('button', { name: 'Download model' }).click();
    await expect
      .element(dialog.getByText('Fetching weights'))
      .toBeInTheDocument();
    expect(dialog.getByRole('progressbar').element()).toHaveProperty(
      'value',
      0.5
    );

    download.reject(new Error('Device lost'));
    await expect.element(dialog.getByText('Device lost')).toBeInTheDocument();
    await dialog.getByRole('button', { name: 'Try again' }).click();
    await expect
      .element(dialog.getByRole('textbox', { name: 'Prompt' }))
      .toBeInTheDocument();
  });

  it('applies a generated design in one undoable editor action', async () => {
    const { screen, getEditor } = await renderEditorPanel();
    const dialog = await openDialog(screen);
    await dialog
      .getByRole('textbox', { name: 'Prompt' })
      .fill('Welcome email for a coffee roastery');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
    await expect
      .poll(() => getEditor().view.dom.textContent)
      .toContain('Welcome to Roastery');
    expect(aiEngine.generateJson).toHaveBeenCalledWith(
      engine,
      expect.objectContaining({
        user: 'Request: Welcome email for a coffee roastery',
      })
    );

    await screen.getByText('Welcome to Roastery').click();
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(getEditor().view.dom.textContent).toContain('Welcome to Mailblocks');
    expect(getEditor().view.dom.textContent).not.toContain(
      'Welcome to Roastery'
    );
  });

  it('preserves manual editor changes made while generation is running', async () => {
    const generation = Promise.withResolvers<string>();
    vi.mocked(aiEngine.generateJson).mockReturnValue(generation.promise);
    const { screen, getEditor } = await renderEditorPanel();
    const dialog = await openDialog(screen);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Make a design');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    getEditor().commands.setContent('<p>Manual update</p>');
    generation.resolve(JSON.stringify(design));

    await expect
      .element(
        dialog
          .getByRole('alert')
          .getByText(
            'The email changed while generating. Close this dialog and try again.'
          )
      )
      .toBeInTheDocument();
    expect(getEditor().view.dom.textContent).toContain('Manual update');
    expect(getEditor().view.dom.textContent).not.toContain(
      'Welcome to Roastery'
    );
  });

  it('interrupts generation and ignores its result when closed', async () => {
    const generation = Promise.withResolvers<string>();
    vi.mocked(aiEngine.generateJson).mockReturnValue(generation.promise);
    const { screen, getEditor } = await renderEditorPanel();
    const originalHtml = getEditor().getHTML();
    const dialog = await openDialog(screen);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Make a design');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await userEvent.keyboard('{Escape}');
    await expect.element(dialog).not.toBeInTheDocument();
    expect(aiEngine.interruptGeneration).toHaveBeenCalledOnce();
    generation.resolve(JSON.stringify(design));
    await expect.poll(() => getEditor().getHTML()).toBe(originalHtml);
  });

  it('shows generation failures and allows the user to retry', async () => {
    vi.mocked(aiEngine.generateJson).mockRejectedValueOnce(
      new Error('Model failed')
    );
    const { screen } = await renderEditorPanel();
    const dialog = await openDialog(screen);
    await dialog.getByRole('textbox', { name: 'Prompt' }).fill('Make a design');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect
      .element(dialog.getByRole('alert'))
      .toHaveTextContent('Model failed');
    await dialog.getByRole('button', { name: 'Generate' }).click();
    await expect.element(dialog).not.toBeInTheDocument();
  });
});
