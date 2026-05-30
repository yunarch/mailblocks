import { cx, tv, type VariantProps } from 'tailwind-variants';

// Styles
const typographyStyles = tv({
  variants: {
    variant: {
      h1: 'text-3xl font-semibold tracking-normal',
      h2: 'text-2xl font-semibold tracking-normal',
      h3: 'text-xl font-semibold tracking-normal',
      h4: 'text-lg font-medium tracking-normal',
      h5: 'text-base font-medium tracking-normal',
      h6: 'text-sm font-medium tracking-normal',
      body: 'text-sm',
      bodySm: 'text-xs',
      caption: 'text-[11px]',
      label: 'text-xs font-medium',
      code: 'font-mono text-xs',
    },
    tone: {
      default: 'text-gray-950 dark:text-white',
      muted: 'text-gray-500 dark:text-neutral-500',
      subtle: 'text-gray-400 dark:text-neutral-600',
      danger: 'text-red-500 dark:text-red-400',
      warning: 'text-orange-500 dark:text-orange-300',
      success: 'text-emerald-600 dark:text-emerald-400',
      info: 'text-sky-600 dark:text-sky-300',
    },
    leading: {
      none: 'leading-none',
      tight: 'leading-tight',
      normal: 'leading-normal',
      relaxed: 'leading-6',
      loose: 'leading-7',
    },
    link: {
      true: [
        'cursor-pointer underline-offset-4 transition-colors hover:underline',
        'text-gray-700 hover:text-gray-950 dark:text-neutral-300 dark:hover:text-white',
      ],
      false: '',
    },
    truncate: {
      true: 'truncate',
      false: '',
    },
    uppercase: {
      true: 'uppercase',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'body',
    tone: 'default',
    leading: 'normal',
    link: false,
    truncate: false,
    uppercase: false,
  },
});

type TypographyVariants = VariantProps<typeof typographyStyles>;

// Prop types
type TypographyOwnProps<
  As extends React.ElementType,
  IsLink extends boolean,
> = TypographyVariants & {
  /**
   * The component ref.
   */
  ref?: React.Ref<React.ComponentRef<As>>;
  /**
   * The HTML element to render as.
   */
  as?: As;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The component to be rendered inside.
   */
  children?: React.ReactNode;
  /**
   * Whether the typography should be rendered as a link.
   */
  link?: IsLink;
};
export type TypographyProps<
  As extends React.ElementType,
  IsLink extends boolean,
> = TypographyOwnProps<As, IsLink> &
  Omit<
    React.ComponentPropsWithoutRef<As>,
    keyof TypographyOwnProps<As, IsLink>
  >;

// Component
const defaultElementByVariant: Record<
  NonNullable<TypographyVariants['variant']>,
  React.ElementType
> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  bodySm: 'p',
  caption: 'span',
  label: 'span',
  code: 'code',
};

export const Typography = <
  IsLink extends boolean,
  As extends React.ElementType = IsLink extends true ? 'a' : 'p',
>({
  ref,
  as,
  className,
  children,
  variant = 'body',
  tone,
  leading,
  link,
  truncate,
  uppercase,
  ...other
}: TypographyProps<As, IsLink>) => {
  const Component = link ? 'a' : as || defaultElementByVariant[variant];
  return (
    <Component
      ref={ref}
      className={cx(
        'typography',
        typographyStyles({
          variant,
          tone,
          leading,
          link,
          truncate,
          uppercase,
          className,
        })
      )}
      {...other}
    >
      {children}
    </Component>
  );
};
