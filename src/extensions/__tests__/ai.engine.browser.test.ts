import {
  prebuiltAppConfig,
  WebWorkerMLCEngine,
  type ChatCompletion,
  type MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiEngine, MODEL_F16, MODEL_F32 } from '../ai/engine';

// Utility functions
const fakeEngine = (choice: Partial<ChatCompletion.Choice>) => {
  const create = vi.fn().mockResolvedValue({
    choices: [{ finish_reason: 'stop', message: { content: '{}' }, ...choice }],
  });
  return {
    create,
    engine: {
      chat: { completions: { create } },
    } as never as MLCEngineInterface,
  };
};
const request = { system: 'Be brief', user: 'Hi', schema: { type: 'object' } };

// Tests
describe('ai engine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses models that web-llm still provides', () => {
    const ids = prebuiltAppConfig.model_list.map((model) => model.model_id);
    expect(ids).toContain(MODEL_F16);
    expect(ids).toContain(MODEL_F32);
  });

  it('reports the model as not stored when it was never downloaded', async () => {
    await expect(aiEngine.isModelCached()).resolves.toBe(false);
  });

  it('has no engine to reuse or interrupt before loading', () => {
    expect(aiEngine.getLoadedEngine()).toBeNull();
    expect(() => {
      aiEngine.interruptGeneration();
    }).not.toThrow();
  });

  it('asks the model for JSON matching the schema', async () => {
    const { engine, create } = fakeEngine({
      message: { role: 'assistant', content: '{"ok":true}' },
    });
    await expect(aiEngine.generateJson(engine, request)).resolves.toBe(
      '{"ok":true}'
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'Be brief' },
          { role: 'user', content: 'Hi' },
        ],
        response_format: {
          type: 'json_object',
          schema: JSON.stringify(request.schema),
        },
      })
    );
    expect(create.mock.calls[0][0]).not.toHaveProperty('stream', true);
  });

  it('returns null when the generation was interrupted', async () => {
    const { engine } = fakeEngine({ finish_reason: 'abort' });
    await expect(aiEngine.generateJson(engine, request)).resolves.toBeNull();
  });

  it('returns an empty reply when the model sends no content', async () => {
    const { engine } = fakeEngine({
      message: { role: 'assistant', content: null },
    });
    await expect(aiEngine.generateJson(engine, request)).resolves.toBe('');
  });
});

describe('ai engine worker', () => {
  it('answers web-llm requests from the page', async () => {
    const worker = new Worker(
      new URL('../ai/engine.worker.ts', import.meta.url),
      {
        type: 'module',
      }
    );
    try {
      const engine = new WebWorkerMLCEngine(worker);
      // Without a loaded model the handler replies with an error, which
      // proves the worker runs and speaks the same protocol as the client
      await expect(engine.getMessage()).rejects.toThrow();
    } finally {
      worker.terminate();
    }
  });
});
