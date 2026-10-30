import type { EmailTemplate } from '@/types/templates';

type MatchedRule = {
  element: HTMLElement;
  specificity: number;
  order: number;
  style: CSSStyleDeclaration;
};

// `link` is included because external stylesheets can't be inlined client side
const UNSAFE_ELEMENTS =
  'script, iframe, frame, frameset, object, embed, applet, base, meta[http-equiv], link';
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'xlink:href',
]);
const UNSAFE_URL = /^(?:javascript|vbscript|data:text\/html)/i;

/**
 * Splits a selector list on top-level commas, keeping commas inside
 * functional pseudo-classes such as `:is(a, b)`, attribute selectors, quoted
 * strings and escapes such as `.a\,b`.
 *
 * @param selectorText - Comma-separated selectors, as in `CSSStyleRule.selectorText`, which always serializes strings with double quotes.
 * @returns The individual selectors.
 */
function splitSelectorList(selectorText: string) {
  const selectors: string[] = [];
  let depth = 0;
  let inString = false;
  let escaped = false;
  let current = '';
  for (const char of selectorText) {
    if (escaped) {
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    } else if (!inString) {
      if (char === '(' || char === '[') depth++;
      if (char === ')' || char === ']') depth--;
      if (char === ',' && depth === 0) {
        selectors.push(current.trim());
        current = '';
        continue;
      }
    }
    current += char;
  }
  selectors.push(current.trim());
  return selectors.filter(Boolean);
}

/**
 * Approximates the specificity of a single selector, encoded so that a higher
 * number wins (ids, then classes/attributes/pseudo-classes, then types).
 *
 * @param selector - One complex selector such as `td p.title`, without commas.
 * @returns A number where a larger value means the selector wins the cascade.
 */
export function getSelectorSpecificity(selector: string) {
  let rest = selector.replaceAll(/\[[^\]]*\]/g, () => ' .x ');
  rest = rest.replaceAll(/:where\([^)]*\)/g, ' ');
  const ids = rest.match(/#[\w-]+/g)?.length ?? 0;
  rest = rest.replaceAll(/#[\w-]+/g, ' ');
  const classes =
    (rest.match(/\.[\w-]+/g)?.length ?? 0) +
    (rest.match(/:(?!:)[\w-]+/g)?.length ?? 0);
  rest = rest.replaceAll(/::?[\w-]+|\.[\w-]+/g, ' ');
  const types = rest.match(/(?:^|[\s>+~(])[a-z][\w-]*/gi)?.length ?? 0;
  return ids * 10_000 + classes * 100 + types;
}

/**
 * Removes elements and attributes that can run scripts or navigate away, since
 * imported HTML is rendered in the editor and in the preview iframe.
 *
 * @param document - The parsed document, modified in place.
 */
function sanitize(document: Document) {
  for (const el of document.querySelectorAll(UNSAFE_ELEMENTS)) el.remove();
  for (const el of document.querySelectorAll('*')) {
    const attributes = Array.from(el.attributes, ({ name, value }) => ({
      name,
      value,
    }));
    for (const { name, value } of attributes) {
      const lowerName = name.toLowerCase();
      const isHandler = lowerName.startsWith('on');
      const isUnsafeUrl =
        URL_ATTRIBUTES.has(lowerName) &&
        UNSAFE_URL.test(value.replaceAll(/\s/g, ''));
      if (isHandler || isUnsafeUrl) el.removeAttribute(name);
    }
  }
}

/**
 * Inlines the rules of the email's style elements into the `style` attribute
 * of the elements they match, then removes the style elements. The editor only
 * keeps inline styles, so rules that can't be inlined (media queries, `:hover`,
 * pseudo-elements) are dropped.
 *
 * @param document - The parsed document, modified in place.
 */
function inlineStyles(document: Document) {
  const styleElements = [...document.querySelectorAll('style')];
  const matches: MatchedRule[] = [];
  let order = 0;
  for (const styleElement of styleElements) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(styleElement.textContent);
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const selector of splitSelectorList(rule.selectorText)) {
        const elements = document.querySelectorAll<HTMLElement>(selector);
        const specificity = getSelectorSpecificity(selector);
        for (const element of elements) {
          matches.push({ element, specificity, order, style: rule.style });
        }
        order++;
      }
    }
    styleElement.remove();
  }
  matches.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  // Apply the rules per element, then its own inline style (which wins), then `!important` rules
  const byElement = Map.groupBy(matches, (match) => match.element);
  for (const [element, rules] of byElement) {
    const inlineStyle = element.getAttribute('style') ?? '';
    element.removeAttribute('style');
    for (const { style } of rules) {
      for (const property of style) {
        element.style.setProperty(property, style.getPropertyValue(property));
      }
    }
    element.style.cssText = `${element.style.cssText};${inlineStyle}`;
    for (const { style } of rules) {
      for (const property of style) {
        if (style.getPropertyPriority(property) !== 'important') continue;
        if (element.style.getPropertyPriority(property) === 'important')
          continue;
        element.style.setProperty(property, style.getPropertyValue(property));
      }
    }
  }
}

/**
 * Imports an HTML email so it can be edited: removes unsafe markup and
 * inlines its style rules so the editor keeps the styling.
 *
 * @param html - The full HTML document or fragment of the email.
 * @param fileName - The name of the imported file, if any, used when the email has no title.
 * @returns The imported email as a template to load in the editor.
 */
export function importHtmlEmail(
  html: string,
  fileName?: string
): EmailTemplate {
  const document = new DOMParser().parseFromString(html, 'text/html');
  sanitize(document);
  inlineStyles(document);
  const name =
    document.title.trim() ||
    (fileName ?? '').replace(/\.html?$/i, '').trim() ||
    'Imported email';
  return {
    id: `imported-${crypto.randomUUID()}`,
    name,
    category: 'Imported',
    description: fileName
      ? `Imported from ${fileName}.`
      : 'Imported from pasted HTML.',
    content: document.documentElement.outerHTML,
  };
}
