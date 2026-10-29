# Testing

## File layout

- `src/__tests__/`: shared test utilities, mocks, and setup files only (for
  example, `setup.browser.ts` and `test-utils.tsx`). Do not put tests here.
- Tests belong in `__tests__/` directories alongside the code they test:
  - `src/utils/__tests__/`
  - `src/components/ComponentName/__tests__/`
  - `src/hooks/__tests__/`
  - `src/providers/__tests__/`
  - `src/ui/ComponentName/__tests__/`
  - `src/extensions/__tests__/`

Use `*.test.ts` for pure utilities in the standard Vitest project. Use
`*.browser.test.ts` or `*.browser.test.tsx` for DOM and React tests in headless
Chromium. DOM-dependent utilities also use browser tests, not simulated DOMs.

## Test structure

Import `describe`, `expect`, and `it` explicitly from `vitest`. Group tests by the
public function or component, and use behavior-focused descriptions. Import the
subject from its adjacent source directory:

```ts
import { describe, expect, it } from 'vitest';
import { getByteLength } from '../helpers';

describe('getByteLength', () => {
  it('counts UTF-8 bytes rather than characters', () => {
    expect(getByteLength('\u00e9')).toBe(2);
  });
});
```

Assert observable output, including boundary values and negative cases. Avoid
testing implementation details or merely asserting that exports exist.

## Rendering components

For components without providers, use `render` from `vitest-browser-react`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Button } from '../Button';

describe('<Button />', () => {
  it('calls onClick', async () => {
    const onClick = vi.fn();
    const screen = await render(<Button onClick={onClick}>Save</Button>);
    await screen.getByRole('button', { name: 'Save' }).click();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

Use accessible locators and await browser actions and `expect.element`
assertions. Add shared provider wrappers to `src/__tests__/` only when needed.

## Mocking browser APIs

Prefer real browser behavior. When an API needs mocking, use `vi.spyOn` and
restore spies with `afterEach(() => vi.restoreAllMocks())`. Keep mock return
values type-safe and restore any DOM or storage state changed by a test.

Unforgeable browser APIs such as `location.reload` cannot be spied on or
redefined in a real browser; do not test them.

Do not use `vi.mock` for modules. The configuration uses `isolate: false`, so
the module cache is shared across files and module mocks can leak between tests.
