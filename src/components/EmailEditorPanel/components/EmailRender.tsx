import { use, useEffect, useRef } from 'react';
import type { ViewportSize } from '@/types/viewports';
import { Stack } from '@/ui/Stack';

/**
 * @param html - The exported email HTML.
 * @returns The HTML with a base element targeting new tabs, so links open in a
 * new tab instead of navigating the preview frame.
 */
function withBaseTarget(html: string): string {
  const base = '<base target="_blank">';
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (head) => `${head}${base}`);
  }
  return `${base}${html}`;
}

// Component
export const EmailRender = ({
  html,
  viewportWidth,
}: {
  html: Promise<string>;
  viewportWidth: ViewportSize['width'];
}) => {
  const content = use(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  // Fit the iframe height to the rendered email
  const fitToContent = () => {
    const iframe = iframeRef.current;
    const root = iframe?.contentDocument?.documentElement;
    if (!iframe || !root) return;
    const resize = () => {
      iframe.style.height = `${String(root.scrollHeight)}px`;
    };
    observerRef.current?.disconnect();
    observerRef.current = new ResizeObserver(resize);
    observerRef.current.observe(root);
    resize();
  };

  // Disconnect the resize observer when the component unmounts to avoid memory leaks.
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  // Render
  return (
    <Stack className="relative flex-1">
      <div
        className="mailblocks-workspace absolute inset-0 overflow-auto"
        style={{
          '--mailblocks-canvas-width': `${String(viewportWidth)}px`,
          '--mailblocks-canvas-label': `"Rendered · ${String(viewportWidth)}px"`,
        }}
      >
        <iframe
          ref={iframeRef}
          title="Rendered email"
          className="mailblocks-artboard border-0 bg-white"
          // No scripts; same-origin only so the frame height can be measured.
          sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          srcDoc={withBaseTarget(content)}
          onLoad={fitToContent}
        />
      </div>
    </Stack>
  );
};
