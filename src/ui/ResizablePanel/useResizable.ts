import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseResizableOptions {
  /**
   * The panel edge where the resize handle sits.
   */
  edge: 'top' | 'right' | 'bottom' | 'left';
  /**
   * The initial size in pixels, also restored on double click or Enter.
   */
  defaultSize: number;
  /**
   * The minimum size in pixels.
   */
  minSize: number;
  /**
   * The maximum size in pixels, or a function computing it (e.g. from the viewport).
   */
  maxSize: number | (() => number);
  /**
   * The size change in pixels for each arrow key press.
   */
  step?: number;
}

const GROW_KEYS: Record<UseResizableOptions['edge'], string> = {
  top: 'ArrowUp',
  right: 'ArrowRight',
  bottom: 'ArrowDown',
  left: 'ArrowLeft',
};

const SHRINK_KEYS: Record<UseResizableOptions['edge'], string> = {
  top: 'ArrowDown',
  right: 'ArrowLeft',
  bottom: 'ArrowUp',
  left: 'ArrowRight',
};

/**
 * Clamps a size between the given bounds.
 *
 * @param size - The size to clamp.
 * @param min - The minimum size.
 * @param max - The maximum size.
 * @returns The clamped size.
 */
function clamp(size: number, min: number, max: number) {
  return Math.round(Math.min(Math.max(size, min), Math.max(min, max)));
}

/**
 * Hook that makes a panel resizable by dragging (or using the keyboard on) a handle.
 * The size is clamped to the given bounds.
 *
 * @param options - The resize options.
 * @returns The current size, whether it is being resized, and the props for the handle.
 */
export function useResizable({
  edge,
  defaultSize,
  minSize,
  maxSize,
  step = 16,
}: UseResizableOptions) {
  const isVertical = edge === 'top' || edge === 'bottom';
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ start: number; startSize: number } | null>(null);
  const maxSizeRef = useRef(maxSize);
  const getMax = useCallback(() => {
    const max = maxSizeRef.current;
    return typeof max === 'function' ? max() : max;
  }, []);
  const [size, setSize] = useState(() => {
    return clamp(defaultSize, minSize, getMax());
  });
  const sizeRef = useRef(size);
  maxSizeRef.current = maxSize;
  sizeRef.current = size;

  // Methods
  const getPointerPosition = (event: React.PointerEvent) => {
    return isVertical ? event.clientY : event.clientX;
  };
  const updateSize = useCallback(
    (value: number) => {
      setSize(clamp(value, minSize, getMax()));
    },
    [minSize, getMax]
  );
  const endResize = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setIsResizing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  // Re-clamp the size when the window resizes, since `maxSize` may depend on the viewport
  useEffect(() => {
    const onWindowResize = () => {
      setSize((prev) => clamp(prev, minSize, getMax()));
    };
    window.addEventListener('resize', onWindowResize);
    return () => {
      window.removeEventListener('resize', onWindowResize);
    };
  }, [minSize, getMax]);

  // While dragging, keep the resize cursor everywhere and prevent text selection
  useEffect(() => {
    if (!isResizing) return;
    const { body } = document;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;
    body.style.cursor = isVertical ? 'row-resize' : 'col-resize';
    body.style.userSelect = 'none';
    return () => {
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [isResizing, isVertical]);

  // Handle props for the resize handle
  const handleProps = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': isVertical ? 'horizontal' : 'vertical',
    'aria-valuenow': size,
    'aria-valuemin': minSize,
    'aria-valuemax': getMax(),
    onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        start: getPointerPosition(event),
        startSize: sizeRef.current,
      };
      setIsResizing(true);
    },
    onPointerMove: (event: React.PointerEvent<HTMLElement>) => {
      if (!dragRef.current) return;
      const offset = getPointerPosition(event) - dragRef.current.start;
      const delta = edge === 'top' || edge === 'left' ? -offset : offset;
      updateSize(dragRef.current.startSize + delta);
    },
    onPointerUp: endResize,
    onPointerCancel: endResize,
    onDoubleClick: () => {
      updateSize(defaultSize);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      const actions: Partial<Record<string, () => number>> = {
        [GROW_KEYS[edge]]: () => sizeRef.current + step,
        [SHRINK_KEYS[edge]]: () => sizeRef.current - step,
        Home: () => minSize,
        End: getMax,
        Enter: () => defaultSize,
      };
      const action = actions[event.key];
      if (!action) return;
      event.preventDefault();
      updateSize(action());
    },
  } as const;

  return { size, isVertical, isResizing, handleProps };
}
