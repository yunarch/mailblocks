import { twMerge } from 'tailwind-merge';

export interface DividerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLSpanElement>;
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
  className,
  orientation = 'horizontal',
  ...other
}: DividerProps) => {
  return (
    <span
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
