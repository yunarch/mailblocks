import { cx, tv, type VariantProps } from 'tailwind-variants';

// Styles
const buttonStyles = tv({
  base: [
    'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md',
    'font-medium transition-colors outline-none',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    'focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
    'dark:focus-visible:ring-white/30 dark:focus-visible:ring-offset-black',
  ],
  variants: {
    variant: {
      solid: [
        'bg-gray-950 text-white hover:bg-gray-800',
        'dark:bg-white dark:text-black dark:hover:bg-neutral-200',
      ],
      outline: [
        'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-950',
        'dark:border-white/10 dark:bg-black dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-white',
      ],
      ghost: [
        'text-gray-600 hover:bg-gray-100 hover:text-black',
        'dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white',
      ],
      subtle: [
        'bg-gray-100 text-gray-950 hover:bg-gray-200',
        'dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10',
      ],
    },
    size: {
      sm: 'h-8 px-2 text-sm',
      md: 'h-9 px-3 text-sm',
    },
    disabled: {
      true: 'pointer-events-none cursor-not-allowed opacity-50',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'solid',
    size: 'sm',
  },
});

type ButtonVariants = VariantProps<typeof buttonStyles>;

// Prop types
type ButtonOwnProps<IsLink extends boolean> = ButtonVariants & {
  /**
   * The component ref.
   */
  ref?: React.Ref<IsLink extends true ? HTMLAnchorElement : HTMLButtonElement>;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The children of the component.
   */
  children: React.ReactNode;
  /**
   * Whether the button is a link. If true, the button will be rendered as an anchor tag.
   */
  link?: IsLink;
};
export type ButtonProps<IsLink extends boolean> = ButtonOwnProps<IsLink> &
  Omit<
    React.ComponentPropsWithoutRef<IsLink extends true ? 'a' : 'button'>,
    keyof ButtonOwnProps<IsLink>
  >;

// Component
export const Button = <IsLink extends boolean>({
  ref,
  className,
  children,
  variant,
  size,
  type,
  link,
  disabled,
  ...other
}: ButtonProps<IsLink>) => {
  const isLink = Boolean(link);
  const Component = link ? 'a' : 'button';
  return (
    <Component
      {...({
        ref,
        type: isLink ? undefined : type || 'button',
        className: cx(
          'ui-button',
          buttonStyles({
            variant,
            size,
            disabled,
            className,
          buttonStyles({
            variant,
            size,
            disabled,
            className,
          })
        ),
        'aria-disabled': disabled || undefined,
        disabled: isLink ? undefined : disabled,
        ...other,
      } as React.ComponentPropsWithRef<'a'> &
        React.ComponentPropsWithRef<'button'>)}
    >
      {children}
    </Component>
  );
};
