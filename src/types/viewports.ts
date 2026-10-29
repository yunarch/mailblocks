import type { IconType } from 'react-icons';
import {
  MdOutlineDesktopWindows,
  MdOutlineMonitor,
  MdPhoneIphone,
  MdTabletMac,
} from 'react-icons/md';

export type ViewportSize = {
  id: 'xl' | 'l' | 'm' | 's';
  label: string;
  width: number;
  Icon: IconType;
};

/**
 * @param viewport - The selected viewport.
 * @returns Whether the client is shown as a mobile app instead of a desktop window.
 */
export function isMobileClientViewport(viewport: ViewportSize): boolean {
  return viewport.id === 'm' || viewport.id === 's';
}

// Available viewport sizes for the email client UI.
export const viewportSizes: ViewportSize[] = [
  { id: 'xl', label: 'XL', width: 800, Icon: MdOutlineMonitor },
  { id: 'l', label: 'L', width: 650, Icon: MdOutlineDesktopWindows },
  { id: 'm', label: 'M', width: 480, Icon: MdTabletMac },
  { id: 's', label: 'S', width: 375, Icon: MdPhoneIphone },
];

// Default viewport size for the email client UI.
export const DEFAULT_VIEWPORT_SIZE = viewportSizes[1];
