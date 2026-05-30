import { twMerge } from 'tailwind-merge';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLHRElement>;
  /**
   * The HTML element to render the divider as.
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
  orientation?: 'horizontal' | 'vertical';
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
      className={twMerge(
        'bg-gray-300 dark:bg-slate-600',
        orientation === 'horizontal' ? 'w-full h-px' : 'h-full w-px',
        className
      )}
    />
  );
};
