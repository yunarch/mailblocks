/* eslint-disable max-lines */
import type { LintCheck, LintingRow, LintStatus } from '@/types/linter';
import {
  findCodeLocation,
  formatBytes,
  getByteLength,
  GMAIL_CLIP_BYTES,
  isLocalhostUrl,
} from './helpers';

// Placeholders replaced by email service providers ({{x}}, *|x|*, %%x%%, [[x]])
const MERGE_TAG_PATTERN = /\{\{.*\}\}|\*\|.*\|\*|%%.*%%|\[\[.*\]\]/;

/**
 * @param checks - The failing lint checks of an element.
 * @returns The overall lint status for the element, determined by the most severe failing check.
 */
function getStatusFromChecks(
  checks: LintCheck[]
): Exclude<LintStatus, 'success'> {
  if (
    checks.some((check) => check.status === 'error' || check.type === 'syntax')
  ) {
    return 'error';
  }
  if (checks.every((check) => check.status === 'info')) return 'info';
  return 'warning';
}

/**
 * @param value - The data URL string to analyze.
 * @returns The byte count of the data represented by the data URL, accounting for base64 encoding if applicable.
 */
function getDataUrlByteCount(value: string) {
  const [, data = ''] = value.split(',', 2);
  if (value.startsWith('data:') && value.includes(';base64,')) {
    const padding = data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0;
    return Math.floor((data.length * 3) / 4) - padding;
  }
  try {
    return getByteLength(decodeURIComponent(data));
  } catch {
    return getByteLength(data);
  }
}

/**
 * @param detail - The message describing the failing check.
 * @param type - The type of the failing check.
 * @param status - An optional status overriding the one derived from the type.
 * @returns A failing lint check.
 */
function fail(
  detail: string,
  type: LintCheck['type'],
  status?: LintCheck['status']
): LintCheck {
  return { passed: false, type, status, metadata: { detail } };
}

/**
 * Checks a link or image URL for issues that prevent it from working for recipients.
 *
 * Checks:
 *  - relative or invalid URLs.
 *  - `javascript:` URLs.
 *  - temporary `blob:` URLs (e.g. images uploaded in this browser).
 *  - `data:` images (blocked by Gmail and most Outlook versions).
 *  - HTTP URLs.
 *  - localhost URLs.
 *  - invalid mailto addresses.
 *
 * @param value - The URL to check.
 * @param kind - Whether the URL belongs to a link or an image.
 * @returns The failing checks for the URL.
 */
function checkUrl(value: string, kind: 'link' | 'image'): LintCheck[] {
  if (MERGE_TAG_PATTERN.test(value)) return [];
  if (kind === 'link' && value.startsWith('#')) return [];
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    const isRelative = !/^[a-z][a-z\d+.-]*:/i.test(value);
    return [
      fail(
        isRelative
          ? 'Relative URLs do not work in email, use an absolute https:// URL'
          : `Invalid ${kind === 'image' ? 'image source' : 'URL syntax'}`,
        'syntax'
      ),
    ];
  }
  const checks: LintCheck[] = [];
  // eslint-disable-next-line no-script-url -- Detecting script URLs, not executing them.
  if (url.protocol === 'javascript:') {
    checks.push(
      // eslint-disable-next-line no-script-url -- Message text only.
      fail('javascript: URLs are blocked by email clients', 'security', 'error')
    );
  }
  if (url.protocol === 'blob:') {
    checks.push(
      fail(
        kind === 'image'
          ? 'Temporary image only available in this browser, host it on a public URL'
          : 'Temporary blob: URL only available in this browser',
        'email_best_practice',
        'error'
      )
    );
  }
  if (url.protocol === 'data:' && kind === 'image') {
    checks.push({
      passed: false,
      type: 'email_best_practice',
      metadata: {
        detail:
          'Embedded images are blocked by Gmail and most Outlook versions, host it on a public URL',
        byteCount: getDataUrlByteCount(value),
      },
    });
  }
  if (isLocalhostUrl(url)) {
    checks.push(
      fail(
        kind === 'image'
          ? 'Local images will not work for recipients'
          : 'Local URLs will not work for recipients',
        'email_best_practice'
      )
    );
  }
  if (url.protocol === 'http:') {
    checks.push(fail('Use HTTPS instead of HTTP', 'security'));
  }
  if (url.protocol === 'mailto:' && !url.pathname.includes('@')) {
    checks.push(fail('Invalid mailto address', 'syntax'));
  }
  return checks;
}

/**
 * @param anchor - The anchor element to check.
 * @returns Whether the link has text that screen readers and spam filters can read.
 */
function hasAccessibleText(anchor: HTMLAnchorElement): boolean {
  if (anchor.textContent.trim()) return true;
  if (anchor.getAttribute('aria-label')?.trim()) return true;
  if (anchor.getAttribute('title')?.trim()) return true;
  return [...anchor.querySelectorAll('img')].some((image) =>
    image.getAttribute('alt')?.trim()
  );
}

/**
 * @param params - An object containing the parameters for creating a markup linting row.
 * @returns A LintingRow object representing a linting issue found in the markup, with details about the issue and its location.
 */
function createMarkupRow({
  markup,
  label,
  detail,
  type,
  needle,
}: {
  markup: string;
  label: string;
  detail: string;
  type: LintCheck['type'];
  needle: string;
}): LintingRow {
  return {
    source: 'markup',
    result: {
      status: type === 'client_limit' ? 'info' : 'warning',
      label,
      codeLocation: findCodeLocation(markup, needle),
      checks: [fail(detail, type)],
    },
  };
}

