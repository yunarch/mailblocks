/* eslint-disable max-lines */
import { EmailMark, EmailNode } from '@react-email/editor/core';
import type { Editor, JSONContent } from '@tiptap/core';
import {
  createElement,
  Fragment,
  isValidElement,
  type ComponentType,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Body,
  Button,
  CodeBlock,
  CodeInline,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email';

type SerializerPlugin = {
  getNodeStyles: (
    node: JSONContent,
    depth: number,
    editor: Editor
  ) => CSSProperties;
  BaseTemplate: ComponentType<{
    children?: ReactNode;
    editor: Editor;
    previewMode?: boolean;
  }>;
};

type SourceNode =
  | { kind: 'text'; value: string }
  | {
      kind: 'element';
      name: string;
      props: [string, unknown][];
      children: SourceNode[];
    };

type RenderMarkup = (element: ReactElement) => string;

// React Email components kept as-is in the generated source, by name.
const REACT_EMAIL_COMPONENTS = new Map<unknown, string>(
  Object.entries({
    Body,
    Button,
    CodeBlock,
    CodeInline,
    Column,
    Container,
    Font,
    Head,
    Heading,
    Hr,
    Html,
    Img,
    Link,
    Preview,
    Row,
    Section,
    Text,
  }).map(([name, component]) => [component, name])
);
const NODES_WITH_INCREMENTED_CHILD_DEPTH = new Set([
  'bulletList',
  'orderedList',
]);
const FORWARD_REF = Symbol.for('react.forward_ref');
const MEMO = Symbol.for('react.memo');
const MAX_LINE_LENGTH = 80;
const INDENT = '  ';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const SAFE_JSX_TEXT = /^[^\s{}<>&]$|^[^\s{}<>&][^{}<>&\n\r]*[^\s{}<>&]$/;

// Mirrors the editor's default base template, used when no theming plugin provides one.
const FallbackBaseTemplate = ({ children }: { children?: ReactNode }) =>
  createElement(
    Html,
    null,
    createElement(
      Head,
      null,
      createElement('meta', {
        content: 'width=device-width',
        name: 'viewport',
      }),
      createElement('meta', {
        content: 'IE=edge',
        httpEquiv: 'X-UA-Compatible',
      }),
      createElement('meta', { name: 'x-apple-disable-message-reformatting' }),
      createElement('meta', {
        content: 'telephone=no,address=no,email=no,date=no,url=no',
        name: 'format-detection',
      }),
      createElement(
        'style',
        null,
        '@media (prefers-color-scheme: dark){li::marker{color:#c4c4c4}}'
      )
    ),
    createElement(Body, null, children)
  );

/**
 * Builds the same React element tree the editor renders when exporting HTML.
 *
 * @param editor - The editor instance.
 * @returns The React element of the whole email.
 */
function composeEmailElement(editor: Editor): ReactElement {
  const { extensions } = editor.extensionManager;
  const serializerPlugin = extensions
    .map(
      (extension) =>
        (extension.options as { serializerPlugin?: SerializerPlugin } | null)
          ?.serializerPlugin
    )
    .findLast((plugin): plugin is SerializerPlugin => Boolean(plugin));
  const extensionsByName = new Map(
    extensions.map((extension) => [extension.name, extension])
  );
  // Marks always come from the schema; `rank` is ProseMirror's internal mark order.
  const getMarkRank = (name: string) =>
    (editor.schema.marks[name] as unknown as { rank: number }).rank;

  const parseContent = (
    content: JSONContent[] | undefined,
    depth = 0
  ): ReactNode[] | undefined => {
    if (!content) return;
    // Drop the trailing empty paragraph the editor keeps for typing, like the HTML export.
    const nodes = content.filter((node, index, all) => {
      if (node.type !== 'paragraph' || node.content?.length) return true;
      if (index !== all.length - 1) return true;
      return all[index - 1]?.type === 'paragraph';
    });
    return nodes.map((node) => {
      const emailNode = extensionsByName.get(String(node.type));
      if (!(emailNode instanceof EmailNode)) return null;
      const style = serializerPlugin?.getNodeStyles(node, depth, editor) ?? {};
      const childDepth = NODES_WITH_INCREMENTED_CHILD_DEPTH.has(emailNode.name)
        ? depth + 1
        : depth;
      const inlineWidth = /(?:^|;)\s*width\s*:\s*(?<width>[^;]+)/i.exec(
        String(node.attrs?.style ?? '')
      )?.groups?.width;
      const renderedNodeData =
        node.type === 'table' && inlineWidth && !node.attrs?.width
          ? { ...node, attrs: { ...node.attrs, width: inlineWidth.trim() } }
          : node;
      let rendered: ReactNode =
        node.text ??
        createElement(
          emailNode.config.renderToReactEmail,
          { node: renderedNodeData, style, extension: emailNode },
          parseContent(node.content, childDepth)
        );
      const marks = (node.marks ?? []).toSorted(
        (a, b) => getMarkRank(b.type) - getMarkRank(a.type)
      );
      for (const mark of marks) {
        const emailMark = extensionsByName.get(mark.type);
        if (!(emailMark instanceof EmailMark)) continue;
        rendered = createElement(
          emailMark.config.renderToReactEmail,
          {
            mark,
            node,
            extension: emailMark,
            style:
              serializerPlugin?.getNodeStyles(
                { type: mark.type, attrs: mark.attrs ?? {} },
                depth,
                editor
              ) ?? {},
          },
          rendered
        );
      }
      return rendered;
    });
  };

  return createElement(
    serializerPlugin?.BaseTemplate ?? FallbackBaseTemplate,
    { editor, previewMode: false },
    parseContent(editor.getJSON().content)
  );
}

/**
 * @param type - The component to render.
 * @param props - The props to render it with.
 * @returns What the component renders, or `undefined` when it can't be
 * rendered outside React.
 */
function renderComponent(
  type: unknown,
  props: Record<string, unknown>
): ReactNode | undefined {
  const exotic = type as {
    $$typeof?: symbol;
    render?: (props: unknown, ref: null) => ReactNode;
    type?: unknown;
  };
  if (typeof type === 'function') {
    return (type as (props: unknown) => ReactNode)(props);
  }
  if (exotic.$$typeof === FORWARD_REF && exotic.render) {
    return exotic.render(props, null);
  }
  if (exotic.$$typeof === MEMO) {
    return createElement(exotic.type as ComponentType, props);
  }
  return undefined;
}

/**
 * Renders the editor's own wrapper components until the node is a React Email
 * component, an HTML element, or plain content.
 *
 * @param node - The React node to expand.
 * @returns The expanded node.
 * @throws {Error} When the node has an element type that can't be expanded.
 */
function expandNode(node: ReactNode): ReactNode {
  let current = node;
  while (
    isValidElement<Record<string, unknown>>(current) &&
    typeof current.type !== 'string' &&
    current.type !== Fragment &&
    !REACT_EMAIL_COMPONENTS.has(current.type)
  ) {
    const rendered = renderComponent(current.type, current.props);
    if (rendered === undefined) {
      throw new Error('The email contains content that cannot be exported');
    }
    current = rendered;
  }
  return current;
}

/**
 * @param value - The value to check.
 * @returns Whether the value is a plain object, such as a `style` prop.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param props - The element props.
 * @returns The props, and the entries of object props, without `undefined` values.
 */
function withoutUndefined(
  props: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(props).flatMap(([key, value]): [string, unknown][] => {
      if (value === undefined) return [];
      return [[key, isPlainObject(value) ? withoutUndefined(value) : value]];
    })
  );
}

