import { cx, tv, type VariantProps } from 'tailwind-variants';

// Styles
const dividerStyles = tv({
  base: 'border-t-0 bg-gray-300',
  variants: {
    orientation: {
      horizontal: 'w-full h-px',
      vertical: 'h-full w-px',
    },
  },
  defaultVariants: {
    orientation: 'horizontal',
  },
});

type DividerVariantProps = VariantProps<typeof dividerStyles>;

// Prop types
export interface DividerProps
  extends React.HTMLAttributes<HTMLSpanElement>, DividerVariantProps {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLSpanElement>;
  /**
   * The HTML element to render as.
   */
  as?: React.ElementType;
  /**
   * The className of the component.
   */
  className?: string;
}

// Component
export const Divider = ({
  ref,
  as,
  className,
  orientation,
  ...other
}: DividerProps) => {
  const Component = as || 'span';
  return (
    <Component
      ref={ref}
      className={cx('ui-divider', dividerStyles({ orientation, className }))}
      {...other}
    />
  );
};
