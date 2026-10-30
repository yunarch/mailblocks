import { describe, expect, it } from 'vitest';
import { composeEmailDraft } from '../composeEmailDraft';

const decodeBase64 = (value: string) =>
  new TextDecoder().decode(
    Uint8Array.from(
      atob(value.replaceAll(/\s/g, '')),
      (char) => char.codePointAt(0) ?? 0
    )
  );

const getParts = (draft: string) => {
  const boundary = /boundary="(?<boundary>[^"]+)"/.exec(draft)?.groups
    ?.boundary;
  if (!boundary) throw new Error('The draft has no boundary');
  return draft
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((part) => {
      const [headers, body] = part.split('\r\n\r\n', 2);
      return { headers, body: decodeBase64(body) };
    });
};

describe('composeEmailDraft', () => {
  it('builds an unsent multipart message with plain-text and HTML parts', () => {
    const draft = composeEmailDraft({
      subject: 'Hello',
      html: '<p>Café ☕</p>',
      text: 'Café ☕',
    });
    const [headers] = draft.split('\r\n\r\n', 1);
    expect(headers.split('\r\n')).toEqual([
      'X-Unsent: 1',
      'Subject: =?UTF-8?B?SGVsbG8=?=',
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative;',
      expect.stringMatching(/^ boundary="mailblocks-[\w-]+"$/),
    ]);
    const parts = getParts(draft);
    expect(parts.map(({ headers: partHeaders }) => partHeaders)).toEqual([
      '\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64',
      '\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64',
    ]);
    expect(parts.map(({ body }) => body)).toEqual([
      'Café ☕',
      '<p>Café ☕</p>',
    ]);
    expect(draft.endsWith(`--\r\n`)).toBe(true);
  });

  it('keeps every line within the MIME length limit', () => {
    const draft = composeEmailDraft({
      subject: `Ünïcödé ${'very long subject '.repeat(10)}🎉`,
      html: `<p>${'x'.repeat(500)}</p>`,
      text: 'x'.repeat(500),
    });
    for (const line of draft.split('\r\n')) {
      expect(line.length).toBeLessThanOrEqual(78);
    }
    const subject = /^Subject: (?<value>.+?)\r\n(?! )/ms.exec(draft)?.groups
      ?.value;
    const decoded = [
      ...(subject ?? '').matchAll(/=\?UTF-8\?B\?(?<word>.+?)\?=/g),
    ]
      .map(({ groups }) => decodeBase64(groups?.word ?? ''))
      .join('');
    expect(decoded).toBe(`Ünïcödé ${'very long subject '.repeat(10)}🎉`);
  });

  it('omits the subject header when there is no subject', () => {
    expect(
      composeEmailDraft({ subject: '', html: '<p>Hi</p>', text: 'Hi' })
    ).not.toContain('Subject:');
  });

  it('uses CRLF line breaks in the decoded text parts', () => {
    const draft = composeEmailDraft({
      subject: 'Hi',
      html: '<p>a</p>\n<p>b</p>\r<p>c</p>\r\n',
      text: 'a\nb\rc\r\n',
    });
    expect(getParts(draft).map(({ body }) => body)).toEqual([
      'a\r\nb\r\nc\r\n',
      '<p>a</p>\r\n<p>b</p>\r\n<p>c</p>\r\n',
    ]);
  });
});
