import {
  Binary,
  BookOpen,
  BookMarked,
  CalendarDays,
  Contact2,
  FlaskConical,
  Globe2,
  KeyRound,
  Network,
  Orbit,
  PackageSearch,
  Radar,
  Radio,
  ScrollText,
  Shield,
  WalletCards,
} from 'lucide-react';

const wallpaperOne = new URL('../../HD/wallpaper-one.png', import.meta.url).href;
const wallpaperTwo = new URL('../../HD/wallpaper-two.png', import.meta.url).href;
const wallpaperThree = new URL('../../HD/wallpaper-three.png', import.meta.url).href;
const wallpaperFour = new URL('../../HD/wallpaper-four.png', import.meta.url).href;
const wallpaperFive = new URL('../../HD/wallpaper-five.png', import.meta.url).href;
const midnightOilWallpaperOne = new URL('../../HD/Midnight_Oil/State-One-Wallpaper.png', import.meta.url).href;
const midnightOilWallpaperTwo = new URL('../../HD/Midnight_Oil/State-Two-Wallpaper.png', import.meta.url).href;
const midnightOilLoginScreen = new URL('../../HD/Midnight_Oil/Login-Screen.png', import.meta.url).href;
const midnightOilLockScreen = new URL('../../HD/Midnight_Oil/Lock-Screen.png', import.meta.url).href;
const midnightOilOverlaySteam = new URL('../../HD/Midnight_Oil/Overlay-Steam.png', import.meta.url).href;
const midnightOilPipeHero = new URL('../../HD/Midnight_Oil/PipeNetwork-Alt-Hero.png', import.meta.url).href;
const splashOne = new URL('../../HD/Cypher Citadel terminal interface.png', import.meta.url).href;
const splashTwo = new URL('../../HD/Mockup.png', import.meta.url).href;
export const BRAND_LOGO = '/osa-midnight-oil-logo.png';

