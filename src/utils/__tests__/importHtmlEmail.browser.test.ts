/* eslint-disable max-lines */
import { describe, expect, it } from 'vitest';
import {
  decodeHtml,
  getSelectorSpecificity,
  importHtmlEmail,
} from '../importHtmlEmail';

const importBody = (html: string, fileName = 'email.html') => {
  const { content } = importHtmlEmail(html, fileName);
  return new DOMParser().parseFromString(content, 'text/html');
};

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((part) =>
      typeof part === 'string' ? [...new TextEncoder().encode(part)] : part
    )
  ).buffer;

describe('decodeHtml', () => {
  it.each([
    ['<meta charset="windows-1252">', 'windows-1252'],
    [
      '<meta http-equiv="Content-Type" content="text/html; charset=ISO-8859-1">',
      'ISO-8859-1',
    ],
    // Browsers decode x-user-defined declarations as Windows-1252
    ['<meta charset="x-user-defined">', 'windows-1252'],
  ])('decodes using the charset declared by %s', (meta) => {
    // "é" is 0xE9 in Windows-1252 and ISO-8859-1
    expect(decodeHtml(bytes(meta, '<p>Caf', [0xe9], '</p>'))).toBe(
      `${meta}<p>Café</p>`
    );
  });

  it('decodes as UTF-8 without a declaration or with an unknown one', () => {
    expect(decodeHtml(bytes('<p>Café</p>'))).toBe('<p>Café</p>');
    expect(decodeHtml(bytes('<meta charset="nope"><p>Café</p>'))).toBe(
      '<meta charset="nope"><p>Café</p>'
    );
  });

  it('ignores charset declarations inside comments', () => {
    const html =
      '<!-- <meta charset="windows-1252"> --><meta charset="utf-8"><p>Café</p>';
    expect(decodeHtml(bytes(html))).toBe(html);
    expect(decodeHtml(bytes('<!-- <meta charset="windows-1252">Café'))).toBe(
      '<!-- <meta charset="windows-1252">Café'
    );
  });

  it('decodes a declared UTF-16 as UTF-8, since the declaration was readable as ASCII', () => {
    expect(decodeHtml(bytes('<meta charset="UTF-16"><p>Café</p>'))).toBe(
      '<meta charset="UTF-16"><p>Café</p>'
    );
  });

  it('prefers the byte order mark over the declared charset', () => {
    expect(
      decodeHtml(bytes([0xef, 0xbb, 0xbf], '<meta charset="latin1">é'))
    ).toBe('<meta charset="latin1">é');
    expect(decodeHtml(new Uint8Array([0xff, 0xfe, 0xe9, 0x00]).buffer)).toBe(
      'é'
    );
    expect(decodeHtml(new Uint8Array([0xfe, 0xff, 0x00, 0xe9]).buffer)).toBe(
      'é'
    );
  });
});

describe('getSelectorSpecificity', () => {
  it.each([
    ['p', 'td p'],
    ['td p', '.title'],
    ['.title', 'p.title'],
    ['p.title', '.a .b'],
    ['[data-x="#y"]', '#y'],
    ['table td.a.b.c', '#hero'],
    [':where(#hero) p', 'p.a'],
  ])('ranks %s below %s', (lower, higher) => {
    expect(getSelectorSpecificity(lower)).toBeLessThan(
      getSelectorSpecificity(higher)
    );
  });
});

