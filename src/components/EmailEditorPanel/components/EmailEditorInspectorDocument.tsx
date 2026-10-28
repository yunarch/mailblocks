/* eslint-disable max-lines */
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
import { useState } from 'react';

const PADDING_SIDES = new Set<KnownCssProperties>([
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
]);

const SIZE_UNITS = ['px', '%'] as const;

type InspectorDocumentContext = Parameters<
  NonNullable<InspectorDocumentProps['children']>
>[0];

type SizeUnit = (typeof SIZE_UNITS)[number];

/**
 * @param styles - The document theme styles.
 * @param classReference - The themed component, e.g. `body`.
 * @param prop - The CSS property to read.
 * @returns The theme input holding the value and its unit, when it is set.
 */
function getThemeInput(
  styles: PanelGroup[],
  classReference: KnownThemeComponents,
  prop: KnownCssProperties
) {
  for (const group of styles) {
    const input = group.inputs.find(
      (item) => item.classReference === classReference && item.prop === prop
    );
    if (input?.value !== undefined && input.value !== '') return input;
  }
}

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
  return getThemeInput(styles, classReference, prop)?.value;
}

/**
 * @param input - The theme input of a size property.
 * @returns The size with its unit (e.g. `600px`, `100%`), or empty when not set.
 */
function formatSize(input?: { value?: string | number; unit?: string }) {
  if (input?.value === undefined) return '';
  return typeof input.value === 'number'
    ? `${String(input.value)}${input.unit ?? 'px'}`
    : input.value;
}

/**
 * @param size - A CSS size such as `600px` or `100%`, empty for auto.
 * @returns The number and unit of the size (`px` when it has no unit).
 */
function splitSize(size: string) {
  const match = /^(?<amount>\d+(?:\.\d+)?)\s*(?<unit>px|%)?$/.exec(size.trim());
  const unit = match?.groups?.unit as SizeUnit | undefined;
  return { amount: match?.groups?.amount ?? '', unit: unit ?? 'px' };
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
 * A size field styled like the inspector number inputs, with a px / % unit
 * picker. Emptying the number goes back to automatic sizing. The number is
 * applied on Enter or when leaving the field.
 *
 * @param props - The field state.
 * @param props.label - The visible field name.
 * @param props.value - The current size with its unit, empty for auto.
 * @param props.onCommit - Called with the new CSS size, or `undefined` for auto.
 * @returns The labelled size field.
 */
const SizeField = ({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string;
  onCommit: (value: string | undefined) => void;
}) => {
  const { amount, unit: storedUnit } = splitSize(value);
  const [pickedUnit, setPickedUnit] = useState<SizeUnit | null>(null);
  const unit = amount ? storedUnit : (pickedUnit ?? storedUnit);
  const commit = (input: HTMLInputElement) => {
    const typed = input.value.trim();
    if (typed === amount) return;
    if (typed === '') {
      onCommit(undefined);
      return;
    }
    if (Number.isNaN(Number(typed)) || Number(typed) < 0) {
      input.value = amount;
      return;
    }
    onCommit(`${String(Number(typed))}${unit}`);
  };
  return (
    <div data-re-inspector-prop-row="">
      <label data-re-inspector-label="">{label}</label>
      <div className="flex items-center gap-1">
        <span data-re-inspector-number="">
          <input
            key={value}
            data-re-inspector-input=""
            data-type="number"
            aria-label={label}
            type="text"
            inputMode="decimal"
            placeholder="auto"
            defaultValue={amount}
            className="max-w-14!"
            onBlur={(event) => {
              commit(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit(event.currentTarget);
              if (event.key === 'Escape') event.currentTarget.value = amount;
            }}
          />
        </span>
        <div
          data-re-inspector-toggle-group=""
          role="group"
          aria-label={`${label} unit`}
        >
          {SIZE_UNITS.map((option) => (
            <button
              key={option}
              type="button"
              data-re-inspector-toggle-item=""
              {...(option === unit ? { 'data-active': '' } : {})}
              aria-pressed={option === unit}
              title={option === 'px' ? 'Pixels' : 'Percentage'}
              className="text-xs"
              onClick={() => {
                if (option === unit) return;
                setPickedUnit(option);
                if (amount) onCommit(`${amount}${option}`);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Size of the container: width and height with their unit, emptied for auto.
 * Replaces the element Size section, which only supports pixels and shows a
 * default value when the size is not set.
 *
 * @param props - The theme styles and setter of the open email.
 * @param props.styles - The document theme styles.
 * @param props.setGlobalStyle - Updates a theme style.
 * @returns The container size section.
 */
const ContainerSize = ({
  styles,
  setGlobalStyle,
}: Pick<InspectorDocumentContext, 'styles' | 'setGlobalStyle'>) => {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div data-re-inspector-section="" data-has-title="">
      <div data-re-inspector-section-header="">
        <button
          type="button"
          data-re-inspector-section-toggle=""
          onClick={() => {
            setCollapsed((value) => !value);
          }}
        >
          <span data-re-inspector-text="">Size</span>
        </button>
      </div>
      {!collapsed && (
        <div data-re-inspector-section-body="">
          {(['width', 'height'] as const).map((prop) => (
            <SizeField
              key={prop}
              label={prop === 'width' ? 'Width' : 'Height'}
              value={formatSize(getThemeInput(styles, 'container', prop))}
              onCommit={(size) => {
                setGlobalStyle('container', prop, size);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

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
        <ContainerSize
          styles={context.styles}
          setGlobalStyle={context.setGlobalStyle}
        />
        <Inspector.Padding {...container} />
        <Inspector.Border {...container} />
      </Group>
    </>
  );
};
