import { beforeEach } from 'vitest';
import { cleanup } from 'vitest-browser-react';
import '../styles/index.css';

// vitest-browser-react only registers its auto-cleanup once per module load, which breaks with isolate: false
beforeEach(async () => {
  await cleanup();
});