/**
 * React Email components set defaults (e.g. `Section` is centered and
 * `Container` has a `maxWidth`) that an explicit `undefined` removes, so those
 * `undefined` props and style entries must be kept.
 *
 * @param type - The React Email component.
 * @param props - The props it is rendered with, without children.
 * @param renderMarkup - Renders an element to static markup.
 * @returns The props without the `undefined` values that don't change the output.
 */
function getEffectiveProps(
  type: ComponentType,
  props: Record<string, unknown>,
  renderMarkup: RenderMarkup
): Record<string, unknown> {
  const markup = (candidate: Record<string, unknown>) =>
    renderMarkup(createElement(type, candidate));
  const expected = markup(props);
  let effective = { ...props };
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) {
      const { [key]: _, ...rest } = effective;
      if (markup(rest) === expected) effective = rest;
    } else if (isPlainObject(value)) {
      for (const [entryKey, entry] of Object.entries(value)) {
        if (entry !== undefined) continue;
        const current = effective[key] as Record<string, unknown>;
        const { [entryKey]: _, ...rest } = current;
        if (markup({ ...effective, [key]: rest }) === expected) {
          effective[key] = rest;
        }
      }
    }
  }
  return effective;
}

/**
 * Converts a React node into source nodes made only of React Email
 * components, HTML elements and text.
 *
 * @param node - The React node to convert.
 * @param imports - Collects the React Email components used.
 * @param renderMarkup - Renders an element to static markup.
 * @returns The flattened source nodes.
 * @throws {Error} When the tree contains content that can't be converted.
 */
