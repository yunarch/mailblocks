import { tv, VariantProps } from 'tailwind-variants';

const typographyStyles = tv({
  base: 'text-gray-950 dark:text-white',
  variants: {
    variant: {
      h1: 'text-lg font-semibold',
      h2: 'text-lg font-semibold',
      h3: 'text-xs font-medium uppercase text-gray-400 dark:text-neutral-500',
      h4: 'text-sm font-semibold',
      h5: 'text-sm font-medium',
      h6: 'text-xs font-medium',
      p: 'text-sm text-gray-500 dark:text-neutral-500',
    },
    link: {
      true: 'text-blue-600 hover:underline dark:text-blue-400',
      false: '',
    },
  },
});
type TypographyVariants = VariantProps<typeof typographyStyles>;

export interface TypographyProps<
  IsLink extends boolean,
  As extends React.ElementType,
> extends React.HTMLAttributes<IsLink extends true ? 'a' : As> {
  /**
   * The component ref.
   */
  ref?: React.Ref<As>;
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
   * The variant of the typography.
   */
  variant?: TypographyVariants['variant'];
  /**
   * Whether the typography should be rendered as a link.
   */
  link?: IsLink;
}

export const Typography = <
  IsLink extends boolean,
  As extends React.ElementType = 'p',
>({
  ref,
  as,
  className,
  children,
  variant = 'p',
  link,
  ...other
}: TypographyProps<IsLink, As>) => {
  const Component = link ? 'a' : as || variant;
  return (
    <Component
      {...other}
      ref={ref}
      className={typographyStyles({
        variant,
        link,
        className,
      })}
    >
      {children}
    </Component>
  );
};
