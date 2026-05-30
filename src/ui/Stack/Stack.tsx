import { Children, Fragment, isValidElement, useMemo } from 'react';
import { cx } from 'tailwind-variants';

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
      className={cx('stack', 'flex flex-col', className)}
      {...other}
    >
      {clones}
    </Component>
  );
};
