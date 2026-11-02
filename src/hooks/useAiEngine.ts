import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { useCallback, useEffect, useState } from 'react';
import { aiEngine } from '@/extensions/ai/engine';

type AiEngineState =
  | { status: 'unsupported' }
  | { status: 'checking' }
  | { status: 'download' }
  | { status: 'loading'; progress: number; text: string }
  | { status: 'ready'; engine: MLCEngineInterface }
  | { status: 'error'; message: string };

/**
 * Hook that manages the in-browser AI model: once active, it loads a model
 * that is already stored in the browser, and otherwise waits for `load()` so
 * the user agrees to the download first.
 *
 * @param active - Whether the model is needed now (e.g. its dialog is open).
 * @returns The model state and `load()` to download and load it.
 */
export function useAiEngine(active: boolean) {
  const [state, setState] = useState<AiEngineState>(() => {
    if (!aiEngine.hasWebGpu()) return { status: 'unsupported' };
    const engine = aiEngine.getLoadedEngine();
    return engine ? { status: 'ready', engine } : { status: 'checking' };
  });

  // Methods
  const load = useCallback(async () => {
    setState({ status: 'loading', progress: 0, text: '' });
    try {
      const engine = await aiEngine.loadEngine(({ progress, text }) => {
        setState({ status: 'loading', progress, text });
      });
      setState({ status: 'ready', engine });
    } catch (error) {
      setState({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'The model failed to load.',
      });
    }
  }, []);

  useEffect(() => {
    if (!active || state.status !== 'checking') return;
    const controller = new AbortController();
    void (async () => {
      const cached = await aiEngine.isModelCached();
      if (controller.signal.aborted) return;
      if (cached) await load();
      else setState({ status: 'download' });
    })();
    return () => {
      controller.abort();
    };
  }, [active, state.status, load]);

  return { state, load };
}
