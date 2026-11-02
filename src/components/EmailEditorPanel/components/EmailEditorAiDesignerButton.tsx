import { useState } from 'react';
import { MdOutlineAutoAwesome } from 'react-icons/md';
import { EmailDesignerAiDrawer } from '@/components/EmailDesignerAiDrawer/EmailDesignerAiDrawer';
import { useAppContext } from '@/providers/AppContextProvider';
import { Button } from '@/ui/Button';

// Component
export const EmailEditorAiDesignerButton = ({
  isEditing,
}: {
  isEditing: boolean;
}) => {
  const { templatesDrawerOpen, setTemplatesDrawerOpen } = useAppContext();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        aria-label="Design with AI"
        title="Design with AI"
        aria-expanded={open}
        onClick={() => {
          // Both drawers slide in from the left, so the templates drawer gives way.
          if (templatesDrawerOpen) {
            setTemplatesDrawerOpen(false);
            setOpen(true);
            return;
          }
          setOpen((value) => !value);
        }}
      >
        <MdOutlineAutoAwesome />
      </Button>
      <EmailDesignerAiDrawer
        open={open && isEditing && !templatesDrawerOpen}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
};
