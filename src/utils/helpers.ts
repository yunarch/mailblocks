import type { Dispatch, SetStateAction } from 'react';
import type { CodeLocation } from '@/types/linter';

// Types
export type SetValue<T> = Dispatch<SetStateAction<T>>;

/**
 * @param url - The URL to check
 * @returns true if the URL is a localhost URL, false otherwise
 */
export function isLocalhostUrl(url: string | URL): boolean {
  try {
    const { hostname } = url instanceof URL ? url : new URL(url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}

/**
 * @param bytes - The number of bytes to format
 * @returns A human-readable string representing the size in bytes, kilobytes, or megabytes.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Finds the line and column number of a given needle string within the provided markup.
 * If the needle is not found, returns line 1, column 0.
 *
 * @param markup - The full HTML markup to search within.
 * @param needle - The specific string to find within the markup (e.g., a URL or tag snippet).
 * @returns An object containing the line and column number where the needle is located in the markup.
 */
export function findCodeLocation(markup: string, needle: string): CodeLocation {
  const offset = markup.indexOf(needle);
  if (offset === -1) return { line: 1, column: 0 };
  const safeOffset = Math.max(0, offset);
  const precedingContent = markup.slice(0, safeOffset);
  const lines = precedingContent.split('\n');
  const line = lines.length;
  const column = lines.at(-1)?.length ?? 0;
  return { line, column };
}
