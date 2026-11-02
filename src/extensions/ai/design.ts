/* eslint-disable max-lines */
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import {
  createNodeFromContent,
  type Editor,
  type JSONContent,
} from '@tiptap/core';
import { DOMSerializer, Fragment, type Node } from '@tiptap/pm/model';
import type { EmailVariable } from '@/types/variables';
import {
  BLOCKS,
  DEFAULT_ACCENT,
  renderBlock,
  type BlockContent,
  type BlockType,
} from '../blocks/definitions';
import { aiEngine } from './engine';

// Types
export type DesignBlockType = BlockType | 'fixed'; // `fixed`: content the AI can keep, move or remove, but not rewrite.
export type DesignBlock = BlockContent & { id: string; type: DesignBlockType };
export type EmailDesign = {
  accentColor: string;
  blocks: DesignBlock[];
};
// Each top-level node of the email body, with its markup to recognize it.
export type BodyNode = { element: Element; json: JSONContent };
// The email body to write: markup for new blocks, editor nodes for kept ones.
export type EmailBody = (string | JSONContent)[];
export type EditorDesign = {
  design: EmailDesign;
  // The editor nodes of each block by id, so blocks the AI leaves untouched keep their exact look.
  sources: Map<string, { block: DesignBlock; nodes: JSONContent[] }>;
};
export type AiTurn = {
  id: string;
  prompt: string;
  changes: string[];
  body: JSONContent[]; // The email body right after this turn, to restore it.
};
export type AiConversation = {
  turns: AiTurn[];
  current: number; // The restored turn, or the last one; the next prompt drops the turns after it.
};

// Constants for email design parsing and validation.
const MAX_BLOCKS = 20;
const HISTORY_SIZE = 3;
const SAFE_URL = /^(?:https?:\/\/|mailto:|\{\{)/i;
const FALLBACK_URL = 'https://example.com';
const TEXT_TAGS = new Set([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'UL',
  'OL',
  'BLOCKQUOTE',
]);
const BLOCK_STRING_FIELDS = [
  'title',
  'text',
  'buttonLabel',
  'buttonUrl',
] as const;
const BLOCK_HINTS: Record<BlockType, string | null> = {
  header: 'the brand name in "title".',
  hero: 'a "title" and "text", and optionally a button ("buttonLabel" and "buttonUrl").',
  content: 'a "title" and "text".',
  cta: 'a short "text" and a button.',
  feature: 'one highlighted point, with a "title" and a short "text".',
  divider: 'a line in the accent color, with no other fields.',
  social: null,
  footer:
    'the company name and address in "text"; an unsubscribe link is added automatically.',
};

// Define AI system blocks based on the hints provided.
const AI_BLOCKS = (
  Object.entries(BLOCK_HINTS) as [BlockType, string | null][]
).flatMap(([type, hint]) => (hint ? [{ type, hint }] : []));

const AI_BLOCK_TYPES = AI_BLOCKS.map(({ type }) => type);

const SYSTEM_PROMPT = `You edit emails made of blocks, as JSON. Reply with JSON only, matching the schema.
Block types:
${AI_BLOCKS.map(({ type, hint }) => `- ${type}: ${hint}`).join('\n')}
- fixed: content you cannot edit. Keep its "id" and fields as given; you may move or remove it.
Rules:
- Reply with the whole email, blocks in order from top to bottom.
- Blocks with an "id" are already in the email. Keep their "id" when you keep or change them, and keep what you were not asked to change exactly as it is.
- New blocks have an empty "id".
- When asked for a new or different email, replace the blocks.
- Fields a block does not use must be empty strings.
- "accentColor" is a hex color such as #2563eb. Keep the current one unless asked to change the colors.
- Write in the language of the request. Keep the copy short, specific and free of placeholder text.
- Use https://example.com as "buttonUrl" unless the request gives a URL.
- A new email usually has 3 to 7 blocks: a header, a hero, one or two content blocks, a cta and a footer.`;

// JSON schema handed to the model so its reply always has the shape `parseEmailDesign` expects.
const EMAIL_DESIGN_SCHEMA = {
  type: 'object',
  properties: {
    accentColor: { type: 'string' },
    blocks: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_BLOCKS,
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: [...AI_BLOCK_TYPES, 'fixed'] },
          title: { type: 'string' },
          text: { type: 'string' },
          buttonLabel: { type: 'string' },
          buttonUrl: { type: 'string' },
        },
        required: ['id', 'type', ...BLOCK_STRING_FIELDS],
        additionalProperties: false,
      },
    },
  },
  required: ['accentColor', 'blocks'],
  additionalProperties: false,
};

