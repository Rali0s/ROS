/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryMedium,
  Download,
  KeyRound,
  LifeBuoy,
  Lock,
  Minus,
  ScanLine,
  Search,
  Shield,
  ShieldCheck,
  Square,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import {
  APP_ORDER,
  APPS,
  getAuthScreenAssets,
  BOOT_SPLASH,
  BRAND_LOGO,
  getAppIconTone,
  getDesktopBackgroundStyle,
  getShellTheme,
} from './utils/constants.js';
import OverviewApp from './components/OverviewApp.jsx';
import CalendarApp from './components/CalendarApp.jsx';
import NotesApp from './components/NotesApp.jsx';
import LibraryManagerApp from './components/LibraryManagerApp.jsx';
import ResearchVaultApp from './components/ResearchVaultApp.jsx';
import ProfileOrganizerApp from './components/ProfileOrganizerApp.jsx';
import CommsApp from './components/CommsApp.jsx';
import FSocietyApp from './components/FSocietyApp.jsx';
import NostrLoungeApp from './components/NostrLoungeApp.jsx';
import FlowStudioApp from './components/FlowStudioApp.jsx';
import BookmarksApp from './components/BookmarksApp.jsx';
import InventoryApp from './components/InventoryApp.jsx';
import WalletVaultApp from './components/WalletVaultApp.jsx';
import ClocksApp from './components/ClocksApp.jsx';
import TerminalApp from './components/TerminalApp.jsx';
import SettingsApp from './components/SettingsApp.jsx';
import {
  lockWorkspace,
  runAutoSnapshotExport,
  searchWorkspaceData,
  setWorkspaceNavigation,
  skipLegacyMigration,
  useWorkspaceData,
} from './utils/workspaceStore.js';
import {
  closeNativeApp,
  isNativeVaultRuntime,
  syncNativeWindowPresentation,
  watchNativeWindowPresentation,
} from './utils/nativeVault.js';
import { APP_RELEASE } from './utils/betaRuntime.js';

const COMPONENT_MAP = {
  OverviewApp,
  CalendarApp,
  NotesApp,
  LibraryManagerApp,
  ResearchVaultApp,
  ProfileOrganizerApp,
  CommsApp,
  FSocietyApp,
  NostrLoungeApp,
  FlowStudioApp,
  BookmarksApp,
  InventoryApp,
  WalletVaultApp,
  ClocksApp,
  TerminalApp,
  SettingsApp,
};

const WINDOW_Z_BASE = 20;
const getNextZ = (windows) =>
  Math.max(WINDOW_Z_BASE - 1, ...windows.map((windowItem) => windowItem.zIndex || 0)) + 1;
const getErrorMessage = (error, fallback) => {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }

    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error;
    }
  }

  return fallback;
};

const buildWindow = (app, index, windows = []) => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const frame = app.defaultFrame ?? { w: 1040, h: 720 };
  const baseX = Math.max(92, Math.round((viewportWidth - frame.w) / 2));
  const usableHeight = Math.max(640, viewportHeight - 132);
  const baseY = Math.max(18, Math.round((usableHeight - frame.h) / 2));

  return {
    ...app,
    x: baseX + index * 24,
    y: baseY + index * 22,
    zIndex: getNextZ(windows),
    isMinimized: false,
    isMaximized: false,
  };
};

const BOOT_DURATION_MS = 8000;
const BOOT_STEPS = [
  'Layer-3 Bus',
  'Citadel Mesh',
  'Ghost Routing',
  'Noir Kernel',
];
const LUNAR_CYCLE_DAYS = 29.530588;
const KNOWN_NEW_MOON = new Date('2023-11-13T00:00:00Z');
const SPIRITS_BY_HOUR = {
  0: 'Samael',
  1: 'Anael',
  2: 'Veguaniel',
  3: 'Vachmiel',
  4: 'Sasquiel',
  5: 'Samiel',
  6: 'Banyniel',
  7: 'Osmadiel',
  8: 'Uvadriel',
  9: 'Oriel',
  10: 'Bariel',
  11: 'Beratiel',
  12: 'Sabrachon',
  13: 'Taktis',
  14: 'Sarquamech',
  15: 'Jdfischa',
  16: 'Abasdashon',
  17: 'Zaazenach',
  18: 'Mendrion',
  19: 'Narcriel',
  20: 'Pamiel',
  21: 'Iasgnarim',
  22: 'Dardariel',
  23: 'Sarandiel',
};

const buildAnsiProgress = (progress) => {
  const blocks = 12;
  const filled = Math.round((progress / 100) * blocks);
  return `${'▓'.repeat(filled)}${'░'.repeat(Math.max(0, blocks - filled))}`;
};

const getMoonPhaseName = (age) => {
  if (age < 1.84566) {
    return 'New';
  }
  if (age < 5.53699) {
    return 'Waxing Crescent';
  }
  if (age < 9.22831) {
    return 'First Quarter';
  }
  if (age < 12.91963) {
    return 'Waxing Gibbous';
  }
  if (age < 16.61096) {
    return 'Full';
  }
  if (age < 20.30228) {
    return 'Waning Gibbous';
  }
  if (age < 23.99361) {
    return 'Last Quarter';
  }
  if (age < 27.68493) {
    return 'Waning Crescent';
  }
  return 'New';
};

const calculateMoonIllumination = (phase) => {
  if (phase <= LUNAR_CYCLE_DAYS / 2) {
    return 0.5 * (1 - Math.cos(Math.PI * phase / (LUNAR_CYCLE_DAYS / 2)));
  }

  return 0.5 * (1 + Math.cos(Math.PI * (phase - LUNAR_CYCLE_DAYS / 2) / (LUNAR_CYCLE_DAYS / 2)));
};

