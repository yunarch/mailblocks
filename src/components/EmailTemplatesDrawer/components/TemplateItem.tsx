import { cx } from 'tailwind-variants';
import { useAppContext } from '@/providers/AppContextProvider';
import { EmailTemplate } from '@/templates/types';
import { Stack } from '@/ui/Stack';
import { Typography } from '@/ui/Typography';
import { TemplateItemThumbnail } from './TemplateItemThumbnail';

export const TemplateItem = ({
  category,
  categoryTemplates,
}: {
  category: string;
  categoryTemplates: EmailTemplate[];
}) => {
  const { selectedTemplate, setSelectedTemplate, setEmailContent } =
    useAppContext();
  return (
    <Stack className="gap-2">
      <Typography as="h3" variant="label" tone="subtle" uppercase>
        {category}
      </Typography>
      <Stack className="gap-2">
        {categoryTemplates.map((template) => {
          const isSelected = template.id === selectedTemplate.id;
          return (
            <button
              key={template.id}
              type="button"
              className={cx(
                'flex flex-row w-full cursor-pointer items-start gap-3 rounded-md border p-2.5 text-left transition-colors',
                isSelected
                  ? 'border-gray-950 dark:border-white '
                  : 'border-transparent hover:border-gray-300 dark:hover:border-white/50'
              )}
              onClick={() => {
                setSelectedTemplate(template);
                setEmailContent(template.content);
              }}
            >
              <TemplateItemThumbnail template={template} />
              <Stack className="gap-1">
                <Typography variant="body">{template.name}</Typography>
                <Typography variant="caption" tone="subtle">
                  {template.description}
                </Typography>
              </Stack>
            </button>
          );
        })}
      </Stack>
    </Stack>
  );
};
