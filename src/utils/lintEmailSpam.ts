import type { SpamCheckingResult } from '@/types/linter';

type SpamCheck = SpamCheckingResult['checks'][number];

const spammyPhrases = [
  'act now',
  'buy now',
  'cash bonus',
  'click here',
  'congratulations',
  'free money',
  'guaranteed',
  'limited time',
  'make money',
  'no credit check',
  'risk free',
  'special promotion',
  'urgent',
  'winner',
  'you have been selected',
];

const shortenerHosts = new Set([
  'bit.ly',
  'buff.ly',
  'cutt.ly',
  'goo.gl',
  'is.gd',
  'lnkd.in',
  'ow.ly',
  'rebrand.ly',
  's.id',
  'shorturl.at',
  't.co',
  'tiny.cc',
  'tinyurl.com',
]);

// Utility functions
const roundScore = (points: number): number => {
  return Math.round(points * 10) / 10;
};
const getText = (document: Document, fallbackText: string): string => {
  return (fallbackText || document.body.textContent || '')
    .replaceAll(/\s+/g, ' ')
    .trim();
};
const getWords = (text: string): string[] => {
  return text.match(/[a-z0-9]+(?:'[a-z0-9]+)?/gi) ?? [];
};
const getReadableTextLength = (text: string): number => {
  return text.replaceAll(/[^a-z0-9]/gi, '').length;
};
const getLinkHost = (href: string): string | undefined => {
  try {
    return new URL(href).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return undefined;
  }
};
const linkTextLooksLikeUrl = (text: string): boolean => {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
};

/**
 * @param anchor - An HTMLAnchorElement to check for mismatched link text and href.
 * @returns A boolean indicating whether the anchor has mismatched link text and href hosts.
 */
function hasMismatchedLink(anchor: HTMLAnchorElement): boolean {
  const text = anchor.textContent?.trim() ?? '';
  const href = anchor.getAttribute('href') ?? '';
  if (!href || !linkTextLooksLikeUrl(text)) return false;
  const textHost = getLinkHost(
    text.startsWith('http') ? text : `https://${text}`
  );
  const hrefHost = getLinkHost(href);
  return (
    textHost !== undefined && hrefHost !== undefined && textHost !== hrefHost
  );
}

/**
 * @param image - An HTMLImageElement to check for characteristics of a tracking pixel (1x1 size or hidden).
 * @returns A boolean indicating whether the image has characteristics of a tracking pixel.
 */
function hasTrackingPixel(image: HTMLImageElement): boolean {
  const width = Number(image.getAttribute('width') ?? image.width);
  const height = Number(image.getAttribute('height') ?? image.height);
  const style = image.getAttribute('style') ?? '';
  return (
    (width > 0 && width <= 1 && height > 0 && height <= 1) ||
    /display\s*:\s*none/i.test(style) ||
    /visibility\s*:\s*hidden/i.test(style)
  );
}

/**
 * Creates a SpamCheckingResult object from an array of SpamCheck objects by summing
 * their points and determining if the total points indicate that the email is likely spam.
 *
 * @param checks - An array of SpamCheck objects representing individual spam checks.
 * @returns A SpamCheckingResult object with the aggregated results of the spam checks.
 */
function createResult(checks: SpamCheck[]): SpamCheckingResult {
  const points = roundScore(
    checks.reduce((total, check) => total + check.points, 0)
  );
  return {
    checks,
    isSpam: points >= 5,
    points,
  };
}

/**
 * Analyzes the HTML and plain text content of an email for potential spam indicators.
 *
 * @param email - An object containing the HTML and plain text of the email.
 * @returns A SpamCheckingResult object with the results of the spam checks.
 */
export function lintEmailSpam({
  html,
  text,
}: {
  html: string;
  text: string;
}): SpamCheckingResult {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const plainText = getText(document, text);
  const lowerText = plainText.toLowerCase();
  const words = getWords(plainText);
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')];
  const images = [...document.querySelectorAll<HTMLImageElement>('img')];
  const checks: SpamCheck[] = [];
  if (html.trim().length > 0 && plainText.length < 80) {
    checks.push({
      name: 'MIME_HTML_ONLY',
      description: 'Message has little or no plain-text readable content.',
      points: 0.4,
    });
  }
  if (images.length > 0 && words.length / images.length < 45) {
    checks.push({
      name: 'HTML_IMAGE_RATIO_02',
      description: 'HTML has a low ratio of text to images.',
      points: images.length >= 3 ? 1.2 : 0.7,
    });
  }
  if (!/unsubscribe|manage preferences|email preferences/i.test(plainText)) {
    checks.push({
      name: 'MISSING_UNSUBSCRIBE',
      description: 'No unsubscribe or email preferences text was found.',
      points: 0.8,
    });
  }
  if (links.length > 8) {
    checks.push({
      name: 'MANY_LINKS',
      description: 'Message contains a high number of links.',
      points: links.length > 16 ? 1.4 : 0.6,
    });
  }
  if (links.some((link) => hasMismatchedLink(link))) {
    checks.push({
      name: 'URI_DISPLAY_MISMATCH',
      description: 'A visible URL points to a different destination host.',
      points: 1.2,
    });
  }
  if (
    links.some((link) => {
      const host = getLinkHost(link.href);
      return host !== undefined && shortenerHosts.has(host);
    })
  ) {
    checks.push({
      name: 'URI_SHORTENER',
      description: 'Message links through a common URL shortener.',
      points: 1.5,
    });
  }
  const phraseMatches = spammyPhrases.filter((phrase) =>
    lowerText.includes(phrase)
  );
  if (phraseMatches.length > 0) {
    checks.push({
      name: 'SPAMMY_PHRASES',
      description: `Contains spam-like wording: ${phraseMatches.slice(0, 3).join(', ')}.`,
      points: Math.min(2.4, phraseMatches.length * 0.6),
    });
  }
  const uppercaseWords = words.filter(
    (word) => word.length > 3 && word === word.toUpperCase()
  );
  if (words.length > 20 && uppercaseWords.length / words.length > 0.18) {
    checks.push({
      name: 'UPPERCASE_WORDS',
      description: 'Message has a high ratio of all-caps words.',
      points: 0.7,
    });
  }
  if (/[!?]{3,}/.test(plainText)) {
    checks.push({
      name: 'EXCESSIVE_PUNCTUATION',
      description: 'Message contains repeated urgent punctuation.',
      points: 0.4,
    });
  }
  if (html.length > 102_400) {
    checks.push({
      name: 'HTML_TOO_LARGE',
      description: 'HTML is large enough to risk clipping in mailbox clients.',
      points: 0.6,
    });
  }
  if (images.some((image) => hasTrackingPixel(image))) {
    checks.push({
      name: 'TRACKING_PIXEL',
      description: 'Message includes a hidden or 1x1 tracking-style image.',
      points: 0.5,
    });
  }
  if (getReadableTextLength(plainText) < 40) {
    checks.push({
      name: 'EMPTY_MESSAGE',
      description: 'Message body has very little readable text.',
      points: 1,
    });
  }
  return createResult(checks);
}
