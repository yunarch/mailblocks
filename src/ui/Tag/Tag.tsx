import { cx } from 'tailwind-variants';

// Prop types
export interface TagProps extends React.HtmlHTMLAttributes<HTMLSpanElement> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLSpanElement>;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The component to be rendered inside.
   */
  children?: React.ReactNode;
}

// Component
export const Tag = ({ ref, className, children, ...other }: TagProps) => {
  return (
    <span
      ref={ref}
      className={cx(
        'tag',
        'rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none',
        'border-gray-300 text-gray-600 dark:border-white/15 dark:text-neutral-300'
      )}
      {...other}
    >
      {children}
    </span>
  );
};
