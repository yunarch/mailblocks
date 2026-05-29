import { useCallback, useSyncExternalStore } from 'react';

/**
 * Easily retrieve media dimensions with this Hook which also works onResize.
 *
 * @param query - the media query to check.
 * @returns true if the window matches the media query, false otherwise.
 *
 * @example
 * ```tsx
 * function App() {
 *      const matches = useMediaQuery('(min-width: 768px)')
 *      return (
 *          <div>
 *              {`The view port is ${matches ? 'at least' : 'less than'} 768 pixels wide`}
 *          </div>
 *      )
 * }
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const matchMedia = globalThis.matchMedia(query);
      matchMedia.addEventListener('change', callback);
      return () => {
        matchMedia.removeEventListener('change', callback);
      };
    },
    [query]
  );
  const getSnapshot = () => {
    return globalThis.matchMedia(query).matches;
  };
  return useSyncExternalStore(subscribe, getSnapshot, () => {
    throw new Error('useMediaQuery is a client-only hook');
  });
}