describe('importHtmlEmail', () => {
  it('creates an imported template named after the title or the file', () => {
    const titled = importHtmlEmail(
      '<title> Spring sale </title><p>Hi</p>',
      'promo.html'
    );
    expect(titled).toMatchObject({
      name: 'Spring sale',
      category: 'Imported',
      description: 'Imported from promo.html.',
    });
    expect(importHtmlEmail('<p>Hi</p>', 'Welcome.HTM').name).toBe('Welcome');
    expect(importHtmlEmail('<p>Hi</p>', '.html').name).toBe('Imported email');
    expect(importHtmlEmail('<p>Hi</p>')).toMatchObject({
      name: 'Imported email',
      description: 'Imported from pasted HTML.',
    });
  });

  it('gives every import a new id, even for the same file', () => {
    const first = importHtmlEmail('<p>Hi</p>', 'a.html');
    const second = importHtmlEmail('<p>Hi</p>', 'a.html');
    expect(first.id).toMatch(/^imported-/);
    expect(first.id).not.toBe(second.id);
  });

  it('removes scripts, embeds, event handlers and script URLs', () => {
    const document = importBody(`
      <script>alert(1)</script>
      <iframe src="https://example.com"></iframe>
      <link rel="stylesheet" href="https://example.com/a.css">
      <p onclick="alert(1)" onMouseOver="alert(2)">Text</p>
      <a href=" javascript:alert(1)">Bad</a>
      <a href="https://example.com">Good</a>
      <img src="data:text/html,<script>alert(1)</script>" alt="">
      <img src="https://example.com/a.png" alt="">
    `);
    expect(document.querySelector('script, iframe, link')).toBeNull();
    const paragraph = document.querySelector('p');
    expect(paragraph?.getAttributeNames()).toEqual([]);
    expect(paragraph?.textContent).toBe('Text');
    const [bad, good] = document.querySelectorAll('a');
    expect(bad.hasAttribute('href')).toBe(false);
    expect(good.getAttribute('href')).toBe('https://example.com');
    const [badImage, goodImage] = document.querySelectorAll('img');
    expect(badImage.hasAttribute('src')).toBe(false);
    expect(goodImage.getAttribute('src')).toBe('https://example.com/a.png');
  });

  it('removes script URLs hidden behind encoded control characters', () => {
    const html = `
      <a href="&#1;javascript:alert(1)">Control</a>
      <a href="&#31; java&#9;script:alert(1)">Mixed</a>
      <a href="&#1;https://example.com">Safe</a>
    `;
    // The browser strips the controls, so these really are script URLs
    const raw = new DOMParser().parseFromString(html, 'text/html');
    expect(
      [...raw.querySelectorAll('a')].map((anchor) => anchor.protocol)
      // eslint-disable-next-line no-script-url -- Asserting the payload is a script URL
    ).toEqual(['javascript:', 'javascript:', 'https:']);
    const [control, mixed, safe] = importBody(html).querySelectorAll('a');
    expect(control.hasAttribute('href')).toBe(false);
    expect(mixed.hasAttribute('href')).toBe(false);
    expect(safe.hasAttribute('href')).toBe(true);
  });

  it('neutralizes mutation XSS payloads', () => {
    const { content } = importHtmlEmail(
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></p></noscript><svg><style><img src=x onerror=alert(2)></style></svg>'
    );
    expect(content).not.toMatch(/onerror/i);
  });

  it('keeps email layout attributes', () => {
    const document = importBody(`
      <body bgcolor="#eeeeee">
        <table role="presentation" align="center" width="600" cellpadding="0" cellspacing="0" border="0">
          <tbody><tr><td valign="top" data-id="cell">Hi</td></tr></tbody>
        </table>
      </body>
    `);
    expect(document.body.getAttribute('bgcolor')).toBe('#eeeeee');
    const table = document.querySelector('table');
    const tableAttributes = Object.fromEntries(
      table
        ?.getAttributeNames()
        .map((name) => [name, table.getAttribute(name)]) ?? []
    );
    expect(tableAttributes).toEqual({
      role: 'presentation',
      align: 'center',
      width: '600',
      cellpadding: '0',
      cellspacing: '0',
      border: '0',
    });
    const cell = document.querySelector('td');
    expect(cell?.getAttribute('valign')).toBe('top');
    expect(cell?.dataset.id).toBe('cell');
  });

  it('inlines style rules and removes the style elements', () => {
    const document = importBody(`
      <html><head><style>
        body { background-color: #eeeeee; }
        .title, h2 { color: red; font-size: 24px; }
      </style></head>
      <body><h1 class="title">Hi</h1><h2>There</h2><p>Plain</p></body></html>
    `);
    expect(document.querySelector('style')).toBeNull();
    expect(document.body.style.backgroundColor).toBe('rgb(238, 238, 238)');
    for (const heading of document.querySelectorAll<HTMLElement>('h1, h2')) {
      expect(heading.style.color).toBe('red');
      expect(heading.style.fontSize).toBe('24px');
    }
    expect(document.querySelector('p')?.hasAttribute('style')).toBe(false);
  });

  it('applies rules by specificity and source order, with inline styles winning', () => {
    const document = importBody(`
      <style>
        #a { color: blue; }
        p { color: red; padding: 4px; }
        p { color: green; }
        .b { margin: 0 auto; }
      </style>
      <p id="a">Id</p>
      <p>Order</p>
      <p class="b" style="padding: 8px; margin-top: 2px">Inline</p>
    `);
    const [id, order, inline] = document.querySelectorAll<HTMLElement>('p');
    expect(id.style.color).toBe('blue');
    expect(order.style.color).toBe('green');
    expect(inline.style.padding).toBe('8px');
    expect(inline.style.marginTop).toBe('2px');
    expect(inline.style.marginBottom).toBe('0px');
    expect(inline.style.marginLeft).toBe('auto');
  });

  it('lets important rules override inline styles', () => {
    const document = importBody(`
      <style>p { color: red !important; }</style>
      <p style="color: blue">Text</p>
    `);
    expect(document.querySelector('p')?.style.color).toBe('red');
  });

  it('keeps important inline styles over important rules', () => {
    const document = importBody(`
      <style>p { color: red !important; }</style>
      <p style="color: blue !important">Text</p>
    `);
    expect(document.querySelector('p')?.style.color).toBe('blue');
  });

  it('splits selector lists without breaking commas inside parentheses, strings or escapes', () => {
    const document = importBody(String.raw`
      <style>
        :is(h1, h2), [data-tags="a,b"], [title="],"], .x\,y { color: red; }
      </style>
      <h1>One</h1><h2>Two</h2>
      <p data-tags="a,b">Tagged</p>
      <p title="],">Bracket</p>
      <p class="x,y">Escaped</p>
      <p>Plain</p>
    `);
    const styled = document.querySelectorAll<HTMLElement>(
      'h1, h2, p:not(:last-child)'
    );
    expect(styled).toHaveLength(5);
    for (const element of styled) expect(element.style.color).toBe('red');
    expect(document.querySelector('p:last-child')?.hasAttribute('style')).toBe(
      false
    );
  });

  it.each(['', 'all', 'SCREEN', 'screen, print'])(
    'inlines style elements with media "%s"',
    (media) => {
      const document = importBody(`
        <style media="${media}">p { color: red; }</style>
        <p>Text</p>
      `);
      expect(document.querySelector('style')).toBeNull();
      expect(document.querySelector('p')?.style.color).toBe('red');
    }
  );

  it.each([
    'print',
    'screen and (max-width: 600px)',
    '(prefers-color-scheme: dark)',
  ])('drops style elements with media "%s"', (media) => {
    const document = importBody(`
      <style media="${media}">p { display: none; }</style>
      <p>Text</p>
    `);
    expect(document.querySelector('style')).toBeNull();
    expect(document.querySelector('p')?.hasAttribute('style')).toBe(false);
  });

  it('skips selectors that cannot be queried and inlines the rest', () => {
    const document = importBody(`
      <style>
        @namespace svg url(http://www.w3.org/2000/svg);
        svg|a, p { color: red; }
        h1 { color: blue; }
      </style>
      <h1>Title</h1><p>Text</p>
    `);
    expect(document.querySelector('h1')?.style.color).toBe('blue');
    expect(document.querySelector('p')?.style.color).toBe('red');
  });

  it('drops rules that cannot be inlined', () => {
    const document = importBody(`
      <style>
        @media (max-width: 600px) { p { color: red; } }
        a:hover { color: blue; }
        p::first-line { color: green; }
        p:unknown-pseudo { color: pink; }
      </style>
      <p><a href="https://example.com">Link</a></p>
    `);
    expect(document.querySelector('style')).toBeNull();
    expect(document.querySelector('[style]')).toBeNull();
  });
});
