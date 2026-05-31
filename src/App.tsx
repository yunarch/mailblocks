import { cx } from 'tailwind-variants';
import { AppFooter } from './components/AppFooter/AppFooter';
import { AppHeader } from './components/AppHeader/AppHeader';
import { BlockerModal } from './components/BlockerModal/BlockerModal';
import { EmailChecksPanel } from './components/EmailChecksPanel/EmailChecksPanel';
import { EmailEditorPanel } from './components/EmailEditorPanel/EmailEditorPanel';
import { EmailTemplatesDrawer } from './components/EmailTemplatesDrawer/EmailTemplatesDrawer';
import { useAppContext } from './providers/AppContextProvider';
import { Stack } from './ui/Stack';

export const App = () => {
  const {
    templatesDrawerOpen,
    pendingTemplate,
    cancelTemplateSwitch,
    confirmTemplateSwitch,
  } = useAppContext();
  return (
    <Stack className="min-h-svh w-full">
      <AppHeader />
      <Stack as="main" className="relative flex-1 px-4">
        <EmailTemplatesDrawer />
        <Stack
          className={cx(
            'flex-1 w-full max-w-312 mx-auto py-1 gap-2 border-x border-gray-200 dark:border-white/10',
            templatesDrawerOpen ? 'translate-x-(--templates-push)' : ''
          )}
          style={{
            '--templates-push': templatesDrawerOpen
              ? 'clamp(0px, calc(20rem - max(0px, calc((100vw - 78rem) / 2))), 20rem)'
              : '0px',
          }}
        >
          <Stack className="flex-1 p-2 pb-1">
            <EmailEditorPanel />
          </Stack>
          <EmailChecksPanel />
        </Stack>
      </Stack>
      <AppFooter />
      {pendingTemplate ? (
        <BlockerModal
          title="Unsaved Changes"
          message="You have unsaved changes. Loading a new template will discard your current edits."
          cancelText="Keep editing"
          confirmText="Discard & switch"
          onCancel={cancelTemplateSwitch}
          onConfirm={confirmTemplateSwitch}
        />
      ) : null}
    </Stack>
  );
};
