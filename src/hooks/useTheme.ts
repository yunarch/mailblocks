import { useCallback, useState } from 'react';

export type ThemeType = 'light' | 'dark';

/**
 * Hook that manages the application's color theme (dark/light).
 *
 * Reads the initial theme from `document.documentElement.dataset.theme`,
 * defaulting to `'dark'`, and keeps the DOM attribute in sync on changes.
 *
 * @returns A tuple of the current theme and a function to toggle it.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeType>(() => {
    return (document.documentElement.dataset.theme as ThemeType) ?? 'dark';
  });
  const toggleTheme = useCallback(
    (t?: ThemeType) => {
      const newTheme = t ?? (theme === 'dark' ? 'light' : 'dark');
      setTheme(newTheme);
      document.documentElement.dataset.theme = newTheme;
    },
    [theme]
  );
  return [theme, toggleTheme] as const;
}