const getMoonAppearance = (phaseName, hemisphere) => {
  const appearances = {
    Northern: {
      New: 'Mostly invisible',
      'Waxing Crescent': 'Right side, partially illuminated',
      'First Quarter': 'Right half illuminated',
      'Waxing Gibbous': 'Right side, mostly illuminated',
      Full: 'Fully illuminated',
      'Waning Gibbous': 'Left side, mostly illuminated',
      'Last Quarter': 'Left half illuminated',
      'Waning Crescent': 'Left side, partially illuminated',
    },
    Southern: {
      New: 'Mostly invisible',
      'Waxing Crescent': 'Left side, partially illuminated',
      'First Quarter': 'Left half illuminated',
      'Waxing Gibbous': 'Left side, mostly illuminated',
      Full: 'Fully illuminated',
      'Waning Gibbous': 'Right side, mostly illuminated',
      'Last Quarter': 'Right half illuminated',
      'Waning Crescent': 'Right side, partially illuminated',
    },
  };

  return appearances[hemisphere]?.[phaseName] ?? 'Varies';
};

const getMoonGlyph = (phaseName) => {
  switch (phaseName) {
    case 'New':
      return '●';
    case 'Waxing Crescent':
      return '◔';
    case 'First Quarter':
      return '◑';
    case 'Waxing Gibbous':
      return '◕';
    case 'Full':
      return '○';
    case 'Waning Gibbous':
      return '◕';
    case 'Last Quarter':
      return '◐';
    case 'Waning Crescent':
      return '◓';
    default:
      return '●';
  }
};

