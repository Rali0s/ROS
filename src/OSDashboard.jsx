/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryMedium,
  KeyRound,
  Lock,
  Minus,
  ScanLine,
  Search,
  Shield,
  Square,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import { APP_ORDER, APPS, BOOT_SPLASH, BRAND_LOGO, SYSTEM_THEME, getDesktopBackgroundStyle } from './utils/constants.js';
import OverviewApp from './components/OverviewApp.jsx';
import CalendarApp from './components/CalendarApp.jsx';
import NotesApp from './components/NotesApp.jsx';
import ProfileOrganizerApp from './components/ProfileOrganizerApp.jsx';
import FlowStudioApp from './components/FlowStudioApp.jsx';
import BookmarksApp from './components/BookmarksApp.jsx';
import InventoryApp from './components/InventoryApp.jsx';
import WalletVaultApp from './components/WalletVaultApp.jsx';
import ClocksApp from './components/ClocksApp.jsx';
import TerminalApp from './components/TerminalApp.jsx';
import SettingsApp from './components/SettingsApp.jsx';
import {
  lockWorkspace,
  searchWorkspaceData,
  setWorkspaceNavigation,
  useWorkspaceData,
} from './utils/workspaceStore.js';

const COMPONENT_MAP = {
  OverviewApp,
  CalendarApp,
  NotesApp,
  ProfileOrganizerApp,
  FlowStudioApp,
  BookmarksApp,
  InventoryApp,
  WalletVaultApp,
  ClocksApp,
  TerminalApp,
  SettingsApp,
};

const getNextZ = (windows) => Math.max(0, ...windows.map((windowItem) => windowItem.zIndex || 0)) + 1;

const buildWindow = (app, index, windows = []) => {
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
  const frame = app.defaultFrame ?? { w: 1040, h: 720 };
  const baseX = Math.max(132, Math.round((viewportWidth - frame.w) / 2));
  const baseY = Math.max(48, Math.round((viewportHeight - frame.h) / 2) - 24);

  return {
    ...app,
    x: baseX + index * 24,
    y: baseY + index * 22,
    zIndex: getNextZ(windows),
    isMinimized: false,
    isMaximized: false,
  };
};

const BOOT_DURATION_MS = 12000;
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

const DesktopSignals = ({ now }) => {
  const moon = getMoonPhaseData(now);
  const hour = now.getHours();
  const spirit = SPIRITS_BY_HOUR[hour] ?? 'Unknown';
  const timeString = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <div className="pointer-events-none absolute right-5 top-4 z-0 flex w-[20rem] flex-col gap-4">
      <section className="rounded-[24px] border border-cyan-400/12 bg-slate-950/40 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-200">Phased Approach</div>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <div className="text-2xl font-semibold text-white">{moon.phaseName}</div>
            <div className="mt-1 text-sm text-slate-300">Illumination {moon.illumination}%</div>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-cyan-500/10 px-4 py-2 text-4xl leading-none text-cyan-100">
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

      <section className="rounded-[24px] border border-violet-400/12 bg-slate-950/40 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.3em] text-violet-200">Spiritual Clock</div>
        <div className="mt-3 text-3xl font-semibold text-white">{timeString}</div>
        <div className="mt-2 text-sm uppercase tracking-[0.22em] text-slate-500">Lemegeton · Ars Paulina</div>
        <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Governing Spirit</div>
          <div className="mt-2 text-lg font-medium text-violet-100">{spirit}</div>
        </div>
      </section>
    </div>
  );
};

