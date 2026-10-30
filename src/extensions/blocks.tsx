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
import { createNodeFromContent, type Editor, type Range } from '@tiptap/core';
import { Fragment } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';

// Placeholder logo: the app icon, as an absolute URL so it also loads in the exported email
const LOGO_URL = new URL('android-chrome-192x192.png', document.baseURI).href;

// Shared React Email demo assets, also used by the bundled templates
const SOCIAL_ICONS_URL =
  'https://react-email-demo-6woqf4gn1-resend.vercel.app/static/shared';

const COLORS = {
  text: '#111827',
  muted: '#6b7280',
  accent: '#111827',
};

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
 * @param label - The visible button text.
 * @param align - The horizontal position of the button.
 * @returns The markup of an editor button node.
 */
function button(label: string, align: 'left' | 'center') {
  const href = 'https://example.com';
  return `<a data-id="react-email-button" href="${href}" data-href="${href}" alignment="${align}" style="background-color:${COLORS.accent};color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;text-decoration:none">${label}</a>`;
}

const BLOCKS: (Omit<SlashCommandItem, 'command' | 'category'> & {
  html: string;
})[] = [
  {
    title: 'Header',
    description: 'Centered logo',
    icon: <PanelTopIcon size={20} />,
    searchTerms: ['header', 'logo', 'brand', 'top'],
    html: `<section data-type="section" style="padding:32px 24px 16px"><img src="${LOGO_URL}" alt="Logo" width="48" style="display:block;margin:0 auto"></section>`,
  },
  {
    title: 'Hero',
    description: 'Title, text and button',
    icon: <LayoutIcon size={20} />,
    searchTerms: ['hero', 'banner', 'intro', 'title', 'headline'],
    html: `<section data-type="section" style="padding:32px 24px;text-align:center"><h1 style="text-align:center;color:${COLORS.text};font-size:28px;line-height:1.3;margin:0 0 12px">Your headline here</h1><p style="text-align:center;color:${COLORS.muted};font-size:16px;line-height:1.6;margin:0 0 24px">Introduce your message in a sentence or two, then point readers to the next step.</p>${button('Get started', 'center')}</section>`,
  },
  {
    title: 'Content',
    description: 'Heading and paragraph',
    icon: <TextIcon size={20} />,
    searchTerms: ['content', 'text', 'paragraph', 'body', 'article'],
    html: `<section data-type="section" style="padding:16px 24px"><h2 style="color:${COLORS.text};font-size:20px;line-height:1.4;margin:0 0 8px">Section title</h2><p style="color:${COLORS.text};font-size:15px;line-height:1.6;margin:0">Write the body of your email here. Keep paragraphs short so they are easy to read on small screens.</p></section>`,
  },
  {
    title: 'Call to action',
    description: 'Short text with a button',
    icon: <MousePointerClickIcon size={20} />,
    searchTerms: ['cta', 'call to action', 'button', 'action'],
    html: `<section data-type="section" style="padding:16px 24px 32px;text-align:center"><p style="text-align:center;color:${COLORS.text};font-size:15px;line-height:1.6;margin:0 0 16px">Ready to continue?</p>${button('Continue', 'center')}</section>`,
  },
  {
    title: 'Feature',
    description: 'Icon next to a title and text',
    icon: <Columns2Icon size={20} />,
    searchTerms: ['feature', 'icon', 'media', 'image text', 'list'],
    html: `<div data-type="two-columns" style="padding:12px 24px"><div data-type="column" style="width:64px;vertical-align:top"><img src="${LOGO_URL}" alt="" width="40" style="display:block"></div><div data-type="column" style="vertical-align:top"><h3 style="color:${COLORS.text};font-size:16px;line-height:1.4;margin:0 0 4px">Feature title</h3><p style="color:${COLORS.muted};font-size:14px;line-height:1.6;margin:0">Describe the feature and why it matters in one or two lines.</p></div></div>`,
  },
  {
    title: 'Accent divider',
    description: 'Colored separator line',
    icon: <MinusIcon size={20} />,
    searchTerms: ['divider', 'separator', 'line', 'hr', 'accent'],
    html: `<section data-type="section" style="padding:16px 24px"><hr style="margin:0;padding:0;border-width:0;border-style:solid;border-top-width:2px;border-top-color:${COLORS.accent}"></section>`,
  },
  {
    title: 'Social links',
    description: 'Row of social icons',
    icon: <LinkIcon size={20} />,
    searchTerms: ['social', 'icons', 'follow', 'twitter', 'linkedin'],
    html: `<table align="center" style="margin:0 auto;padding:16px 0"><tbody><tr>${SOCIAL_LINKS.map(
      ({ name, href, icon }) =>
        `<td style="padding:0 8px"><a href="${href}"><img src="${SOCIAL_ICONS_URL}/${icon}" alt="${name}" width="20" style="display:block"></a></td>`
    ).join('')}</tr></tbody></table>`,
  },
  {
    title: 'Footer',
    description: 'Company details and unsubscribe',
    icon: <PanelBottomIcon size={20} />,
    searchTerms: ['footer', 'legal', 'unsubscribe', 'address', 'copyright'],
    html: `<section data-type="section" style="padding:24px"><p style="text-align:center;color:${COLORS.muted};font-size:12px;line-height:1.6;margin:0">© Your Company. All rights reserved.<br>123 Main Street, City, Country</p><p style="text-align:center;color:${COLORS.muted};font-size:12px;line-height:1.6;margin:8px 0 0"><a href="https://example.com/unsubscribe" style="color:${COLORS.muted};text-decoration:underline">Unsubscribe</a></p></section>`,
  },
];

/**
 * Inserts a block where the slash command was typed: it replaces the line
 * when that line is empty, otherwise it goes right after it. The cursor then
 * moves to the line after the block (created when needed), so blocks can be
 * chained one after another instead of nesting inside the previous block.
 *
 * @param editor - The editor instance.
 * @param range - The range of the typed slash command.
 * @param html - The block markup.
 */
function insertBlock(editor: Editor, range: Range, html: string) {
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .command(({ tr, state }) => {
      const { $from } = tr.selection;
      if (!$from.parent.isTextblock) return false;
      const content = createNodeFromContent(html, state.schema);
      const block =
        content instanceof Fragment ? content : Fragment.from(content);
      const lineStart = $from.before();
      const lineEnd = $from.after();
      const isEmptyLine = $from.parent.content.size === 0;
      if (isEmptyLine) {
        tr.replaceWith(lineStart, lineEnd, block);
      } else {
        tr.insert(lineEnd, block);
      }
      const blockEnd = (isEmptyLine ? lineStart : lineEnd) + block.size;
      if (!tr.doc.resolve(blockEnd).nodeAfter?.isTextblock) {
        tr.insert(blockEnd, state.schema.nodes.paragraph.create());
      }
      tr.setSelection(TextSelection.create(tr.doc, blockEnd + 1));
      return true;
    })
    .scrollIntoView()
    .run();
}

/**
 * Slash commands that insert the pre-styled blocks, grouped under "Blocks".
 */
export const BLOCK_COMMANDS: SlashCommandItem[] = BLOCKS.map(
  ({ html, ...item }) => ({
    ...item,
    category: 'Blocks',
    command: ({ editor, range }) => {
      insertBlock(editor, range, html);
    },
  })
);
