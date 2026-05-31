import { FaGithub } from 'react-icons/fa';
import {
  MdClose,
  MdDarkMode,
  MdMenu,
  MdOutlineLightMode,
} from 'react-icons/md';
import { useTheme } from '@/hooks/useTheme';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';
import { Divider } from '@/ui/Divider';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

export const AppHeader = () => {
  const [theme, toggleTheme] = useTheme();
  const { templatesDrawerOpen, setTemplatesDrawerOpen } = useAppContext();
  return (
    <header className="sticky top-0 border-b border-gray-200 px-4 dark:border-white/10">
      <div className="mx-auto max-w-312 border-x border-gray-200 px-2 py-1 dark:border-white/10">
        <Stack className="flex-row items-center justify-between">
          <Stack className="flex-row items-center gap-1">
            <Button
              aria-label={
                templatesDrawerOpen ? 'Close templates' : 'Open templates'
              }
              variant="ghost"
              onClick={() => {
                setTemplatesDrawerOpen((prev) => !prev);
              }}
            >
              {templatesDrawerOpen ? <MdClose /> : <MdMenu />}
            </Button>
            <Typography as="h1" variant="body" className="font-semibold">
              Mailblocks
            </Typography>
            <Typography variant="bodySm" tone="muted">
              | Email template editor for developers
            </Typography>
          </Stack>
          <Stack
            className="flex-row items-center gap-1"
            separator={<Divider orientation="vertical" className="h-3" />}
          >
            <Button
              aria-label="Toggle Theme"
              variant="ghost"
              onClick={() => {
                toggleTheme();
              }}
            >
              {theme === 'dark' ? <MdDarkMode /> : <MdOutlineLightMode />}
            </Button>
            <Button
              link
              aria-label="GitHub Repository"
              variant="ghost"
              href="https://github.com/yunarch/mailblocks"
            >
              <FaGithub />
            </Button>
          </Stack>
        </Stack>
      </div>
    </header>
  );
};
