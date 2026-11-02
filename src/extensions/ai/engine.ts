import type { MLCEngineInterface } from '@mlc-ai/web-llm';

export type EngineProgress = { progress: number; text: string };

// Small instruct model (~1 GB download). The f16 build needs the `shader-f16` GPU feature.
const MODEL_F16 = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const MODEL_F32 = 'Qwen2.5-1.5B-Instruct-q4f32_1-MLC';

// Shared by every caller, so the model is only loaded once per page.
const session: {
  modelId: Promise<string> | null;
  engine: Promise<MLCEngineInterface> | null;
  loadedEngine: MLCEngineInterface | null;
  onProgress: ((progress: EngineProgress) => void) | undefined;
} = { modelId: null, engine: null, loadedEngine: null, onProgress: undefined };

/**
 * @returns Whether the browser supports WebGPU, which the model needs.
 */
function hasWebGpu() {
  return 'gpu' in navigator;
}

/**
 * @returns The engine when it has already been loaded in this session.
 */
function getLoadedEngine() {
  return session.loadedEngine;
}

/**
 * @returns The id of the model build this device can run.
 */
function getModelId() {
  session.modelId ??= (async () => {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter?.features.has('shader-f16') ? MODEL_F16 : MODEL_F32;
  })();
  return session.modelId;
}

/**
 * @returns Whether the model files are already stored in the browser, so loading needs no download.
 */
async function isModelCached() {
  try {
    const [{ hasModelInCache }, id] = await Promise.all([
      import('@mlc-ai/web-llm'),
      getModelId(),
    ]);
    return await hasModelInCache(id);
  } catch {
    return false;
  }
}

/**
 * @returns The engine running the model in a worker, so the page stays responsive.
 */
async function createEngine() {
  const [{ CreateWebWorkerMLCEngine }, id] = await Promise.all([
    import('@mlc-ai/web-llm'),
    getModelId(),
  ]);
  // eslint-disable-next-line unicorn/relative-url-style -- Vite only bundles the worker when the URL starts with `./`.
  const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {
    type: 'module',
  });
  try {
    const engine = await CreateWebWorkerMLCEngine(worker, id, {
      initProgressCallback: (report) => {
        session.onProgress?.(report);
      },
    });
    session.loadedEngine = engine;
    return engine;
  } catch (error) {
    worker.terminate();
    throw error;
  }
}

/**
 * Downloads (when needed) and loads the model. The engine is shared, so calling
 * it again while loading, or after loading, reuses the same one.
 *
 * @param onProgress - Called while the model files are downloaded and loaded.
 * @returns The loaded engine.
 */
async function loadEngine(onProgress: (progress: EngineProgress) => void) {
  session.onProgress = onProgress;
  session.engine ??= createEngine();
  try {
    return await session.engine;
  } catch (error) {
    session.engine = null;
    throw error;
  }
}

/**
 * Asks the model for a reply in JSON.
 *
 * @param engine - The loaded engine.
 * @param request - The instructions and the shape of the reply.
 * @param request.system - How the model should behave.
 * @param request.user - What the user asks for.
 * @param request.schema - The JSON schema the reply must match.
 * @returns The reply, or `null` when the generation was interrupted.
 */
async function generateJson(
  engine: MLCEngineInterface,
  { system, user, schema }: { system: string; user: string; schema: object }
) {
  const reply = await engine.chat.completions.create({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    // The model must also be told to answer in JSON, or it can loop on whitespace.
    response_format: { type: 'json_object', schema: JSON.stringify(schema) },
    temperature: 0.5,
    max_tokens: 1800,
  });
  const [choice] = reply.choices;
  if (choice.finish_reason === 'abort') return null;
  return choice.message.content ?? '';
}

/**
 * Stops the generation in progress.
 */
function interruptGeneration() {
  session.loadedEngine?.interruptGenerate();
}

// Callers go through this object, so tests can replace the real model with `vi.spyOn`.
export const aiEngine = {
  hasWebGpu,
  getLoadedEngine,
  isModelCached,
  loadEngine,
  generateJson,
  interruptGeneration,
};
