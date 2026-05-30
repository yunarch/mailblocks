import {
  MdOutlineDesktopWindows,
  MdDevices,
  MdPhoneIphone,
  MdTabletMac,
} from 'react-icons/md';

export type ViewportSize = {
  id: 'xl' | 'l' | 'm' | 's';
  label: string;
  width: number;
  icon: React.ReactElement;
};

export const viewportSizes: ViewportSize[] = [
  { id: 'xl', label: 'XL', width: 960, icon: <MdDevices /> },
  { id: 'l', label: 'L', width: 600, icon: <MdOutlineDesktopWindows /> },
  { id: 'm', label: 'M', width: 480, icon: <MdTabletMac /> },
  { id: 's', label: 'S', width: 375, icon: <MdPhoneIphone /> },
];
