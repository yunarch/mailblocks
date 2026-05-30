import { Children, Fragment, isValidElement, useMemo } from 'react';
import { cx, tv, type VariantProps } from 'tailwind-variants';

/**
 * Filters and returns only the valid React elements from the given children.
 *
 * @param children - The React children nodes to filter.
 * @returns An array of valid React elements.
 */
function getValidChildren(children: React.ReactNode) {
  return Children.toArray(children).filter((child) => {
    return isValidElement(child);
  }) as React.ReactElement[];
}

// Styles
const stackStyles = tv({
  base: 'flex',
  variants: {
    direction: {
      row: 'flex-row',
      column: 'flex-col',
    },
  },
});
type StackVariants = VariantProps<typeof stackStyles>;

// Prop types
export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
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
   * The direction of the stack.
   * @default 'column'
   */
  direction?: StackVariants['direction'];
  /**
   * A React element used as a separator between children of the stack.
   */
  separator?: React.ReactElement;
}

// Component
export const Stack = ({
  ref,
  as,
  className,
  children,
  direction = 'column',
  separator,
  ...other
}: StackProps) => {
  const Component = as || 'div';
  const clones = useMemo(() => {
    if (!separator) return children;
    return getValidChildren(children).map((child, index, arr) => {
      const key = child.key ?? index;
      return (
        <Fragment key={key}>
          {child}
          {index === arr.length - 1 ? null : separator}
        </Fragment>
      );
    });
  }, [children, separator]);
  return (
    <Component
      ref={ref}
      className={cx('stack', stackStyles({ direction, className }))}
      {...other}
    >
      {clones}
    </Component>
  );
};