const EMPTY_CONTENT: BlockContent = {
  title: '',
  text: '',
  buttonLabel: '',
  buttonUrl: '',
};

/**
 * @param value - Any parsed JSON value.
 * @returns Whether the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @param element - The element to read.
 * @returns Its text, with `&lt;br>` and list items as line breaks.
 */
function textOf(element: Element | null | undefined): string {
  if (!element) return '';
  if (element.matches('ul, ol')) {
    return [...element.querySelectorAll(':scope > li')]
      .map((item) => `• ${textOf(item)}`)
      .join('\n');
  }
  const clone = element.cloneNode(true) as Element;
  for (const br of clone.querySelectorAll('br')) br.replaceWith('\n');
  return clone.textContent.trim();
}

/**
 * @param elements - The elements to read.
 * @returns Their non-empty texts, one per line.
 */
function textsOf(elements: Iterable<Element>) {
  return [...elements]
    .map((element) => textOf(element))
    .filter(Boolean)
    .join('\n');
}

/**
 * @param root - The element holding the button.
 * @returns The label and link of the first editor button, if any.
 */
function buttonOf(
  root: Element
): Pick<BlockContent, 'buttonLabel' | 'buttonUrl'> {
  const button = root.querySelector<HTMLElement>(
    'a[data-id="react-email-button"]'
  );
  return {
    buttonLabel: textOf(button),
    buttonUrl: button?.dataset.href ?? button?.getAttribute('href') ?? '',
  };
}

/**
 * Recognizes the pre-styled blocks by their structure, so their content can be edited.
 *
 * @param element - A top-level element of the email body.
 * @returns The block, or `null` when the element isn't one of the pre-styled blocks.
 */
function readBlock(
  element: Element
): (BlockContent & { type: BlockType }) | null {
  if (element.matches('[data-type="two-columns"]')) {
    const columns = [
      ...element.querySelectorAll(':scope > [data-type="column"]'),
    ];
    const media = columns.at(0);
    const body = columns.at(1);
    if (!media || !body || !media.querySelector('img') || textOf(media)) {
      return null;
    }
    return {
      ...EMPTY_CONTENT,
      type: 'feature',
      title: textOf(body.querySelector(':scope > :is(h1, h2, h3, h4)')),
      text: textsOf(body.querySelectorAll(':scope > p')),
    };
  }
  if (!element.matches('section')) return null;
  const paragraphs = element.querySelectorAll(':scope > p');
  if (element.querySelector(':scope > hr')) {
    return { ...EMPTY_CONTENT, type: 'divider' };
  }
  if (element.querySelector('a[href*="unsubscribe"]')) {
    return {
      ...EMPTY_CONTENT,
      type: 'footer',
      text: textsOf(
        [...paragraphs].filter(
          (p) => !p.querySelector('a[href*="unsubscribe"]')
        )
      ),
    };
  }
  const h1 = element.querySelector(':scope > h1');
  if (h1) {
    return {
      type: 'hero',
      title: textOf(h1),
      text: textsOf(paragraphs),
      ...buttonOf(element),
    };
  }
  const h2 = element.querySelector(':scope > h2');
  if (h2) {
    return {
      ...EMPTY_CONTENT,
      type: 'content',
      title: textOf(h2),
      text: textsOf(paragraphs),
    };
  }
  const logo = element.querySelector(':scope > img');
  if (logo) {
    return {
      ...EMPTY_CONTENT,
      type: 'header',
      title: textsOf(paragraphs) || (logo.getAttribute('alt') ?? ''),
    };
  }
  const button = buttonOf(element);
  if (button.buttonLabel) {
    return {
      ...EMPTY_CONTENT,
      type: 'cta',
      text: textsOf(paragraphs),
      ...button,
    };
  }
  return null;
}