const getMoonPhaseData = (value) => {
  const phaseDays = (value - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const currentPhase = ((phaseDays % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const phaseName = getMoonPhaseName(currentPhase);
  const illumination = Math.round(calculateMoonIllumination(currentPhase) * 100);

  return {
    phaseName,
    illumination,
    glyph: getMoonGlyph(phaseName),
    northernAppearance: getMoonAppearance(phaseName, 'Northern'),
    southernAppearance: getMoonAppearance(phaseName, 'Southern'),
  };
};

const DesktopSignals = ({ now, lan }) => {
  const moon = getMoonPhaseData(now);
  const hour = now.getHours();
  const spirit = SPIRITS_BY_HOUR[hour] ?? 'Unknown';
  const timeString = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="pointer-events-none absolute right-4 top-3 z-0 flex w-[17.5rem] flex-col gap-3">
      <section className="rounded-[22px] border border-cyan-400/12 bg-slate-950/40 p-3.5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Phased Approach</div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-white">{moon.phaseName}</div>
            <div className="mt-1 text-sm text-slate-300">Illumination {moon.illumination}%</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 px-3.5 py-2 text-[2rem] leading-none text-cyan-100">
            {moon.glyph}
          </div>
        </div>
        <div className="mt-4 space-y-3 text-xs leading-5 text-slate-400">
          <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
            <div className="uppercase tracking-[0.24em] text-slate-500">Northern Hemisphere</div>
            <div className="mt-1 text-slate-200">{moon.northernAppearance}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
            <div className="uppercase tracking-[0.24em] text-slate-500">Southern Hemisphere</div>
            <div className="mt-1 text-slate-200">{moon.southernAppearance}</div>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-violet-400/12 bg-slate-950/40 p-3.5 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.3em] text-violet-200">Spiritual Clock</div>
        <div className="mt-3 text-3xl font-semibold text-white">{timeString}</div>
        <div className="mt-2 text-sm uppercase tracking-[0.22em] text-slate-500">Lemegeton · Ars Paulina</div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Governing Spirit</div>
          <div className="mt-2 text-lg font-medium text-violet-100">{spirit}</div>
        </div>
        <div className="mt-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Security::Open Ports</div>
          <div className="mt-2 text-lg font-medium text-white">
            {lan?.enabled ? `${lan.security?.openPortCount || 0} open` : 'Closed'}
          </div>
          <div className="mt-1 text-xs leading-5 text-slate-400">
            {lan?.enabled
              ? `${lan.security?.bindScope || 'LAN only'} · ${(lan.security?.openPorts || []).join(' · ')}`
              : 'F*Society LAN mode disabled'}
          </div>
        </div>
      </section>
    </div>
  );
};

const BootSplash = ({ elapsedMs }) => {
  const progress = Math.min(100, Math.round((elapsedMs / BOOT_DURATION_MS) * 100));
  const stageLabel =
    progress < 34 ? 'INITIALIZING GRID' : progress < 68 ? 'SYNCING GHOST ROUTING' : 'HANDSHAKE READY';
  const currentStep = BOOT_STEPS[Math.min(BOOT_STEPS.length - 1, Math.floor((progress / 100) * BOOT_STEPS.length))];
  const progressLabel = `${buildAnsiProgress(progress)} · ${progress}%`;

  return (
    <div className="relative h-screen overflow-hidden bg-[#03080b] text-slate-100">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-50 boot-splash-pan"
        style={{ backgroundImage: `url(${BOOT_SPLASH.image})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,11,0.48),rgba(2,6,11,0.76)_48%,rgba(0,2,5,0.94)_100%)]" />
      <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(170,252,244,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(170,252,244,0.05)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 flex h-screen items-center justify-center px-6 py-8">
        <section className="boot-splash-card w-full max-w-[40rem] rounded-[32px] border border-cyan-200/14 bg-[linear-gradient(180deg,rgba(3,11,16,0.60),rgba(3,9,14,0.78))] px-6 py-7 shadow-[0_20px_80px_rgba(0,0,0,0.46)] backdrop-blur-[14px] sm:px-8 sm:py-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-black/18 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.32em] text-cyan-100/88">
            <ScanLine size={12} />
            Secure Access Node
          </div>

          <div className="mt-8">
            <div className="text-[11px] uppercase tracking-[0.32em] text-amber-200/70">{stageLabel}</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-[3.25rem]">
              {BOOT_SPLASH.title}
            </h1>
            <p className="mt-4 max-w-[34rem] text-sm leading-7 text-slate-300 sm:text-[15px]">
              {BOOT_SPLASH.subtitle}
            </p>
          </div>

          <div className="mt-10 rounded-[24px] border border-white/8 bg-black/18 px-4 py-4 sm:px-5">
            <div className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.24em] text-slate-400">
              <span>{currentStep}</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="boot-progress-bar h-full rounded-full bg-[linear-gradient(90deg,rgba(251,191,36,0.96),rgba(94,234,212,0.92))]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-3 text-xs tracking-[0.16em] text-cyan-100/68">
              {progressLabel}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <span>Premise::Layer-3 Inc.</span>
            <span>Credits: Rali0s</span>
          </div>
        </section>
      </div>
    </div>
  );
};

const LockScreen = ({
  boot,
  lifecycle,
  backend,
  notice,
  error,
  busy,
  passphrase,
  setPassphrase,
  confirmPassphrase,
  setConfirmPassphrase,
  onSubmit,
  onSkipMigration,
}) => {
  const authAssets = getAuthScreenAssets(boot?.theme);
  const backgroundImage = lifecycle === 'locked' ? authAssets.lockImage : authAssets.loginImage;
  const heroImage = authAssets.heroImage || backgroundImage;
  const overlayImage = authAssets.overlayImage;
  const midnightOilMode = boot?.theme === 'midnight_oil';
  const title =
    lifecycle === 'migration'
      ? 'Migrate Local Workspace'
      : lifecycle === 'locked'
        ? 'Unlock Workspace'
      : 'Initialize Secure Workspace';

  const description =
    lifecycle === 'migration'
      ? backend === 'tauri-native'
        ? 'A browser beta workspace was found. Enter its existing passphrase to migrate it into the native vault, or start a fresh native vault instead.'
        : 'A legacy local workspace was found. Set a master passphrase to encrypt it in place and keep working.'
      : lifecycle === 'locked'
        ? 'Enter the master passphrase to decrypt the workspace into memory for this session.'
        : 'Create a master passphrase to seal the workspace locally before ROS starts.';

  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden px-6 py-8">
      <div
        className={`absolute inset-0 scale-[1.02] bg-cover bg-center ${midnightOilMode ? 'opacity-78' : 'opacity-62'}`}
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      {overlayImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-34 mix-blend-screen"
          style={{ backgroundImage: `url(${overlayImage})` }}
        />
      ) : null}
      <div
        className={`absolute inset-0 ${
          midnightOilMode
            ? 'bg-[radial-gradient(circle_at_center,rgba(255,188,92,0.18),transparent_16%),linear-gradient(180deg,rgba(20,10,6,0.48),rgba(10,6,4,0.82)_54%,rgba(3,2,2,0.96)_100%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(170,255,245,0.16),transparent_14%),linear-gradient(180deg,rgba(2,7,10,0.58),rgba(1,4,8,0.82)_54%,rgba(0,1,3,0.96)_100%)]'
        }`}
      />
      <div
        className={`absolute inset-0 ${
          midnightOilMode
            ? 'opacity-8 [background-image:linear-gradient(rgba(255,195,125,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,195,125,0.05)_1px,transparent_1px)]'
            : 'opacity-12 [background-image:linear-gradient(rgba(170,252,244,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(170,252,244,0.05)_1px,transparent_1px)]'
        } [background-size:72px_72px]`}
      />
      <div
        className={`relative z-10 w-full max-w-[1180px] rounded-[1.9rem] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.52)] backdrop-blur-[18px] md:p-6 ${
          midnightOilMode
            ? 'border border-amber-500/18 bg-[linear-gradient(180deg,rgba(22,12,8,0.62),rgba(10,6,4,0.88))] shadow-[0_0_36px_rgba(251,191,36,0.08),0_20px_80px_rgba(0,0,0,0.52)]'
            : 'border border-cyan-200/18 bg-[linear-gradient(180deg,rgba(4,12,16,0.62),rgba(2,8,12,0.84))] shadow-[0_0_36px_rgba(131,255,240,0.10),0_20px_80px_rgba(0,0,0,0.52)]'
        }`}
      >
        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <section
            className={`relative overflow-hidden rounded-[1.75rem] p-5 shadow-xl shadow-black/30 ${
              midnightOilMode
                ? 'border border-amber-500/20 bg-[linear-gradient(135deg,rgba(38,24,16,0.82),rgba(25,15,10,0.88)_55%,rgba(12,7,6,0.94)_100%)]'
                : 'border border-cyan-300/22 bg-[linear-gradient(135deg,rgba(8,27,31,0.68),rgba(8,20,28,0.76)_55%,rgba(5,14,18,0.88)_100%)]'
            }`}
          >
            {heroImage ? (
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.16]"
                style={{ backgroundImage: `url(${heroImage})` }}
              />
            ) : null}
            <div
              className={`pointer-events-none absolute inset-0 ${
                midnightOilMode
                  ? 'bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_34%),linear-gradient(115deg,rgba(255,255,255,0.03),transparent_24%,transparent_76%,rgba(255,255,255,0.02))]'
                  : 'bg-[radial-gradient(circle_at_top,rgba(131,255,240,0.12),transparent_34%),linear-gradient(115deg,rgba(255,255,255,0.04),transparent_24%,transparent_76%,rgba(255,255,255,0.03))]'
              }`}
            />
            <div className="flex items-center gap-4">
              <img
                src={BRAND_LOGO}
                alt="OSA Midnight Oil logo"
                className={`h-14 w-14 rounded-2xl bg-black/20 p-2 shadow-lg shadow-black/20 ${
                  midnightOilMode ? 'border border-amber-500/18' : 'border border-cyan-200/18'
                }`}
              />
              <div
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${
                  midnightOilMode
                    ? 'border border-amber-500/20 bg-amber-600/10 text-amber-100'
                    : 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-100'
                }`}
              >
                <Shield size={12} />
                Master-Locked Vault
              </div>
            </div>
            <h1 className="mt-5 text-[2.1rem] font-semibold tracking-tight text-white">{boot.codename}</h1>
            <p className={`mt-3 max-w-xl text-sm leading-6 ${midnightOilMode ? 'text-amber-50/76' : 'text-cyan-50/78'}`}>{description}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-2xl bg-black/18 p-4 backdrop-blur-sm ${midnightOilMode ? 'border border-amber-500/10' : 'border border-cyan-200/10'}`}>
                <div className={`text-[11px] uppercase tracking-[0.24em] ${midnightOilMode ? 'text-amber-100/45' : 'text-cyan-100/45'}`}>Operator</div>
                <div className="mt-2 text-lg font-semibold text-white">{boot.operator}</div>
              </div>
              <div className={`rounded-2xl bg-black/18 p-4 backdrop-blur-sm ${midnightOilMode ? 'border border-amber-500/10' : 'border border-cyan-200/10'}`}>
                <div className={`text-[11px] uppercase tracking-[0.24em] ${midnightOilMode ? 'text-amber-100/45' : 'text-cyan-100/45'}`}>Storage</div>
                <div className="mt-2 text-lg font-semibold text-white">Local only</div>
              </div>
            </div>

            <div
              className={`mt-6 rounded-2xl p-4 text-sm leading-6 ${
                midnightOilMode
                  ? 'border border-amber-500/16 bg-[linear-gradient(135deg,rgba(45,28,18,0.78),rgba(24,14,10,0.44))] text-amber-50/72'
                  : 'border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,18,24,0.72),rgba(10,28,32,0.40))] text-cyan-50/72'
              }`}
            >
              The workspace stays encrypted at rest. Unlocking decrypts it into memory for this session only, and inactivity locks it again automatically.
            </div>
          </section>

          <section
            className={`rounded-[1.75rem] p-5 ${
              midnightOilMode
                ? 'border border-amber-500/16 bg-[linear-gradient(180deg,rgba(16,10,8,0.92),rgba(10,6,4,0.98))] shadow-[0_0_28px_rgba(251,191,36,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]'
                : 'border border-cyan-200/16 bg-[linear-gradient(180deg,rgba(2,8,12,0.88),rgba(3,10,16,0.96))] shadow-[0_0_28px_rgba(131,255,240,0.06),inset_0_1px_0_rgba(255,255,255,0.03)]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-2xl p-3 ${
                  midnightOilMode
                    ? 'border border-amber-500/20 bg-amber-600/10 text-amber-200'
                    : 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-200'
                }`}
              >
                <KeyRound size={18} />
              </span>
              <div>
                <div className={`text-[11px] uppercase tracking-[0.24em] ${midnightOilMode ? 'text-amber-100/42' : 'text-cyan-100/42'}`}>Vault access</div>
                <div className="text-2xl font-semibold text-white">{title}</div>
              </div>
            </div>

            {notice ? (
              <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${midnightOilMode ? 'border border-amber-500/20 bg-amber-600/10 text-amber-100' : 'border border-cyan-500/20 bg-cyan-500/10 text-cyan-100'}`}>
                {notice}
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <label className="block space-y-2 text-sm text-slate-200">
                <span className={`text-xs uppercase tracking-[0.24em] ${midnightOilMode ? 'text-amber-100/42' : 'text-cyan-100/42'}`}>Master passphrase</span>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  className={`w-full rounded-2xl px-4 py-3 outline-none transition placeholder:text-slate-500 ${
                    midnightOilMode
                      ? 'border border-amber-500/14 bg-[rgba(20,12,8,0.86)] text-amber-50 focus:border-amber-400/36 focus:bg-[rgba(28,18,12,0.96)] focus:shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_0_24px_rgba(251,191,36,0.08)]'
                      : 'border border-cyan-200/14 bg-[rgba(3,11,15,0.78)] text-cyan-50 focus:border-cyan-300/40 focus:bg-[rgba(4,14,20,0.92)] focus:shadow-[0_0_0_1px_rgba(131,255,240,0.12),0_0_24px_rgba(131,255,240,0.10)]'
                  }`}
                  placeholder="Required to unlock the workspace"
                />
              </label>

              {lifecycle !== 'locked' ? (
                <label className="block space-y-2 text-sm text-slate-200">
                  <span className={`text-xs uppercase tracking-[0.24em] ${midnightOilMode ? 'text-amber-100/42' : 'text-cyan-100/42'}`}>Confirm passphrase</span>
                  <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(event) => setConfirmPassphrase(event.target.value)}
                    className={`w-full rounded-2xl px-4 py-3 outline-none transition placeholder:text-slate-500 ${
                      midnightOilMode
                        ? 'border border-amber-500/14 bg-[rgba(20,12,8,0.86)] text-amber-50 focus:border-amber-400/36 focus:bg-[rgba(28,18,12,0.96)] focus:shadow-[0_0_0_1px_rgba(251,191,36,0.10),0_0_24px_rgba(251,191,36,0.08)]'
                        : 'border border-cyan-200/14 bg-[rgba(3,11,15,0.78)] text-cyan-50 focus:border-cyan-300/40 focus:bg-[rgba(4,14,20,0.92)] focus:shadow-[0_0_0_1px_rgba(131,255,240,0.12),0_0_24px_rgba(131,255,240,0.10)]'
                    }`}
                    placeholder="Repeat the master passphrase"
                  />
                </label>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 ${
                  midnightOilMode
                    ? 'border-amber-400/24 bg-[linear-gradient(90deg,rgba(217,119,6,0.94),rgba(251,191,36,0.98))] shadow-[0_0_24px_rgba(251,191,36,0.12)]'
                    : 'border-cyan-200/20 bg-[linear-gradient(90deg,rgba(91,241,231,0.88),rgba(126,255,247,0.98))] shadow-[0_0_24px_rgba(131,255,240,0.16)]'
                }`}
              >
                <Shield size={16} />
                {busy
                  ? 'Working...'
                  : lifecycle === 'migration'
                    ? 'Encrypt and migrate'
                    : lifecycle === 'locked'
                      ? 'Unlock workspace'
                      : 'Create secure workspace'}
              </button>

              {lifecycle === 'migration' && backend === 'tauri-native' && onSkipMigration ? (
                <button
                  type="button"
                  onClick={onSkipMigration}
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    midnightOilMode
                      ? 'border-amber-500/14 bg-amber-600/10 text-amber-50 hover:bg-amber-600/15'
                      : 'border-cyan-200/12 bg-cyan-500/5 text-cyan-50 hover:bg-cyan-500/10'
                  }`}
                >
                  Start fresh native vault
                </button>
              ) : null}
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

