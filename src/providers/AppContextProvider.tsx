import type { EmailEditorRef } from '@react-email/editor';
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EmailTemplate } from '@/types/templates';
import type { SetValue } from '@/utils/helpers';
import { generatedReactEmailTemplates } from '@/utils/templates';

// Create a context
type AppContextType = {
  editorRef: React.RefObject<EmailEditorRef | null>;
  templatesDrawerOpen: boolean;
  setTemplatesDrawerOpen: SetValue<boolean>;
  selectedTemplate: EmailTemplate;
  setSelectedTemplate: SetValue<EmailTemplate>;
  emailContent: string;
  setEmailContent: SetValue<string>;
  pendingTemplate: EmailTemplate | null;
  isDirty: boolean;
  selectTemplate: (template: EmailTemplate) => void;
  markEmailDirty: () => void;
  cancelTemplateSwitch: () => void;
  confirmTemplateSwitch: () => void;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const editorRef = useRef<EmailEditorRef>(null);
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(
    generatedReactEmailTemplates[0]
  );
  const [emailContent, setEmailContent] = useState(selectedTemplate.content);
  const [pendingTemplate, setPendingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);

  // Methods
  const loadTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEmailContent(template.content);
    setIsDirty(false);
  }, []);
  const selectTemplate = useCallback(
    (template: EmailTemplate) => {
      if (template.id === selectedTemplate.id) return;
      if (isDirty) {
        setPendingTemplate(template);
        return;
      }
      loadTemplate(template);
    },
    [isDirty, loadTemplate, selectedTemplate.id]
  );
  const markEmailDirty = useCallback(() => {
    setIsDirty(true);
  }, []);
  const cancelTemplateSwitch = useCallback(() => {
    setPendingTemplate(null);
  }, []);
  const confirmTemplateSwitch = useCallback(() => {
    if (!pendingTemplate) return;
    loadTemplate(pendingTemplate);
    setPendingTemplate(null);
  }, [loadTemplate, pendingTemplate]);

  // Create context
  const contextValue: AppContextType = useMemo(
    () => ({
      editorRef,
      templatesDrawerOpen,
      setTemplatesDrawerOpen,
      selectedTemplate,
      setSelectedTemplate,
      setEmailContent,
      pendingTemplate,
      emailContent,
      isDirty,
      selectTemplate,
      markEmailDirty,
      cancelTemplateSwitch,
      confirmTemplateSwitch,
    }),
    [
      editorRef,
      templatesDrawerOpen,
      selectedTemplate,
      pendingTemplate,
      emailContent,
      isDirty,
      selectTemplate,
      markEmailDirty,
      cancelTemplateSwitch,
      confirmTemplateSwitch,
    ]
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
