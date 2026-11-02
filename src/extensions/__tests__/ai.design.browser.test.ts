import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { aiEngine } from '@/extensions/ai/engine';
import type { EmailVariable } from '@/types/variables';
import {
  generateEmailDesign,
  parseEmailDesign,
  type EmailDesign,
} from '../ai/design';

const design: EmailDesign = {
  accentColor: '#2563eb',
  blocks: [
    {
      type: 'hero',
      title: 'Welcome',
      text: 'Fresh coffee',
      buttonLabel: 'Shop now',
      buttonUrl: 'https://roastery.test',
    },
  ],
};
const engine = {} as MLCEngineInterface;

describe('parseEmailDesign', () => {
  it('rejects invalid JSON and replies without supported blocks', () => {
    expect(parseEmailDesign('not JSON')).toBeNull();
    expect(parseEmailDesign(JSON.stringify({ accentColor: '#2563eb' }))).toBe(
      null
    );
    expect(
      parseEmailDesign(
        JSON.stringify({
          accentColor: '#2563eb',
          blocks: [{ type: 'social' }, null, 'invalid'],
        })
      )
    ).toBeNull();
  });

  it('normalizes block fields, unsafe URLs and invalid accent colors', () => {
    expect(
      parseEmailDesign(
        JSON.stringify({
          accentColor: 'blue',
          blocks: [
            {
              type: 'hero',
              title: '  Welcome  ',
              text: 10,
              buttonLabel: ' Shop ',
              buttonUrl: 'data:text/html,unsafe',
            },
          ],
        })
      )
    ).toEqual({
      accentColor: '#111827',
      blocks: [
        {
          type: 'hero',
          title: 'Welcome',
          text: '',
          buttonLabel: 'Shop',
          buttonUrl: 'https://example.com',
        },
      ],
    });
  });

  it('keeps only the first twelve supported blocks', () => {
    const blocks = Array.from({ length: 13 }, () => ({
      type: 'divider',
      title: '',
      text: '',
      buttonLabel: '',
      buttonUrl: '',
    }));
    const parsed = parseEmailDesign(
      JSON.stringify({ accentColor: '#abcdef', blocks })
    );
    expect(parsed?.blocks).toHaveLength(12);
  });
});

describe('generateEmailDesign', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the prompt, allowed variables and structured output schema', async () => {
    const generateJson = vi
      .spyOn(aiEngine, 'generateJson')
      .mockResolvedValue(JSON.stringify(design));
    const variables: EmailVariable[] = [
      { name: 'firstName', sample: 'Ada' },
      { name: 'orderId', sample: '123' },
    ];

    await expect(
      generateEmailDesign(engine, {
        prompt: 'Welcome new customers',
        variables,
      })
    ).resolves.toEqual(design);

    expect(generateJson).toHaveBeenCalledOnce();
    const [calledEngine, request] = generateJson.mock.calls[0];
    expect(calledEngine).toBe(engine);
    expect(request.user).toBe('Request: Welcome new customers');
    expect(request.system).toContain('{{firstName}}, {{orderId}}');
    expect(request.system).not.toContain('Ada');
    expect(request.schema).toMatchObject({
      type: 'object',
      required: ['accentColor', 'blocks'],
      properties: {
        blocks: {
          type: 'array',
          minItems: 1,
          maxItems: 12,
        },
      },
    });
  });

  it('returns null when generation was interrupted', async () => {
    vi.spyOn(aiEngine, 'generateJson').mockResolvedValue(null);
    await expect(
      generateEmailDesign(engine, { prompt: 'Hello', variables: [] })
    ).resolves.toBeNull();
  });

  it('reports an unusable model response', async () => {
    vi.spyOn(aiEngine, 'generateJson').mockResolvedValue('not JSON');
    await expect(
      generateEmailDesign(engine, { prompt: 'Hello', variables: [] })
    ).rejects.toThrow(
      'The model did not return a usable design. Try again or shorten the request.'
    );
  });
});
