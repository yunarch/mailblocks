import type { Dispatch, SetStateAction } from 'react';

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
