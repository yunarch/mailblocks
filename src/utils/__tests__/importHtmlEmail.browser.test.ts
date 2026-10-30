import { describe, expect, it } from 'vitest';
import { getSelectorSpecificity, importHtmlEmail } from '../importHtmlEmail';

const importBody = (html: string, fileName = 'email.html') => {
  const { content } = importHtmlEmail(html, fileName);
  return new DOMParser().parseFromString(content, 'text/html');
};

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
