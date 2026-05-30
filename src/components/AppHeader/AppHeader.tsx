import { FaGithub } from 'react-icons/fa';
import {
  MdClose,
  MdDarkMode,
  MdMenu,
  MdOutlineLightMode,
} from 'react-icons/md';
import { twJoin } from 'tailwind-merge';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/providers/AppContextProvider';

export const AppHeader = () => {
  const [theme, toggleTheme] = useTheme();
  const { templatesDrawerOpen, setTemplatesDrawerOpen } = useAppContext();
  return (
    <header
      className={twJoin(
        'sticky top-0 z-50 w-full border-b backdrop-blur-md',
        'border-gray-200 bg-white/80',
        'dark:border-white/10 dark:bg-black/80'
      )}
    >
      <div className="mx-auto flex h-12 w-full max-w-312 items-center justify-between border-x border-gray-200 px-4 dark:border-white/10">
        <h1 className="flex min-w-0 items-center gap-2.5">
          <button
            aria-label={
              templatesDrawerOpen ? 'Close templates' : 'Open templates'
            }
            type="button"
            className={twJoin(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md',
              'text-gray-600 transition-colors hover:bg-gray-100 hover:text-black',
              'dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white'
            )}
            onClick={() => {
              setTemplatesDrawerOpen((prev) => !prev);
            }}
          >
            {templatesDrawerOpen ? <MdClose size={18} /> : <MdMenu size={18} />}
          </button>
          <span className="text-sm font-semibold">📧 Mailblocks</span>
          <span className="hidden text-xs font-normal text-gray-400 sm:inline dark:text-neutral-500">
            | Email template editor
          </span>
        </h1>
        <div className="flex items-center gap-1">
          <button
            className={twJoin(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md',
              'text-gray-600 transition-colors hover:bg-gray-100 hover:text-black',
              'dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white'
            )}
            type="button"
            onClick={() => {
              toggleTheme();
            }}
          >
            {theme === 'dark' ? (
              <MdDarkMode size={16} />
            ) : (
              <MdOutlineLightMode size={16} />
            )}
          </button>
          <div className="flex items-center gap-0.5">
            <span className="h-3 w-px bg-gray-300 dark:bg-slate-600" />
            <a
              href="https://github.com/yunarch/mailblocks"
              className={twJoin(
                'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md',
                'text-gray-600 transition-colors hover:bg-gray-100 hover:text-black',
                'dark:text-neutral-400 dark:hover:bg-white/10 dark:hover:text-white'
              )}
            >
              <FaGithub size={16} />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