function toSourceNodes(
  node: ReactNode,
  imports: Set<string>,
  renderMarkup: RenderMarkup
): SourceNode[] {
  const expanded = expandNode(node);
  if (
    expanded === null ||
    expanded === undefined ||
    typeof expanded === 'boolean'
  ) {
    return [];
  }
  if (
    typeof expanded === 'string' ||
    typeof expanded === 'number' ||
    typeof expanded === 'bigint'
  ) {
    const value = String(expanded);
    return value ? [{ kind: 'text', value }] : [];
  }
  if (Array.isArray(expanded)) {
    return (expanded as ReactNode[]).flatMap((child) =>
      toSourceNodes(child, imports, renderMarkup)
    );
  }
  if (!isValidElement<Record<string, unknown>>(expanded)) {
    throw new Error('The email contains content that cannot be exported');
  }
  const {
    type,
    props: { children: childNodes, ...props },
  } = expanded;
  const children = toSourceNodes(
    childNodes as ReactNode,
    imports,
    renderMarkup
  );
  if (type === Fragment) return children;
  const componentName = REACT_EMAIL_COMPONENTS.get(type);
  if (componentName) imports.add(componentName);
  return [
    {
      kind: 'element',
      name: componentName ?? (type as string),
      props: Object.entries(
        componentName
          ? getEffectiveProps(type as ComponentType, props, renderMarkup)
          : withoutUndefined(props)
      ),
      children,
    },
  ];
}

/**
 * @param value - The string to quote.
 * @returns The string as a single-quoted JavaScript literal.
 */
function quote(value: string): string {
  return `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", String.raw`\'`)
    .replaceAll('\n', String.raw`\n`)
    .replaceAll('\r', String.raw`\r`)
    .replaceAll('\u{2028}', String.raw`\u2028`)
    .replaceAll('\u{2029}', String.raw`\u2029`)}'`;
}

/**
 * @param value - The value to print.
 * @param indent - The indentation of the line the value starts on.
 * @param multiline - Whether objects with several keys are printed one key per line.
 * @returns The value as a JavaScript expression.
 */
function printValue(
  value: unknown,
  indent: string,
  multiline: boolean
): string {
  if (typeof value === 'string') return quote(value);
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => printValue(item, indent, false)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(
      ([, entry]) => typeof entry !== 'function'
    );
    if (entries.length === 0) return '{}';
    const inner = indent + INDENT;
    const printed = entries.map(
      ([key, entry]) =>
        `${IDENTIFIER.test(key) ? key : quote(key)}: ${printValue(entry, inner, multiline)}`
    );
    return multiline && entries.length > 1
      ? `{\n${printed.map((entry) => `${inner}${entry},`).join('\n')}\n${indent}}`
      : `{ ${printed.join(', ')} }`;
  }
  return 'undefined';
}

