import { Editor } from './components/Editor/Editor';
import { Header } from './components/Header/Header';

export const App = () => {
  return (
    <div className="min-h-svh w-full bg-white dark:bg-black">
      <Header />
      <div className="relative mx-auto flex max-w-5xl justify-between gap-4 px-4">
        <div className="flex-1">
          <Editor />
        </div>
      </div>
    </div>
  );
};
