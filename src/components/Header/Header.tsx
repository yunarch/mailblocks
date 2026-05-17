import { FaGithub } from 'react-icons/fa';
import { MdDarkMode, MdOutlineLightMode } from 'react-icons/md';
import { twJoin } from 'tailwind-merge';
import { useTheme } from '@/hooks/useTheme';

export const Header = () => {
  const [theme, toggleTheme] = useTheme();
  return (
    <header className="relative mx-auto flex max-w-5xl justify-between gap-4 px-4 py-8">
      <h1 className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight">📧 Mailblocks</span>
        <span className="text-xs text-gray-400">
          | Email template editor powered by React Email
        </span>
      </h1>
      <div className="flex items-center gap-2">
        <button
          className={twJoin(
            'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-2',
            'transition-all duration-200 hover:bg-gray-300 dark:hover:bg-slate-600'
          )}
          type="button"
          onClick={() => {
            toggleTheme();
          }}
        >
          {theme === 'dark' ? <MdDarkMode /> : <MdOutlineLightMode />}
        </button>
        <div className="flex items-center gap-0.5">
          <span className="h-3 w-px bg-gray-300 dark:bg-slate-600" />
          <a
            href="https://github.com/yunarch/mailblocks"
            className={twJoin(
              'flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-2',
              'transition-all duration-200 hover:bg-gray-300 dark:hover:bg-slate-600'
            )}
          >
            <FaGithub />
          </a>
        </div>
      </div>
    </header>
  );
};