/**
 * @param props - The element props.
 * @param indent - The indentation of the line each prop starts on.
 * @param multiline - Whether object values are printed one key per line.
 * @returns Each printable prop as a JSX attribute.
 */
function printProps(
  props: [string, unknown][],
  indent: string,
  multiline: boolean
): string[] {
  return props.flatMap(([key, value]) => {
    if (
      key === 'key' ||
      key === 'ref' ||
      value === null ||
      typeof value === 'function' ||
      typeof value === 'symbol' ||
      (key === 'style' &&
        isPlainObject(value) &&
        Object.keys(value).length === 0)
    ) {
      return [];
    }
    if (value === true) return [key];
    if (typeof value === 'string' && !/["&\n\r\\]/.test(value)) {
      return [`${key}="${value}"`];
    }
    return [`${key}={${printValue(value, indent, multiline)}}`];
  });
}

/**
 * @param value - The text content.
 * @returns The text as JSX children, wrapped in an expression when it would
 * otherwise be altered or misread by the JSX parser.
 */
function printText(value: string): string {
  return SAFE_JSX_TEXT.test(value) ? value : `{${quote(value)}}`;
}

/**
 * @param node - The source node to print.
 * @param indent - The indentation of the node.
 * @returns The JSX lines of the node.
 */
function printNode(node: SourceNode, indent: string): string[] {
  if (node.kind === 'text') return [indent + printText(node.value)];
  const { name, children } = node;
  const inlineProps = printProps(node.props, indent, false);
  const inlineOpening = `<${[name, ...inlineProps].join(' ')}`;
  const fitsInline =
    !inlineOpening.includes('\n') &&
    indent.length + inlineOpening.length + 2 <= MAX_LINE_LENGTH;
  const opening = fitsInline
    ? [indent + inlineOpening]
    : [
        `${indent}<${name}`,
        ...printProps(node.props, indent + INDENT, true).map(
          (prop) => indent + INDENT + prop
        ),
      ];
  if (children.length === 0) {
    return fitsInline ? [`${opening[0]} />`] : [...opening, `${indent}/>`];
  }
  const [onlyChild] = children;
  if (fitsInline && children.length === 1 && onlyChild.kind === 'text') {
    const line = `${opening[0]}>${printText(onlyChild.value)}</${name}>`;
    if (line.length <= MAX_LINE_LENGTH) return [line];
  }
  return [
    ...(fitsInline ? [`${opening[0]}>`] : [...opening, `${indent}>`]),
    ...children.flatMap((child, index) =>
      // JSX would join adjacent text lines into a single string
      child.kind === 'text' && children[index - 1]?.kind === 'text'
        ? [`${indent + INDENT}{${quote(child.value)}}`]
        : printNode(child, indent + INDENT)
    ),
    `${indent}</${name}>`,
  ];
}

/**
 * Generates the React Email source code of the email in the editor.
 *
 * @param editor - The editor instance.
 * @returns A TSX module exporting the email as a React Email component.
 */
export function composeReactEmailSource(editor: Editor) {
  const email = composeEmailElement(editor);
  const imports = new Set<string>();
  const nodes = toSourceNodes(email, imports, renderToStaticMarkup);
  const body = nodes.flatMap((node) => printNode(node, INDENT.repeat(3)));
  return [
    `import { ${[...imports].toSorted((a, b) => a.localeCompare(b)).join(', ')} } from 'react-email';`,
    '',
    'export default function Email() {',
    `${INDENT}return (`,
    ...body,
    `${INDENT});`,
    '}',
    '',
  ].join('\n');
}
