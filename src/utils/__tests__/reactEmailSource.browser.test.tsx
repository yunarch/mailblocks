/* eslint-disable unicorn/consistent-function-scoping */
import { composeReactEmail, EmailNode } from '@react-email/editor/core';
import { StarterKit } from '@react-email/editor/extensions';
import {
  Editor,
  Mark,
  Node,
  type Extensions,
  type JSONContent,
} from '@tiptap/core';
import {
  createContext,
  createElement,
  forwardRef,
  Fragment,
  lazy,
  memo,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from 'react';
import * as ReactEmail from 'react-email';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
import { renderEditorPanel } from '@/__tests__/test-utils';
import { composeReactEmailSource } from '@/utils/reactEmailSource';

const editors: Editor[] = [];

/**
 * @param html - The HTML string to split.
 * @returns An array of HTML tags and text nodes.
 */
function splitTags(html: string) {
  return html.split(/(?=<)/);
}

/**
 * Creates an editor outside the app, without the theming plugin.
 *
 * @param content - The document content.
 * @param extensions - Extensions added to the starter kit.
 * @returns The editor instance.
 */
function createEditor(content: JSONContent[], extensions: Extensions = []) {
  const editor = new Editor({
    extensions: [StarterKit, ...extensions],
    content: { type: 'doc', content },
  });
  editors.push(editor);
  return editor;
}

/**
 * @param render - What the block renders in the email.
 * @returns A block node that renders the given content.
 */
function createBlock(render: () => ReactNode) {
  return EmailNode.create({
    name: 'customBlock',
    group: 'block',
    atom: true,
    renderHTML: () => ['div'],
    renderToReactEmail: render,
  });
}

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
  const Email = compileEmail(await composeReactEmailSource(editor));
  const [actual, expected] = await Promise.all([
    ReactEmail.render(createElement(Email)),
    composeReactEmail({ editor }),
  ]);
  return {
    actual: splitTags(actual),
    expected: splitTags(expected.unformattedHtml),
  };
}

// Tests
afterEach(() => {
  for (const editor of editors) editor.destroy();
  editors.length = 0;
});

describe('composeReactEmailSource', () => {
  it('generates a React Email module', async () => {
    const { editor } = await renderEditorPanel(
      '<h1>Title</h1><p>Hello <strong>{{name}}</strong> &amp; <a href="https://example.com/?a=1&b=2">friends</a> <x></p>'
    );
    const source = await composeReactEmailSource(editor);
    expect(source).toMatch(
      /^import \{ [^}]*\bBody\b[^}]*\bHtml\b[^}]*\} from 'react-email';\n/
    );
    expect(source).toContain('export default function Email() {');
    expect(source).toContain("{'{{name}}'}");
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toEqual(expected);
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
    const source = await composeReactEmailSource(editor);
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
    expect(actual).toEqual(expected);
  });
});

describe('composeReactEmailSource without the app', () => {
  const paragraph = (...content: JSONContent[]): JSONContent => ({
    type: 'paragraph',
    content,
  });
  const text = (value: string, ...marks: string[]): JSONContent => ({
    type: 'text',
    text: value,
    marks: marks.map((type) => ({ type })),
  });

  it('uses the default base template when there is no theme', async () => {
    const editor = createEditor([
      paragraph(),
      paragraph(text('Bold and italic', 'bold', 'italic')),
      paragraph(),
    ]);
    const source = await composeReactEmailSource(editor);
    expect(source).toContain('name="x-apple-disable-message-reformatting"');
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toEqual(expected);
  });

  it('skips nodes and marks that cannot render to React Email', async () => {
    const plainNode = Node.create({
      name: 'plainNode',
      group: 'block',
      atom: true,
      renderHTML: () => ['div'],
    });
    const plainMark = Mark.create({
      name: 'plainMark',
      renderHTML: () => ['span', 0],
    });
    const editor = createEditor(
      [{ type: 'plainNode' }, paragraph(text('Kept', 'plainMark'))],
      [plainNode, plainMark]
    );
    const source = await composeReactEmailSource(editor);
    expect(source).toContain('Kept');
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toEqual(expected);
  });

  it('prints every kind of rendered content and prop', async () => {
    const MemoBox = memo(({ children }: { children?: ReactNode }) =>
      createElement('div', null, children)
    );
    // Third-party components may still use `forwardRef`
    // eslint-disable-next-line react/no-forward-ref
    const RefBox = forwardRef<HTMLSpanElement, { style: CSSProperties }>(
      (props, ref) => createElement('span', { ...props, ref })
    );
    const LazyBox = lazy(() =>
      Promise.resolve({
        default: ({ title }: { title: string }) =>
          createElement('p', { title }, 'Lazy'),
      })
    );
    const editor = createEditor(
      [{ type: 'customBlock' }],
      [
        createBlock(() =>
          createElement(
            MemoBox,
            null,
            createElement(Fragment, null, 'Hello', ' ', 'world'),
            '',
            0,
            createElement('input', {
              'data-list': ['a', 1],
              'data-empty': {},
              'data-config': { name: 'x', count: 1 },
              disabled: true,
              hidden: false,
              'aria-checked': false,
              style: { '--brand': 'red', color: 'red' },
            }),
            createElement(RefBox, { style: {} }),
            createElement(LazyBox, { title: 'Loaded' })
          )
        ),
      ]
    );
    const source = await composeReactEmailSource(editor);
    expect(source).toMatch(/\sdisabled(?:\s|$)/m);
    expect(source).toContain("'--brand': 'red'");
    expect(source).toContain("data-list={['a', 1]}");
    expect(source).toContain('data-empty={{}}');
    expect(source).toContain('hidden={false}');
    expect(source).toContain('aria-checked={false}');
    expect(source).toContain('<span />');
    expect(source).toContain('<p title="Loaded">');
    const { actual, expected } = await renderBoth(editor);
    expect(actual).toEqual(expected);
  });

  it.each([
    ['a context provider', () => createElement(createContext(null), null)],
    ['a promise', () => Promise.resolve('Later') as unknown as ReactNode],
  ])('fails on content it cannot export, such as %s', async (_, render) => {
    const editor = createEditor(
      [{ type: 'customBlock' }],
      [createBlock(render)]
    );
    await expect(composeReactEmailSource(editor)).rejects.toThrow(
      'The email contains content that cannot be exported'
    );
  });
});
