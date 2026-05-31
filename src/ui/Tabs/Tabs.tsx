import { cx } from 'tailwind-variants';
import { Typography } from '../Typography';

// Prop types
export interface TabsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onChange'
> {
  /**
   * The component ref.
   */
  ref?: React.Ref<HTMLDivElement>;
  /**
   * The className of the component.
   */
  className?: string;
  /**
   * The index of the active tab.
   * Note: This is a zero-based index, so the first tab should have an index of 0.
   */
  activeItem: number;
  /**
   * The list of tab items.
   */
  items: {
    label: React.ReactNode;
    leadingContent?: React.ReactNode;
    trailingContent?: React.ReactNode;
  }[];
  /**
   * Callback fired when a tab is clicked, receiving the clicked tab as an argument.
   *
   * @param tabIndex - The index of the clicked tab.
   * @param tab - The clicked tab item.
   */
  onChange?: (tabIndex: number, tab: TabsProps['items'][number]) => void;
}

// Component
export const Tabs = ({
  ref,
  className,
  activeItem,
  items,
  onChange,
  ...other
}: TabsProps) => {
  return (
    <div
      ref={ref}
      role="tablist"
      className={cx('ui-tabs', 'flex shrink-0', className)}
      {...other}
    >
      {items.map((item, index) => {
        const id = `tab-${index}`;
        const isActive = index === activeItem;
        return (
          <button
            key={id}
            type="button"
            className={cx(
              'ui-tabs__item',
              'relative flex cursor-pointer items-center gap-2 py-2 px-5 border-r border-gray-200 dark:border-white/10 transition-colors',
              isActive
                ? 'bg-gray-50 dark:bg-white/6'
                : 'hover:bg-gray-50 hover:text-gray-950 dark:hover:bg-white/4 dark:hover:text-white'
            )}
            onClick={() => {
              onChange?.(index, item);
            }}
          >
            {item.leadingContent}
            <Typography
              as="span"
              variant="label"
              tone={isActive ? 'default' : 'muted'}
              className={cx('ui-tabs__item-label', 'font-semibold')}
            >
              {item.label}
            </Typography>
            {item.trailingContent}
            {isActive ? (
              <span
                className={cx(
                  'ui-tabs__item-indicator',
                  'absolute right-0 bottom-0 left-0 h-px bg-gray-950 dark:bg-white'
                )}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};
