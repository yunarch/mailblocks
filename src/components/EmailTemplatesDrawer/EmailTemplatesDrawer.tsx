import { twJoin } from 'tailwind-merge';
import { useAppContext } from '@/providers/AppContextProvider';
import { demoTemplates } from '@/templates/demoTemplates';
import type { EmailTemplate } from '@/templates/types';
import { TemplateThumbnail } from './components/TemplateThumbnail';

export const EmailTemplatesDrawer = () => {
  const {
    templatesDrawerOpen: isOpen,
    selectedTemplate,
    setSelectedTemplate,
    setEmailContent,
  } = useAppContext();
  const groups = demoTemplates.reduce<Record<string, EmailTemplate[]>>(
    (acc, template) => {
      acc[template.category] ??= [];
      acc[template.category].push(template);
      return acc;
    },
    {}
  );

  // Render
  return (
    <aside
      aria-label="Templates"
      className={twJoin(
        'absolute inset-y-0 left-0 z-40 w-[320px] border-r transition-transform duration-200',
        'border-gray-200 bg-white shadow-2xl shadow-black/10',
        'dark:border-white/10 dark:bg-neutral-950 dark:shadow-black/40',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="px-4">
          <h2 className="text-lg font-semibold text-gray-950 dark:text-white">
            Templates
          </h2>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-neutral-500">
            <a
              className="text-gray-400 underline decoration-gray-300 decoration-1 transition-colors hover:text-gray-600 dark:text-neutral-500 dark:decoration-neutral-600 dark:hover:text-neutral-300"
              href="https://github.com/resend/react-email/tree/main/apps/demo/emails"
              target="_blank"
              rel="noopener noreferrer"
            >
              React Email demos
            </a>
            <span> rendered into editable HTML.</span>
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {Object.entries(groups).map(([category, categoryTemplates]) => {
            return (
              <section key={category} className="mb-5">
                <h3 className="mb-2 text-xs font-medium text-gray-400 uppercase dark:text-neutral-500">
                  {category}
                </h3>
                <div className="grid gap-2">
                  {categoryTemplates.map((template) => {
                    const isSelected = template.id === selectedTemplate.id;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        className={twJoin(
                          'group flex w-full cursor-pointer items-start gap-3 rounded-md border p-2.5 text-left transition-colors',
                          isSelected
                            ? 'border-gray-950 bg-gray-950 text-white dark:border-white dark:bg-white dark:text-black'
                            : 'border-gray-200 bg-white text-gray-950 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:bg-white/3 dark:text-white dark:hover:border-white/20 dark:hover:bg-white/6'
                        )}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setEmailContent(template.content);
                        }}
                      >
                        <TemplateThumbnail template={template} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {template.name}
                          </span>
                          <span
                            className={twJoin(
                              'mt-1 block text-xs leading-4',
                              isSelected
                                ? 'text-white/70 dark:text-black/60'
                                : 'text-gray-500 dark:text-neutral-500'
                            )}
                          >
                            {template.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
