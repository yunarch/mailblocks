import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import type { EmailVariable } from '@/types/variables';
import {
  DEFAULT_ACCENT,
  renderBlock,
  type BlockContent,
  type BlockType,
} from '../blocks/definitions';
import { aiEngine } from './engine';

// Types
export type DesignBlock = BlockContent & { type: BlockType };
export type EmailDesign = {
  accentColor: string;
  blocks: DesignBlock[];
};
export type AiDesign = {
  design: EmailDesign;
  html: string; // Editor HTML right after the design was applied, to detect manual edits.
};

// Constants for email design parsing and validation.
const MAX_BLOCKS = 12;
const SAFE_URL = /^(?:https?:\/\/|mailto:|\{\{)/i;
const FALLBACK_URL = 'https://example.com';
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

const SYSTEM_PROMPT = `You design emails as JSON. Reply with JSON only, matching the schema.
Block types, used from top to bottom:
${AI_BLOCKS.map(({ type, hint }) => `- ${type}: ${hint}`).join('\n')}
Rules:
- Fields a block does not use must be empty strings.
- "accentColor" is a hex color such as #2563eb that fits the brand or topic.
- Write in the language of the request. Keep the copy short, specific and free of placeholder text.
- Use https://example.com as "buttonUrl" unless the request gives a URL.
- Use 3 to 7 blocks, usually a header, a hero, one or two content blocks, a cta and a footer.`;

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
          type: { type: 'string', enum: AI_BLOCK_TYPES },
          title: { type: 'string' },
          text: { type: 'string' },
          buttonLabel: { type: 'string' },
          buttonUrl: { type: 'string' },
        },
        required: ['type', ...BLOCK_STRING_FIELDS],
        additionalProperties: false,
      },
    },
  },
  required: ['accentColor', 'blocks'],
  additionalProperties: false,
};

/**
 * @param value - Any parsed JSON value.
 * @returns Whether the value is a non-null object.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * @param raw - The model reply.
 * @returns The validated design, or `null` when it isn't usable (invalid or truncated JSON, no blocks).
 */
export function parseEmailDesign(raw: string): EmailDesign | null {
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
    const type = AI_BLOCK_TYPES.find((t) => t === item.type);
    if (!type) continue;
    const field = (name: (typeof BLOCK_STRING_FIELDS)[number]) => {
      const value = item[name];
      return typeof value === 'string' ? value.trim() : '';
    };
    const buttonUrl = field('buttonUrl');
    blocks.push({
      type,
      title: field('title'),
      text: field('text'),
      buttonLabel: field('buttonLabel'),
      // Only http(s), mailto and `{{variable}}` links are kept.
      buttonUrl: SAFE_URL.test(buttonUrl) ? buttonUrl : FALLBACK_URL,
    });
  }
  if (blocks.length === 0) return null;
  const accent =
    typeof data.accentColor === 'string' &&
    /^#[\da-f]{6}$/i.test(data.accentColor)
      ? data.accentColor
      : DEFAULT_ACCENT;
  return { accentColor: accent, blocks };
}

/**
 * @param design - The blocks and accent color to render.
 * @returns The email markup the editor loads, built with the same blocks as the slash commands.
 */
export function renderEmailDesign({ accentColor, blocks }: EmailDesign) {
  return blocks
    .map((block) => renderBlock(block.type, block, accentColor))
    .join('');
}

/**
 * Asks the model for a new email design.
 *
 * @param engine - The loaded engine.
 * @param request - What to write, the design to change (when editing) and the variables it may use.
 * @param request.prompt - The user's instructions.
 * @param request.current - The design to change, when editing.
 * @param request.variables - The variables the email may use as `{{name}}` placeholders.
 * @returns The new design, or `null` when the generation was interrupted.
 * @throws {Error} When the model reply isn't a usable design.
 */
export async function generateEmailDesign(
  engine: MLCEngineInterface,
  {
    prompt,
    current,
    variables,
  }: { prompt: string; current?: EmailDesign; variables: EmailVariable[] }
) {
  const variableNames = variables.map(({ name }) => `{{${name}}}`).join(', ');
  const reply = await aiEngine.generateJson(engine, {
    system: variableNames
      ? `${SYSTEM_PROMPT}\n- Variables you may use inside any text: ${variableNames}.`
      : SYSTEM_PROMPT,
    user: current
      ? `Current email:\n${JSON.stringify(current)}\n\nChange it as requested and keep everything else as it is. Request: ${prompt}`
      : `Request: ${prompt}`,
    schema: EMAIL_DESIGN_SCHEMA,
  });
  if (reply === null) return null;
  const design = parseEmailDesign(reply);
  if (!design) {
    throw new Error(
      'The model did not return a usable design. Try again or shorten the request.'
    );
  }
  return design;
}
