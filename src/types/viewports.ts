import { IconType } from 'react-icons';
import {
  MdOutlineDesktopWindows,
  MdPhoneIphone,
  MdTabletMac,
} from 'react-icons/md';

export type ViewportSize = {
  id: 'l' | 'm' | 's';
  label: string;
  width: number;
  Icon: IconType;
};

export const viewportSizes: ViewportSize[] = [
  { id: 'l', label: 'L', width: 600, Icon: MdOutlineDesktopWindows },
  { id: 'm', label: 'M', width: 480, Icon: MdTabletMac },
  { id: 's', label: 'S', width: 375, Icon: MdPhoneIphone },
];
