import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { userEvent } from 'vitest/browser';
import { ResizablePanel, type ResizablePanelProps } from '../ResizablePanel';

type Edge = ResizablePanelProps['edge'];

const renderPanel = async (props: Partial<ResizablePanelProps> = {}) => {
  const screen = await render(
    // Padding keeps the left and top handles fully inside the viewport.
    <div className="p-4">
      <ResizablePanel
        data-testid="panel"
        edge="right"
        defaultSize={200}
        minSize={100}
        maxSize={400}
        step={10}
        {...props}
      >
        Content
      </ResizablePanel>
    </div>
  );
  const handle = screen.getByRole('separator');
  return { handle, panel: screen.getByTestId('panel'), screen };
};

const pointer = (
  element: Element,
  type: string,
  init: PointerEventInit = {}
) => {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
      ...init,
    })
  );
};

const drag = (handle: Element, from: number, to: number, axis: 'x' | 'y') => {
  const key = axis === 'x' ? 'clientX' : 'clientY';
  pointer(handle, 'pointerdown', { [key]: from });
  pointer(handle, 'pointermove', { [key]: to });
  pointer(handle, 'pointerup', { [key]: to });
};

describe('<ResizablePanel />', () => {
  it('renders a sized panel with an accessible resize handle', async () => {
    const { handle, panel } = await renderPanel({
      as: 'aside',
      className: 'custom',
      style: { color: 'red' },
    });
    expect(panel.element().tagName).toBe('ASIDE');
    await expect.element(panel).toHaveClass('ui-resizable-panel', 'custom');
    await expect
      .element(panel)
      .toHaveStyle({ width: '200px', color: 'rgb(255, 0, 0)' });
    await expect.element(panel).toHaveTextContent('Content');
    await expect.element(handle).toHaveAccessibleName('Resize panel');
    await expect
      .element(handle)
      .toHaveAttribute('aria-orientation', 'vertical');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '200');
    await expect.element(handle).toHaveAttribute('aria-valuemin', '100');
    await expect.element(handle).toHaveAttribute('aria-valuemax', '400');
  });

  it.each([
    [500, 100, 400, 400],
    [50, 100, 400, 100],
    [200, 100, 50, 100],
  ])(
    'clamps a default size of %i between min %i and max %i to %i',
    async (defaultSize, minSize, maxSize, expected) => {
      const { panel } = await renderPanel({ defaultSize, minSize, maxSize });
      await expect.element(panel).toHaveStyle({ width: `${expected}px` });
    }
  );

  it.each<[Edge, 'width' | 'height', { x: number; y: number }]>([
    ['right', 'width', { x: 150, y: 5 }],
    ['left', 'width', { x: 50, y: 5 }],
    ['bottom', 'height', { x: 5, y: 150 }],
    ['top', 'height', { x: 5, y: 50 }],
  ])(
    'resizes from the %s edge by dragging its handle',
    async (edge, dimension, targetPosition) => {
      const { handle, panel } = await renderPanel({ edge });
      await handle.dropTo(panel, { targetPosition });
      await expect.element(panel).toHaveStyle({ [dimension]: '150px' });
      await expect.element(handle).toHaveAttribute('aria-valuenow', '150');
    }
  );

  it('clamps dragging to the size bounds', async () => {
    const { handle, panel } = await renderPanel();
    drag(handle.element(), 0, 1000, 'x');
    await expect.element(panel).toHaveStyle({ width: '400px' });
    drag(handle.element(), 1000, 0, 'x');
    await expect.element(panel).toHaveStyle({ width: '100px' });
  });

  it('shows resize feedback only while dragging', async () => {
    const { handle } = await renderPanel({ edge: 'top' });
    const element = handle.element();
    const { body } = document;
    pointer(element, 'pointerdown', { clientY: 0 });
    await expect.poll(() => body.style.cursor).toBe('row-resize');
    expect(body.style.userSelect).toBe('none');
    await expect.element(handle).toHaveClass('after:bg-sky-500');
    pointer(element, 'pointercancel');
    await expect.poll(() => body.style.cursor).toBe('');
    expect(body.style.userSelect).toBe('');
    await expect.element(handle).not.toHaveClass('after:bg-sky-500');
  });

  it('ends a drag whose pointer capture was already lost', async () => {
    const { handle } = await renderPanel();
    const element = handle.element();
    pointer(element, 'pointerdown', { clientX: 0 });
    await expect.poll(() => document.body.style.cursor).toBe('col-resize');
    element.releasePointerCapture(1);
    pointer(element, 'pointerup', { clientX: 0 });
    await expect.poll(() => document.body.style.cursor).toBe('');
  });

  it('ignores pointer input without a primary-button drag', async () => {
    const { handle, panel } = await renderPanel();
    const element = handle.element();
    pointer(element, 'pointermove', { clientX: 300 });
    pointer(element, 'pointerup', { clientX: 300 });
    pointer(element, 'pointerdown', { button: 2, clientX: 0 });
    pointer(element, 'pointermove', { button: 2, clientX: 100 });
    pointer(element, 'pointerup', { button: 2, clientX: 100 });
    await expect.element(panel).toHaveStyle({ width: '200px' });
    expect(document.body.style.cursor).toBe('');
  });

  it('restores the default size on double click', async () => {
    const { handle } = await renderPanel();
    drag(handle.element(), 0, 100, 'x');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '300');
    await handle.dblClick();
    await expect.element(handle).toHaveAttribute('aria-valuenow', '200');
  });

  it.each<[Edge, string, string]>([
    ['right', 'ArrowRight', 'ArrowLeft'],
    ['left', 'ArrowLeft', 'ArrowRight'],
    ['bottom', 'ArrowDown', 'ArrowUp'],
    ['top', 'ArrowUp', 'ArrowDown'],
  ])(
    'resizes from the %s edge with the keyboard',
    async (edge, growKey, shrinkKey) => {
      const { handle } = await renderPanel({ edge });
      (handle.element() as HTMLElement).focus();
      await userEvent.keyboard(`{${growKey}}`);
      await expect.element(handle).toHaveAttribute('aria-valuenow', '210');
      await userEvent.keyboard(`{${shrinkKey}}{${shrinkKey}}`);
      await expect.element(handle).toHaveAttribute('aria-valuenow', '190');
      await userEvent.keyboard('a');
      await expect.element(handle).toHaveAttribute('aria-valuenow', '190');
    }
  );

  it('jumps to the bounds or default size with Home, End and Enter', async () => {
    const { handle } = await renderPanel();
    (handle.element() as HTMLElement).focus();
    await userEvent.keyboard('{End}');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '400');
    await userEvent.keyboard('{Home}');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '100');
    await userEvent.keyboard('{Enter}');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '200');
  });

  it('re-evaluates a dynamic maximum when the window resizes', async () => {
    let max = 400;
    const { handle } = await renderPanel({
      defaultSize: 350,
      maxSize: () => max,
      handleLabel: 'Resize sidebar',
    });
    await expect.element(handle).toHaveAccessibleName('Resize sidebar');
    await expect.element(handle).toHaveAttribute('aria-valuenow', '350');
    max = 300;
    dispatchEvent(new Event('resize'));
    await expect.element(handle).toHaveAttribute('aria-valuenow', '300');
    await expect.element(handle).toHaveAttribute('aria-valuemax', '300');
  });
});
