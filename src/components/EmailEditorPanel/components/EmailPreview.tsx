import { use, useEffect, useMemo, useRef } from 'react';
import { MdMoreVert } from 'react-icons/md';
import { isMobileClientViewport, type ViewportSize } from '@/types/viewports';
import { Menu } from '@/ui/Menu';
import { Stack } from '@/ui/Stack';
import {
  EMAIL_CLIENT_FRAME_SIDEBAR_WIDTH,
  EmailPreviewClientFrame,
} from './EmailPreviewClientFrame';

// The iframe grows to its content, so hide its scrollbar to keep the full viewport width.
const HIDDEN_SCROLLBAR_STYLE =
  '<style>html{scrollbar-width:none}html::-webkit-scrollbar{display:none}</style>';

/**
 * @param html - The exported email HTML.
 * @param extraHead - Extra markup injected at the start of the head.
 * @returns The HTML with a base element targeting new tabs, so links open in a
 * new tab instead of navigating the preview frame.
 */
function withBaseTarget(html: string, extraHead = ''): string {
  const base = `<base target="_blank">${extraHead}`;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head[^>]*>/i, (head) => `${head}${base}`);
  }
  return `${base}${html}`;
}

// Component
export const EmailPreview = ({
  html,
  viewport,
  showEmailClientFrame = false,
  onShowEmailClientFrameChange,
}: {
  html: Promise<string>;
  viewport: ViewportSize;
  showEmailClientFrame?: boolean;
  onShowEmailClientFrameChange?: (showEmailClientFrame: boolean) => void;
}) => {
  const content = use(html);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const subject = useMemo(
    () => new DOMParser().parseFromString(content, 'text/html').title,
    [content]
  );
  const { width } = viewport;
  const canvasWidth =
    showEmailClientFrame && !isMobileClientViewport(viewport)
      ? width + EMAIL_CLIENT_FRAME_SIDEBAR_WIDTH
      : width;

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
  const iframe = (
    <iframe
      ref={iframeRef}
      title="Rendered email"
      className={
        showEmailClientFrame
          ? 'block border-0 bg-white'
          : 'mailblocks-artboard border-0 bg-white'
      }
      style={showEmailClientFrame ? { width } : undefined}
      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" // No scripts; same-origin only so the frame height can be measured.
      srcDoc={withBaseTarget(content, HIDDEN_SCROLLBAR_STYLE)}
      onLoad={fitToContent}
    />
  );
  return (
    <Stack className="relative flex-1">
      <div
        className="mailblocks-workspace absolute inset-0 overflow-auto"
        style={{
          '--mailblocks-canvas-width': `${String(canvasWidth)}px`,
          '--mailblocks-canvas-label': 'none',
        }}
      >
        <div
          className="mx-auto flex items-center justify-between gap-3 pt-2 pb-1.5 transition-[width] duration-200"
          style={{ width: canvasWidth }}
        >
          <span className="text-[11px] text-(--mailblocks-hint)">
            {`Rendered · ${String(width)}px`}
          </span>
          {onShowEmailClientFrameChange && (
            <Menu label="Preview options" trigger={<MdMoreVert />}>
              <Menu.CheckboxItem
                checked={showEmailClientFrame}
                onChange={onShowEmailClientFrameChange}
              >
                Show mail client frame
              </Menu.CheckboxItem>
            </Menu>
          )}
        </div>
        {showEmailClientFrame ? (
          <EmailPreviewClientFrame viewport={viewport} subject={subject}>
            {iframe}
          </EmailPreviewClientFrame>
        ) : (
          iframe
        )}
      </div>
    </Stack>
  );
};
