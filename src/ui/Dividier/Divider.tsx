import { cx, tv, VariantProps } from 'tailwind-variants';

// Styles
const dividerStyles = tv({
  base: 'border-t-0 bg-gray-300',
  variants: {
    orientation: {
      horizontal: 'w-4/5 h-px',
      vertical: 'h-4/5 w-px',
    },
  },
});

type DividerVariantProps = VariantProps<typeof dividerStyles>;

// Prop types
export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLHRElement>;
  /**
   * The HTML element to render as.
   */
  as?: React.ElementType;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The orientation of the divider.
   * @default 'horizontal'
   */
  orientation?: DividerVariantProps['orientation'];
}

// Component
export const Divider = ({
  ref,
  as,
  className,
  orientation = 'horizontal',
  ...other
}: DividerProps) => {
  const Component = as || 'hr';
  return (
    <Component
      ref={ref}
      className={cx('divider', dividerStyles({ orientation, className }))}
      {...other}
    />
  );
};