/**
 * @param elements - Consecutive headings, paragraphs and lists typed in the editor.
 * @returns A content block, with a leading heading as its title.
 */
function readTextGroup(
  elements: Element[]
): BlockContent & { type: BlockType } {
  const [first, ...rest] = elements;
  const hasTitle = /^H[1-6]$/.test(first.tagName);
  return {
    ...EMPTY_CONTENT,
    type: 'content',
    title: hasTitle ? textOf(first) : '',
    text: textsOf(hasTitle ? rest : elements),
  };
}

/**
 * @param element - Content that isn't a pre-styled block.
 * @returns A short name for it, so the model knows what it is.
 */
function fixedLabel(element: Element) {
  if (element.matches('img')) return 'Image';
  if (element.matches('table')) return 'Table';
  if (element.matches('[data-type="two-columns"]')) return 'Columns';
  if (element.matches('hr')) return 'Line';
  return 'Section';
}

/**
 * @param color - A CSS color, usually `rgb()` as browsers serialize inline styles.
 * @returns The color as hex, or `undefined` when it isn't an opaque color.
 */
function toHex(color: string) {
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  const match = /^rgb\((?<r>\d+),\s*(?<g>\d+),\s*(?<b>\d+)\)$/.exec(color);
  if (!match?.groups) return;
  const { r, g, b } = match.groups;
  return `#${[r, g, b]
    .map((channel) => Number(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * @param elements - The top-level elements of the email body.
 * @returns The accent color used by its buttons or divider lines.
 */
function readAccent(elements: Element[]) {
  const find = (selector: string) =>
    elements
      .map((element) =>
        element.matches(selector)
          ? (element as HTMLElement)
          : element.querySelector<HTMLElement>(selector)
      )
      .find(Boolean);
  return (
    toHex(
      find('a[data-id="react-email-button"]')?.style.backgroundColor ?? ''
    ) ??
    toHex(find('section > hr')?.style.borderTopColor ?? '') ??
    DEFAULT_ACCENT
  );
}

/**
 * @param editor - The editor holding the email.
 * @returns The node whose children are the email body (the root container), and their range.
 */
function findBody(editor: Editor) {
  const { doc } = editor.state;
  let body = { node: doc, from: 0, to: doc.content.size };
  doc.forEach((node, offset) => {
    if (node.type.name === 'container') {
      body = { node, from: offset + 1, to: offset + node.nodeSize - 1 };
    }
  });
  return body;
}

/**
 * @param editor - The editor holding the email.
 * @returns The top-level nodes of the email body, without the theme.
 */
export function getEmailBody(editor: Editor): BodyNode[] {
  const serializer = DOMSerializer.fromSchema(editor.schema);
  const nodes: BodyNode[] = [];
  findBody(editor).node.forEach((node) => {
    if (node.type.name === 'globalContent') return;
    nodes.push({
      element: serializer.serializeNode(node) as Element,
      json: node.toJSON() as JSONContent,
    });
  });
  return nodes;
}

/**
 * Replaces the email body, keeping the theme and container settings. It can be undone.
 *
 * @param editor - The editor holding the email.
 * @param body - Markup for new blocks and editor nodes for kept ones, in order.
 */
export function setEmailBody(editor: Editor, body: EmailBody) {
  const { schema } = editor;
  const nodes: Node[] = [];
  for (const part of body) {
    if (typeof part === 'string') {
      const content = createNodeFromContent(part, schema);
      if (content instanceof Fragment) {
        content.forEach((node) => {
          nodes.push(node);
        });
      } else nodes.push(content);
    } else {
      nodes.push(schema.nodeFromJSON(part));
    }
  }
  if (nodes.length === 0) nodes.push(schema.nodes.paragraph.create());
  const { from, to } = findBody(editor);
  editor
    .chain()
    .command(({ tr }) => {
      tr.replaceWith(from, to, nodes);
      return true;
    })
    .run();
}

/**
 * Reads the email body as a design, so the model continues from what is in
 * the editor, including manual edits.
 *
 * @param body - The top-level nodes of the email body, see `getEmailBody`.
 * @returns The design, with the editor nodes of each block.
 */
export function readEmailDesign(body: BodyNode[]): EditorDesign {
  const sources: EditorDesign['sources'] = new Map();
  const blocks: DesignBlock[] = [];
  const add = (
    content: BlockContent & { type: DesignBlockType },
    nodes: BodyNode[]
  ) => {
    const block = { ...content, id: `b${String(blocks.length + 1)}` };
    blocks.push(block);
    sources.set(block.id, { block, nodes: nodes.map(({ json }) => json) });
  };
  let group: BodyNode[] = [];
  const flushGroup = () => {
    const filled = group.filter(({ element }) => textOf(element));
    if (filled.length > 0) {
      add(readTextGroup(filled.map(({ element }) => element)), filled);
    }
    group = [];
  };
  for (const node of body) {
    const { element } = node;
    if (TEXT_TAGS.has(element.tagName)) {
      // Each heading starts a new section of text.
      if (/^H[1-6]$/.test(element.tagName)) flushGroup();
      group.push(node);
      continue;
    }
    flushGroup();
    const block = readBlock(element);
    add(
      block ?? {
        ...EMPTY_CONTENT,
        type: 'fixed',
        title: fixedLabel(element),
        text: textOf(element).slice(0, 80),
      },
      [node]
    );
  }
  flushGroup();
  const elements = body.map(({ element }) => element);
  return { design: { accentColor: readAccent(elements), blocks }, sources };
}

/**
 * @param raw - The model reply.
 * @param current - The design the model was asked to change.
 * @returns The validated design, or `null` when it isn't usable (invalid or truncated JSON, no blocks).
 */
export function parseEmailDesign(
  raw: string,
  current?: EditorDesign
): EmailDesign | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(data) || !Array.isArray(data.blocks)) return null;
  const blocks: DesignBlock[] = [];
  for (const item of data.blocks.slice(0, MAX_BLOCKS)) {
    if (!isRecord(item)) continue;
    const source =
      typeof item.id === 'string' ? current?.sources.get(item.id) : undefined;
    // Fixed content can only be kept as it is.
    if (item.type === 'fixed') {
      if (source?.block.type === 'fixed') blocks.push(source.block);
      continue;
    }
    const type = AI_BLOCK_TYPES.find((t) => t === item.type);
    if (!type) continue;
    const field = (name: (typeof BLOCK_STRING_FIELDS)[number]) => {
      const value = item[name];
      return typeof value === 'string' ? value.trim() : '';
    };
    const buttonUrl = field('buttonUrl');
    blocks.push({
      id: source ? source.block.id : '',
      type,
      title: field('title'),
      text: field('text'),
      buttonLabel: field('buttonLabel'),
      // Only http(s), mailto and `{{variable}}` links are kept; empty stays empty, so untouched blocks still match.
      buttonUrl:
        !buttonUrl || SAFE_URL.test(buttonUrl) ? buttonUrl : FALLBACK_URL,
    });
  }
  if (blocks.length === 0) return null;
  const accent =
    typeof data.accentColor === 'string' &&
    /^#[\da-f]{6}$/i.test(data.accentColor)
      ? data.accentColor
      : (current?.design.accentColor ?? DEFAULT_ACCENT);
  return { accentColor: accent, blocks };
}

/**
 * @param a - A block.
 * @param b - Another block.
 * @returns Whether both have the same type and content.
 */
function sameContent(a: DesignBlock, b: DesignBlock) {
  return (
    a.type === b.type &&
    BLOCK_STRING_FIELDS.every((field) => a[field] === b[field])
  );
}

/**
 * @param design - The blocks and accent color to render.
 * @param current - The design read from the editor, whose untouched blocks keep their editor nodes.
 * @returns The email body for `setEmailBody`, built with the same blocks as the slash commands.
 */
export function renderEmailDesign(
  design: EmailDesign,
  current?: EditorDesign
): EmailBody {
  const accentChanged =
    current !== undefined && current.design.accentColor !== design.accentColor;
  return design.blocks.flatMap<string | JSONContent>((block) => {
    const source = block.id ? current?.sources.get(block.id) : undefined;
    if (
      source &&
      (block.type === 'fixed' ||
        (!accentChanged && sameContent(source.block, block)))
    ) {
      return source.nodes;
    }
    return block.type === 'fixed'
      ? []
      : [renderBlock(block.type, block, design.accentColor)];
  });
}

/**
 * @param block - A block of a design.
 * @returns Its display name, as in the slash command menu.
 */
function blockLabel(block: DesignBlock) {
  return block.type === 'fixed' ? block.title : BLOCKS[block.type].title;
}

/**
 * @param blocks - The blocks of a design.
 * @returns The ids of the blocks that were already in the email, in order.
 */
function keptOrder(blocks: DesignBlock[]) {
  return blocks.flatMap(({ id }) => (id ? [id] : []));
}

/**
 * Describes a design change from the designs themselves, so the summary can't
 * claim changes the model didn't make.
 *
 * @param previous - The design before the change.
 * @param next - The design after the change.
 * @returns One line per change, e.g. `Added Footer`.
 */
export function describeDesignChange(previous: EmailDesign, next: EmailDesign) {
  if (previous.blocks.length === 0 || keptOrder(next.blocks).length === 0) {
    return [
      `Created ${next.blocks.map((block) => blockLabel(block)).join(', ')}`,
      `Accent color ${next.accentColor}`,
    ];
  }
  const nextById = new Map(next.blocks.map((block) => [block.id, block]));
  const changes: string[] = [];
  for (const block of previous.blocks) {
    const updated = nextById.get(block.id);
    if (!updated) changes.push(`Removed ${blockLabel(block)}`);
    else if (!sameContent(block, updated)) {
      changes.push(`Changed ${blockLabel(updated)}`);
    }
  }
  for (const block of next.blocks) {
    if (!block.id) changes.push(`Added ${blockLabel(block)}`);
  }
  const previousOrder = keptOrder(previous.blocks).filter((id) =>
    nextById.has(id)
  );
  if (previousOrder.join(',') !== keptOrder(next.blocks).join(',')) {
    changes.push('Reordered blocks');
  }
  if (previous.accentColor !== next.accentColor) {
    changes.push(`Accent color ${previous.accentColor} → ${next.accentColor}`);
  }
  return changes.length > 0 ? changes : ['No visible changes'];
}

/**
 * Asks the model to change the email.
 *
 * @param engine - The loaded engine.
 * @param request - What to change, the email to change, the earlier prompts and the variables it may use.
 * @param request.prompt - The user's instructions.
 * @param request.current - The email in the editor, see `readEmailDesign`.
 * @param request.history - The earlier prompts of the conversation, oldest first.
 * @param request.variables - The variables the email may use as `{{name}}` placeholders.
 * @returns The new design, or `null` when the generation was interrupted.
 * @throws {Error} When the model reply isn't a usable design.
 */
export async function generateEmailDesign(
  engine: MLCEngineInterface,
  {
    prompt,
    current,
    history,
    variables,
  }: {
    prompt: string;
    current: EditorDesign;
    history: string[];
    variables: EmailVariable[];
  }
) {
  const variableNames = variables.map(({ name }) => `{{${name}}}`).join(', ');
  const earlier = history.slice(-HISTORY_SIZE);
  const reply = await aiEngine.generateJson(engine, {
    system: variableNames
      ? `${SYSTEM_PROMPT}\n- Variables you may use inside any text: ${variableNames}.`
      : SYSTEM_PROMPT,
    user: [
      earlier.length > 0
        ? `Earlier requests in this chat:\n${earlier.map((text) => `- ${text}`).join('\n')}`
        : '',
      current.design.blocks.length > 0
        ? `Current email:\n${JSON.stringify(current.design)}`
        : 'The email is empty.',
      `Request: ${prompt}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    schema: EMAIL_DESIGN_SCHEMA,
  });
  if (reply === null) return null;
  const design = parseEmailDesign(reply, current);
  if (!design) {
    throw new Error(
      'The model did not return a usable design. Try again or shorten the request.'
    );
  }
  return design;
}
