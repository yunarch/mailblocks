// oxlint-disable max-lines -- Compatibility detection is intentionally kept close to the Can I Email feature map.
import caniemailData from 'caniemail/caniemail.json' with { type: 'json' };
import type { CompatibilityResult } from '@/types/linter';
import { findCodeLocation } from './helpers';

// Data
const clientLabels: Record<string, string> = {
  aol: 'AOL',
  'apple-mail': 'Apple Mail',
  fastmail: 'Fastmail',
  'free-fr': 'Free.fr',
  gmail: 'Gmail',
  gmx: 'GMX',
  hey: 'HEY',
  'ionos-1and1': 'IONOS 1&1',
  laposte: 'La Poste',
  'mail-ru': 'Mail.ru',
  orange: 'Orange',
  outlook: 'Outlook',
  protonmail: 'Proton Mail',
  rainloop: 'RainLoop',
  'samsung-email': 'Samsung Email',
  sfr: 'SFR',
  't-online-de': 'T-Online.de',
  thunderbird: 'Thunderbird',
  'web-de': 'WEB.DE',
  'wp-pl': 'WP.pl',
  yahoo: 'Yahoo! Mail',
};

const platformLabels: Record<string, string> = {
  android: 'Android',
  'desktop-webmail': 'Desktop Webmail',
  ios: 'iOS',
  macos: 'macOS',
  'mobile-webmail': 'Mobile Webmail',
  'outlook-com': 'Outlook.com',
  windows: 'Windows',
  'windows-mail': 'Windows Mail',
};

const featuresByTitle = new Map(
  (caniemailData.data as unknown as CaniemailFeature[]).map((feature) => [
    feature.title,
    feature,
  ])
);

// Types
type CaniemailStats = Record<string, Record<string, Record<string, string>>>;

type CaniemailFeature = {
  title: string;
  category: CompatibilityResult['category'];
  url: string;
  stats: CaniemailStats;
};

type CompatibilityRule = {
  id: string;
  featureTitle: string;
};

type CssDeclaration = {
  property: string;
  value: string;
  source: string;
};

// Rules
const cssRules = [
  {
    id: 'css-background-image',
    featureTitle: 'background-image',
    matches: ({ property, value }) => {
      return (
        property === 'background-image' ||
        (property === 'background' && value.includes('url('))
      );
    },
  },
  {
    id: 'css-border-radius',
    featureTitle: 'border-radius',
    matches: ({ property }) => {
      return property === 'border-radius' || property.endsWith('-radius');
    },
  },
  {
    id: 'css-display-flex',
    featureTitle: 'display:flex',
    matches: ({ property, value }) => {
      return property === 'display' && /\b(inline-)?flex\b/.test(value);
    },
  },
  {
    id: 'css-display-grid',
    featureTitle: 'display:grid',
    matches: ({ property, value }) => {
      return property === 'display' && /\b(inline-)?grid\b/.test(value);
    },
  },
  {
    id: 'css-gap',
    featureTitle: 'gap, column-gap, row-gap',
    matches: ({ property }) => {
      return (
        property === 'gap' ||
        property === 'row-gap' ||
        property === 'column-gap'
      );
    },
  },
  {
    id: 'css-position',
    featureTitle: 'position',
    matches: ({ property, value }) => {
      return property === 'position' && /\b(fixed|sticky)\b/.test(value);
    },
  },
  {
    id: 'css-object-fit',
    featureTitle: 'object-fit',
    matches: ({ property }) => {
      return property === 'object-fit';
    },
  },
  {
    id: 'css-variables',
    featureTitle: 'CSS Variables (Custom Properties)',
    matches: ({ property, value }) => {
      return property.startsWith('--') || value.includes('var(');
    },
  },
  {
    id: 'css-unit-calc',
    featureTitle: 'CSS calc() function',
    matches: ({ value }) => {
      return value.includes('calc(');
    },
  },
] satisfies (CompatibilityRule & {
  matches: (declaration: CssDeclaration) => boolean;
})[];

const htmlRules = [
  {
    id: 'html-video',
    featureTitle: '<video> element',
    selector: 'video',
  },
  {
    id: 'html-audio',
    featureTitle: '<audio> element',
    selector: 'audio',
  },
  {
    id: 'html-form',
    featureTitle: '<form> element',
    selector: 'form',
  },
  {
    id: 'html-select',
    featureTitle: '<select> element',
    selector: 'select',
  },
  {
    id: 'html-textarea',
    featureTitle: '<textarea> element',
    selector: 'textarea',
  },
  {
    id: 'html-input-text',
    featureTitle: '<input type="text"> element',
    selector: 'input:not([type]),input[type="text"]',
  },
  {
    id: 'html-input-checkbox',
    featureTitle: '<input type="checkbox"> element',
    selector: 'input[type="checkbox"]',
  },
  {
    id: 'html-input-radio',
    featureTitle: '<input type="radio"> element',
    selector: 'input[type="radio"]',
  },
  {
    id: 'html-input-hidden',
    featureTitle: '<input type="hidden"> element',
    selector: 'input[type="hidden"]',
  },
  {
    id: 'html-input-reset',
    featureTitle: '<input type="reset"> element',
    selector: 'input[type="reset"]',
  },
  {
    id: 'html-input-submit',
    featureTitle: '<input type="submit"> element',
    selector: 'input[type="submit"]',
  },
  {
    id: 'html-button-reset',
    featureTitle: '<button type="reset"> element',
    selector: 'button[type="reset"]',
  },
  {
    id: 'html-button-submit',
    featureTitle: '<button type="submit"> element',
    selector: 'button:not([type]),button[type="submit"]',
  },
] satisfies (CompatibilityRule & { selector: string })[];

