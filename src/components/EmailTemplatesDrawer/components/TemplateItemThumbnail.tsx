import type { EmailTemplate } from '@/types/templates';

/**
 * Creates a thumbnail document for the given content.
 * If the content already contains an `html` tag, it returns the content as is.
 * Otherwise, it wraps the content in a basic HTML structure with some default styles
 * to ensure it displays correctly in the thumbnail iframe.
 *
 * @param content - The HTML content to create a thumbnail for.
 * @returns A complete HTML document as a string, suitable for use in an iframe srcDoc.
 */
function createThumbnailDocument(content: string) {
  if (content.toLowerCase().includes('<html')) return content;
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          html,
          body {
            width: 600px;
            min-height: 420px;
            margin: 0;
            overflow: hidden;
            background: #ffffff;
            color: #111827;
            font-family: Arial, sans-serif;
          }

          * {
            box-sizing: border-box;
          }
        </style>
      </head>
      <body>${content}</body>
    </html>
  `;
}

// Component
export const TemplateItemThumbnail = ({
  template,
}: {
  template: EmailTemplate;
}) => {
  return (
    <span className="relative mt-0.5 h-16 w-20 shrink-0 overflow-hidden rounded border border-gray-200 bg-white dark:border-white/10">
      <iframe
        className="pointer-events-none absolute top-0 left-0 h-105 w-150 origin-top-left scale-[0.1334] border-0 bg-white"
        srcDoc={createThumbnailDocument(template.content)}
        title={`${template.name} thumbnail`}
        loading="lazy"
        sandbox=""
        tabIndex={-1}
      />
    </span>
  );
};
