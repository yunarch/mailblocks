const CRLF = '\r\n';
const BASE64_LINE_LENGTH = 76;
const MAX_ENCODED_WORD_BYTES = 39; // Keeps each RFC 2047 encoded word (and the `Subject:` line) within the line length limit.

/**
 * @param bytes - The bytes to encode.
 * @returns The bytes as base64.
 */
function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCodePoint(byte);
  return btoa(binary);
}

/**
 * @param content - The text to encode.
 * @returns The UTF-8 text as base64, wrapped to the MIME line length.
 */
function encodeBody(content: string): string {
  const normalized = content.replaceAll(/\r\n|\r|\n/g, CRLF);
  const encoded = toBase64(new TextEncoder().encode(normalized));
  const lines: string[] = [];
  for (let i = 0; i < encoded.length; i += BASE64_LINE_LENGTH) {
    lines.push(encoded.slice(i, i + BASE64_LINE_LENGTH));
  }
  return lines.join(CRLF);
}

/**
 * @param value - The header value to encode.
 * @returns The value as folded RFC 2047 encoded words, so any characters
 * survive in a header.
 */
function encodeHeaderValue(value: string): string {
  const encoder = new TextEncoder();
  const words: string[] = [];
  let chunk = '';
  for (const char of value) {
    const next = chunk + char;
    if (chunk && encoder.encode(next).byteLength > MAX_ENCODED_WORD_BYTES) {
      words.push(chunk);
      chunk = char;
    } else {
      chunk = next;
    }
  }
  words.push(chunk);
  return words
    .map((word) => `=?UTF-8?B?${toBase64(encoder.encode(word))}?=`)
    .join(`${CRLF} `);
}

/**
 * Builds an unsent email message (`.eml`) that mail clients such as Outlook
 * open as a ready-to-send draft.
 *
 * @param email - The subject, HTML and plain-text versions of the email.
 * @returns The message as a `multipart/alternative` MIME document.
 */
export function composeEmailDraft({
  subject,
  html,
  text,
}: {
  subject: string;
  html: string;
  text: string;
}): string {
  const boundary = `mailblocks-${crypto.randomUUID()}`;
  const part = (type: string, content: string) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset=UTF-8`,
      'Content-Transfer-Encoding: base64',
      '',
      encodeBody(content),
    ].join(CRLF);
  return [
    'X-Unsent: 1',
    ...(subject ? [`Subject: ${encodeHeaderValue(subject)}`] : []),
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative;${CRLF} boundary="${boundary}"`,
    '',
    part('text/plain', text),
    part('text/html', html),
    `--${boundary}--`,
    '',
  ].join(CRLF);
}
