import { EmailEditor, type EmailEditorRef } from '@react-email/editor';
import { useRef } from 'react';
import { Header } from './components/Header/Header';

const defaultContent = `
  <h1>Welcome</h1>
  <p>
    Start editing your email template. Select text to format it,
    or type <strong>/</strong> for slash commands.
  </p>
`;

export const App = () => {
  const editorRef = useRef<EmailEditorRef>(null);
  return (
    <div className="min-h-svh w-full bg-gray-100 dark:bg-slate-800">
      <Header />
      <div className="relative mx-auto flex max-w-5xl justify-between gap-4 px-4">
        <div className="flex-1">
          <EmailEditor ref={editorRef} content={defaultContent} theme="basic" />
        </div>
      </div>
    </div>
  );
};
