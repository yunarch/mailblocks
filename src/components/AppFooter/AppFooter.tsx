import { Divider } from '@/ui/Dividier';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';

export const AppFooter = () => {
  return (
    <footer className="sticky bottom-0 border-t border-gray-200 px-4 dark:border-white/10">
      <div className="mx-auto max-w-312 border-x border-gray-200 px-4 py-3 dark:border-white/10">
        <Stack className="flex-row items-center justify-between">
          <Typography
            link
            href="https://github.com/yunarch"
            target="_blank"
            rel="noopener noreferrer"
            variant="bodySm"
          >
            by @yunarch
          </Typography>
          <Stack
            className="flex-row items-center justify-between gap-1"
            separator={<Divider orientation="vertical" className="h-3" />}
          >
            <Typography
              link
              href="https://react.email/"
              target="_blank"
              rel="noopener noreferrer"
              variant="bodySm"
            >
              Powered by React Email
            </Typography>
            <Typography
              link
              href="https://github.com/resend/react-email/tree/main/apps/demo/emails"
              target="_blank"
              rel="noopener noreferrer"
              variant="bodySm"
            >
              Demo templates
            </Typography>
          </Stack>
        </Stack>
      </div>
    </footer>
  );
};
