import { cx } from 'tailwind-variants';
import { useAppContext } from '@/providers/AppContextProvider';
import type { EmailTemplate } from '@/types/templates';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { generatedReactEmailTemplates } from '@/utils/templates';
import { TemplateItem } from './components/TemplateItem';

export const EmailTemplatesDrawer = () => {
  const { templatesDrawerOpen: isOpen } = useAppContext();
  const groups = Object.entries(
    Object.groupBy(
      generatedReactEmailTemplates,
      (template) => template.category
    )
  ).filter((entry): entry is [string, EmailTemplate[]] => Boolean(entry[1]));

  // Render
  return (
    <aside
      className={cx(
        'absolute inset-y-0 left-0 z-40 w-[320px] py-2 border-r transition-transform duration-200',
        'border-gray-200 bg-white shadow-2xl shadow-black/10',
        'dark:border-white/10 dark:bg-neutral-950 dark:shadow-black/40',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <Stack className="flex h-full flex-col gap-4">
        <Stack className="gap-1 px-4">
          <Typography variant="h2">Templates</Typography>
          <Stack className="flex-row gap-1">
            <Typography
              link
              href="https://github.com/resend/react-email/tree/main/apps/demo/emails"
              target="_blank"
              rel="noopener noreferrer"
              variant="bodySm"
            >
              React Email demos
            </Typography>
            <Typography variant="bodySm" tone="muted">
              rendered into editable HTML.
            </Typography>
          </Stack>
        </Stack>
        <Stack className="flex-1 gap-4 overflow-y-auto px-4">
          {groups.map(([category, categoryTemplates]) => (
            <TemplateItem
              key={category}
              category={category}
              categoryTemplates={categoryTemplates}
            />
          ))}
        </Stack>
      </Stack>
    </aside>
  );
};