export const WALLPAPERS = [
  {
    id: 'violet-surge',
    title: 'Monochrome',
    description: 'Black-and-white wire sweep with a stealth console finish.',
    image: wallpaperOne,
  },
  {
    id: 'monochrome-grid',
    title: 'Violet Grid',
    description: 'Purple wire-burst with the OSA ROS Console signature.',
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
  {
    id: 'citadel-glass',
    title: 'Citadel Glass',
    description: 'Cold-blue tower vista framed through a midnight observation deck.',
    image: wallpaperFive,
  },
  {
    id: 'midnight-oil-state-one',
    title: 'Midnight Oil State One',
    description: 'Steampunk riverfront skyline lit by brass towers, steam, and amber channels.',
    image: midnightOilWallpaperOne,
  },
  {
    id: 'midnight-oil-state-two',
    title: 'Midnight Oil State Two',
    description: 'Pipe-network control wall with gauges, brass runs, and low steam drift.',
    image: midnightOilWallpaperTwo,
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
  subtitle: 'ROS::Terminal Splash',
  image: splashTwo,
  fallbackImage: splashOne,
};

export const AUTH_SCREEN_ASSETS = {
  default: {
    loginImage: BOOT_SPLASH.image,
    lockImage: BOOT_SPLASH.image,
    heroImage: BOOT_SPLASH.image,
    overlayImage: '',
  },
  midnight_oil: {
    loginImage: midnightOilLoginScreen,
    lockImage: midnightOilLockScreen,
    heroImage: midnightOilPipeHero,
    overlayImage: midnightOilOverlaySteam,
  },
};

export const getAuthScreenAssets = (themeId) =>
  AUTH_SCREEN_ASSETS[themeId] ?? AUTH_SCREEN_ASSETS.default;

export const SHELL_THEMES = {
  cypher: {
    id: 'cypher',
    name: 'Cypher Citadel',
    shortName: 'OSA',
    accentLabel: 'Citadel Glass',
    bg: 'bg-[#03080b]',
    windowBg: 'bg-[rgba(3,11,15,0.94)]',
    panelBg: 'bg-[rgba(6,18,22,0.82)]',
    border: 'border-cyan-300/18',
    borderStrong: 'border-cyan-300/22',
    accentText: 'text-cyan-200',
    accentChip: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
    launcherHover: 'hover:border-cyan-300/20',
    launcherSelected: 'border-cyan-300/22 bg-cyan-500/10',
    lockButton: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20',
    shellBadge: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
    iconTone:
      'border-cyan-300/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight Spectrum',
    shortName: 'OSA',
    accentLabel: 'Midnight Oil',
    bg: 'bg-slate-950',
    windowBg: 'bg-slate-950/96',
    panelBg: 'bg-slate-900/85',
    border: 'border-amber-500/20',
    borderStrong: 'border-amber-400/30',
    accentText: 'text-amber-300',
    accentChip: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    launcherHover: 'hover:border-amber-400/20',
    launcherSelected: 'border-amber-400/30 bg-amber-500/10',
    lockButton: 'border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
    shellBadge: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    iconTone: null,
  },
  midnight_oil: {
    id: 'midnight_oil',
    name: 'Midnight Oil',
    shortName: 'OSA',
    accentLabel: 'Steampunk Foundry',
    bg: 'bg-[#120d09]',
    windowBg: 'bg-[rgba(18,11,8,0.96)]',
    panelBg: 'bg-[rgba(28,18,12,0.84)]',
    border: 'border-amber-700/22',
    borderStrong: 'border-amber-500/30',
    accentText: 'text-amber-200',
    accentChip: 'border-amber-500/24 bg-amber-600/12 text-amber-100',
    launcherHover: 'hover:border-amber-500/24',
    launcherSelected: 'border-amber-500/30 bg-amber-600/12',
    lockButton: 'border-amber-500/24 bg-amber-600/12 text-amber-100 hover:bg-amber-600/18',
    shellBadge: 'border-amber-500/24 bg-amber-600/12 text-amber-100',
    iconTone: 'border-amber-500/24 bg-amber-600/12 text-amber-200 shadow-amber-700/20',
  },
};

export const getShellTheme = (themeId) => SHELL_THEMES[themeId] ?? SHELL_THEMES.cypher;

export const getAppIconTone = (app, themeId) => getShellTheme(themeId).iconTone ?? app.iconTone;

export const APP_INTERIOR_THEMES = {
  cypher: {
    pageBg: 'bg-[#03080b]',
    sidebarBg: 'bg-[rgba(6,18,22,0.84)]',
    sidebarBorder: 'border-cyan-300/12',
    panelBg: 'bg-[rgba(7,20,24,0.72)]',
    panelBorder: 'border-cyan-300/12',
    panelMutedBg: 'bg-black/20',
    panelMutedBorder: 'border-white/8',
    heroBg:
      'bg-[linear-gradient(135deg,rgba(7,31,36,0.78),rgba(8,22,28,0.74)_55%,rgba(4,13,18,0.88)_100%)]',
    heroBorder: 'border-cyan-300/18',
    heroPill: 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
    accentText: 'text-cyan-200',
    accentSoftText: 'text-cyan-50/78',
    input:
      'border-cyan-300/12 bg-[rgba(3,11,15,0.82)] text-cyan-50 focus:border-cyan-300/35 focus:bg-[rgba(4,14,20,0.92)]',
    primaryButton: 'bg-cyan-400 text-slate-950 hover:bg-cyan-300',
    primaryButtonSoft: 'border-cyan-300/18 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20',
    secondaryButton: 'bg-white/5 text-slate-200 hover:bg-white/10',
    activeChip: 'bg-cyan-400 text-slate-950',
    inactiveChip: 'bg-white/5 text-slate-300 hover:bg-white/10',
    selectedCard: 'border-cyan-300/24 bg-cyan-500/10',
    card: 'border-white/8 bg-black/15 hover:border-cyan-300/18 hover:bg-white/5',
    tag: 'border-cyan-300/16 bg-cyan-500/10 text-cyan-100',
    linkCard: 'border-cyan-300/15 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20',
    previewBg: 'bg-black/25',
    headingAccent: 'text-cyan-100',
    bulletAccent: 'bg-cyan-300',
    codeAccent: 'text-cyan-200',
  },
  midnight: {
    pageBg: 'bg-slate-950',
    sidebarBg: 'bg-slate-900/90',
    sidebarBorder: 'border-white/10',
    panelBg: 'bg-slate-900/70',
    panelBorder: 'border-white/10',
    panelMutedBg: 'bg-black/20',
    panelMutedBorder: 'border-white/10',
    heroBg: 'bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(15,23,42,0.92))]',
    heroBorder: 'border-amber-500/20',
    heroPill: 'border-amber-400/20 bg-amber-500/10 text-amber-200',
    accentText: 'text-amber-300',
    accentSoftText: 'text-slate-300',
    input:
      'border-white/10 bg-black/30 text-white focus:border-amber-400/40',
    primaryButton: 'bg-amber-500 text-black hover:bg-amber-400',
    primaryButtonSoft: 'border-amber-500/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
    secondaryButton: 'bg-white/5 text-slate-200 hover:bg-white/10',
    activeChip: 'bg-amber-500 text-black',
    inactiveChip: 'bg-white/5 text-slate-300 hover:bg-white/10',
    selectedCard: 'border-amber-400/30 bg-amber-500/10',
    card: 'border-white/10 bg-slate-900/70 hover:border-white/20 hover:bg-white/5',
    tag: 'border-amber-500/20 bg-amber-500/10 text-amber-100',
    linkCard: 'border-amber-500/15 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20',
    previewBg: 'bg-black/25',
    headingAccent: 'text-amber-200',
    bulletAccent: 'bg-amber-300',
    codeAccent: 'text-cyan-200',
  },
  midnight_oil: {
    pageBg: 'bg-[#120d09]',
    sidebarBg: 'bg-[rgba(31,20,14,0.92)]',
    sidebarBorder: 'border-amber-700/16',
    panelBg: 'bg-[rgba(29,18,12,0.78)]',
    panelBorder: 'border-amber-700/16',
    panelMutedBg: 'bg-black/22',
    panelMutedBorder: 'border-white/8',
    heroBg: 'bg-[linear-gradient(135deg,rgba(120,68,22,0.28),rgba(31,20,14,0.92)_58%,rgba(14,9,7,0.98)_100%)]',
    heroBorder: 'border-amber-500/18',
    heroPill: 'border-amber-500/20 bg-amber-600/10 text-amber-100',
    accentText: 'text-amber-200',
    accentSoftText: 'text-amber-50/78',
    input:
      'border-amber-700/16 bg-[rgba(20,12,8,0.88)] text-amber-50 focus:border-amber-500/34 focus:bg-[rgba(28,18,12,0.96)]',
    primaryButton: 'bg-amber-500 text-black hover:bg-amber-400',
    primaryButtonSoft: 'border-amber-500/18 bg-amber-600/10 text-amber-100 hover:bg-amber-600/18',
    secondaryButton: 'bg-white/5 text-slate-200 hover:bg-white/10',
    activeChip: 'bg-amber-500 text-black',
    inactiveChip: 'bg-white/5 text-slate-300 hover:bg-white/10',
    selectedCard: 'border-amber-500/24 bg-amber-600/10',
    card: 'border-white/8 bg-black/15 hover:border-amber-500/18 hover:bg-white/5',
    tag: 'border-amber-500/16 bg-amber-600/10 text-amber-100',
    linkCard: 'border-amber-500/15 bg-amber-600/10 text-amber-100 hover:bg-amber-600/18',
    previewBg: 'bg-black/25',
    headingAccent: 'text-amber-100',
    bulletAccent: 'bg-amber-400',
    codeAccent: 'text-amber-200',
  },
};

export const getAppInteriorTheme = (themeId) =>
  APP_INTERIOR_THEMES[themeId] ?? APP_INTERIOR_THEMES.cypher;

const roomyWindow = (width, height) => ({
  w: `min(${width}px, calc(100vw - 124px))`,
  h: `min(${height}px, calc(100vh - 96px))`,
});

export const APP_ORDER = [
  'overview',
  'library',
  'research-vault',
  'calendar',
  'notes',
  'profiles',
  'comms',
  'f-society',
  'nostr-lounge',
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
    defaultSize: roomyWindow(1280, 820),
    defaultFrame: { w: 1280, h: 820 },
    iconTone: 'border-amber-400/25 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
  },
  library: {
    id: 'library',
    title: 'Library',
    icon: BookOpen,
    component: 'LibraryManagerApp',
    description: 'Read-only PDF and EPUB catalog with Calibre-style metadata imports.',
    category: 'library',
    defaultSize: roomyWindow(1560, 930),
    defaultFrame: { w: 1560, h: 930 },
    iconTone: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  },
  'research-vault': {
    id: 'research-vault',
    title: 'Research Vault',
    icon: FlaskConical,
    component: 'ResearchVaultApp',
    description: 'Structured research intelligence for studies, bias models, and cross-study analysis.',
    category: 'research',
    defaultSize: roomyWindow(1600, 940),
    defaultFrame: { w: 1600, h: 940 },
    iconTone: 'border-amber-400/25 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
  },
  calendar: {
    id: 'calendar',
    title: 'Calendar',
    icon: CalendarDays,
    component: 'CalendarApp',
    description: 'Plan dates, events, checkpoints, and time-blocked work.',
    category: 'core',
    defaultSize: roomyWindow(1440, 900),
    defaultFrame: { w: 1440, h: 900 },
    iconTone: 'border-indigo-400/25 bg-indigo-500/10 text-indigo-200 shadow-indigo-500/10',
  },
  notes: {
    id: 'notes',
    title: 'Vault Notes',
    icon: ScrollText,
    component: 'NotesApp',
    description: 'Markdown notes with live capture and quick templates.',
    category: 'core',
    defaultSize: roomyWindow(1440, 900),
    defaultFrame: { w: 1440, h: 900 },
    iconTone: 'border-orange-400/25 bg-orange-500/10 text-orange-200 shadow-orange-500/10',
  },
  profiles: {
    id: 'profiles',
    title: 'Profile Organizer',
    icon: Contact2,
    component: 'ProfileOrganizerApp',
    description: 'Track identities, mailboxes, logins, VPN zones, and PGP keysets.',
    category: 'vault',
    defaultSize: roomyWindow(1480, 920),
    defaultFrame: { w: 1480, h: 920 },
    iconTone: 'border-teal-400/25 bg-teal-500/10 text-teal-200 shadow-teal-500/10',
  },
  comms: {
    id: 'comms',
    title: 'ROS Comms',
    icon: KeyRound,
    component: 'CommsApp',
    description: 'CypherID-bound dead-drop messaging with vault-backed identities and peers.',
    category: 'vault',
    defaultSize: roomyWindow(1520, 920),
    defaultFrame: { w: 1520, h: 920 },
    iconTone: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  },
  'f-society': {
    id: 'f-society',
    title: 'F*Society',
    icon: Network,
    component: 'FSocietyApp',
    description: 'LAN-only peer desk for discovery, chat, note handoff, and direct file sends.',
    category: 'lan',
    defaultSize: roomyWindow(1560, 930),
    defaultFrame: { w: 1560, h: 930 },
    iconTone: 'border-amber-300/25 bg-amber-500/10 text-amber-100 shadow-amber-700/10',
  },
  'nostr-lounge': {
    id: 'nostr-lounge',
    title: 'Nostr Lounge',
    icon: Radio,
    component: 'NostrLoungeApp',
    description: 'After-hours social desk for reading, posting, and loosely staying in the loop.',
    category: 'social',
    defaultSize: roomyWindow(1560, 930),
    defaultFrame: { w: 1560, h: 930 },
    iconTone: 'border-cyan-300/25 bg-cyan-500/10 text-cyan-100 shadow-cyan-500/10',
  },
  'flow-studio': {
    id: 'flow-studio',
    title: 'Flow Studio',
    icon: Orbit,
    component: 'FlowStudioApp',
    description: 'Wireframe charts for network, service, and workflow flows.',
    category: 'mapping',
    defaultSize: roomyWindow(1440, 900),
    defaultFrame: { w: 1440, h: 900 },
    iconTone: 'border-violet-400/25 bg-violet-500/10 text-violet-200 shadow-violet-500/10',
  },
  bookmarks: {
    id: 'bookmarks',
    title: 'Bookmarks',
    icon: BookMarked,
    component: 'BookmarksApp',
    description: 'Saved links for references, docs, and recurring tools.',
    category: 'reference',
    defaultSize: roomyWindow(1320, 820),
    defaultFrame: { w: 1320, h: 820 },
    iconTone: 'border-sky-400/25 bg-sky-500/10 text-sky-200 shadow-sky-500/10',
  },
  inventory: {
    id: 'inventory',
    title: 'Inventory',
    icon: PackageSearch,
    component: 'InventoryApp',
    description: 'Track software, systems, methodologies, and gear.',
    category: 'reference',
    defaultSize: roomyWindow(1280, 820),
    defaultFrame: { w: 1280, h: 820 },
    iconTone: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10',
  },
  'wallet-vault': {
    id: 'wallet-vault',
    title: 'Wallet Vault',
    icon: WalletCards,
    component: 'WalletVaultApp',
    description: 'Store addresses and locally encrypted recovery material.',
    category: 'vault',
    defaultSize: roomyWindow(1380, 860),
    defaultFrame: { w: 1380, h: 860 },
    iconTone: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  },
  clocks: {
    id: 'clocks',
    title: 'World Clocks',
    icon: Globe2,
    component: 'ClocksApp',
    description: 'Keep local and global timing visible at a glance.',
    category: 'utility',
    defaultSize: roomyWindow(1120, 760),
    defaultFrame: { w: 1120, h: 760 },
    iconTone: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-200 shadow-fuchsia-500/10',
  },
  console: {
    id: 'console',
    title: 'Midnight Console',
    icon: Binary,
    component: 'TerminalApp',
    description: 'Local command console with no AI and no network actions.',
    category: 'utility',
    defaultSize: roomyWindow(1180, 760),
    defaultFrame: { w: 1180, h: 760 },
    iconTone: 'border-lime-400/25 bg-lime-500/10 text-lime-200 shadow-lime-500/10',
  },
  'control-room': {
    id: 'control-room',
    title: 'Control Room',
    icon: Shield,
    component: 'SettingsApp',
    description: 'Workspace settings, export/import, and wipe controls.',
    category: 'system',
    defaultSize: roomyWindow(1320, 840),
    defaultFrame: { w: 1320, h: 840 },
    iconTone: 'border-rose-400/25 bg-rose-500/10 text-rose-200 shadow-rose-500/10',
  },
};

export const WINDOW_STATES = {
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  NORMAL: 'normal',
};
