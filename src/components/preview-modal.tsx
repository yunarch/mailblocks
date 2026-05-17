import { useCallback, useState } from 'react';

export function PreviewModal({
  html,
  onClose,
}: {
  html: string;
  onClose: () => void;
}) {
  const [view, setView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(() => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'email.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [html]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [html]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className="flex h-[85vh] w-[90vw] max-w-4xl flex-col rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={() => {}}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold">Email Preview</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('preview')}
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === 'preview'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => setView('code')}
              className={`rounded-md px-3 py-1.5 text-sm ${
                view === 'code'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              HTML
            </button>
            <div className="mx-1 h-6 w-px bg-gray-200" />
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200"
            >
              {copied ? 'Copied!' : 'Copy HTML'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              Download .html
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 rounded-md p-1.5 hover:bg-gray-100"
              aria-label="Close preview"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          {view === 'preview' ? (
            <div className="mx-auto max-w-[700px] rounded-lg bg-white shadow-sm">
              <iframe
                srcDoc={html}
                className="min-h-[500px] w-full rounded-lg border-0"
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <pre className="h-full overflow-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
              <code>{html}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
