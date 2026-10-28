import { getNodeMeta } from '@react-email/editor/ui';
import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

type HoverTarget = { node: ProseMirrorNode; pos: number };
type InspectedNode = { nodeType: string; pos: number };

// Keyed by view: the editor can mount more than one view over its lifetime
const highlights = new WeakMap<EditorView, HoverHighlightView>();

/**
 * Mirrors the inspector: text nodes, the document and non-selectable nodes are
 * never targeted.
 *
 * @param node - The node to check.
 * @returns Whether the node can be highlighted.
 */
function isHighlightable(node: ProseMirrorNode) {
  return (
    !node.isText &&
    node.type.name !== 'doc' &&
    node.type.spec.selectable !== false
  );
}

/**
 * Resolves the node under the pointer (the one a click would inspect) and its
 * highlightable ancestors, innermost first.
 *
 * @param view - The editor view.
 * @param coords - The pointer position in viewport coordinates.
 * @param coords.left - The horizontal pointer position.
 * @param coords.top - The vertical pointer position.
 * @returns The hovered node followed by its ancestors, or an empty list.
 */
function getHoverTargets(
  view: EditorView,
  coords: { left: number; top: number }
): HoverTarget[] {
  const position = view.posAtCoords(coords);
  if (!position || position.inside < 0) return [];
  const { doc } = view.state;
  const targets: HoverTarget[] = [];
  const insideNode = doc.nodeAt(position.inside);
  if (insideNode && isHighlightable(insideNode)) {
    targets.push({ node: insideNode, pos: position.inside });
  }
  const resolved = doc.resolve(position.inside);
  for (let depth = resolved.depth; depth > 0; depth--) {
    const node = resolved.node(depth);
    if (isHighlightable(node))
      targets.push({ node, pos: resolved.before(depth) });
  }
  // Like the inspector, text inside a column targets the column itself
  const columnIndex = targets.findIndex(
    (target) => target.node.type.name === 'columnsColumn'
  );
  return targets[0]?.node.type.name === 'paragraph' && columnIndex > 0
    ? targets.slice(columnIndex)
    : targets;
}

/**
 * @param view - The editor view that rendered the node.
 * @param target - The node to measure.
 * @returns The bounding box of the node DOM, when rendered.
 */
function getTargetRect(view: EditorView, target?: HoverTarget) {
  const dom = target ? view.nodeDOM(target.pos) : null;
  return dom instanceof HTMLElement ? dom.getBoundingClientRect() : undefined;
}

/**
 * @param a - The first box.
 * @param b - The second box.
 * @returns Whether both boxes cover (almost) the same area.
 */
function isSameRect(a: DOMRect, b: DOMRect) {
  return (
    Math.abs(a.left - b.left) < 1 &&
    Math.abs(a.top - b.top) < 1 &&
    Math.abs(a.width - b.width) < 1 &&
    Math.abs(a.height - b.height) < 1
  );
}

/**
 * Creates an absolutely positioned overlay box inside the host element.
 *
 * @param host - The element that contains the overlay.
 * @param className - CSS classes applied to the overlay.
 * @returns The overlay element.
 */
function createOverlay(host: HTMLElement, className: string) {
  const element = document.createElement('div');
  element.className = className;
  element.hidden = true;
  element.setAttribute('aria-hidden', 'true');
  host.append(element);
  return element;
}

/**
 * Positions an overlay over the given box, or hides it.
 *
 * @param overlay - The overlay element to position.
 * @param rect - The box to cover, in viewport coordinates.
 */
function placeOverlay(overlay: HTMLElement, rect?: DOMRect) {
  const host = overlay.parentElement;
  if (!rect || !host) {
    overlay.hidden = true;
    return;
  }
  const hostRect = host.getBoundingClientRect();
  overlay.hidden = false;
  overlay.style.width = `${String(rect.width)}px`;
  overlay.style.height = `${String(rect.height)}px`;
  overlay.style.transform = `translate(${String(rect.left - hostRect.left - host.clientLeft + host.scrollLeft)}px, ${String(rect.top - hostRect.top - host.clientTop + host.scrollTop)}px)`;
}

/**
 * Marks the node shown in the inspector, so it stays highlighted while its
 * properties are edited, even when the pointer is elsewhere.
 *
 * @param view - The editor view that renders the node.
 * @param inspected - The inspected node, or `null` to clear the highlight.
 */
