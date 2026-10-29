import { useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdArrowBack,
  MdBatteryFull,
  MdMoreVert,
  MdOutlineArchive,
  MdOutlineDelete,
  MdOutlineDrafts,
  MdOutlineEdit,
  MdOutlineInbox,
  MdOutlineMarkEmailUnread,
  MdOutlineSend,
  MdOutlineStarBorder,
  MdReply,
  MdSearch,
  MdSignalCellularAlt,
  MdWifi,
} from 'react-icons/md';
import { cx } from 'tailwind-variants';
import { isMobileClientViewport, type ViewportSize } from '@/types/viewports';

// Generic, unbranded mail client UI drawn around the rendered email.
const SENDER = { name: 'Your Company', email: 'hello@example.com' };
const DEFAULT_SUBJECT = 'Your email subject';
const FOLDERS: { label: string; Icon: IconType; count?: number }[] = [
  { label: 'Inbox', Icon: MdOutlineInbox, count: 1 },
  { label: 'Starred', Icon: MdOutlineStarBorder },
  { label: 'Sent', Icon: MdOutlineSend },
  { label: 'Drafts', Icon: MdOutlineDrafts },
  { label: 'Trash', Icon: MdOutlineDelete },
];
export const EMAIL_CLIENT_FRAME_SIDEBAR_WIDTH = 200;

// Toolbar icon component for the email client UI.
const ToolbarIcon = ({ Icon, label }: { Icon: IconType; label: string }) => (
  <span title={label} className="grid size-8 place-items-center rounded-full">
    <Icon className="size-5" />
  </span>
);

// Sender row component for the email client UI.
const SenderRow = ({ compact }: { compact: boolean }) => {
  const [date] = useState(() =>
    new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  );
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-600 text-base font-semibold text-white">
        {SENDER.name.charAt(0)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-sm font-semibold">{SENDER.name}</span>
          {!compact && (
            <span className="truncate text-xs text-gray-500">
              &lt;{SENDER.email}&gt;
            </span>
          )}
          {compact && (
            <span className="ml-auto shrink-0 text-xs text-gray-500">
              {date}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">to me</div>
      </div>
      {!compact && (
        <span className="shrink-0 text-xs text-gray-500">{date}</span>
      )}
      <ToolbarIcon Icon={MdReply} label="Reply" />
    </div>
  );
};

// Desktop client frame component for the email client UI.
const DesktopClientFrame = ({
  subject,
  children,
}: {
  subject: string;
  children: React.ReactNode;
}) => (
  <div className="mailblocks-client overflow-hidden rounded-xl">
    <div className="flex items-center gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden>
        <span className="size-3 rounded-full bg-gray-300" />
        <span className="size-3 rounded-full bg-gray-300" />
        <span className="size-3 rounded-full bg-gray-300" />
      </div>
      <div className="flex max-w-md flex-1 items-center gap-2 rounded-full bg-gray-200/70 px-3 py-1.5 text-sm text-gray-500">
        <MdSearch className="size-4" />
        Search mail
      </div>
    </div>
    <div className="flex">
      <nav
        className="shrink-0 border-r border-gray-200 bg-gray-50 p-3"
        style={{ width: EMAIL_CLIENT_FRAME_SIDEBAR_WIDTH }}
      >
        <div className="mb-3 flex w-fit items-center gap-2 rounded-xl bg-sky-100 px-4 py-3 text-sm font-medium text-sky-900">
          <MdOutlineEdit className="size-5" />
          Compose
        </div>
        {FOLDERS.map(({ label, Icon, count }, index) => (
          <div
            key={label}
            className={cx(
              'flex items-center gap-3 rounded-full px-3 py-1.5 text-sm',
              index === 0 ? 'bg-sky-100 font-semibold text-sky-900' : ''
            )}
          >
            <Icon className="size-5" />
            <span className="flex-1">{label}</span>
            {count !== undefined && <span className="text-xs">{count}</span>}
          </div>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 border-b border-gray-200 px-2 py-1 text-gray-600">
          <ToolbarIcon Icon={MdArrowBack} label="Back" />
          <ToolbarIcon Icon={MdOutlineArchive} label="Archive" />
          <ToolbarIcon Icon={MdOutlineDelete} label="Delete" />
          <ToolbarIcon Icon={MdOutlineMarkEmailUnread} label="Mark as unread" />
          <span className="flex-1" />
          <ToolbarIcon Icon={MdMoreVert} label="More" />
        </div>
        <div className="space-y-4 px-5 pt-4 pb-3">
          <h2 className="text-xl font-normal wrap-break-word">
            {subject}
            <span className="ml-2 rounded bg-gray-200 px-1.5 py-0.5 align-middle text-xs text-gray-600">
              Inbox
            </span>
          </h2>
          <SenderRow compact={false} />
        </div>
        {children}
      </div>
    </div>
  </div>
);

// Mobile client frame component for the email client UI.
const MobileClientFrame = ({
  subject,
  children,
}: {
  subject: string;
  children: React.ReactNode;
}) => (
  <div className="mailblocks-client overflow-hidden rounded-xl">
    <div
      className="flex items-center justify-between px-5 pt-2 pb-1 text-xs font-semibold"
      aria-hidden
    >
      <span>9:41</span>
      <span className="flex items-center gap-1">
        <MdSignalCellularAlt />
        <MdWifi />
        <MdBatteryFull className="rotate-90" />
      </span>
    </div>
    <div className="flex items-center gap-1 px-1 py-1 text-gray-700">
      <ToolbarIcon Icon={MdArrowBack} label="Back" />
      <span className="flex-1" />
      <ToolbarIcon Icon={MdOutlineArchive} label="Archive" />
      <ToolbarIcon Icon={MdOutlineDelete} label="Delete" />
      <ToolbarIcon Icon={MdOutlineMarkEmailUnread} label="Mark as unread" />
      <ToolbarIcon Icon={MdMoreVert} label="More" />
    </div>
    <div className="space-y-3 px-4 pt-1 pb-3">
      <h2 className="text-lg leading-snug wrap-break-word">{subject}</h2>
      <SenderRow compact />
    </div>
    {children}
  </div>
);

// Component
export const EmailPreviewClientFrame = ({
  viewport,
  subject,
  children,
}: {
  viewport: ViewportSize;
  subject?: string;
  children: React.ReactNode;
}) => {
  const Client = isMobileClientViewport(viewport)
    ? MobileClientFrame
    : DesktopClientFrame;
  const trimmedSubject = subject?.trim() ?? '';
  return (
    <Client
      subject={trimmedSubject.length > 0 ? trimmedSubject : DEFAULT_SUBJECT}
    >
      {children}
    </Client>
  );
};
