// oxlint-disable max-lines -- This file contains a large number of lines due to the comprehensive linting checks implemented.
import type { LintCheck, LintingRow, LintStatus } from '@/types/linter';
import { findCodeLocation, isLocalhostUrl } from './helpers';

const ONE_MEGABYTE = 1_048_576;
const LARGE_HTML_THRESHOLD = 100_000;

/**
 * @param checks - A list of lint checks that were performed on an element.
 * @returns The overall lint status for the element, determined by the most severe failing check.
 */
function getStatusFromChecks(
  checks: LintCheck[]
): Exclude<LintStatus, 'success'> {
  if (checks.some((check) => !check.passed && check.type === 'syntax')) {
    return 'error';
  }
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
  return new TextEncoder().encode(decodeURIComponent(data)).byteLength;
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
      checks: [
        {
          passed: false,
          type,
          metadata: { detail },
        },
      ],
    },
  };
}

/**
 * Lints a single anchor element for common issues in email clients.
 * Checks:
 *  - missing href
 *  - invalid URL syntax
 *  - use of HTTP URLs
 *  - localhost URLs
 *  - missing rel="noopener noreferrer" on links with target="_blank"
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
  const checks: LintCheck[] = [];
  if (link) {
    try {
      const url = new URL(link);
      checks.push({ passed: true, type: 'syntax' });
      if (isLocalhostUrl(url)) {
        checks.push({
          passed: false,
          type: 'email_best_practice',
          metadata: { detail: 'Local URLs will not work for recipients' },
        });
      }
      if (url.protocol === 'http:') {
        checks.push({
          passed: false,
          type: 'security',
          metadata: { detail: 'Use HTTPS instead of HTTP' },
        });
      }
      if (url.protocol === 'mailto:' && !url.pathname.includes('@')) {
        checks.push({
          passed: false,
          type: 'syntax',
          metadata: { detail: 'Invalid mailto address' },
        });
      }
    } catch {
      checks.push({
        passed: false,
        type: 'syntax',
        metadata: { detail: 'Invalid URL syntax' },
      });
    }
  } else {
    checks.push({
      passed: false,
      type: 'syntax',
      metadata: { detail: 'Missing href' },
    });
  }
  if (anchor.target === '_blank') {
    const rel = anchor.rel.toLowerCase();
    if (!rel.includes('noopener') || !rel.includes('noreferrer')) {
      checks.push({
        passed: false,
        type: 'security',
        metadata: {
          detail: 'Add rel="noopener noreferrer" to external links',
        },
      });
    }
  }
  const failingChecks = checks.filter((check) => !check.passed);
  if (failingChecks.length === 0) return null;
  return {
    source: 'link',
    result: {
      status: getStatusFromChecks(failingChecks),
      link: link || '(missing href)',
      codeLocation: findCodeLocation(markup, link || '<a'),
      checks,
    },
  };
}

/**
 * Lints a single image element for common issues in email clients.
 * Checks:
 *  - missing alt text
 *  - missing src
 *  - use of HTTP URLs
 *  - localhost URLs
 *  - data URLs that exceed size limits
 *
 * @param image - The image element to lint.
 * @param markup - The HTML markup containing the image element.
 * @returns A LintingRow object representing the linting results for the image element, or null if no issues were found.
 */
function lintImage(image: HTMLImageElement, markup: string): LintingRow | null {
  const source = image.getAttribute('src')?.trim() ?? '';
  const checks: LintCheck[] = [];
  if (image.getAttribute('alt') === null) {
    checks.push({
      passed: false,
      type: 'accessibility',
      metadata: { detail: 'Missing alt text' },
    });
  }
  if (source) {
    try {
      checks.push({ passed: true, type: 'syntax' });
      const url = new URL(source);
      if (isLocalhostUrl(url)) {
        checks.push({
          passed: false,
          type: 'email_best_practice',
          metadata: { detail: 'Local images will not work for recipients' },
        });
      }
      if (url.protocol === 'http:') {
        checks.push({
          passed: false,
          type: 'security',
          metadata: { detail: 'Use HTTPS instead of HTTP' },
        });
      }
      if (url.protocol === 'data:') {
        const byteCount = getDataUrlByteCount(source);
        checks.push({
          passed: byteCount < ONE_MEGABYTE,
          type: 'image_size',
          metadata: { byteCount },
        });
      }
    } catch {
      checks.push({
        passed: false,
        type: 'syntax',
        metadata: { detail: 'Invalid image source' },
      });
    }
  } else {
    checks.push({
      passed: false,
      type: 'syntax',
      metadata: { detail: 'Missing image source' },
    });
  }
  const failingChecks = checks.filter((check) => !check.passed);
  if (failingChecks.length === 0) return null;
  return {
    source: 'image',
    result: {
      status: getStatusFromChecks(failingChecks),
      source: source || '(missing source)',
      codeLocation: findCodeLocation(markup, source || '<img'),
      checks,
    },
  };
}

/**
 * Lints the overall markup of the email for common issues that may affect rendering in email clients.
 * Checks:
 * - overall HTML size that may be clipped by email clients
 * - presence of <script> tags which are not supported in email clients
 * - presence of <form> tags which have poor support in email clients
 * - presence of external stylesheets which are not reliable in email clients
 *
 * @param document - The parsed Document object representing the email markup.
 * @param markup - The original HTML markup string, used for calculating code locations of issues.
 * @returns An array of LintingRow objects representing the linting results for the overall markup, with details about any issues found and their locations.
 */
function lintMarkup(document: Document, markup: string) {
  const rows: LintingRow[] = [];
  if (markup.length > LARGE_HTML_THRESHOLD) {
    rows.push(
      createMarkupRow({
        markup,
        label: 'html size',
        detail:
          'Rendered HTML is large and may be clipped by some email clients',
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
  ].filter(Boolean) as LintingRow[];
  return rows.toSorted((a, b) => {
    const statusOrder: Record<LintStatus, number> = {
      error: 0,
      warning: 1,
      info: 2,
      success: 3,
    };
    return statusOrder[a.result.status] - statusOrder[b.result.status];
  });
}
