import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  generateEmailDesign,
  parseEmailDesign,
  renderEmailDesign,
  type DesignBlock,
} from '../ai/design';
import { aiEngine } from '../ai/engine';

const block = (overrides: Partial<DesignBlock>): DesignBlock => ({
  type: 'content',
  title: '',
  text: '',
  buttonLabel: '',
  buttonUrl: '',
  ...overrides,
});

describe('parseEmailDesign', () => {
  it('keeps valid blocks and trims their text', () => {
    const spec = parseEmailDesign(
      JSON.stringify({
        accentColor: '#2563eb',
        blocks: [block({ type: 'hero', title: '  Hello  ' })],
      })
    );
    expect(spec).toEqual({
      accentColor: '#2563eb',
      blocks: [
        block({
          type: 'hero',
          title: 'Hello',
          buttonUrl: 'https://example.com',
        }),
      ],
    });
  });

  it('keeps safe links and variables, and replaces anything else', () => {
    const urls = [
      'https://acme.test',
      'mailto:hi@acme.test',
      '{{url}}',
      // eslint-disable-next-line no-script-url -- The unsafe link under test.
      'javascript:alert(1)',
    ];
    const spec = parseEmailDesign(
      JSON.stringify({
        accentColor: '#2563eb',
        blocks: urls.map((buttonUrl) => block({ type: 'cta', buttonUrl })),
      })
    );
    expect(spec?.blocks.map(({ buttonUrl }) => buttonUrl)).toEqual([
      'https://acme.test',
      'mailto:hi@acme.test',
      '{{url}}',
      'https://example.com',
    ]);
  });

  it('drops unknown blocks and blocks not offered to the AI', () => {
    const spec = parseEmailDesign(
      JSON.stringify({
        accentColor: 'blue',
        blocks: [
          { ...block({}), type: 'carousel' },
          block({ type: 'social' }),
          block({ type: 'footer' }),
          'x',
        ],
      })
    );
    expect(spec?.accentColor).toBe('#111827');
    expect(spec?.blocks.map(({ type }) => type)).toEqual(['footer']);
  });

  it('rejects invalid, truncated or empty output', () => {
    expect(
      parseEmailDesign('{"accentColor":"#000000","blocks":[{"ty')
    ).toBeNull();
    expect(parseEmailDesign('{"blocks":[]}')).toBeNull();
    expect(parseEmailDesign('[]')).toBeNull();
  });
});

describe('renderEmailDesign', () => {
  it('renders each block with the accent color', () => {
    const html = renderEmailDesign({
      accentColor: '#ff0000',
      blocks: [
        block({ type: 'header', title: 'Acme' }),
        block({
          type: 'hero',
          title: 'Big news',
          text: 'Line 1\nLine 2',
          buttonLabel: 'Read',
          buttonUrl: 'https://acme.test',
        }),
        block({ type: 'divider' }),
      ],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('h1')?.textContent).toBe('Big news');
    expect(doc.querySelector('br')).not.toBeNull();
    const button = doc.querySelector<HTMLAnchorElement>('a');
    expect(button?.href).toBe('https://acme.test/');
    expect(button?.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(doc.querySelector('hr')).not.toBeNull();
  });

  it('escapes text', () => {
    const html = renderEmailDesign({
      accentColor: '#111827',
      blocks: [
        block({
          type: 'cta',
          text: '<script>alert(1)</script>',
          buttonLabel: '<b>Go</b>',
          buttonUrl: 'https://acme.test/?a=1&b="2"',
        }),
      ],
    });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('script, b')).toBeNull();
    expect(doc.querySelector('p')?.textContent).toBe(
      '<script>alert(1)</script>'
    );
    expect(doc.querySelector('a')?.getAttribute('href')).toBe(
      'https://acme.test/?a=1&b="2"'
    );
  });

  it('keeps variable placeholders in text and links', () => {
    const html = renderEmailDesign({
      accentColor: '#111827',
      blocks: [
        block({
          type: 'cta',
          text: 'Hi {{name}}',
          buttonLabel: 'Open',
          buttonUrl: '{{url}}',
        }),
      ],
    });
    expect(html).toContain('Hi {{name}}');
    expect(html).toContain('href="{{url}}"');
  });
});

describe('generateEmailDesign', () => {
  const engine = {} as MLCEngineInterface;
  const design = {
    accentColor: '#2563eb',
    blocks: [block({ type: 'hero', buttonUrl: 'https://acme.test' })],
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the request, current design and variables to the model', async () => {
    const generateJson = vi
      .spyOn(aiEngine, 'generateJson')
      .mockResolvedValue(JSON.stringify(design));
    const result = await generateEmailDesign(engine, {
      prompt: 'Add a footer',
      current: design,
      variables: [{ name: 'first_name', sample: '' }],
    });
    expect(result).toEqual(design);
    const { system, user } = generateJson.mock.lastCall?.[1] ?? {};
    expect(system).toContain('{{first_name}}');
    expect(user).toContain(JSON.stringify(design));
    expect(user).toContain('Request: Add a footer');
  });

  it('returns nothing when interrupted and fails on an unusable reply', async () => {
    const generateJson = vi
      .spyOn(aiEngine, 'generateJson')
      .mockResolvedValue(null);
    const request = { prompt: 'Anything', variables: [] };
    await expect(generateEmailDesign(engine, request)).resolves.toBeNull();
    generateJson.mockResolvedValue('{"blocks":[]}');
    await expect(generateEmailDesign(engine, request)).rejects.toThrow(
      'did not return a usable design'
    );
  });
});
