import type { InspectorNodeContext } from '@react-email/editor/ui';
import type { Editor } from '@tiptap/core';
import { useState } from 'react';

// React Email `Hr` default line color, shown when the divider has no color of its own
const DEFAULT_COLOR = '#eaeaea';

const LINE_STYLES = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

/**
 * The color picker only accepts `#rrggbb` values.
 *
 * @param color - The CSS color value.
 * @returns The color as `#rrggbb`, or black when it is not a hex color.
 */
function toPickerColor(color: string) {
  if (/^#[\da-f]{6}$/i.test(color)) return color;
  if (/^#[\da-f]{3}$/i.test(color)) {
    return color.replaceAll(/[\da-f]/gi, (c) => c + c);
  }
  return '#000000';
}

/**
 * Updates inline styles of a node with an attribute step. The inspector updates
 * styles by replacing the node's markup, which for a leaf node like the divider
 * is a content replacement that the Divider extension rejects while the divider
 * is selected, so its style edits would be silently dropped.
 *
 * @param editor - The editor instance.
 * @param pos - The position of the node.
 * @param changes - The CSS properties (camelCase) and values to set, removed when empty.
 */
export function setNodeStyles(
  editor: Editor,
  pos: number,
  changes: [prop: string, value: string | number | undefined][]
) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const styles = new Map<string, string>();
  const declarations = String(node.attrs.style ?? '').split(';');
  for (const declaration of declarations) {
    const separator = declaration.indexOf(':');
    const key = declaration.slice(0, separator).trim();
    const value = declaration.slice(separator + 1).trim();
    if (separator !== -1 && key && value) styles.set(key, value);
  }
  for (const [prop, value] of changes) {
    const key = prop.replaceAll(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
    // Re-added at the end, so it overrides any shorthand set before it
    styles.delete(key);
    if (value === undefined || value === '') continue;
    styles.set(key, typeof value === 'number' ? `${String(value)}px` : value);
  }
  const style = [...styles].map(([key, value]) => `${key}:${value}`).join(';');
  editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, 'style', style));
}

/**
 * The color, thickness and style of the divider line. The line is the top
 * border of the `hr`, which the generic Border section can't edit since it
 * treats borders as a box around the element.
 *
 * @param props - The style accessors of the selected divider.
 * @returns The divider line section.
 */
export const EmailEditorInspectorDivider = ({
  getStyle,
  setStyle,
}: Pick<InspectorNodeContext, 'getStyle' | 'setStyle'>) => {
  const [collapsed, setCollapsed] = useState(false);
  const read = (prop: 'Color' | 'Width' | 'Style') => {
    const value = getStyle(`borderTop${prop}`) ?? getStyle(`border${prop}`);
    return value === undefined ? '' : String(value);
  };
  const color = read('Color') || DEFAULT_COLOR;
  const width = read('Width').replace(/px$/, '');
  const lineStyle = read('Style') || 'solid';
  const [draftWidth, setDraftWidth] = useState(width);
  const [syncedWidth, setSyncedWidth] = useState(width);
  if (width !== syncedWidth) {
    setSyncedWidth(width);
    setDraftWidth(width);
  }

  // Render
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
          <span data-re-inspector-text="">Divider</span>
        </button>
      </div>
      {!collapsed && (
        <div data-re-inspector-section-body="">
          <div data-re-inspector-prop-row="">
            <label
              data-re-inspector-label=""
              htmlFor="mailblocks-divider-color"
            >
              Color
            </label>
            <span data-re-inspector-color-control="">
              <input
                type="color"
                data-re-inspector-color-trigger=""
                aria-label="Color picker"
                value={toPickerColor(color)}
                onChange={(event) => {
                  setStyle('borderTopColor', event.target.value);
                }}
              />
              <input
                id="mailblocks-divider-color"
                type="text"
                data-re-inspector-color-hex=""
                spellCheck={false}
                value={color}
                onChange={(event) => {
                  setStyle('borderTopColor', event.target.value);
                }}
              />
            </span>
          </div>
          <div data-re-inspector-prop-row="">
            <label
              data-re-inspector-label=""
              htmlFor="mailblocks-divider-thickness"
            >
              Thickness
            </label>
            <span data-re-inspector-number="">
              <input
                id="mailblocks-divider-thickness"
                data-re-inspector-input=""
                data-type="number"
                type="number"
                min={1}
                inputMode="numeric"
                className="mailblocks-size-input"
                value={draftWidth}
                onChange={(event) => {
                  const typed = event.target.value.trim();
                  setDraftWidth(typed);
                  if (typed === '' || Number.isNaN(Number(typed))) return;
                  if (Number(typed) < 1) return;
                  setStyle('borderTopWidth', `${String(Number(typed))}px`);
                }}
                onBlur={() => {
                  setDraftWidth(width);
                }}
              />
              <span data-re-inspector-unit="">px</span>
            </span>
          </div>
          <div data-re-inspector-prop-row="">
            <label
              data-re-inspector-label=""
              htmlFor="mailblocks-divider-style"
            >
              Style
            </label>
            <select
              id="mailblocks-divider-style"
              data-re-inspector-select=""
              value={lineStyle}
              onChange={(event) => {
                setStyle('borderTopStyle', event.target.value);
              }}
            >
              {LINE_STYLES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
