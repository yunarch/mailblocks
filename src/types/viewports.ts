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

export const viewportSizes: ViewportSize[] = [
  { id: 'xl', label: 'XL', width: 800, Icon: MdOutlineMonitor },
  { id: 'l', label: 'L', width: 650, Icon: MdOutlineDesktopWindows },
  { id: 'm', label: 'M', width: 480, Icon: MdTabletMac },
  { id: 's', label: 'S', width: 375, Icon: MdPhoneIphone },
];

export const DEFAULT_VIEWPORT_SIZE = viewportSizes[1];