/**
 * Lints a single anchor element for common issues in email clients.
 *
 * Checks:
 *  - missing href.
 *  - URL issues (see `checkUrl`).
 *  - links without accessible text.
 *
 * @param anchor - The anchor element to lint.
 * @param markup - The HTML markup containing the anchor element.
 * @returns A LintingRow object representing the linting results for the anchor element, or null if no issues were found.
 */
function lintLink(
  anchor: HTMLAnchorElement,
  markup: string
): LintingRow | null {
  const link = anchor.getAttribute('href')?.trim() ?? '';
  const checks = link
    ? checkUrl(link, 'link')
    : [fail('Missing href', 'syntax')];
  if (!hasAccessibleText(anchor)) {
    checks.push(
      fail('Link has no text, add text or image alt text', 'accessibility')
    );
  }
  if (checks.length === 0) return null;
  return {
    source: 'link',
    result: {
      status: getStatusFromChecks(checks),
      link: link || '(missing href)',
      codeLocation: findCodeLocation(markup, link || '<a'),
      checks,
    },
  };
}

/**
 * Lints a single image element for common issues in email clients.
 *
 * Checks:
 *  - missing alt text.
 *  - missing width attribute (Outlook ignores CSS width).
 *  - missing src.
 *  - URL issues (see `checkUrl`).
 *
 * @param image - The image element to lint.
 * @param markup - The HTML markup containing the image element.
 * @returns A LintingRow object representing the linting results for the image element, or null if no issues were found.
 */
function lintImage(image: HTMLImageElement, markup: string): LintingRow | null {
  const source = image.getAttribute('src')?.trim() ?? '';
  const checks = source
    ? checkUrl(source, 'image')
    : [fail('Missing image source', 'syntax')];
  if (image.getAttribute('alt') === null) {
    checks.push(fail('Missing alt text', 'accessibility'));
  }
  if (!image.hasAttribute('width')) {
    checks.push(
      fail(
        'Missing width attribute, Outlook ignores CSS width and shows the image at full size',
        'email_best_practice'
      )
    );
  }
  if (checks.length === 0) return null;
  return {
    source: 'image',
    result: {
      status: getStatusFromChecks(checks),
      source: source || '(missing source)',
      codeLocation: findCodeLocation(markup, source.slice(0, 64) || '<img'),
      checks,
    },
  };
}

/**
 * Lints the overall markup of the email for common issues that may affect rendering in email clients.
 *
 * Checks:
 * - overall HTML size that may be clipped by Gmail.
 * - presence of `script` tags which are not supported in email clients.
 * - presence of `form` tags which have poor support in email clients.
 * - presence of external stylesheets which are not reliable in email clients.
 *
 * @param document - The parsed Document object representing the email markup.
 * @param markup - The original HTML markup string, used for calculating code locations of issues.
 * @returns An array of LintingRow objects representing the linting results for the overall markup, with details about any issues found and their locations.
 */
function lintMarkup(document: Document, markup: string) {
  const rows: LintingRow[] = [];
  const byteCount = getByteLength(markup);
  if (byteCount > GMAIL_CLIP_BYTES) {
    rows.push(
      createMarkupRow({
        markup,
        label: 'html size',
        detail: `HTML is ${formatBytes(byteCount)}, Gmail clips messages over ${formatBytes(GMAIL_CLIP_BYTES)}`,
        type: 'email_best_practice',
        needle: '<html',
      })
    );
  }
  for (const script of document.querySelectorAll('script')) {
    rows.push(
      createMarkupRow({
        markup,
        label: 'script',
        detail: 'Scripts are not supported in email clients',
        type: 'email_best_practice',
        needle: script.outerHTML,
      })
    );
  }
  for (const form of document.querySelectorAll('form')) {
    rows.push(
      createMarkupRow({
        markup,
        label: 'form',
        detail: 'Forms have poor support across email clients',
        type: 'email_best_practice',
        needle: form.outerHTML,
      })
    );
  }
  for (const stylesheet of document.querySelectorAll(
    'link[rel="stylesheet"]'
  )) {
    rows.push(
      createMarkupRow({
        markup,
        label: 'external stylesheet',
        detail: 'External stylesheets are not reliable in email clients',
        type: 'email_best_practice',
        needle: stylesheet.outerHTML,
      })
    );
  }
  return rows;
}

/**
 * Lints the provided email HTML markup for common issues that may affect rendering and functionality in email clients.
 *
 * @param markup - The HTML markup string of the email to be linted.
 * @returns An array of LintingRow objects representing the linting results for the email markup, with details about any issues found and their locations.
 */
export function lintEmailMarkup(markup: string): LintingRow[] {
  const document = new DOMParser().parseFromString(markup, 'text/html');
  const rows = [
    ...Array.from(document.querySelectorAll('a'), (anchor) => {
      return lintLink(anchor, markup);
    }),
    ...Array.from(document.querySelectorAll('img'), (image) => {
      return lintImage(image, markup);
    }),
    ...lintMarkup(document, markup),
  ].filter((row) => row !== null);
  const seen = new Set<string>();
  const uniqueRows = rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const statusOrder: Record<LintStatus, number> = {
    error: 0,
    warning: 1,
    info: 2,
    success: 3,
  };
  return uniqueRows.toSorted(
    (a, b) => statusOrder[a.result.status] - statusOrder[b.result.status]
  );
}