const atRuleRules = [
  {
    id: 'css-at-media',
    featureTitle: '@media',
    pattern: /@media\b/i,
  },
  {
    id: 'css-at-font-face',
    featureTitle: '@font-face',
    pattern: /@font-face\b/i,
  },
  {
    id: 'css-at-import',
    featureTitle: '@import',
    pattern: /@import\b/i,
  },
] satisfies (CompatibilityRule & { pattern: RegExp })[];

/**
 * Parses a style declaration string into its individual declarations.
 *
 * @param style - The full string from a style attribute, e.g. "color: red; background: url(image.png);"
 * @returns An array of CssDeclaration objects representing each property-value pair in the style string.
 */
function parseDeclarations(style: string): CssDeclaration[] {
  return style
    .split(';')
    .map((declaration) => {
      const [rawProperty, ...rawValue] = declaration.split(':');
      const property = rawProperty?.trim().toLowerCase() ?? '';
      const value = rawValue.join(':').trim().toLowerCase();
      return {
        property,
        value,
        source: declaration.trim(),
      };
    })
    .filter(({ property, value }) => property.length > 0 && value.length > 0);
}

/**
 * Parses a CSS string from a <style> tag into its individual declarations.
 *
 * @param css - The full CSS string from a <style> tag.
 * @returns An array of CssDeclaration objects representing each property-value pair in the CSS string.
 */
function parseStyleTagDeclarations(css: string): CssDeclaration[] {
  return Array.from(
    css.matchAll(/(?<property>[-a-zA-Z0-9]+)\s*:\s*(?<value>[^;{}]+)/g),
    (match) => {
      const property = match.groups?.property?.trim().toLowerCase() ?? '';
      const value = match.groups?.value?.trim().toLowerCase() ?? '';
      return {
        property,
        value,
        source: match[0],
      };
    }
  );
}

/**
 * @param client - The email client being checked.
 * @param platform - The platform of the email client.
 * @param status - The support status of the feature for the client and platform.
 * @returns A formatted label for the client and platform, including the support status.
 */
function getClientLabel(
  client: string,
  platform: string,
  status: string
): string {
  const label = `${clientLabels[client] ?? client} ${
    platformLabels[platform] ?? platform
  }`;
  if (status === 'a') return `${label} (partial)`;
  if (status === 'u') return `${label} (unknown)`;
  return label;
}

/**
 * @param feature - The Caniemail feature being checked.
 * @returns An array of client labels that do not fully support the feature.
 */
function getUnsupportedClients(feature: CaniemailFeature): string[] {
  const clients = Object.entries(feature.stats).flatMap(
    ([client, platforms]) => {
      return Object.entries(platforms).flatMap(([platform, versions]) => {
        const status = Object.values(versions).at(-1)?.charAt(0);
        if (status === undefined || status === 'y') return [];
        return getClientLabel(client, platform, status);
      });
    }
  );
  return [...new Set(clients)].toSorted((a, b) => a.localeCompare(b));
}

/**
 * Creates a compatibility result object for a given rule and source element.
 *
 * @param rule - The compatibility rule being checked.
 * @param markup - The full HTML markup of the email.
 * @param source - The specific HTML or CSS source that triggered the rule.
 * @returns A CompatibilityResult object or undefined if no issues are found.
 */
function createResult(
  rule: CompatibilityRule,
  markup: string,
  source: string
): CompatibilityResult | undefined {
  const feature = featuresByTitle.get(rule.featureTitle);
  if (!feature) return undefined;
  const unsupportedClients = getUnsupportedClients(feature);
  if (unsupportedClients.length === 0) return undefined;
  return {
    title: feature.title,
    category: feature.category,
    unsupportedClients,
    url: feature.url,
    source,
    location: findCodeLocation(markup, source),
  };
}

/**
 * Scans the provided HTML email markup for features with limited email-client
 * support and returns a list of compatibility issues.
 *
 * @param markup - The full HTML string of the email to lint.
 * @returns Compatibility issues sorted by title.
 */
export function lintEmailCompatibility(markup: string): CompatibilityResult[] {
  const document = new DOMParser().parseFromString(markup, 'text/html');
  const results = new Map<string, CompatibilityResult>();
  for (const rule of htmlRules) {
    const element = document.querySelector(rule.selector);
    if (!element) continue;
    const result = createResult(rule, markup, element.outerHTML);
    if (result) results.set(rule.id, result);
  }
  const declarations = [
    ...[...document.querySelectorAll<HTMLElement>('[style]')].flatMap(
      (element) => parseDeclarations(element.getAttribute('style') ?? '')
    ),
    ...[...document.querySelectorAll('style')].flatMap((style) => {
      return parseStyleTagDeclarations(style.textContent ?? '');
    }),
  ];
  for (const rule of cssRules) {
    const declaration = declarations.find((item) => rule.matches(item));
    if (!declaration) continue;
    const result = createResult(rule, markup, declaration.source);
    if (result) results.set(rule.id, result);
  }
  const styleText = [...document.querySelectorAll('style')]
    .map((style) => {
      return style.textContent ?? '';
    })
    .join('\n');
  for (const rule of atRuleRules) {
    const match = rule.pattern.exec(styleText);
    if (!match) continue;
    const result = createResult(rule, markup, match[0]);
    if (result) results.set(rule.id, result);
  }
  return [...results.values()].toSorted((a, b) => {
    return a.title.localeCompare(b.title);
  });
}
