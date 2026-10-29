import { describe, expect, it } from 'vitest';
import type { LintingRow } from '@/types/linter';
import { lintEmailMarkup } from '../lintEmailMarkup';

const details = (row: LintingRow | undefined) =>
  row?.result.checks.map((check) => check.metadata?.detail);

describe('lintEmailMarkup', () => {
  it('passes valid, accessible links and images', () => {
    expect(
      lintEmailMarkup(`
        <a href="https://example.com">Text</a>
        <a href="https://example.com" aria-label="Label"></a>
        <a href="https://example.com" title="Title"></a>
        <a href="https://example.com"><img src="https://example.com/a.png" alt="Logo" width="20"></a>
        <a href="#top">Anchor</a>
        <a href="mailto:hi@example.com">Mail</a>
        <a href="{{unsubscribe_url}}">Merge tag</a>
        <img src="https://example.com/b.png" alt="" width="20">
      `)
    ).toEqual([]);
  });

  it('reports a link without href or accessible text at its location', () => {
    expect(lintEmailMarkup('<p>Hi</p>\n<a></a>')).toEqual([
      {
        source: 'link',
        result: {
          status: 'error',
          link: '(missing href)',
          codeLocation: { line: 2, column: 0 },
          checks: [
            {
              passed: false,
              type: 'syntax',
              metadata: { detail: 'Missing href' },
            },
            {
              passed: false,
              type: 'accessibility',
              metadata: {
                detail: 'Link has no text, add text or image alt text',
              },
            },
          ],
        },
      },
    ]);
  });

  it.each([
    [
      '/relative',
      'error',
      'Relative URLs do not work in email, use an absolute https:// URL',
    ],
    ['https://[invalid', 'error', 'Invalid URL syntax'],
    /* eslint-disable no-script-url -- Input for blocked URL detection, never executed. */
    [
      'javascript:alert(1)',
      'error',
      'javascript: URLs are blocked by email clients',
    ],
    /* eslint-enable no-script-url */
    [
      'blob:https://example.com/id',
      'error',
      'Temporary blob: URL only available in this browser',
    ],
    ['mailto:nobody', 'error', 'Invalid mailto address'],
    // eslint-disable-next-line unicorn/prefer-https -- HTTP is the input under test.
    ['http://example.com', 'warning', 'Use HTTPS instead of HTTP'],
  ])('reports link %s as %s', (href, status, detail) => {
    const [row] = lintEmailMarkup(`<a href="${href}">Open</a>`);
    expect(row.result.status).toBe(status);
    expect(details(row)).toEqual([detail]);
  });

  it('combines every problem found on a single URL', () => {
    const [row] = lintEmailMarkup('<a href="http://localhost">Local</a>');
    expect(details(row)).toEqual([
      'Local URLs will not work for recipients',
      'Use HTTPS instead of HTTP',
    ]);
  });

  it('reports an image without source, alt text, or width', () => {
    expect(lintEmailMarkup('<img>')).toEqual([
      {
        source: 'image',
        result: {
          status: 'error',
          source: '(missing source)',
          codeLocation: { line: 1, column: 0 },
          checks: [
            {
              passed: false,
              type: 'syntax',
              metadata: { detail: 'Missing image source' },
            },
            {
              passed: false,
              type: 'accessibility',
              metadata: { detail: 'Missing alt text' },
            },
            {
              passed: false,
              type: 'email_best_practice',
              metadata: {
                detail:
                  'Missing width attribute, Outlook ignores CSS width and shows the image at full size',
              },
            },
          ],
        },
      },
    ]);
  });

  it.each([
    [
      'blob:https://example.com/id',
      'error',
      'Temporary image only available in this browser, host it on a public URL',
    ],
    ['https://[invalid', 'error', 'Invalid image source'],
    [
      'https://localhost/a.png',
      'warning',
      'Local images will not work for recipients',
    ],
  ])('reports image source %s as %s', (src, status, detail) => {
    const [row] = lintEmailMarkup(`<img src="${src}" alt="" width="20">`);
    expect(row.result.status).toBe(status);
    expect(details(row)).toEqual([detail]);
  });

  it.each([
    ['data:image/png;base64,YQ==', 1],
    ['data:image/png;base64,YWI=', 2],
    ['data:image/png;base64,YWJj', 3],
    ['data:image/svg+xml,%C3%A9', 2],
    ['data:image/svg+xml,%ZZ', 3],
  ])('reports the decoded size of embedded image %s', (src, byteCount) => {
    const [row] = lintEmailMarkup(`<img src="${src}" alt="" width="20">`);
    expect(row.result.status).toBe('warning');
    expect(row.result.checks).toEqual([
      expect.objectContaining({
        metadata: expect.objectContaining({ byteCount }),
      }),
    ]);
  });

  it.each([
    [
      '<script>void 0</script>',
      'script',
      'Scripts are not supported in email clients',
    ],
    ['<form></form>', 'form', 'Forms have poor support across email clients'],
    [
      '<link rel="stylesheet" href="https://example.com/a.css">',
      'external stylesheet',
      'External stylesheets are not reliable in email clients',
    ],
  ])('reports unsupported %s markup', (markup, label, detail) => {
    expect(lintEmailMarkup(`<p>Hi</p>\n${markup}`)).toEqual([
      {
        source: 'markup',
        result: {
          status: 'warning',
          label,
          codeLocation: { line: 2, column: 0 },
          checks: [
            {
              passed: false,
              type: 'email_best_practice',
              metadata: { detail },
            },
          ],
        },
      },
    ]);
  });

  it('warns only when the UTF-8 size exceeds the Gmail clipping limit', () => {
    expect(lintEmailMarkup('x'.repeat(102_400))).toEqual([]);
    const [row] = lintEmailMarkup(`<html>${'\u{E9}'.repeat(51_198)}`);
    expect(row.result).toMatchObject({ label: 'html size', status: 'warning' });
    expect(details(row)).toEqual([
      'HTML is 100.0 kB, Gmail clips messages over 100.0 kB',
    ]);
  });

  it('removes duplicate rows and lists errors before warnings', () => {
    const rows = lintEmailMarkup(
      // eslint-disable-next-line unicorn/prefer-https -- HTTP is the input under test.
      '<a href="http://a.com">A</a><a href="http://a.com">A</a><img>'
    );
    expect(rows.map((row) => [row.source, row.result.status])).toEqual([
      ['image', 'error'],
      ['link', 'warning'],
    ]);
  });
});