const BootSplash = ({ elapsedMs }) => {
  const progress = Math.min(100, Math.round((elapsedMs / BOOT_DURATION_MS) * 100));
  const activeStepIndex = Math.min(BOOT_STEPS.length - 1, Math.floor((progress / 100) * BOOT_STEPS.length));
  const ansiLines = [
    '┌────────────────────────────────────────────┐',
    '│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │',
    '│                                            │',
    '│     CITADEL NOIR :: CYBERPUNK INIT         │',
    '│                                            │',
    '│     [ ROS CORE BOOTSTRAP ]                 │',
    ...BOOT_STEPS.map((step, index) => {
      const status = progress >= ((index + 1) / BOOT_STEPS.length) * 100 ? 'OK' : index === activeStepIndex ? '..' : '--';
      return `│     ${step.padEnd(22, '.')} ${status.padEnd(2, ' ')}            │`;
    }),
    '│                                            │',
    `│     LOADING VECTOR FIELD ${buildAnsiProgress(progress)}      │`,
    '│                                            │',
    '│     By: Premise::Layer-3 Inc.,             │',
    '│     Credits: Rali0s                        │',
    '│                                            │',
    '└────────────────────────────────────────────┘',
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050911] text-slate-100">
      <div
        className="absolute inset-0 scale-105 bg-cover bg-center opacity-35 boot-splash-pan"
        style={{ backgroundImage: `url(${BOOT_SPLASH.image})` }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_75%,rgba(71,184,255,0.24),transparent_24%),radial-gradient(circle_at_78%_28%,rgba(177,92,255,0.28),transparent_26%),radial-gradient(circle_at_65%_60%,rgba(111,86,255,0.16),transparent_30%),linear-gradient(135deg,#070b1a_0%,#111a3a_42%,#241457_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(circle_at_center,rgba(0,0,0,0.92),transparent_88%)]" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[16%] h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl boot-orbit-a" />
        <div className="absolute right-[6%] top-[14%] h-80 w-80 rounded-full bg-violet-500/20 blur-3xl boot-orbit-b" />
        <div className="absolute bottom-[10%] left-[28%] h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl boot-orbit-c" />
      </div>

      <div className="relative z-10 grid min-h-screen place-items-center px-5 py-8">
        <div className="w-full max-w-[1120px]">
          <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-[26px] xl:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(71,184,255,0.12)_0%,transparent_28%,rgba(177,92,255,0.1)_70%,transparent_100%)]" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-black/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.36em] text-cyan-100">
                <ScanLine size={12} />
                Secure Access Node
              </div>
              <div className="rounded-[28px] border border-white/10 bg-black/25 p-3 shadow-2xl shadow-black/30">
                <div className="overflow-hidden rounded-[22px] border border-white/10">
                  <img
                    src={BOOT_SPLASH.image}
                    alt="Citadel Noir splash"
                    className="h-[30rem] w-full object-cover object-center saturate-[1.05]"
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-slate-400">Citadel boot rail</div>
                  <h1 className="mt-3 text-5xl font-light uppercase tracking-[0.18em] text-slate-50 text-shadow-glow">
                    {BOOT_SPLASH.title}
                  </h1>
                  <div className="mt-3 text-xl uppercase tracking-[0.18em] text-slate-300">
                    {BOOT_SPLASH.subtitle}
                  </div>
                  <div className="mt-5 h-4 overflow-hidden rounded-full border border-emerald-400/20 bg-emerald-950/40">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,rgba(52,211,153,0.92),rgba(34,197,94,0.88))] shadow-[0_0_18px_rgba(74,222,128,0.4)] transition-[width] duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
                    <span>Loading vector field</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {BOOT_STEPS.map((step, index) => {
                      const stepReady = progress >= ((index + 1) / BOOT_STEPS.length) * 100;
                      const stepActive = index === activeStepIndex && !stepReady;

                      return (
                        <div
                          key={step}
                          className={`rounded-2xl border px-4 py-3 transition ${
                            stepReady
                              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                              : stepActive
                                ? 'border-violet-400/25 bg-violet-500/10 text-violet-100'
                                : 'border-white/10 bg-black/20 text-slate-400'
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-[0.28em]">Bootstrap</div>
                          <div className="mt-2 flex items-center justify-between gap-4">
                            <span className="font-medium">{step}</span>
                            <span className="text-xs uppercase tracking-[0.24em]">
                              {stepReady ? 'OK' : stepActive ? 'SYNC' : 'WAIT'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-black/30">
                  <div className="mb-3 text-xs uppercase tracking-[0.34em] text-emerald-300">ANSI bootstrap</div>
                  <pre className="ansi-terminal overflow-hidden whitespace-pre rounded-2xl border border-emerald-500/20 bg-black/70 p-4 text-[12px] leading-6 text-emerald-300 shadow-inner shadow-black/40">
                    {ansiLines.join('\n')}
                  </pre>
                  <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.26em] text-slate-500">
                    <span>Premise::Layer-3 Inc.</span>
                    <span className="boot-cursor text-emerald-300">Rali0s_</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-sm tracking-[0.08em] text-slate-500">
                By: <span className="text-slate-300">Premise::Layer-3 Inc.</span> | Credits:{' '}
                <span className="text-slate-300">Rali0s</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

const LockScreen = ({
  boot,
  lifecycle,
  notice,
  error,
  busy,
  passphrase,
  setPassphrase,
  confirmPassphrase,
  setConfirmPassphrase,
  onSubmit,
}) => {
  const title =
    lifecycle === 'migration'
      ? 'Migrate Local Workspace'
      : lifecycle === 'locked'
        ? 'Unlock Workspace'
        : 'Initialize Secure Workspace';

  const description =
    lifecycle === 'migration'
      ? 'A legacy local workspace was found. Set a master passphrase to encrypt it in place and keep working.'
      : lifecycle === 'locked'
        ? 'Enter the master passphrase to decrypt the workspace into memory for this session.'
        : 'Create a master passphrase to seal the workspace locally before ROS starts.';

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/10 bg-slate-950/78 p-6 shadow-2xl shadow-black/50 backdrop-blur md:p-8">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[1.75rem] border border-cyan-400/15 bg-[linear-gradient(135deg,rgba(8,18,42,0.92),rgba(22,32,68,0.86)_55%,rgba(34,24,66,0.82)_100%)] p-6 shadow-xl shadow-black/30">
            <div className="flex items-center gap-4">
              <img src={BRAND_LOGO} alt="OSA Midnight Oil logo" className="h-14 w-14 rounded-2xl border border-white/10 bg-black/20 p-2 shadow-lg shadow-black/20" />
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
                <Shield size={12} />
                Master-Locked Vault
              </div>
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">{boot.codename}</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">{description}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Operator</div>
                <div className="mt-2 text-lg font-semibold text-white">{boot.operator}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Storage</div>
                <div className="mt-2 text-lg font-semibold text-white">Local only</div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-violet-400/12 bg-[linear-gradient(135deg,rgba(15,23,42,0.62),rgba(30,41,59,0.42))] p-4 text-sm leading-6 text-slate-300">
              The workspace stays encrypted at rest. Unlocking decrypts it into memory for this session only, and inactivity locks it again automatically.
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(8,12,30,0.96))] p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-violet-200">
                <KeyRound size={18} />
              </span>
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Vault access</div>
                <div className="text-2xl font-semibold text-white">{title}</div>
              </div>
            </div>

            {notice ? (
              <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
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
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Master passphrase</span>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-violet-400/35 focus:bg-slate-950/50"
                  placeholder="Required to unlock the workspace"
                />
              </label>

              {lifecycle !== 'locked' ? (
                <label className="block space-y-2 text-sm text-slate-200">
                  <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Confirm passphrase</span>
                  <input
                    type="password"
                    value={confirmPassphrase}
                    onChange={(event) => setConfirmPassphrase(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 outline-none transition focus:border-violet-400/35 focus:bg-slate-950/50"
                    placeholder="Repeat the master passphrase"
                  />
                </label>
              ) : null}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#f2a93b,#f59e0b)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
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
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const {
    data,
    session,
    initializeSecureWorkspace,
    migrateLegacyWorkspace,
    nukeWorkspaceData,
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

  useEffect(() => {
    const timer = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(timer);
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

  const handleLockWorkspace = (notice = 'Workspace locked.') => {
    lockWorkspace(notice);
    setPassphrase('');
    setConfirmPassphrase('');
  };

  const closeWindow = (windowId, event) => {
    event.stopPropagation();
    setWindows((current) => {
      const remaining = current.filter((windowItem) => windowItem.id !== windowId);

      if (data.settings.deadMansTriggerEnabled && remaining.length === 0) {
        nukeWorkspaceData();
        setMenuOpen(false);
        setActiveWindowId(null);
        return remaining;
      }

      if (activeWindowId === windowId) {
        setActiveWindowId(remaining.length ? remaining[remaining.length - 1].id : null);
      }

      return remaining;
    });
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

    setWindows((current) =>
      current.map((windowItem) =>
        windowItem.id === windowId
          ? { ...windowItem, x: initialLeft + deltaX, y: initialTop + deltaY }
          : windowItem,
      ),
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
      setAccessError(error.message || 'Unable to complete the workspace access request.');
    } finally {
      setBusy(false);
    }
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
            transform: scale(1.05) translate3d(0, 0, 0);
          }
          50% {
            transform: scale(1.09) translate3d(-1.5%, -1%, 0);
          }
          100% {
            transform: scale(1.07) translate3d(1.25%, 1.5%, 0);
          }
        }

        @keyframes orbitA {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.55; }
          50% { transform: translate3d(26px, -18px, 0); opacity: 0.85; }
        }

        @keyframes orbitB {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.42; }
          50% { transform: translate3d(-20px, 22px, 0); opacity: 0.72; }
        }

        @keyframes orbitC {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.4; }
          50% { transform: translate3d(18px, -14px, 0); opacity: 0.68; }
        }

        @keyframes ansiSweep {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }

        @keyframes cursorBlink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.28; }
        }

        .boot-splash-pan {
          animation: bootPan 12s ease-in-out infinite alternate;
        }

        .boot-orbit-a {
          animation: orbitA 8s ease-in-out infinite;
        }

        .boot-orbit-b {
          animation: orbitB 10s ease-in-out infinite;
        }

        .boot-orbit-c {
          animation: orbitC 9s ease-in-out infinite;
        }

        .ansi-terminal {
          position: relative;
          font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
          text-shadow: 0 0 10px rgba(74, 222, 128, 0.22);
        }

        .ansi-terminal::after {
          content: "";
          position: absolute;
          inset: -20% 0;
          background: linear-gradient(180deg, transparent 0%, rgba(74, 222, 128, 0.08) 48%, transparent 100%);
          animation: ansiSweep 3.2s linear infinite;
          pointer-events: none;
        }

        .boot-cursor {
          animation: cursorBlink 1s steps(1) infinite;
        }

        .text-shadow-glow {
          text-shadow:
            0 0 10px rgba(177, 92, 255, 0.18),
            0 0 18px rgba(71, 184, 255, 0.12);
        }
      `}</style>

      {!bootComplete ? (
        <BootSplash elapsedMs={bootElapsedMs} />
      ) : (
        <div
          className={`flex min-h-screen w-full flex-col overflow-hidden ${SYSTEM_THEME.bg} text-slate-100`}
          style={desktopBackground}
          onMouseMove={session.lifecycle === 'unlocked' ? handleMouseMove : undefined}
          onMouseUp={session.lifecycle === 'unlocked' ? handleMouseUp : undefined}
          onMouseLeave={session.lifecycle === 'unlocked' ? handleMouseUp : undefined}
        >
          {session.lifecycle !== 'unlocked' ? (
            <LockScreen
              boot={session.boot}
              lifecycle={session.lifecycle}
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
            />
          ) : (
            <>
            <header className="relative z-40 border-b border-white/5 bg-black/15 px-4 py-3 backdrop-blur">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.34em] text-amber-300">
                    {SYSTEM_THEME.shortName}
                  </div>
                  <div className="mt-1 flex items-center gap-3">
                    <h1 className="text-2xl font-semibold tracking-tight text-white">
                      {data.settings.codename}
                    </h1>
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-100">
                      Local only
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative z-50">
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
                      <div className="absolute right-0 top-14 z-50 w-[28rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur">
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

            <main className="relative z-0 flex-1 overflow-hidden p-4">
              <div className="absolute left-4 top-4 bottom-20 z-0 flex w-32 flex-col gap-3 overflow-y-auto pr-2 pb-4">
                {orderedApps.map((app) => {
                  const Icon = app.icon;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => openApp(app.appKey)}
                      className="group wireframe-grid rounded-2xl border border-white/5 bg-black/15 p-3 text-left transition hover:border-amber-400/20 hover:bg-white/5"
                    >
                      <div className={`mb-2 inline-flex rounded-2xl border p-3 shadow-lg shadow-black/30 ${app.iconTone}`}>
                        <Icon size={20} />
                      </div>
                      <div className="text-sm font-semibold text-slate-100">{app.title}</div>
                      <div className="mt-1 text-[11px] leading-4 text-slate-500">{app.category}</div>
                    </button>
                  );
                })}
              </div>

              <DesktopSignals now={time} />

              {windows.map((windowItem) => {
                if (windowItem.isMinimized) {
                  return null;
                }

                const Icon = windowItem.icon;
                const WindowComponent = COMPONENT_MAP[windowItem.component];

                return (
                  <section
                    key={windowItem.id}
                    onMouseDown={(event) => handleMouseDown(event, windowItem.id)}
                    style={{
                      zIndex: windowItem.zIndex,
                      left: windowItem.isMaximized ? 0 : windowItem.x,
                      top: windowItem.isMaximized ? 0 : windowItem.y,
                      width: windowItem.isMaximized ? '100%' : windowItem.defaultSize.w,
                      height: windowItem.isMaximized ? '100%' : windowItem.defaultSize.h,
                    }}
                    className={`midnight-animate-in absolute flex flex-col overflow-hidden rounded-2xl border ${SYSTEM_THEME.borderStrong} ${SYSTEM_THEME.windowBg} shadow-2xl shadow-black/40 backdrop-blur`}
                  >
                    <div className="flex h-11 items-center justify-between border-b border-white/10 bg-black/20 px-4">
                      <button
                        type="button"
                        onClick={() => focusWindow(windowItem.id)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className={`wireframe-grid inline-flex rounded-xl border p-2 ${windowItem.iconTone}`}>
                          <Icon size={16} />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{windowItem.title}</div>
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
                    <div className="text-sm font-semibold text-white">{SYSTEM_THEME.shortName}</div>
                    <div className="text-[11px] text-slate-500">{SYSTEM_THEME.accentLabel}</div>
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
                            <span className={`wireframe-grid inline-flex rounded-xl border p-2 shadow-lg shadow-black/20 ${app.iconTone}`}>
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
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-amber-100 transition hover:bg-white/5"
                      >
                        <span className="wireframe-grid inline-flex rounded-xl border border-amber-400/25 bg-amber-500/10 p-2">
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
                      <span className={`wireframe-grid inline-flex rounded-lg border p-1.5 ${windowItem.iconTone}`}>
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
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/20"
                >
                  <Lock size={14} />
                  Lock
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-400">
                  <Wifi size={16} />
                  <Volume2 size={16} />
                  <BatteryMedium size={16} />
                </div>
              </div>
            </footer>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default App;
