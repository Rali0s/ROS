import {
  Binary,
  BookMarked,
  CalendarDays,
  Contact2,
  Globe2,
  Orbit,
  PackageSearch,
  Radar,
  ScrollText,
  Shield,
  WalletCards,
} from 'lucide-react';

const wallpaperOne = new URL('../../HD/wallpaper-one.png', import.meta.url).href;
const wallpaperTwo = new URL('../../HD/wallpaper-two.png', import.meta.url).href;
const wallpaperThree = new URL('../../HD/wallpaper-three.png', import.meta.url).href;
const wallpaperFour = new URL('../../HD/wallpaper-four.png', import.meta.url).href;
const splashOne = new URL('../../HD/Splash-01.png', import.meta.url).href;
export const BRAND_LOGO = '/osa-midnight-oil-logo.png';

export const WALLPAPERS = [
  {
    id: 'violet-surge',
    title: 'Violet Surge',
    description: 'Purple wire-burst with the OSA ROS Console signature.',
    image: wallpaperOne,
  },
  {
    id: 'monochrome-grid',
    title: 'Monochrome Grid',
    description: 'Black-and-white wire sweep with a stealth console finish.',
    image: wallpaperTwo,
  },
  {
    id: 'terminal-rain',
    title: 'Terminal Rain',
    description: 'Green ROS-Terminal skyline with matrix-style signal falloff.',
    image: wallpaperThree,
  },
  {
    id: 'neon-rooftop',
    title: 'Neon Rooftop',
    description: 'Violet rooftop city scene with a bright midnight-glow horizon.',
    image: wallpaperFour,
  },
];

export const getWallpaperById = (wallpaperId) =>
  WALLPAPERS.find((wallpaper) => wallpaper.id === wallpaperId) ?? WALLPAPERS[0];

export const getDesktopBackgroundStyle = (wallpaperId) => {
  const wallpaper = getWallpaperById(wallpaperId);

  return {
    backgroundImage: `
      linear-gradient(180deg, rgba(2,6,23,0.66) 0%, rgba(2,6,23,0.78) 100%),
      radial-gradient(circle at top, rgba(249,115,22,0.12), transparent 32%),
      url(${wallpaper.image})
    `,
    backgroundSize: 'cover, cover, cover',
    backgroundPosition: 'center, center, center',
    backgroundRepeat: 'no-repeat, no-repeat, no-repeat',
  };
};

export const BOOT_SPLASH = {
  id: 'citadel-noir',
  title: 'Citadel Noir',
  subtitle: 'Cyberpunk Init',
  image: splashOne,
};

export const SYSTEM_THEME = {
  name: 'OSA: Midnight Oil',
  shortName: 'OSA',
  accentLabel: 'Midnight Oil',
  bg: 'bg-slate-950',
  windowBg: 'bg-slate-950/96',
  panelBg: 'bg-slate-900/85',
  border: 'border-amber-500/20',
  borderStrong: 'border-amber-400/30',
  accentText: 'text-amber-300',
  mutedText: 'text-slate-400',
};

const roomyWindow = (width, height) => ({
  w: `min(${width}px, calc(100vw - 190px))`,
  h: `min(${height}px, calc(100vh - 150px))`,
});

export const APP_ORDER = [
  'overview',
  'calendar',
  'notes',
  'profiles',
  'flow-studio',
  'bookmarks',
  'inventory',
  'wallet-vault',
  'clocks',
  'console',
  'control-room',
];

