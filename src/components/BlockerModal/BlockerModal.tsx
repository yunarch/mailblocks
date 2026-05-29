export function BlockerModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-neutral-950">
        <h2 className="text-base font-semibold text-gray-950 dark:text-white">
          Unsaved Changes
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-neutral-400">
          You have unsaved changes. Loading new content will discard your
          current edits.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10"
            onClick={onCancel}
          >
            Keep editing
          </button>
          <button
            type="button"
            className="h-9 cursor-pointer rounded-md bg-gray-950 px-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
            onClick={onConfirm}
          >
            Discard & switch
          </button>
        </div>
      </section>
    </div>
  );
}
