import { EmailEditor, type EmailEditorRef } from '@react-email/editor';
import { useRef } from 'react';
import { defaultTemplate } from '@/templates/default';

export const Editor = () => {
  const editorRef = useRef<EmailEditorRef>(null);
  return (
    <EmailEditor ref={editorRef} content={defaultTemplate} theme="basic" />
  );
};