export const APPS = {
  overview: {
    id: 'overview',
    title: 'Overview',
    icon: Radar,
    component: 'OverviewApp',
    description: 'Midnight snapshot for notes, references, and local state.',
    category: 'core',
    defaultSize: roomyWindow(1120, 760),
    defaultFrame: { w: 1120, h: 760 },
    iconTone: 'border-amber-400/25 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
  },
  calendar: {
    id: 'calendar',
    title: 'Calendar',
    icon: CalendarDays,
    component: 'CalendarApp',
    description: 'Plan dates, events, checkpoints, and time-blocked work.',
    category: 'core',
    defaultSize: roomyWindow(1320, 860),
    defaultFrame: { w: 1320, h: 860 },
    iconTone: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200 shadow-indigo-500/10',
  },
  notes: {
    id: 'notes',
    title: 'Vault Notes',
    icon: ScrollText,
    component: 'NotesApp',
    description: 'Markdown notes with live capture and quick templates.',
    category: 'core',
    defaultSize: roomyWindow(1320, 860),
    defaultFrame: { w: 1320, h: 860 },
    iconTone: 'border-orange-400/25 bg-orange-500/10 text-orange-200 shadow-orange-500/10',
  },
  profiles: {
    id: 'profiles',
    title: 'Profile Organizer',
    icon: Contact2,
    component: 'ProfileOrganizerApp',
    description: 'Track identities, mailboxes, logins, VPN zones, and PGP keysets.',
    category: 'vault',
    defaultSize: roomyWindow(1380, 860),
    defaultFrame: { w: 1380, h: 860 },
    iconTone: 'border-teal-400/25 bg-teal-500/10 text-teal-200 shadow-teal-500/10',
  },
  'flow-studio': {
    id: 'flow-studio',
    title: 'Flow Studio',
    icon: Orbit,
    component: 'FlowStudioApp',
    description: 'Wireframe charts for network, service, and workflow flows.',
    category: 'mapping',
    defaultSize: roomyWindow(1320, 860),
    defaultFrame: { w: 1320, h: 860 },
    iconTone: 'border-violet-400/25 bg-violet-500/10 text-violet-200 shadow-violet-500/10',
  },
  bookmarks: {
    id: 'bookmarks',
    title: 'Bookmarks',
    icon: BookMarked,
    component: 'BookmarksApp',
    description: 'Saved links for references, docs, and recurring tools.',
    category: 'reference',
    defaultSize: roomyWindow(1040, 720),
    defaultFrame: { w: 1040, h: 720 },
    iconTone: 'border-sky-400/25 bg-sky-500/10 text-sky-200 shadow-sky-500/10',
  },
  inventory: {
    id: 'inventory',
    title: 'Inventory',
    icon: PackageSearch,
    component: 'InventoryApp',
    description: 'Track software, systems, methodologies, and gear.',
    category: 'reference',
    defaultSize: roomyWindow(1160, 760),
    defaultFrame: { w: 1160, h: 760 },
    iconTone: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10',
  },
  'wallet-vault': {
    id: 'wallet-vault',
    title: 'Wallet Vault',
    icon: WalletCards,
    component: 'WalletVaultApp',
    description: 'Store addresses and locally encrypted recovery material.',
    category: 'vault',
    defaultSize: roomyWindow(1240, 820),
    defaultFrame: { w: 1240, h: 820 },
    iconTone: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  },
  clocks: {
    id: 'clocks',
    title: 'World Clocks',
    icon: Globe2,
    component: 'ClocksApp',
    description: 'Keep local and global timing visible at a glance.',
    category: 'utility',
    defaultSize: roomyWindow(980, 700),
    defaultFrame: { w: 980, h: 700 },
    iconTone: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200 shadow-fuchsia-500/10',
  },
  console: {
    id: 'console',
    title: 'Midnight Console',
    icon: Binary,
    component: 'TerminalApp',
    description: 'Local command console with no AI and no network actions.',
    category: 'utility',
    defaultSize: roomyWindow(1020, 660),
    defaultFrame: { w: 1020, h: 660 },
    iconTone: 'border-lime-400/25 bg-lime-500/10 text-lime-200 shadow-lime-500/10',
  },
  'control-room': {
    id: 'control-room',
    title: 'Control Room',
    icon: Shield,
    component: 'SettingsApp',
    description: 'Workspace settings, export/import, and wipe controls.',
    category: 'system',
    defaultSize: roomyWindow(1140, 780),
    defaultFrame: { w: 1140, h: 780 },
    iconTone: 'border-rose-400/25 bg-rose-500/10 text-rose-200 shadow-rose-500/10',
  },
};

export const WINDOW_STATES = {
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  NORMAL: 'normal',
};
