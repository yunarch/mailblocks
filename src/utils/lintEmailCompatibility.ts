import caniemailData from 'caniemail/caniemail.json' with { type: 'json' };
import type { CompatibilityResult } from '@/types/linter';
import { findCodeLocation } from './helpers';

// Types
type CaniemailNicenames = {
  family: Record<string, string>;
};
type CaniemailFeature = {
  slug: string;
  title: string;
  category: CompatibilityResult['category'];
  url: string;
  stats: Record<string, Record<string, Record<string, string>>>;
};

// Caniemail data
const CANIEMAIL_NICENAMES =
  caniemailData.nicenames as unknown as CaniemailNicenames;
const CANIEMAIL_FEATURES = caniemailData.data as unknown as CaniemailFeature[];
const CANIEMAIL_STATS_KEYS = new Set(
  CANIEMAIL_FEATURES.flatMap((f) => Object.keys(f.stats))
);

// Email clients (extracted from caniemail nicenames)
export type EmailClient = { key: string; label: string };
export const EMAIL_CLIENTS: EmailClient[] = Object.entries(
  CANIEMAIL_NICENAMES.family
)
  .filter(([key]) => CANIEMAIL_STATS_KEYS.has(key))
  .map(([key, label]) => ({ key, label }));
export const DEFAULT_EMAIL_CLIENTS = [
  'apple-mail',
  'gmail',
  'outlook',
  'yahoo',
];

/**
 * Derives an HTML selector for a given Caniemail feature slug, if applicable.
 *
 * @param slug - The Caniemail feature slug.
 * @returns The corresponding HTML selector or null if not applicable.
 */
function deriveHtmlSelector(slug: string): string | null {
  const HTML_SELECTORS: Record<string, string | null> = {
    'html-align': '[align]',
    'html-background': '[background]',
    'html-cellpadding': '[cellpadding]',
    'html-cellspacing': '[cellspacing]',
    'html-dir': '[dir]',
    'html-height': '[height]',
    'html-hidden': '[hidden]',
    'html-lang': '[lang]',
    'html-popover': '[popover]',
    'html-required': '[required]',
    'html-role': '[role]',
    'html-valign': '[valign]',
    'html-width': '[width]',
    'html-anchor-links': 'a[href]',
    'html-image-maps': 'map,img[usemap]',
    'html-loading-attribute': 'img[loading],iframe[loading]',
    'html-mailto-links': 'a[href^="mailto:"]',
    'html-meta-color-scheme': 'meta[name="color-scheme"]',
    'html-srcset': 'img[srcset],source[srcset]',
    'html-target': 'a[target]',
    'html-h1-h6': 'h1,h2,h3,h4,h5,h6',
    'html-lists': 'ul,ol,dl',
    'html-semantics':
      'article,aside,details,figcaption,figure,footer,header,main,nav,section,summary',
    'html-strike': 'strike,s',
    'html-input-text': 'input:not([type]),input[type="text"]',
    'html-button-submit': 'button:not([type]),button[type="submit"]',
    'html-comments': null,
    'html-doctype': null,
  };
  if (slug in HTML_SELECTORS) return HTML_SELECTORS[slug];
  const name = slug.slice('html-'.length);
  if (name.startsWith('input-'))
    return `input[type="${name.slice('input-'.length)}"]`;
  if (name.startsWith('button-'))
    return `button[type="${name.slice('button-'.length)}"]`;
  if (name.startsWith('aria-')) return `[${name}]`;
  return name;
}

/**
 * Derives a CSS pattern for a given Caniemail feature slug, if applicable.
 *
 * @param slug - The Caniemail feature slug.
 * @returns A RegExp pattern to match the CSS feature or null if not applicable.
 */
