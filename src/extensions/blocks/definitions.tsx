import {
  Columns2Icon,
  LayoutIcon,
  LinkIcon,
  MinusIcon,
  MousePointerClickIcon,
  PanelBottomIcon,
  PanelTopIcon,
  TextIcon,
  type SlashCommandItem,
} from '@react-email/editor/ui';
import { escapeHtml } from '@/utils/helpers';

// Types
export type BlockContent = {
  title: string;
  text: string;
  buttonLabel: string;
  buttonUrl: string;
};
export type BlockDefinition = Omit<SlashCommandItem, 'command' | 'category'> & {
  defaults: BlockContent;
  render: (content: BlockContent, accent: string) => string;
};

// Default accent color for the blocks
export const DEFAULT_ACCENT = '#111827';

// Placeholder logo: the app icon, as an absolute URL so it also loads in the exported email
const LOGO_URL = new URL('android-chrome-192x192.png', document.baseURI).href;

// Shared React Email demo assets, also used by the bundled templates
const SOCIAL_ICONS_URL =
  'https://react-email-demo-6woqf4gn1-resend.vercel.app/static/shared';

// Text and muted colors for the blocks
const COLORS = {
  text: '#111827',
  muted: '#6b7280',
};

// Social links used in the blocks
const SOCIAL_LINKS = [
  { name: 'X', href: 'https://x.com', icon: 'social-x-black.png' },
  {
    name: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: 'social-in-black.png',
  },
  { name: 'YouTube', href: 'https://youtube.com', icon: 'social-yt-black.png' },
  { name: 'GitHub', href: 'https://github.com', icon: 'social-gh-black.png' },
];

/**
 * @param overrides - The fields the block uses.
 * @returns The block content, with unused fields empty.
 */
function blockContent(overrides: Partial<BlockContent>): BlockContent {
  return { title: '', text: '', buttonLabel: '', buttonUrl: '', ...overrides };
}

/**
 * @param tag - The HTML tag wrapping the text, such as `p` or `h1`.
 * @param style - The inline style.
 * @param text - Plain text, where line breaks become `&lt;br>`.
 * @returns The element markup, or an empty string without text.
 */
function textElement(tag: string, style: string, text: string) {
  if (!text) return '';
  const html = escapeHtml(text).replaceAll(/\r?\n/g, '<br>');
  return `<${tag} style="${style}">${html}</${tag}>`;
}

/**
 * @param content - The block content holding the button label and link.
 * @param accent - The button color.
 * @returns The markup of an editor button node, or an empty string without a label.
 */
function button({ buttonLabel, buttonUrl }: BlockContent, accent: string) {
  if (!buttonLabel) return '';
  const href = escapeHtml(buttonUrl);
  return `<a data-id="react-email-button" href="${href}" data-href="${href}" alignment="center" style="background-color:${accent};color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">${escapeHtml(buttonLabel)}</a>`;
}

