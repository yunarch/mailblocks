import type { Dispatch, SetStateAction } from 'react';
import type { CodeLocation } from '@/types/linter';

// Types
export type SetValue<T> = Dispatch<SetStateAction<T>>;

// Gmail clips messages whose HTML exceeds ~102KB.
export const GMAIL_CLIP_BYTES = 102_400;

/**
 * @param value - The string to measure.
 * @returns The UTF-8 byte length of the string.
 */
export function getByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

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
 * @param markup - The full HTML markup.
 * @param offset - A character offset within the markup.
 * @returns The line and column number of the offset.
 */
export function getCodeLocation(markup: string, offset: number): CodeLocation {
  const before = markup.slice(0, Math.max(0, offset));
  return {
    line: before.split('\n').length,
    column: before.length - before.lastIndexOf('\n') - 1,
  };
}

/**
 * Finds the line and column number of a given needle string within the provided markup.
 * If the needle is not found, returns line 1, column 0.
 *
 * @param markup - The full HTML markup to search within.
 * @param needle - The specific string to find within the markup (e.g., a URL or tag snippet).
 * @param fromIndex - The offset to start searching from.
 * @returns An object containing the line and column number where the needle is located in the markup.
 */
export function findCodeLocation(
  markup: string,
  needle: string,
  fromIndex = 0
): CodeLocation {
  const offset = markup.indexOf(needle, fromIndex);
  if (offset === -1) return { line: 1, column: 0 };
  return getCodeLocation(markup, offset);
}