export function setInspectedNode(
  view: EditorView,
  inspected: InspectedNode | null
) {
  highlights.get(view)?.setInspected(inspected);
}

/**
 * Owns the highlight overlays of one editor view and keeps them in sync with
 * the pointer, the inspected node, the document and the canvas scroll position.
 */
class HoverHighlightView {
  private frame = 0;
  private inspected: InspectedNode | null = null;
  private pointer: { left: number; top: number } | null = null;
  private readonly host: HTMLElement;
  private readonly hoveredOverlay: HTMLElement;
  private readonly inspectedOverlay: HTMLElement;
  private readonly parentOverlay: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly view: EditorView;

  readonly schedule = () => {
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      this.refresh();
    });
  };

  constructor(view: EditorView, host: HTMLElement) {
    this.view = view;
    this.host = host;
    this.parentOverlay = createOverlay(
      host,
      'mailblocks-hover-overlay mailblocks-hover-overlay--parent'
    );
    this.hoveredOverlay = createOverlay(
      host,
      'mailblocks-hover-overlay mailblocks-hover-overlay--hovered'
    );
    this.inspectedOverlay = createOverlay(
      host,
      'mailblocks-hover-overlay mailblocks-hover-overlay--inspected'
    );
    this.resizeObserver = new ResizeObserver(this.schedule);
    this.resizeObserver.observe(view.dom);
    host.addEventListener('scroll', this.schedule, { passive: true });
  }

  private getInspectedTarget(): HoverTarget | undefined {
    if (!this.inspected) return;
    const { pos, nodeType } = this.inspected;
    if (pos < 0 || pos >= this.view.state.doc.content.size) return;
    const node = this.view.state.doc.nodeAt(pos);
    // The position can be briefly stale after an edit, until the inspector re-renders
    return node?.type.name === nodeType ? { node, pos } : undefined;
  }

  private refresh() {
    const inspected = this.getInspectedTarget();
    const inspectedRect = getTargetRect(this.view, inspected);
    if (inspected) {
      this.inspectedOverlay.dataset.label = getNodeMeta(
        inspected.node.type.name
      ).label;
    }
    placeOverlay(this.inspectedOverlay, inspectedRect);

    const targets = this.pointer
      ? getHoverTargets(this.view, this.pointer)
      : [];
    const hovered = targets.at(0);
    // The inspected outline already marks this node
    const hoveredRect =
      hovered && hovered.pos !== inspected?.pos
        ? getTargetRect(this.view, hovered)
        : undefined;
    // Skip wrappers that share the hovered box (e.g. table > row > cell)
    const parentRect = hoveredRect
      ? targets
          .slice(1)
          .map((ancestor) => getTargetRect(this.view, ancestor))
          .find((rect) => rect && !isSameRect(rect, hoveredRect))
      : undefined;
    if (hovered) {
      this.hoveredOverlay.dataset.label = getNodeMeta(
        hovered.node.type.name
      ).label;
    }
    placeOverlay(this.hoveredOverlay, hoveredRect);
    placeOverlay(this.parentOverlay, parentRect);
  }

  setInspected(inspected: InspectedNode | null) {
    this.inspected = inspected;
    this.schedule();
  }

  setPointer(pointer: { left: number; top: number } | null) {
    this.pointer = pointer;
    this.schedule();
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.host.removeEventListener('scroll', this.schedule);
    this.parentOverlay.remove();
    this.hoveredOverlay.remove();
    this.inspectedOverlay.remove();
  }
}

/**
 * Highlights the editor node under the pointer with a labelled outline, and
 * its closest visible container with a fainter one, so the structure of the
 * email is visible without clicking around. The node shown in the inspector
 * (see `setInspectedNode`) keeps a stronger outline.
 *
 * The overlays are appended to the editor's parent element, which must be
 * positioned (e.g. `position: relative`).
 */
export const HoverHighlight = Extension.create({
  name: 'hoverHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('hoverHighlight'),
        view(view) {
          const host = view.dom.parentElement;
          if (!host) return {};
          const highlight = new HoverHighlightView(view, host);
          highlights.set(view, highlight);
          return {
            update: highlight.schedule,
            destroy() {
              highlight.destroy();
              if (highlights.get(view) === highlight) highlights.delete(view);
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              highlights.get(view)?.setPointer({
                left: event.clientX,
                top: event.clientY,
              });
              return false;
            },
            mouseleave(view) {
              highlights.get(view)?.setPointer(null);
              return false;
            },
          },
        },
      }),
    ];
  },
});