const BetaOnboarding = ({ codename, onComplete, onOpenControlRoom }) => (
  <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[rgba(1,5,10,0.72)] px-6 py-8 backdrop-blur-md">
    <section className="w-full max-w-[52rem] rounded-[32px] border border-cyan-300/16 bg-[linear-gradient(180deg,rgba(4,12,18,0.94),rgba(3,9,14,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.48)] sm:p-7">
      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100">
        <ShieldCheck size={12} />
        Waitlist Beta Orientation
      </div>

      <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-[2.5rem]">
        Welcome to {codename}
      </h2>
      <p className="mt-3 max-w-[42rem] text-sm leading-7 text-slate-300">
        ROS is built to be a trustworthy local-first workspace first and a connected product second. Your vault stays
        under your control, but production beta assumes you will treat recovery, diagnostics, and supportability as
        part of the workflow.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
            <Shield size={15} />
            Local-first trust
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            The vault is encrypted at rest, unlocks into memory for the active session, and should remain usable even
            without an account.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Download size={15} />
            Backup before trust
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Export an encrypted recovery bundle early, validate that restore path, and keep Control Room as your trust
            center.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/8 bg-black/18 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
            <LifeBuoy size={15} />
            Beta support loop
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            This release is {APP_RELEASE.channel}. Use the support bundle and feedback surfaces when something feels
            sharp or unclear.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
        <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
          Goal: backup readiness, clear trust status, calm daily use
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onOpenControlRoom}
            className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300/18 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/18"
          >
            <Shield size={15} />
            Open Control Room
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <ShieldCheck size={15} />
            Start using ROS
          </button>
        </div>
      </div>
    </section>
  </div>
);

