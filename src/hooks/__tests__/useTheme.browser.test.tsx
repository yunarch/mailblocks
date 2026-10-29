import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from 'vitest-browser-react';
import { useTheme } from '../useTheme';

const root = document.documentElement;

describe('useTheme', () => {
  let initialTheme: string | undefined;

  beforeEach(() => {
    initialTheme = root.dataset.theme;
    delete root.dataset.theme;
  });

  afterEach(() => {
    if (initialTheme === undefined) delete root.dataset.theme;
    else root.dataset.theme = initialTheme;
  });

  it('defaults to dark when the document has no theme', async () => {
    const { result } = await renderHook(() => useTheme());
    expect(result.current[0]).toBe('dark');
  });

  it('starts from the theme already set on the document', async () => {
    root.dataset.theme = 'light';
    const { result } = await renderHook(() => useTheme());
    expect(result.current[0]).toBe('light');
  });

  it('toggles between dark and light and syncs the document', async () => {
    const { result, act } = await renderHook(() => useTheme());
    await act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe('light');
    expect(root.dataset.theme).toBe('light');
    await act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
  });

  it('applies an explicit theme regardless of the current one', async () => {
    const { result, act } = await renderHook(() => useTheme());
    await act(() => {
      result.current[1]('dark');
    });
    expect(result.current[0]).toBe('dark');
    expect(root.dataset.theme).toBe('dark');
    await act(() => {
      result.current[1]('light');
    });
    await act(() => {
      result.current[1]('light');
    });
    expect(result.current[0]).toBe('light');
    expect(root.dataset.theme).toBe('light');
  });
});
