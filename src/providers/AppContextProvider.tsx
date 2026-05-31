import { createContext, use, useMemo, useState } from 'react';
import { demoTemplates } from '@/templates/demoTemplates';
import type { SetValue } from '@/utils/helpers';

// Create a context
type AppContextType = {
  templatesDrawerOpen: boolean;
  setTemplatesDrawerOpen: SetValue<boolean>;
  emailContent: string;
  selectedTemplate: (typeof demoTemplates)[0];
  setSelectedTemplate: SetValue<(typeof demoTemplates)[0]>;
  setEmailContent: SetValue<string>;
  isDirty: boolean;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(demoTemplates[0]);
  const [emailContent, setEmailContent] = useState(selectedTemplate.content);
  const [isDirty, setIsDirty] = useState(false);

  // Create context
  const contextValue: AppContextType = useMemo(
    () => ({
      templatesDrawerOpen,
      setTemplatesDrawerOpen,
      selectedTemplate,
      setSelectedTemplate,
      emailContent,
      setEmailContent: (content) => {
        setEmailContent(content);
        setIsDirty(emailContent !== content);
      },
      isDirty,
    }),
    [templatesDrawerOpen, selectedTemplate, emailContent, isDirty]
  );

  // Render
  return <AppContext value={contextValue}>{children}</AppContext>;
};

/**
 * @returns the global application context value.
 *
 * @throws {Error} if the context is not available.
 */
export function useAppContext() {
  const context = use(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within a AppContextProvider');
  }
  return context;
}
