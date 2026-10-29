import { describe, expect, it } from 'vitest';
import { lintEmailSpam } from '../lintEmailSpam';

const unsubscribe = '<a href="https://example.com/u">Unsubscribe</a>';
const text =
  'Here is your monthly account summary with recent activity and helpful tips.';

const lint = (html: string, plainText = text) => {
  return lintEmailSpam({ html: `${unsubscribe}${html}`, text: plainText });
};
const names = (html: string, plainText?: string) => {
  return lint(html, plainText).checks.map((check) => check.name);
};

describe('lintEmailSpam', () => {
  it('returns a clean result for a normal email', () => {
    expect(lint('')).toEqual({ checks: [], isSpam: false, points: 0 });
  });

  it('flags an empty email without an unsubscribe link', () => {
    expect(lintEmailSpam({ html: '', text: '' })).toEqual({
      checks: [
        {
          name: 'MISSING_UNSUBSCRIBE',
          description: 'No unsubscribe or email preferences link was found.',
          points: 0.8,
        },
        {
          name: 'EMPTY_MESSAGE',
          description: 'Message body has very little readable text.',
          points: 1,
        },
      ],
      isSpam: false,
      points: 1.8,
    });
  });

  it('uses HTML text only when no plain text is provided', () => {
    const html =
      '<p>Hello, act now and claim your monthly account summary today!!!</p>';
    expect(names(html, '')).toEqual([
      'SPAMMY_PHRASES',
      'EXCESSIVE_PUNCTUATION',
    ]);
    expect(names(html)).toEqual([]);
  });

  it.each([
    '<a href="https://example.com/opt-out">Settings</a>',
    '<a href="https://example.com">Manage your preferences</a>',
    '<a href="https://example.com">Email preferences</a>',
  ])('recognizes unsubscribe links by text or URL: %s', (link) => {
    expect(lintEmailSpam({ html: link, text }).checks).toEqual([]);
  });

  it.each([
    [1, 44, 0.7],
    [1, 45, 0],
    [3, 134, 1.2],
  ])(
    'scores %i images with %i words at %s image-ratio points',
    (images, words, points) => {
      const html = '<img src="https://example.com/a.png">'.repeat(images);
      const check = lint(html, 'word '.repeat(words)).checks.find(
        ({ name }) => name === 'HTML_IMAGE_RATIO_02'
      );
      expect(check?.points ?? 0).toBe(points);
    }
  );

  it.each([
    'width="1" height="1"',
    'style="display: none"',
    'style="visibility:hidden"',
  ])('treats %s images as tracking pixels, not content', (attributes) => {
    expect(names(`<img src="https://example.com/p" ${attributes}>`)).toEqual([
      'TRACKING_PIXEL',
    ]);
  });

  it.each([
    [8, 0],
    [9, 0.6],
    [17, 1.4],
  ])('scores %i links at %s many-links points', (count, points) => {
    const links = '<a href="https://example.com">Link</a>'.repeat(count - 1);
    const check = lint(links).checks.find(({ name }) => name === 'MANY_LINKS');
    expect(check?.points ?? 0).toBe(points);
  });

  it.each([
    ['https://evil.example', 'https://bank.example', true],
    ['https://evil.example', 'www.bank.example', true],
    ['https://www.bank.example/a', 'bank.example/b', false],
    ['https://evil.example', 'Read more', false],
    ['/relative', 'https://bank.example', false],
    ['', 'https://bank.example', false],
  ])(
    'compares link %j with visible URL %j (mismatch: %s)',
    (href, label, mismatch) => {
      expect(
        names(`<a href="${href}">${label}</a>`).includes('URI_DISPLAY_MISMATCH')
      ).toBe(mismatch);
    }
  );

  it.each([
    ['https://bit.ly/x', true],
    ['https://www.tinyurl.com/x', true],
    ['https://bit.ly.example.com/x', false],
  ])('detects URL shortener %s by exact host: %s', (href, shortened) => {
    expect(names(`<a href="${href}">Read</a>`).includes('URI_SHORTENER')).toBe(
      shortened
    );
  });

  it('lists up to three spam phrases and caps their score', () => {
    expect(
      lint('', `${text} ACT NOW, buy now, cash bonus, click here, winner`)
        .checks
    ).toEqual([
      {
        name: 'SPAMMY_PHRASES',
        description:
          'Contains spam-like wording: act now, buy now, cash bonus.',
        points: 2.4,
      },
    ]);
  });

  it('matches spam phrases only as whole words', () => {
    expect(names('', `${text} urgently winners`)).toEqual([]);
  });

  it.each([
    [20, 20, false],
    [21, 3, false],
    [21, 4, true],
  ])(
    'with %i words and %i in all caps flags shouting: %s',
    (words, caps, flagged) => {
      const body = 'LOUD '.repeat(caps) + 'calm '.repeat(words - caps);
      expect(names('', body).includes('UPPERCASE_WORDS')).toBe(flagged);
    }
  );

  it.each([
    ['Really?!', false],
    ['Really?!?', true],
  ])('checks urgent punctuation in %s', (ending, flagged) => {
    expect(
      names('', `${text} ${ending}`).includes('EXCESSIVE_PUNCTUATION')
    ).toBe(flagged);
  });

  it.each([
    [39, true],
    [40, false],
  ])(
    'with %i readable characters flags an empty message: %s',
    (length, flagged) => {
      expect(
        names('', `${'a'.repeat(length)} !!`).includes('EMPTY_MESSAGE')
      ).toBe(flagged);
    }
  );

  it('flags HTML above the Gmail clipping limit in UTF-8 bytes', () => {
    const atLimit = 'x'.repeat(102_400 - unsubscribe.length);
    expect(names(atLimit)).toEqual([]);
    expect(names(`${atLimit}\u{E9}`)).toEqual(['HTML_TOO_LARGE']);
  });

  it('classifies a rounded total of five points as spam', () => {
    const result = lint(
      '<a href="https://bit.ly/x">https://bank.example</a><img src="https://e.com/p" width="1" height="1">',
      `${text} act now buy now cash bonus`
    );
    expect(result.points).toBe(5);
    expect(result.isSpam).toBe(true);
  });
});
