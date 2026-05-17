import { FaGithub } from 'react-icons/fa';
import { MdDarkMode, MdOutlineLightMode } from 'react-icons/md';
import { twJoin } from 'tailwind-merge';
import { useTheme } from '@/hooks/useTheme';

export const Header = () => {
  const [theme, toggleTheme] = useTheme();
  return (
    <header
      className={twJoin(
        'sticky top-0 z-50 w-full border-b backdrop-blur-md',
        'border-gray-200 bg-white/80',
        'dark:border-white/10 dark:bg-black/80'
      )}
    >
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <h1 className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-tight">
            📧 Mailblocks
          </span>
          <span className="hidden text-xs font-normal text-gray-400 sm:inline dark:text-neutral-500">
            | Email template editor powered by React Email
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
