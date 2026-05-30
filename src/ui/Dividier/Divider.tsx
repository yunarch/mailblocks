import { tv, VariantProps } from 'tailwind-variants';

const dividerStyles = tv({
  base: 'border-t-0 bg-gray-300',
  variants: {
    orientation: {
      horizontal: 'w-full h-px',
      vertical: 'h-full w-px',
    },
  },
});
type DividerVariantProps = VariantProps<typeof dividerStyles>;

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
      {...other}
      ref={ref}
      className={dividerStyles({ orientation, className })}
    />
  );
};
