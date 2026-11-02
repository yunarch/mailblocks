import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { aiEngine } from '@/extensions/ai/engine';
import { useAiEngine } from '../useAiEngine';

const engine = {} as MLCEngineInterface;

describe('useAiEngine', () => {
  beforeEach(() => {
    vi.spyOn(aiEngine, 'hasWebGpu').mockReturnValue(true);
    vi.spyOn(aiEngine, 'getLoadedEngine').mockReturnValue(null);
    vi.spyOn(aiEngine, 'isModelCached').mockResolvedValue(false);
    vi.spyOn(aiEngine, 'loadEngine').mockResolvedValue(engine);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is unsupported without WebGPU and never touches the model', async () => {
    vi.mocked(aiEngine.hasWebGpu).mockReturnValue(false);
    const { result } = await renderHook(() => useAiEngine(true));
    expect(result.current.state).toEqual({ status: 'unsupported' });
    expect(aiEngine.isModelCached).not.toHaveBeenCalled();
    expect(aiEngine.loadEngine).not.toHaveBeenCalled();
  });

  it('reuses the engine already loaded in this session', async () => {
    vi.mocked(aiEngine.getLoadedEngine).mockReturnValue(engine);
    const { result } = await renderHook(() => useAiEngine(true));
    expect(result.current.state).toEqual({ status: 'ready', engine });
    expect(aiEngine.isModelCached).not.toHaveBeenCalled();
  });

  it('waits until it is active before checking for the model', async () => {
    const { result, rerender } = await renderHook(
      (active?: boolean) => useAiEngine(active ?? false),
      { initialProps: false }
    );
    expect(result.current.state).toEqual({ status: 'checking' });
    expect(aiEngine.isModelCached).not.toHaveBeenCalled();
    await rerender(true);
    await expect
      .poll(() => result.current.state)
      .toEqual({ status: 'download' });
  });

  it('loads a model stored in the browser without asking', async () => {
    vi.mocked(aiEngine.isModelCached).mockResolvedValue(true);
    const { result } = await renderHook(() => useAiEngine(true));
    await expect
      .poll(() => result.current.state)
      .toEqual({ status: 'ready', engine });
  });

  it('only downloads the model when asked, reporting progress', async () => {
    const download = Promise.withResolvers<MLCEngineInterface>();
    vi.mocked(aiEngine.loadEngine).mockImplementation(async (onProgress) => {
      onProgress({ progress: 0.5, text: 'Fetching weights' });
      return download.promise;
    });
    const { result, act } = await renderHook(() => useAiEngine(true));
    await expect
      .poll(() => result.current.state)
      .toEqual({ status: 'download' });
    expect(aiEngine.loadEngine).not.toHaveBeenCalled();
    await act(() => {
      void result.current.load();
    });
    expect(result.current.state).toEqual({
      status: 'loading',
      progress: 0.5,
      text: 'Fetching weights',
    });
    download.resolve(engine);
    await expect
      .poll(() => result.current.state)
      .toEqual({ status: 'ready', engine });
  });

  it('reports a failed load and can try again', async () => {
    vi.mocked(aiEngine.loadEngine).mockRejectedValueOnce(
      new Error('Device lost')
    );
    const { result, act } = await renderHook(() => useAiEngine(true));
    await act(async () => {
      await result.current.load();
    });
    expect(result.current.state).toEqual({
      status: 'error',
      message: 'Device lost',
    });
    await act(async () => {
      await result.current.load();
    });
    expect(result.current.state).toEqual({ status: 'ready', engine });
  });
});
