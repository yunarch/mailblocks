import { createContext, use, useMemo, useState } from 'react';
import type { SetValue } from '@/utils/helpers';

// Create a context
type AppContextType = {
  templatesDrawerOpen: boolean;
  setTemplatesDrawerOpen: SetValue<boolean>;
};
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
export const AppContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [templatesDrawerOpen, setTemplatesDrawerOpen] = useState(false);

  // Create context
  const contextValue: AppContextType = useMemo(
    () => ({
      templatesDrawerOpen,
      setTemplatesDrawerOpen,
    }),
    [templatesDrawerOpen, setTemplatesDrawerOpen]
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
