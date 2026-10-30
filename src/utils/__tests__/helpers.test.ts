import { describe, expect, it } from 'vitest';
import {
  applyVariables,
  countVariables,
  findCodeLocation,
  findVariableRanges,
  formatBytes,
  getByteLength,
  getCodeLocation,
  isLocalhostUrl,
  removeVariableFromText,
} from '../helpers';

describe('countVariables', () => {
  it('counts placeholders across texts in order of first appearance', () => {
    expect([
      ...countVariables(['Hi {{ name }}, {{plan}}', 'https://a.dev/{{name}}']),
    ]).toEqual([
      ['name', 2],
      ['plan', 1],
    ]);
  });
});

describe('findVariableRanges and removeVariableFromText', () => {
  it('only target the given variable', () => {
    const text = 'Hi {{ name }}, {{plan}} {{name}}';
    expect(findVariableRanges(text, 'name')).toEqual([
      [3, 13],
      [24, 32],
    ]);
    expect(removeVariableFromText(text, 'name')).toBe('Hi , {{plan}} ');
  });
});

describe('applyVariables', () => {
  it('replaces placeholders with their escaped sample', () => {
    expect(
      applyVariables('<p>Hi {{name}}</p><a href="{{url}}">x</a>', [
        { name: 'name', sample: 'Ada <3' },
        { name: 'url', sample: 'https://a.dev/?a=1&b="2"' },
      ])
    ).toBe(
      '<p>Hi Ada &lt;3</p><a href="https://a.dev/?a=1&amp;b=&quot;2&quot;">x</a>'
    );
  });

  it('keeps placeholders without a sample value', () => {
    expect(
      applyVariables('{{name}} {{other}}', [{ name: 'name', sample: '' }])
    ).toBe('{{name}} {{other}}');
    expect(
      applyVariables('{{name}} {{other}} {{plan}}', [
        { name: 'name', sample: 'Ada' },
        { name: 'other', sample: '' },
      ])
    ).toBe('Ada {{other}} {{plan}}');
  });

  it('inserts samples unescaped into plain text', () => {
    expect(
      applyVariables('Hi {{name}}', [{ name: 'name', sample: 'Ada <3 & co' }], {
        escape: false,
      })
    ).toBe('Hi Ada <3 & co');
  });
});

describe('getByteLength', () => {
  it('counts UTF-8 bytes rather than characters', () => {
    expect(getByteLength('')).toBe(0);
    expect(getByteLength('abc')).toBe(3);
    expect(getByteLength('\u{E9}')).toBe(2);
    expect(getByteLength('\u{1F600}')).toBe(4);
  });
});

describe('isLocalhostUrl', () => {
  it.each([
    'http://localhost:3000/path',
    'http://127.0.0.1',
    'http://[::1]:8080',
    new URL('https://localhost'),
  ])('accepts loopback URL %s', (url) => {
    expect(isLocalhostUrl(url)).toBe(true);
  });

  it.each([
    'https://example.com/localhost',
    'https://localhost.example.com',
    '/relative',
    '',
  ])('rejects non-loopback or invalid URL %j', (url) => {
    expect(isLocalhostUrl(url)).toBe(false);
  });
});

describe('formatBytes', () => {
  it.each([
    [1023, '1023 B'],
    [1024, '1.0 kB'],
    [1_048_575, '1024.0 kB'],
    [1_048_576, '1.0 MB'],
  ])('formats %i bytes as %s at unit boundaries', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('getCodeLocation', () => {
  it.each([
    [-5, 1, 0],
    [3, 1, 3],
    [4, 2, 0],
    [6, 2, 2],
    [99, 3, 0],
  ])('maps offset %i to line %i, column %i', (offset, line, column) => {
    expect(getCodeLocation('abc\nde\n', offset)).toEqual({ line, column });
  });
});

describe('findCodeLocation', () => {
  const markup = '<p>a</p>\n<p>a</p>';

  it('locates the first occurrence at or after the start index', () => {
    expect(findCodeLocation(markup, 'a')).toEqual({ line: 1, column: 3 });
    expect(findCodeLocation(markup, 'a', 4)).toEqual({ line: 2, column: 3 });
  });

  it('falls back to the document start when not found', () => {
    expect(findCodeLocation(markup, 'missing')).toEqual({ line: 1, column: 0 });
  });
});
