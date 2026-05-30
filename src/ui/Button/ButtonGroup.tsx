import { Children, Fragment, isValidElement } from 'react';
import { cx, tv, type VariantProps } from 'tailwind-variants';

// Styles
const buttonGroupStyles = tv({
  base: [
    'inline-flex shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50',
    'dark:border-white/15 dark:bg-black',
  ],
  variants: {
    orientation: {
      horizontal: [
        'flex-row',
        '[&>*+*]:border-l [&>*+*]:border-gray-200',
        'dark:[&>*+*]:border-white/15',
      ],
      vertical: [
        'flex-col',
        '[&>*+*]:border-t [&>*+*]:border-gray-200',
        'dark:[&>*+*]:border-white/15',
      ],
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

type ButtonGroupVariants = VariantProps<typeof buttonGroupStyles>;

// Prop types
export interface ButtonGroupProps
  extends React.HTMLAttributes<HTMLDivElement>, ButtonGroupVariants {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLDivElement>;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The grouped controls.
   */
  children?: React.ReactNode;
  /**
   * The index of the active child.
   */
  activeItem?: number;
}

// Component
export const ButtonGroup = ({
  ref,
  className,
  children,
  orientation,
  activeItem,
  ...other
}: ButtonGroupProps) => {
  const validChildren = Children.toArray(children).filter((child) => {
    return isValidElement(child);
  });
  return (
    <div
      ref={ref}
      className={cx(
        'ui-button-group',
        buttonGroupStyles({ orientation, className })
      )}
      {...other}
    >
      {validChildren.map((child, index) => {
        const isActive = index === activeItem;
        return (
          <Fragment key={child.key ?? index}>
            <span
              className={cx(
                'ui-button-group__item contents *:rounded-none *:border-0',
                isActive && '*:bg-white *:shadow-sm dark:*:bg-white/10'
              )}
            >
              {child}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
};