function deriveCssPattern(slug: string): RegExp | null {
  // css-at-{name}
  if (slug.startsWith('css-at-')) {
    const name = slug.slice('css-at-'.length);
    if (name.startsWith('media-')) {
      const feature = name.slice('media-'.length);
      return new RegExp(`@media[^{]*\\b${feature}\\b`, 'i');
    }
    return new RegExp(`@${name.replace('-', '-')}\\b`, 'i');
  }
  // css-pseudo-class-{name}
  if (slug.startsWith('css-pseudo-class-'))
    return new RegExp(`:${slug.slice('css-pseudo-class-'.length)}\\b`, 'i');
  // css-pseudo-element-{name}
  if (slug.startsWith('css-pseudo-element-'))
    return new RegExp(`::?${slug.slice('css-pseudo-element-'.length)}\\b`, 'i');
  // css-nesting
  if (slug === 'css-nesting') return /&/;
  // css-variables
  if (slug === 'css-variables') return /var\(--|--[a-zA-Z-]/;
  // css-comments
  if (slug === 'css-comments') return /\/\*/;
  // css-display-{value}
  if (slug.startsWith('css-display-')) {
    const value = slug.slice('css-display-'.length);
    return new RegExp(`display\\s*:[^;]*\\b(inline-)?${value}\\b`, 'i');
  }
  // css-unit-{unit}
  if (slug.startsWith('css-unit-')) {
    const unit = slug.slice('css-unit-'.length);
    if (unit === 'percent') return /%/;
    if (unit === 'initial') return /\binitial\b/;
    if (unit === 'calc') return /calc\(/;
    return new RegExp(`[\\d.]${unit}\\b`, 'i');
  }
  // css-function-{fn}
  if (slug.startsWith('css-function-')) {
    const fn = slug.slice('css-function-'.length);
    return new RegExp(`\\b${fn}\\(`, 'i');
  }
  // css-selector-* — too structural for a simple regex, skip
  if (slug.startsWith('css-selector-')) return null;
  // Default css-{property} — match the property name in CSS text
  const property = slug.slice('css-'.length);
  return new RegExp(`\\b${property}\\s*:`, 'i');
}

/**
 * @param feature - The Caniemail feature being checked.
 * @param emailClients - The set of client keys to filter unsupported clients by.
 * @returns An array of client labels that do not fully support the feature.
 */
function getUnsupportedClients(
  feature: CaniemailFeature,
  emailClients: Set<string>
): string[] {
  const clients = Object.entries(feature.stats).flatMap(
    ([client, platforms]) => {
      if (!emailClients.has(client)) return [];
      return Object.entries(platforms).flatMap(([platform, versions]) => {
        const status = Object.values(versions).at(-1)?.charAt(0);
        if (status === undefined || status === 'y') return [];
        const label = `${client} ${platform}`;
        if (status === 'a') return `${label} (partial)`;
        if (status === 'u') return `${label} (unknown)`;
        return label;
      });
    }
  );
  return [...new Set(clients)].toSorted((a, b) => a.localeCompare(b));
}

/**
 * Scans the provided HTML email markup for features with limited email-client
 * support and returns a list of compatibility issues.
 *
 * @param markup - The full HTML string of the email to lint.
 * @param emailClients - The set of email client keys to check against.
 * @returns Compatibility issues sorted by title.
 */
export function lintEmailCompatibility(
  markup: string,
  emailClients: Set<string>
): CompatibilityResult[] {
  const document = new DOMParser().parseFromString(markup, 'text/html');
  const results = new Map<string, CompatibilityResult>();
  const cssTexts = [
    ...[...document.querySelectorAll<HTMLElement>('[style]')].map(
      (el) => el.getAttribute('style') ?? ''
    ),
    ...[...document.querySelectorAll('style')].map(
      (el) => el.textContent ?? ''
    ),
  ];
  const allCss = cssTexts.join('\n');
  for (const feature of CANIEMAIL_FEATURES) {
    let source: string | undefined;
    if (feature.slug.startsWith('html-')) {
      if (feature.slug === 'html-comments') {
        source = /<!--[\s\S]*?-->/.exec(markup)?.[0];
      } else if (feature.slug === 'html-doctype') {
        source = /<!doctype\b[^>]*>/i.exec(markup)?.[0];
      } else {
        const selector = deriveHtmlSelector(feature.slug);
        if (!selector) continue;
        try {
          const el = document.querySelector(selector);
          source = el?.outerHTML;
        } catch {
          continue;
        }
      }
    } else if (feature.slug.startsWith('css-')) {
      const pattern = deriveCssPattern(feature.slug);
      if (!pattern) continue;
      source = pattern.exec(allCss)?.[0];
    }
    if (!source) continue;
    const unsupportedClients = getUnsupportedClients(feature, emailClients);
    if (unsupportedClients.length === 0) continue;
    results.set(feature.slug, {
      title: feature.title,
      category: feature.category,
      unsupportedClients,
      url: feature.url,
      source,
      location: findCodeLocation(markup, source),
    });
  }
  return [...results.values()].toSorted((a, b) =>
    a.title.localeCompare(b.title)
  );
}
