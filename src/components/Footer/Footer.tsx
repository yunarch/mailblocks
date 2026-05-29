export function Footer() {
  return (
    <footer className="border-t border-gray-200 px-4 text-xs text-gray-500 dark:border-white/10 dark:text-neutral-500">
      <div className="mx-auto flex h-12 w-full max-w-312 items-center justify-between border-x border-gray-200 px-4 dark:border-white/10">
        <span className="flex items-center gap-2">
          <a
            className="transition-colors hover:text-gray-950 dark:hover:text-white"
            href="https://github.com/yunarch"
            target="_blank"
            rel="noopener noreferrer"
          >
            By @yunarch
          </a>
        </span>
        <span className="flex items-center gap-2">
          <a
            className="transition-colors hover:text-gray-950 dark:hover:text-white"
            href="https://react.email/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Powered by React Email
          </a>
          <span className="h-3 w-px bg-gray-300 dark:bg-white/10" />
          <a
            className="transition-colors hover:text-gray-950 dark:hover:text-white"
            href="https://github.com/resend/react-email/tree/main/apps/demo/emails"
            target="_blank"
            rel="noopener noreferrer"
          >
            Demo templates
          </a>
        </span>
      </div>
    </footer>
  );
}
