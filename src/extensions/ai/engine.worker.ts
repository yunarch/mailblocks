import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();
addEventListener('message', (event) => {
  handler.onmessage(event);
});
