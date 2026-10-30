import type { Dispatch, SetStateAction } from 'react';
import type { CodeLocation } from '@/types/linter';
import type { EmailVariable } from '@/types/variables';

// Types
export type SetValue<T> = Dispatch<SetStateAction<T>>;

// Gmail clips messages whose HTML exceeds ~102KB.
export const GMAIL_CLIP_BYTES = 102_400;

// Placeholders such as `{{name}}` or `{{ user.first_name }}`.
const VARIABLE_PATTERN = /\{\{\s*(?<name>[\w.]+)\s*\}\}/g;

/**
 * @param value - The text to escape.
 * @returns The text safe to insert into HTML content and attribute values.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * @param name - A typed variable name.
 * @returns The name without the characters a placeholder can't contain.
 */
export function sanitizeVariableName(name: string): string {
  return name.replaceAll(/[^\w.]/g, '');
}

/**
 * @param texts - The texts to scan, such as text content and attribute values.
 * @returns How many times each `{{name}}` placeholder appears, in order of
 * first appearance.
 */
export function countVariables(texts: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    for (const match of text.matchAll(VARIABLE_PATTERN)) {
      const name = match.groups?.name;
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * @param text - The text to search.
 * @param name - Placeholder to find, e.g. `first_name` for `{{first_name}}`.
 * @returns The start and end offsets of each `{{name}}` placeholder in the text.
 */
export function findVariableRanges(
  text: string,
  name: string
): [number, number][] {
  return [...text.matchAll(VARIABLE_PATTERN)]
    .filter((match) => match.groups?.name === name)
    .map((match) => [match.index, match.index + match[0].length]);
}

/**
 * @param text - The text to clean.
 * @param name - Placeholder to remove, e.g. `first_name` for `{{first_name}}`.
 * @returns The text without any `{{name}}` placeholder.
 */
export function removeVariableFromText(text: string, name: string): string {
  return text.replaceAll(VARIABLE_PATTERN, (match, found: string) =>
    found === name ? '' : match
  );
}

/**
 * @param html - The email HTML containing `{{name}}` placeholders.
 * @param variables - The variables with their sample values.
 * @returns The HTML with each placeholder replaced by its escaped sample
 * value. Placeholders without a sample are kept as-is.
 */
export function applyVariables(
  html: string,
  variables: EmailVariable[]
): string {
  const samples = new Map(
    variables
      .filter(({ sample }) => sample)
      .map(({ name, sample }) => [name, sample])
  );
  if (samples.size === 0) return html;
  return html.replaceAll(VARIABLE_PATTERN, (match, name: string) => {
    const sample = samples.get(name);
    return sample === undefined ? match : escapeHtml(sample);
  });
}

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
