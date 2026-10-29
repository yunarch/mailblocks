import {
  createContext,
  use,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MdCheck } from 'react-icons/md';
import { cx } from 'tailwind-variants';
import { Button } from '@/ui/Button';

const MenuContext = createContext<{ close: () => void } | null>(null);

// Prop types
export interface MenuProps {
  /**
   * The className of the menu popover.
   */
  className?: string;
  /**
   * Accessible label of the trigger button.
   */
  label: string;
  /**
   * Content of the trigger button (e.g. an icon).
   */
  trigger: React.ReactNode;
  /**
   * The menu items.
   */
  children: React.ReactNode;
}

export interface MenuCheckboxItemProps {
  /**
   * Whether the item is checked.
   */
  checked: boolean;
  /**
   * Called with the new value when the item is toggled.
   */
  onChange: (checked: boolean) => void;
  /**
   * The item label.
   */
  children: React.ReactNode;
}

// Components
const MenuRoot = ({ className, label, trigger, children }: MenuProps) => {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const context = useMemo(
    () => ({ close: () => popoverRef.current?.hidePopover() }),
    []
  );

  // The popover is fixed to the viewport, so close it instead of letting it drift away.
  useEffect(() => {
    if (!open) return;
    const { close } = context;
    window.addEventListener('scroll', close, { capture: true });
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('resize', close);
    };
  }, [open, context]);

  // Handlers
  const handleToggle = (event: React.ToggleEvent<HTMLDivElement>) => {
    const isOpen = event.newState === 'open';
    setOpen(isOpen);
    const triggerElement = triggerRef.current;
    const popover = popoverRef.current;
    if (!isOpen || !triggerElement || !popover) return;
    const rect = triggerElement.getBoundingClientRect();
    popover.style.top = `${String(rect.bottom + 4)}px`;
    popover.style.left = `${String(Math.max(8, rect.right - popover.offsetWidth))}px`;
  };

  // Render
  return (
    <MenuContext value={context}>
      <Button
        ref={triggerRef}
        variant="ghost"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        popoverTarget={id}
      >
        {trigger}
      </Button>
      <div
        ref={popoverRef}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        onToggle={handleToggle}
        className={cx(
          'ui-menu fixed inset-auto m-0 min-w-48 rounded-lg border p-1 shadow-lg',
          'border-gray-200 bg-white text-gray-800',
          'dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200',
          className
        )}
      >
        {children}
      </div>
    </MenuContext>
  );
};

const MenuCheckboxItem = ({
  checked,
  onChange,
  children,
}: MenuCheckboxItemProps) => {
  const context = use(MenuContext);
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={cx(
        'ui-menu-item flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none',
        'hover:bg-gray-100 focus-visible:bg-gray-100',
        'dark:hover:bg-white/10 dark:focus-visible:bg-white/10'
      )}
      onClick={() => {
        onChange(!checked);
        context?.close();
      }}
    >
      <MdCheck className={cx('size-4 shrink-0', !checked && 'invisible')} />
      {children}
    </button>
  );
};

// Compound export
export const Menu = Object.assign(MenuRoot, {
  CheckboxItem: MenuCheckboxItem,
});