const App = () => {
  const {
    data,
    session,
    initializeSecureWorkspace,
    migrateLegacyWorkspace,
    nukeWorkspaceData,
    updateWorkspaceData,
    unlockWorkspace,
  } = useWorkspaceData();
  const [windows, setWindows] = useState([]);
  const [activeWindowId, setActiveWindowId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [time, setTime] = useState(new Date());
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [bootElapsedMs, setBootElapsedMs] = useState(0);
  const [exitBusy, setExitBusy] = useState(false);
  const launchTrackedRef = useRef(false);
  const mainRef = useRef(null);
  const dragInfo = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
    windowId: null,
  });

  const desktopBackground = getDesktopBackgroundStyle(
    session.lifecycle === 'unlocked' ? data.settings.wallpaper : session.boot.wallpaper,
  );
  const shellTheme = getShellTheme(data.settings.theme);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isNativeVaultRuntime()) {
      return undefined;
    }

    let unlistenNativeWindow = null;
    let timeoutId = null;
    let cancelled = false;

    const scheduleNativePresentationSync = (ensureWindowFit = false) => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        syncNativeWindowPresentation({ ensureWindowFit });
      }, ensureWindowFit ? 24 : 90);
    };

    const handleBrowserResize = () => {
      scheduleNativePresentationSync(false);
    };

    scheduleNativePresentationSync(true);
    window.addEventListener('resize', handleBrowserResize);

    watchNativeWindowPresentation(() => {
      scheduleNativePresentationSync(false);
    }).then((dispose) => {
      if (cancelled) {
        dispose?.();
        return;
      }

      unlistenNativeWindow = dispose;
    });

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      window.removeEventListener('resize', handleBrowserResize);
      unlistenNativeWindow?.();
    };
  }, []);

  useEffect(() => {
    const electronVersion = window?.process?.versions?.electron;
    if (!(session.lifecycle === 'unlocked' && data.settings.privacyElectronContentProtection && electronVersion)) {
      return;
    }

    document.body.setAttribute('data-electron-content-protection', 'requested');

    return () => {
      document.body.removeAttribute('data-electron-content-protection');
    };
  }, [data.settings.privacyElectronContentProtection, session.lifecycle]);

  useEffect(() => {
    if (
      session.lifecycle !== 'unlocked' ||
      !data.settings.sessionDefenseEnabled ||
      !data.settings.sessionDefenseBlurLock
    ) {
      return undefined;
    }

    const handleBlurLock = () => {
      lockWorkspace('Session Defense locked the workspace on blur.');
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlurLock();
      }
    };

    window.addEventListener('blur', handleBlurLock);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleBlurLock);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    data.settings.sessionDefenseBlurLock,
    data.settings.sessionDefenseEnabled,
    session.lifecycle,
  ]);

  useEffect(() => {
    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setBootElapsedMs(Math.min(BOOT_DURATION_MS, elapsed));
    }, 120);

    return () => window.clearInterval(intervalId);
  }, []);

  const bootComplete = bootElapsedMs >= BOOT_DURATION_MS;

  useEffect(() => {
    if (session.lifecycle !== 'unlocked') {
      launchTrackedRef.current = false;
      setWindows([]);
      setActiveWindowId(null);
      setMenuOpen(false);
      setGlobalSearchQuery('');
      setAccessError('');
      dragInfo.current.isDragging = false;
      return;
    }

    const startupKey = APPS[data.settings.startupApp] ? data.settings.startupApp : 'overview';
    setWindows([buildWindow(APPS[startupKey], 0)]);
    setActiveWindowId(APPS[startupKey].id);
  }, [session.lifecycle, data.settings.startupApp]);

  useEffect(() => {
    if (session.lifecycle !== 'unlocked' || launchTrackedRef.current) {
      return;
    }

    launchTrackedRef.current = true;

    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        betaFirstVaultCreatedAt: current.settings.betaFirstVaultCreatedAt || new Date().toISOString(),
        betaLastOpenedAt: new Date().toISOString(),
        betaMetrics: {
          ...(current.settings.betaMetrics || {}),
          launchCount: Number.isFinite(current.settings.betaMetrics?.launchCount)
            ? current.settings.betaMetrics.launchCount + 1
            : 1,
          snapshotExportCount: Number.isFinite(current.settings.betaMetrics?.snapshotExportCount)
            ? current.settings.betaMetrics.snapshotExportCount
            : 0,
          snapshotImportCount: Number.isFinite(current.settings.betaMetrics?.snapshotImportCount)
            ? current.settings.betaMetrics.snapshotImportCount
            : 0,
          supportBundleCount: Number.isFinite(current.settings.betaMetrics?.supportBundleCount)
            ? current.settings.betaMetrics.supportBundleCount
            : 0,
          feedbackDraftCount: Number.isFinite(current.settings.betaMetrics?.feedbackDraftCount)
            ? current.settings.betaMetrics.feedbackDraftCount
            : 0,
        },
      },
    }));
  }, [session.lifecycle, updateWorkspaceData]);

  useEffect(() => {
    if (session.lifecycle !== 'unlocked') {
      return undefined;
    }

    const timeoutMs = Math.max(1, data.settings.autoLockMinutes || 10) * 60 * 1000;
    let timerId = null;

    const resetIdleTimer = () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }

      timerId = window.setTimeout(() => {
        lockWorkspace(`Workspace auto-locked after ${data.settings.autoLockMinutes} minutes of inactivity.`);
      }, timeoutMs);
    };

    resetIdleTimer();

    const events = ['mousemove', 'keydown', 'pointerdown', 'touchstart', 'scroll'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    return () => {
      if (timerId) {
        window.clearTimeout(timerId);
      }
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
    };
  }, [data.settings.autoLockMinutes, session.lifecycle]);

  const orderedApps = APP_ORDER.map((key) => ({ appKey: key, ...APPS[key] })).filter(Boolean);

  const searchGroups = useMemo(() => {
    const query = globalSearchQuery.trim();

    if (!query || session.lifecycle !== 'unlocked') {
      return [];
    }

    const appResults = orderedApps
      .filter((app) =>
        `${app.title} ${app.description} ${app.category}`.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 6)
      .map((app) => ({
        id: app.id,
        appKey: app.appKey,
        title: app.title,
        subtitle: app.description,
        navigation: {
          appKey: app.appKey,
        },
      }));

    const workspaceGroups = searchWorkspaceData(data, query);
    const combined = appResults.length
      ? [{ key: 'apps', label: 'Apps', results: appResults }, ...workspaceGroups]
      : workspaceGroups;

    return combined;
  }, [data, globalSearchQuery, orderedApps, session.lifecycle]);

  const flatSearchResults = searchGroups.flatMap((group) => group.results);
  const shouldShowOnboarding = session.lifecycle === 'unlocked' && !data.settings.betaOnboardingCompletedAt;

  const focusWindow = (windowId) => {
    setActiveWindowId(windowId);
    setWindows((current) =>
      current.map((windowItem) =>
        windowItem.id === windowId
          ? { ...windowItem, zIndex: getNextZ(current), isMinimized: false }
          : windowItem,
      ),
    );
  };

  const openApp = (appKey) => {
    const app = APPS[appKey];
    if (!app) {
      return;
    }

    setActiveWindowId(app.id);
    setMenuOpen(false);

    setWindows((current) => {
      const existingWindow = current.find((windowItem) => windowItem.id === app.id);
      if (existingWindow) {
        return current.map((windowItem) =>
          windowItem.id === app.id
            ? { ...windowItem, isMinimized: false, zIndex: getNextZ(current) }
            : windowItem,
        );
      }

      return [...current, buildWindow(app, current.length, current)];
    });
  };

  const handleSearchSelection = (result) => {
    if (!result?.navigation?.appKey) {
      return;
    }

    setWorkspaceNavigation(result.navigation);
    openApp(result.navigation.appKey);
    setGlobalSearchQuery('');
  };

  const handleExitApp = async () => {
    if (exitBusy) {
      return;
    }

    setExitBusy(true);

    try {
      await runAutoSnapshotExport({ trigger: 'quit' });
      await closeNativeApp();
    } finally {
      window.setTimeout(() => {
        setExitBusy(false);
      }, 1200);
    }
  };

  const handleLockWorkspace = (notice = 'Workspace locked.') => {
    lockWorkspace(notice);
    setPassphrase('');
    setConfirmPassphrase('');
  };

  const closeWindow = (windowId, event) => {
    event.stopPropagation();
    const remaining = windows.filter((windowItem) => windowItem.id !== windowId);
    const shouldTriggerDeadMan = data.settings.deadMansTriggerEnabled && remaining.length === 0;

    setWindows(remaining);

    if (shouldTriggerDeadMan) {
      setMenuOpen(false);
      setActiveWindowId(null);

      if (data.settings.sessionDefenseLastWindowAction === 'lock') {
        lockWorkspace('Dead-man trigger locked the workspace because the final window was closed.');
      } else {
        nukeWorkspaceData().catch(() => {});
      }

      return;
    }

    if (activeWindowId === windowId) {
      setActiveWindowId(remaining.length ? remaining[remaining.length - 1].id : null);
    }
  };

  const minimizeWindow = (windowId, event) => {
    event.stopPropagation();
    setWindows((current) =>
      current.map((windowItem) =>
        windowItem.id === windowId ? { ...windowItem, isMinimized: true } : windowItem,
      ),
    );

    if (activeWindowId === windowId) {
      setActiveWindowId(null);
    }
  };

  const toggleMaximize = (windowId, event) => {
    event.stopPropagation();
    setWindows((current) =>
      current.map((windowItem) =>
        windowItem.id === windowId
          ? { ...windowItem, isMaximized: !windowItem.isMaximized, zIndex: getNextZ(current) }
          : windowItem,
      ),
    );
    setActiveWindowId(windowId);
  };

  const handleMouseDown = (event, windowId) => {
    if (event.target.closest('.window-controls')) {
      return;
    }

    const targetWindow = windows.find((windowItem) => windowItem.id === windowId);
    if (!targetWindow || targetWindow.isMaximized) {
      return;
    }

    focusWindow(windowId);

    dragInfo.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      initialLeft: targetWindow.x,
      initialTop: targetWindow.y,
      windowId,
    };
  };

  const handleMouseMove = (event) => {
    if (!dragInfo.current.isDragging) {
      return;
    }

    const { startX, startY, initialLeft, initialTop, windowId } = dragInfo.current;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const bounds = mainRef.current?.getBoundingClientRect();

    setWindows((current) =>
      current.map((windowItem) => {
        if (windowItem.id !== windowId) {
          return windowItem;
        }

        const width = Number(windowItem.defaultSize?.w) || 1040;
        const height = Number(windowItem.defaultSize?.h) || 720;
        const maxX = bounds ? Math.max(0, bounds.width - Math.min(width, bounds.width)) : initialLeft + deltaX;
        const maxY = bounds ? Math.max(0, bounds.height - Math.min(height, bounds.height)) : initialTop + deltaY;

        return {
          ...windowItem,
          x: Math.min(Math.max(0, initialLeft + deltaX), maxX),
          y: Math.min(Math.max(0, initialTop + deltaY), maxY),
        };
      }),
    );
  };

  const handleMouseUp = () => {
    dragInfo.current.isDragging = false;
  };

  const handleAccessSubmit = async (event) => {
    event.preventDefault();

    if (!passphrase.trim()) {
      setAccessError('A master passphrase is required.');
      return;
    }

    if (session.lifecycle !== 'locked' && passphrase !== confirmPassphrase) {
      setAccessError('The passphrase and confirmation do not match.');
      return;
    }

    setBusy(true);
    setAccessError('');

    try {
      if (session.lifecycle === 'migration') {
        await migrateLegacyWorkspace(passphrase);
      } else if (session.lifecycle === 'locked') {
        await unlockWorkspace(passphrase);
      } else {
        await initializeSecureWorkspace(passphrase);
      }

      setPassphrase('');
      setConfirmPassphrase('');
    } catch (error) {
      setAccessError(getErrorMessage(error, 'Unable to complete the workspace access request.'));
    } finally {
      setBusy(false);
    }
  };

  const completeOnboarding = () => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        betaOnboardingCompletedAt: current.settings.betaOnboardingCompletedAt || new Date().toISOString(),
      },
    }));
  };

  const openControlRoom = () => {
    openApp('control-room');
    setWorkspaceNavigation({ appKey: 'control-room' });
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .midnight-animate-in {
          animation: fadeInUp 0.22s ease-out forwards;
        }

        .wireframe-grid {
          background-image:
            linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
          background-size: 8px 8px;
        }

        @keyframes bootPan {
          0% {
            transform: scale(1.02) translate3d(0, 0, 0);
          }
          100% {
            transform: scale(1.05) translate3d(0.75%, -0.75%, 0);
          }
        }

        @keyframes bootCardReveal {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .boot-splash-pan {
          animation: bootPan 12s ease-in-out infinite alternate;
        }

        .boot-splash-card {
          animation: bootCardReveal 0.45s ease-out forwards;
        }

        .boot-progress-bar {
          transition: width 0.3s ease;
          box-shadow: 0 0 18px rgba(94, 234, 212, 0.22);
        }
      `}</style>

      {!bootComplete ? (
        <BootSplash elapsedMs={bootElapsedMs} />
      ) : (
        <div
          className={`flex min-h-screen w-full flex-col overflow-hidden ${shellTheme.bg} text-slate-100`}
          style={desktopBackground}
          onMouseMove={session.lifecycle === 'unlocked' ? handleMouseMove : undefined}
          onMouseUp={session.lifecycle === 'unlocked' ? handleMouseUp : undefined}
          onMouseLeave={session.lifecycle === 'unlocked' ? handleMouseUp : undefined}
        >
          {session.lifecycle !== 'unlocked' ? (
            <LockScreen
              boot={session.boot}
              lifecycle={session.lifecycle}
              backend={session.backend}
              notice={session.notice}
              error={accessError || session.error}
              busy={busy}
              passphrase={passphrase}
              setPassphrase={(value) => {
                setAccessError('');
                setPassphrase(value);
              }}
              confirmPassphrase={confirmPassphrase}
              setConfirmPassphrase={(value) => {
                setAccessError('');
                setConfirmPassphrase(value);
              }}
              onSubmit={handleAccessSubmit}
              onSkipMigration={() => {
                setAccessError('');
                setPassphrase('');
                setConfirmPassphrase('');
                skipLegacyMigration();
              }}
            />
          ) : (
            <>
            <header className="relative z-10 border-b border-white/5 bg-black/15 px-4 py-3 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className={`text-[11px] uppercase tracking-[0.34em] ${shellTheme.accentText}`}>
                    {shellTheme.shortName}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                      {data.settings.codename}
                    </h1>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${shellTheme.accentChip}`}>
                      Local only
                    </span>
                    <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-100">
                      {APP_RELEASE.channel}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative z-[120]">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2">
                      <Search size={15} className="text-slate-500" />
                      <input
                        value={globalSearchQuery}
                        onChange={(event) => setGlobalSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && flatSearchResults[0]) {
                            event.preventDefault();
                            handleSearchSelection(flatSearchResults[0]);
                          }
                        }}
                        placeholder="Search the vault..."
                        className="w-56 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                      />
                    </div>

                    {globalSearchQuery.trim() ? (
                      <div className="absolute right-0 top-14 z-[130] w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur">
                        {searchGroups.length ? (
                          <div className="max-h-[32rem] overflow-y-auto p-3">
                            {searchGroups.map((group) => (
                              <div key={group.key} className="mb-3 last:mb-0">
                                <div className="px-3 pb-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                                  {group.label}
                                </div>
                                <div className="space-y-1">
                                  {group.results.map((result) => (
                                    <button
                                      key={result.id}
                                      type="button"
                                      onClick={() => handleSearchSelection(result)}
                                      className="w-full rounded-2xl px-3 py-3 text-left transition hover:bg-white/5"
                                    >
                                      <div className="text-sm font-semibold text-white">{result.title}</div>
                                      <div className="mt-1 text-xs leading-5 text-slate-400">
                                        {result.subtitle}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-5 text-sm text-slate-400">
                            No matches in the unlocked workspace.
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-2 text-right">
                    <div className="text-sm font-semibold text-white">
                      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[11px] text-slate-400">{time.toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </header>

            <main ref={mainRef} className="relative z-0 flex-1 overflow-hidden p-3">
              <div className="absolute bottom-20 left-3 top-3 z-0 flex w-28 flex-col gap-2.5 overflow-y-auto pr-2 pb-4">
                {orderedApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => openApp(app.appKey)}
                      className={`group wireframe-grid rounded-[20px] border border-white/5 bg-black/15 p-2.5 text-left transition ${shellTheme.launcherHover} hover:bg-white/5`}
                    >
                      <div className={`mb-2 inline-flex rounded-2xl border p-2.5 shadow-lg shadow-black/30 ${getAppIconTone(app, data.settings.theme)}`}>
                        <Icon size={18} />
                      </div>
                      <div className="text-[13px] font-semibold text-slate-100">{app.title}</div>
                      <div className="mt-1 text-[11px] leading-4 text-slate-500">{app.category}</div>
                    </button>
                  );
                })}
              </div>

              <DesktopSignals now={time} lan={data.lan} />

              {windows.map((windowItem) => {
                if (windowItem.isMinimized) {
                  return null;
                }

                const Icon = windowItem.icon;
                const WindowComponent = COMPONENT_MAP[windowItem.component];

                return (
                  <section
                    key={windowItem.id}
                    onMouseDown={() => focusWindow(windowItem.id)}
                    style={{
                      zIndex: windowItem.zIndex,
                      left: windowItem.isMaximized ? 0 : windowItem.x,
                      top: windowItem.isMaximized ? 0 : windowItem.y,
                      width: windowItem.isMaximized ? '100%' : windowItem.defaultSize.w,
                      height: windowItem.isMaximized ? '100%' : windowItem.defaultSize.h,
                    }}
                    className={`midnight-animate-in absolute flex flex-col overflow-hidden rounded-[22px] border ${shellTheme.borderStrong} ${shellTheme.windowBg} shadow-2xl shadow-black/40 backdrop-blur`}
                  >
                    <div
                      onMouseDown={(event) => handleMouseDown(event, windowItem.id)}
                      className="flex h-10 items-center justify-between border-b border-white/10 bg-black/20 px-3.5"
                    >
                      <button
                        type="button"
                        onClick={() => focusWindow(windowItem.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className={`wireframe-grid inline-flex rounded-xl border p-2 ${getAppIconTone(windowItem, data.settings.theme)}`}>
                          <Icon size={15} />
                        </span>
                        <div>
                          <div className="text-[13px] font-semibold text-white">{windowItem.title}</div>
                          <div className="text-[11px] text-slate-500">{windowItem.description}</div>
                        </div>
                      </button>

                      <div className="window-controls flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(event) => minimizeWindow(windowItem.id, event)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <Minus size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => toggleMaximize(windowItem.id, event)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <Square size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => closeWindow(windowItem.id, event)}
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 bg-slate-950/40">
                      <WindowComponent />
                    </div>
                  </section>
                );
              })}
            </main>

            <footer className="relative flex h-14 items-center justify-between border-t border-white/5 bg-black/20 px-3 backdrop-blur">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMenuOpen((current) => !current)}
                  className={`inline-flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                    menuOpen ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <span className="inline-flex rounded-xl border border-white/10 bg-black/20 p-1.5 shadow-lg shadow-black/30">
                    <img src={BRAND_LOGO} alt="OSA Midnight Oil logo" className="h-7 w-7" />
                  </span>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{shellTheme.shortName}</div>
                    <div className="text-[11px] text-slate-500">{shellTheme.accentLabel}</div>
                  </div>
                </button>

                {menuOpen ? (
                  <div className="absolute bottom-16 left-3 max-h-[70vh] w-80 overflow-y-auto rounded-3xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-black/50 backdrop-blur">
                    <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Operator</div>
                      <div className="mt-1 text-lg font-semibold text-white">{data.settings.operator}</div>
                      <div className="mt-1 text-sm text-slate-400">{data.settings.codename}</div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {orderedApps.map((app) => {
                        const Icon = app.icon;
                        return (
                          <button
                            key={app.id}
                            type="button"
                            onClick={() => openApp(app.appKey)}
                            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5"
                          >
                            <span className={`wireframe-grid inline-flex rounded-xl border p-2 shadow-lg shadow-black/20 ${getAppIconTone(app, data.settings.theme)}`}>
                              <Icon size={16} />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-white">{app.title}</div>
                              <div className="text-xs text-slate-500">{app.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-3 border-t border-white/5 pt-3">
                      <button
                        type="button"
                        onClick={() => handleLockWorkspace('Workspace locked from the shell menu.')}
                        className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5 ${shellTheme.accentText}`}
                      >
                        <span className={`wireframe-grid inline-flex rounded-xl border p-2 ${shellTheme.accentChip}`}>
                          <Lock size={16} />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">Lock Workspace</div>
                          <div className="text-xs text-slate-500">Clear decrypted state from memory now</div>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 justify-center gap-2 px-4">
                {windows.map((windowItem) => {
                  const Icon = windowItem.icon;
                  const appKey = APP_ORDER.find((key) => APPS[key].id === windowItem.id);

                  return (
                    <button
                      key={windowItem.id}
                      type="button"
                      onClick={() =>
                        windowItem.isMinimized ? openApp(appKey) : focusWindow(windowItem.id)
                      }
                      className={`inline-flex max-w-[180px] items-center gap-2 rounded-2xl px-3 py-2 text-sm transition ${
                        activeWindowId === windowItem.id && !windowItem.isMinimized
                          ? 'border border-white/10 bg-white/10 text-white'
                          : 'bg-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className={`wireframe-grid inline-flex rounded-lg border p-1.5 ${getAppIconTone(windowItem, data.settings.theme)}`}>
                        <Icon size={13} />
                      </span>
                      <span className="truncate">{windowItem.title}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLockWorkspace('Workspace locked from the taskbar.')}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${shellTheme.lockButton}`}
                >
                  <Lock size={14} />
                  Lock
                </button>

                <button
                  type="button"
                  onClick={handleExitApp}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
                >
                  <X size={14} />
                  Exit
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-400">
                  <Wifi size={16} />
                  <Volume2 size={16} />
                  <BatteryMedium size={16} />
                </div>
              </div>
            </footer>
            {shouldShowOnboarding ? (
              <BetaOnboarding
                codename={data.settings.codename}
                onComplete={completeOnboarding}
                onOpenControlRoom={() => {
                  completeOnboarding();
                  openControlRoom();
                }}
              />
            ) : null}
            </>
          )}
        </div>
      )}
    </>
  );
};

export default App;
