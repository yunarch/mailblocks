import { describe, expect, it } from 'vitest';
import {
  DEFAULT_EMAIL_CLIENTS,
  EMAIL_CLIENTS,
  lintEmailCompatibility,
} from '../lintEmailCompatibility';

const outlook = new Set(['outlook']);
const lint = (markup: string) => {
  return lintEmailCompatibility(markup, outlook);
};
const find = (markup: string, title: string) => {
  return lint(markup).find((result) => result.title === title);
};

describe('email client options', () => {
  it('lists unique clients that include every default selection', () => {
    const keys = EMAIL_CLIENTS.map((client) => client.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toEqual(expect.arrayContaining(DEFAULT_EMAIL_CLIENTS));
  });
});

describe('lintEmailCompatibility', () => {
  it('reports nothing for basic markup or when no affected client is selected', () => {
    expect(lint('<p><strong>Hi</strong> <span>there</span></p>')).toEqual([]);
    const flex = '<div style="display:flex"></div>';
    expect(lintEmailCompatibility(flex, new Set())).toEqual([]);
    expect(lintEmailCompatibility(flex, new Set(['apple-mail']))).toEqual([]);
  });

  it('reports unsupported features as warnings with their source and location', () => {
    expect(
      find('<p>Hi</p>\n<div style="display:flex"></div>', 'display:flex')
    ).toEqual({
      title: 'display:flex',
      category: 'css',
      severity: 'warning',
      unsupportedClients: ['Outlook Windows', 'Outlook Windows Mail'],
      partialClients: [],
      notes: [],
      url: 'https://www.caniemail.com/features/css-display-flex/',
      source: 'display:flex',
      location: { line: 2, column: 12 },
    });
  });

  it('reports partial support as info with plain-text notes', () => {
    const result = find('<div style="height:100px"></div>', 'height property');
    expect(result).toMatchObject({
      severity: 'info',
      unsupportedClients: [],
      partialClients: ['Outlook Windows'],
    });
    expect(result?.notes).toHaveLength(1);
    expect(result?.notes[0]).not.toMatch(/`|\]\(/);
  });

  it('omits note references that caniemail does not define', () => {
    expect(
      find('<div><style>a:link{color:red}</style></div>', ':link')
    ).toMatchObject({
      severity: 'info',
      partialClients: ['Outlook macOS', 'Outlook.com'],
      notes: [],
    });
  });

  it('uses platform labels that already include the client name', () => {
    const result = find(
      '<a href="https://a.com">A</a>\n<a href="https://b.com" target="_blank">B</a>',
      'target attribute'
    );
    expect(result?.unsupportedClients).toEqual(['Outlook.com']);
    expect(result?.location).toEqual({ line: 2, column: 0 });
  });

  it('judges support by the latest tested version of each client', () => {
    expect(lint('<img src="https://example.com/a.svg">')).toEqual([]);
  });

  it.each(['0', '0px', 'none', 'inherit', '0 !important'])(
    'ignores the neutral declaration margin:%s',
    (value) => {
      expect(
        find(`<div style="margin:${value}"></div>`, 'margin')
      ).toBeUndefined();
    }
  );

  it('skips neutral declarations and reports the next meaningful one', () => {
    expect(
      find(
        '<div style="height:0"></div>\n<div style="height:9px"></div>',
        'height property'
      )
    ).toMatchObject({
      source: 'height:9px',
      location: { line: 2, column: 12 },
    });
  });

  it('matches whole property names only', () => {
    const titles = lint(
      '<div style="min-height:9px;line-height:9px"></div>'
    ).map((result) => result.title);
    expect(titles).toContain('min-height property');
    expect(titles).not.toContain('height property');
  });

  it('checks stylesheet-only features in <style> blocks, not inline styles', () => {
    expect(
      find('<div><style>@media (min-width:1px){}</style></div>', '@media')
    ).toBeDefined();
    expect(find('<div style="--x:@media"></div>', '@media')).toBeUndefined();
  });

  it('ignores the document shell and the React Email layout wrapper', () => {
    const markup =
      '<html><head><style>p{display:flex}</style></head><body style="display:flex">' +
      '<table><tbody><tr><td dir="ltr" style="display:flex">\n' +
      '<div style="display:flex"></div></td></tr></tbody></table></body></html>';
    expect(find(markup, 'display:flex')?.location).toEqual({
      line: 2,
      column: 12,
    });
    expect(
      find(
        markup.replace('<div style="display:flex">', '<div>'),
        'display:flex'
      )
    ).toBeUndefined();
  });

  it('searches from the <body> tag when there is no layout wrapper', () => {
    const markup =
      '<html><head><style>p{display:flex}</style></head>\n<body><div style="display:flex"></div></body></html>';
    expect(find(markup, 'display:flex')?.location).toEqual({
      line: 2,
      column: 18,
    });
  });

  it('locates elements by source order, ignoring commented-out markup', () => {
    expect(
      find(
        '<!-- <video> -->\n<video src="https://e.com/a.mp4"></video>',
        '<video> element'
      )
    ).toMatchObject({
      category: 'html',
      source: '<video src="https://e.com/a.mp4">',
      location: { line: 2, column: 0 },
    });
  });

  it('locates styles whose declaration text is written with entities', () => {
    expect(
      find('<p>Hi</p>\n<div style="height:9&#112;x"></div>', 'height property')
        ?.location
    ).toEqual({ line: 2, column: 12 });
    expect(
      find('<div style="&#104;eight:9px"></div>', 'height property')?.location
    ).toEqual({ line: 1, column: 0 });
  });

  it.each([
    ['https://e.com/a.WEBP?v=1', 'webP image format'],
    ['data:image/webp;base64,YQ==', 'webP image format'],
    ['data:image/webp;base64,YQ==', 'Base 64 image format'],
  ])('detects the image %s as %s', (src, title) => {
    expect(find(`<img src="${src}">`, title)).toMatchObject({
      category: 'image',
      source: src,
    });
  });

  it('locates an element by its source when the parser renamed the tag', () => {
    expect(
      find('<p>Hi</p>\n<image src="https://e.com/a.webp">', 'webP image format')
        ?.location
    ).toEqual({ line: 2, column: 12 });
  });

  it.each(['https://e.com/a?f=b.webp', 'not a url'])(
    'does not guess an image format from %s',
    (src) => {
      expect(lint(`<img src="${src}">`)).toEqual([]);
    }
  );

  it('lists each feature once, warnings first and then alphabetically', () => {
    const results = lint(
      '<div style="display:flex;position:absolute;height:9px"></div><div style="display:flex"></div>'
    );
    expect(
      results.filter((result) => result.title === 'display:flex')
    ).toHaveLength(1);
    expect(results).toEqual(
      results.toSorted(
        (a, b) =>
          Number(a.severity === 'info') - Number(b.severity === 'info') ||
          a.title.localeCompare(b.title)
      )
    );
  });
});
