import type {
  KnownCssProperties,
  KnownThemeComponents,
  PanelGroup,
} from '@react-email/editor/plugins';
import {
  Inspector,
  type InspectorDocumentProps,
  type InspectorNodeContext,
} from '@react-email/editor/ui';

type InspectorDocumentContext = Parameters<
  NonNullable<InspectorDocumentProps['children']>
>[0];

const PADDING_SIDES = new Set<KnownCssProperties>([
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
]);

/**
 * @param styles - The document theme styles.
 * @param classReference - The themed component, e.g. `body`.
 * @param prop - The CSS property to read.
 * @returns The value set in the theme, or `undefined` when it is not set.
 */
function getThemeValue(
  styles: PanelGroup[],
  classReference: KnownThemeComponents,
  prop: KnownCssProperties
) {
  for (const group of styles) {
    const input = group.inputs.find(
      (item) => item.classReference === classReference && item.prop === prop
    );
    if (input?.value !== undefined && input.value !== '') return input.value;
  }
}

/**
 * Attribute setter for the page and container, which only have theme styles.
 *
 * @returns Nothing, attributes are not stored for the page or container.
 */
function ignoreAttribute() {
  return null;
}

/**
 * Adapts the document theme to the context of the element inspector sections,
 * so the page (body) and container get the same controls as elements, such as
 * per-side padding.
 *
 * @param context - The document inspector context.
 * @param classReference - The themed component edited by the sections.
 * @returns A section context reading and writing the theme styles.
 */
function createThemeSectionContext(
  context: InspectorDocumentContext,
  classReference: Extract<KnownThemeComponents, 'body' | 'container'>
): InspectorNodeContext {
  const { styles, findStyleValue, setGlobalStyle, batchSetGlobalStyle } =
    context;
  return {
    nodeType: classReference,
    nodePos: { pos: -1, inside: -1 },
    getStyle: (prop) => {
      if (!PADDING_SIDES.has(prop)) return findStyleValue(classReference, prop);
      // A side falls back to the `padding` shorthand when it is not set on its own
      return (
        getThemeValue(styles, classReference, prop) ??
        getThemeValue(styles, classReference, 'padding') ??
        0
      );
    },
    setStyle: (prop, value) => {
      setGlobalStyle(classReference, prop, value);
    },
    batchSetStyle: (changes) => {
      const setsPadding = changes.some(({ prop }) => PADDING_SIDES.has(prop));
      batchSetGlobalStyle([
        ...changes.map(({ prop, value }) => ({
          classReference,
          property: prop,
          value,
        })),
        // Per-side values replace the shorthand, so they don't conflict
        ...(setsPadding
          ? [{ classReference, property: 'padding' as const, value: undefined }]
          : []),
      ]);
    },
    // Page and container are styled through the theme only, they have no attributes
    getAttr: () => null,
    setAttr: ignoreAttribute,
    themeDefaults: {},
    presetColors: [],
  };
}

/**
 * @param props - The group content.
 * @param props.title - The group heading.
 * @param props.children - The inspector sections of the group.
 * @returns A titled group of inspector sections.
 */
const Group = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="border-b border-gray-200 pb-2 last:border-b-0 dark:border-white/10">
    <p className="pt-3 text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-neutral-500">
      {title}
    </p>
    {children}
  </div>
);

/**
 * Document inspector (shown when the body is selected): the page and the
 * container use the same sections as elements, including per-side padding.
 *
 * @param context - The theme styles and setters of the open email.
 * @returns The "Page" and "Container" groups of sections.
 */
export const EmailEditorInspectorDocument = (
  context: InspectorDocumentContext
) => {
  const page = createThemeSectionContext(context, 'body');
  const container = createThemeSectionContext(context, 'container');
  return (
    <>
      <Group title="Page">
        <Inspector.Background {...page} />
        <Inspector.Padding {...page} />
      </Group>
      <Group title="Container">
        <Inspector.Background {...container} />
        <Inspector.Size {...container} />
        <Inspector.Padding {...container} />
        <Inspector.Border {...container} />
      </Group>
    </>
  );
};
