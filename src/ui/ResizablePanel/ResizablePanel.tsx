import { cx, tv } from 'tailwind-variants';
import { useResizable, type UseResizableOptions } from './useResizable';

// Styles
const handleStyles = tv({
  base: [
    'ui-resizable-panel__handle',
    'absolute z-10 touch-none outline-none',
    // The visible line, highlighted while hovered, focused or dragged
    'after:absolute after:bg-transparent after:transition-colors',
    'hover:after:bg-sky-500/70 focus-visible:after:bg-sky-500',
  ],
  variants: {
    // The handle is centered on the panel edge
    edge: {
      top: '-top-1 inset-x-0 h-2 cursor-row-resize',
      bottom: '-bottom-1 inset-x-0 h-2 cursor-row-resize',
      left: '-left-1 inset-y-0 w-2 cursor-col-resize',
      right: '-right-1 inset-y-0 w-2 cursor-col-resize',
    },
    orientation: {
      horizontal:
        'after:inset-x-0 after:top-1/2 after:h-0.5 after:-translate-y-1/2',
      vertical:
        'after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2',
    },
    active: {
      true: 'after:bg-sky-500',
    },
  },
});

// Prop types
export interface ResizablePanelProps
  extends React.HTMLAttributes<HTMLDivElement>, UseResizableOptions {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLDivElement>;
  /**
   * The HTML element to render as.
   */
  as?: React.ElementType;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The component to be rendered inside.
   */
  children?: React.ReactNode;
  /**
   * The accessible label of the resize handle.
   */
  handleLabel?: string;
}

// Component
export const ResizablePanel = ({
  ref,
  as,
  className,
  style,
  children,
  edge,
  defaultSize,
  minSize,
  maxSize,
  step,
  handleLabel = 'Resize panel',
  ...other
}: ResizablePanelProps) => {
  const Component = as ?? 'div';
  const { size, isVertical, isResizing, handleProps } = useResizable({
    edge,
    defaultSize,
    minSize,
    maxSize,
    step,
  });
  return (
    <Component
      ref={ref}
      className={cx('ui-resizable-panel', 'relative shrink-0', className)}
      style={{ ...style, [isVertical ? 'height' : 'width']: size }}
      {...other}
    >
      {children}
      <div
        {...handleProps}
        aria-label={handleLabel}
        title="Drag to resize · Double-click to reset"
        className={handleStyles({
          edge,
          orientation: isVertical ? 'horizontal' : 'vertical',
          active: isResizing,
        })}
      />
    </Component>
  );
};
