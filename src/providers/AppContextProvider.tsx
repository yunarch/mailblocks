import type { EmailEditorRef } from '@react-email/editor';
import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EmailTemplate } from '@/types/templates';
import type { EmailVariable } from '@/types/variables';
import type { SetValue } from '@/utils/helpers';
import { generatedReactEmailTemplates } from '@/utils/templates';

// Create a context
type AppContextType = {
  editorRef: React.RefObject<EmailEditorRef | null>;
  editorVersion: number;
  markEditorReady: () => void;
  templatesDrawerOpen: boolean;
  setTemplatesDrawerOpen: SetValue<boolean>;
  selectedTemplate: EmailTemplate;
  setSelectedTemplate: SetValue<EmailTemplate>;
  emailContent: string;
  setEmailContent: SetValue<string>;
  variables: EmailVariable[];
  setVariables: SetValue<EmailVariable[]>;
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
  const [editorVersion, setEditorVersion] = useState(0); // Incremented each time an editor instance becomes ready (initial mount and template switches).
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(
    generatedReactEmailTemplates[0]
  );
  const [emailContent, setEmailContent] = useState(selectedTemplate.content);
  const [variables, setVariables] = useState<EmailVariable[]>([]); // Sample values, plus variables added before they are used in the email.
  const [pendingTemplate, setPendingTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [isDirty, setIsDirty] = useState(false);

  // Methods
  const markEditorReady = useCallback(() => {
    setEditorVersion((version) => version + 1);
  }, []);
  const loadTemplate = useCallback((template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEmailContent(template.content);
    setVariables([]);
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
      editorVersion,
      markEditorReady,
      templatesDrawerOpen,
      setTemplatesDrawerOpen,
      selectedTemplate,
      setSelectedTemplate,
      setEmailContent,
      variables,
      setVariables,
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
      editorVersion,
      markEditorReady,
      templatesDrawerOpen,
      selectedTemplate,
      variables,
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
