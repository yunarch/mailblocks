import { cx } from 'tailwind-variants';

// Prop types
export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLButtonElement>;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * Whether the switch is on.
   */
  checked: boolean;
  /**
   * Called with the new value when the switch is toggled.
   */
  onChange: (checked: boolean) => void;
  /**
   * Optional content rendered next to the switch (e.g. a label or icon).
   */
  label?: React.ReactNode;
}

// Component
export const Switch = ({
  ref,
  className,
  checked,
  onChange,
  label,
  disabled,
  ...other
}: SwitchProps) => {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => {
        onChange(!checked);
      }}
      className={cx(
        'ui-switch inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium outline-none',
        'text-gray-600 hover:text-black dark:text-neutral-400 dark:hover:text-white',
        'focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-white/30',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...other}
    >
      {label}
      <span
        className={cx(
          'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors',
          checked ? 'bg-sky-500' : 'bg-gray-300 dark:bg-white/20'
        )}
      >
        <span
          className={cx(
            'size-3 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          )}
        />
      </span>
    </button>
  );
};