// The pre-styled blocks, in the order the slash command menu lists them.
export const BLOCKS = {
  header: {
    title: 'Header',
    description: 'Centered logo',
    icon: <PanelTopIcon size={20} />,
    searchTerms: ['header', 'logo', 'brand', 'top'],
    defaults: blockContent({}),
    render: ({ title }, accent) =>
      `<section data-type="section" style="padding:32px 24px 16px"><img src="${LOGO_URL}" alt="${escapeHtml(title || 'Logo')}" width="48" style="display:block;margin:0 auto">${textElement('p', `text-align:center;color:${accent};font-size:20px;font-weight:700;margin:12px 0 0`, title)}</section>`,
  },
  hero: {
    title: 'Hero',
    description: 'Title, text and button',
    icon: <LayoutIcon size={20} />,
    searchTerms: ['hero', 'banner', 'intro', 'title', 'headline'],
    defaults: blockContent({
      title: 'Your headline here',
      text: 'Introduce your message in a sentence or two, then point readers to the next step.',
      buttonLabel: 'Get started',
      buttonUrl: 'https://example.com',
    }),
    render: (content, accent) =>
      `<section data-type="section" style="padding:32px 24px;text-align:center">${textElement('h1', `text-align:center;color:${COLORS.text};font-size:28px;line-height:1.3;margin:0 0 12px`, content.title)}${textElement('p', `text-align:center;color:${COLORS.muted};font-size:16px;line-height:1.6;margin:0 0 24px`, content.text)}${button(content, accent)}</section>`,
  },
  content: {
    title: 'Content',
    description: 'Heading and paragraph',
    icon: <TextIcon size={20} />,
    searchTerms: ['content', 'text', 'paragraph', 'body', 'article'],
    defaults: blockContent({
      title: 'Section title',
      text: 'Write the body of your email here. Keep paragraphs short so they are easy to read on small screens.',
    }),
    render: ({ title, text }) =>
      `<section data-type="section" style="padding:16px 24px">${textElement('h2', `color:${COLORS.text};font-size:20px;line-height:1.4;margin:0 0 8px`, title)}${textElement('p', `color:${COLORS.text};font-size:15px;line-height:1.6;margin:0`, text)}</section>`,
  },
  cta: {
    title: 'Call to action',
    description: 'Short text with a button',
    icon: <MousePointerClickIcon size={20} />,
    searchTerms: ['cta', 'call to action', 'button', 'action'],
    defaults: blockContent({
      text: 'Ready to continue?',
      buttonLabel: 'Continue',
      buttonUrl: 'https://example.com',
    }),
    render: (content, accent) =>
      `<section data-type="section" style="padding:16px 24px 32px;text-align:center">${textElement('p', `text-align:center;color:${COLORS.text};font-size:15px;line-height:1.6;margin:0 0 16px`, content.text)}${button(content, accent)}</section>`,
  },
  feature: {
    title: 'Feature',
    description: 'Icon next to a title and text',
    icon: <Columns2Icon size={20} />,
    searchTerms: ['feature', 'icon', 'media', 'image text', 'list'],
    defaults: blockContent({
      title: 'Feature title',
      text: 'Describe the feature and why it matters in one or two lines.',
    }),
    render: ({ title, text }) =>
      `<div data-type="two-columns" style="padding:12px 24px"><div data-type="column" style="width:64px;vertical-align:top"><img src="${LOGO_URL}" alt="" width="40" style="display:block"></div><div data-type="column" style="vertical-align:top">${textElement('h3', `color:${COLORS.text};font-size:16px;line-height:1.4;margin:0 0 4px`, title)}${textElement('p', `color:${COLORS.muted};font-size:14px;line-height:1.6;margin:0`, text)}</div></div>`,
  },
  divider: {
    title: 'Accent divider',
    description: 'Colored separator line',
    icon: <MinusIcon size={20} />,
    searchTerms: ['divider', 'separator', 'line', 'hr', 'accent'],
    defaults: blockContent({}),
    render: (_, accent) =>
      `<section data-type="section" style="padding:16px 24px"><hr style="margin:0;padding:0;border-width:0;border-style:solid;border-top-width:2px;border-top-color:${accent}"></section>`,
  },
  social: {
    title: 'Social links',
    description: 'Row of social icons',
    icon: <LinkIcon size={20} />,
    searchTerms: ['social', 'icons', 'follow', 'twitter', 'linkedin'],
    defaults: blockContent({}),
    render: () =>
      `<table align="center" style="margin:0 auto;padding:16px 0"><tbody><tr>${SOCIAL_LINKS.map(
        ({ name, href, icon }) =>
          `<td style="padding:0 8px"><a href="${href}"><img src="${SOCIAL_ICONS_URL}/${icon}" alt="${name}" width="20" style="display:block"></a></td>`
      ).join('')}</tr></tbody></table>`,
  },
  footer: {
    title: 'Footer',
    description: 'Company details and unsubscribe',
    icon: <PanelBottomIcon size={20} />,
    searchTerms: ['footer', 'legal', 'unsubscribe', 'address', 'copyright'],
    defaults: blockContent({
      text: '© Your Company. All rights reserved.\n123 Main Street, City, Country',
    }),
    render: ({ text }) =>
      `<section data-type="section" style="padding:24px">${textElement('p', `text-align:center;color:${COLORS.muted};font-size:12px;line-height:1.6;margin:0`, text)}<p style="text-align:center;color:${COLORS.muted};font-size:12px;line-height:1.6;margin:8px 0 0"><a href="https://example.com/unsubscribe" style="color:${COLORS.muted};text-decoration:underline">Unsubscribe</a></p></section>`,
  },
} satisfies Record<string, BlockDefinition>;

export type BlockType = keyof typeof BLOCKS;

/**
 * @param type - The block to render.
 * @param content - The text and button of the block.
 * @param accent - The accent color of the email.
 * @returns The block markup.
 */
export function renderBlock(
  type: BlockType,
  content: BlockContent,
  accent: string
) {
  const block: BlockDefinition = BLOCKS[type];
  return block.render(content, accent);
}
