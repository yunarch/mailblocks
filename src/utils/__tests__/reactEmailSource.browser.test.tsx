import { composeReactEmail } from '@react-email/editor/core';
import type { Editor } from '@tiptap/core';
import { createElement, type ComponentType } from 'react';
import * as ReactEmail from 'react-email';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { renderEditorPanel } from '@/__tests__/test-utils';
import { composeReactEmailSource } from '@/utils/reactEmailSource';

/**
 * Compiles the generated module and returns its default export.
 *
 * @param source - The generated React Email source.
 * @returns The email component.
 */
function compileEmail(source: string): ComponentType {
  const [importLine, ...rest] = source.split('\n');
  const names = /\{(?<names>[^}]*)\}/.exec(importLine)?.groups?.names ?? '';
  const { outputText, diagnostics } = ts.transpileModule(
    `${rest.join('\n').replace('export default function', 'function')}\nreturn Email;`,
    {
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: 'email.tsx',
    }
  );
  expect(diagnostics ?? []).toEqual([]);
  const componentNames = names.split(',').map((name) => name.trim());
  // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval -- evaluates the generated source under test
  const factory = new Function('React', ...componentNames, outputText) as (
    ...args: unknown[]
  ) => ComponentType;
  return factory(
    { createElement },
    ...componentNames.map(
      (name) => (ReactEmail as Record<string, unknown>)[name]
    )
  );
}

/**
 * @param editor - The editor instance.
 * @returns The HTML rendered from the generated source and the HTML exported
 * by the editor.
 */
async function renderBoth(editor: Editor) {
  const Email = compileEmail(composeReactEmailSource(editor));
  const [actual, expected] = await Promise.all([
    ReactEmail.render(createElement(Email)),
    composeReactEmail({ editor }),
  ]);
  return { actual, expected: expected.unformattedHtml };
}

describe('composeReactEmailSource', () => {
  it('generates a React Email module', async () => {
    const { editor } = await renderEditorPanel(
      '<h1>Title</h1><p>Hello <strong>{{name}}</strong> &amp; <a href="https://example.com/?a=1&b=2">friends</a> <x></p>'
    );
    const source = composeReactEmailSource(editor);
    expect(source).toMatch(
      /^import \{ [^}]*\bBody\b[^}]*\bHtml\b[^}]*\} from 'react-email';\n/
    );
    expect(source).toContain('export default function Email() {');
    expect(source).toContain("{'{{name}}'}");
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toBe(expected);
  });

  it('renders the same HTML as the editor export for every kind of block', async () => {
    const { editor } = await renderEditorPanel(`
      <section data-type="section" style="padding:32px 24px;text-align:center">
        <h1 style="text-align:center">Welcome, {{name}}</h1>
        <p>Text with <strong>bold</strong>, <em>italic</em>, <u>underline</u>, <s>strike</s>, <code>code</code> and <a href="https://example.com/?a=1&amp;b=2" target="_blank">a "link"</a> &lt;3 } and {</p>
        <a data-id="react-email-button" href="https://example.com" data-href="https://example.com" alignment="center" style="background-color:#111827;color:#ffffff;padding:12px 24px">Get started</a>
      </section>
      <div data-type="two-columns" style="padding:12px 24px">
        <div data-type="column" style="width:64px"><a href="https://example.com"><img src="https://example.com/logo.png" alt="Logo" width="40"></a></div>
        <div data-type="column"><h3>Feature</h3><p>Describe it.</p></div>
      </div>
      <hr style="border-top:2px solid #111827">
      <table align="center" style="width:300px"><tbody><tr><td style="padding:0 8px">Cell 1</td><td>Cell 2</td></tr></tbody></table>
      <ul><li><p>First</p></li><li><p>Second</p><ol><li><p>Nested</p></li></ol></li></ul>
      <blockquote><p>Quoted text</p></blockquote>
      <pre><code class="language-ts">const a = '} {';</code></pre>
      <p>Line one<br>Line two</p>
    `);
    const source = composeReactEmailSource(editor);
    for (const component of [
      'Button',
      'CodeBlock',
      'Column',
      'Heading',
      'Hr',
      'Row',
      'Section',
    ]) {
      expect(source).toContain(`<${component}`);
    }
    expect(source).toContain('align={undefined}');
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toBe(expected);
  });
});
