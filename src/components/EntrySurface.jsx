/* eslint-disable react/prop-types */
import { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Lock,
  RadioTower,
  User,
  Wrench,
} from 'lucide-react';

const DOCTRINES = {
  research: {
    id: 'research',
    label: 'RESEARCH',
    direction: 'top',
    icon: BookOpen,
    purpose: 'Knowledge, notes, studies, documents, synthesis.',
    appKeys: ['library', 'research-vault', 'notes', 'bookmarks', 'flow-studio'],
    trayStyle: {
      left: 'calc(50% + clamp(6.5rem, 10vw, 8rem))',
      top: 'max(0.75rem, calc(50% - clamp(17rem, 22vw, 18.5rem)))',
    },
    trayClass: '',
    nodeStyle: {
      left: '50%',
      top: 'calc(50% - clamp(13rem, 20vw, 16rem))',
    },
  },
  signal: {
    id: 'signal',
    label: 'SIGNAL',
    direction: 'right',
    icon: RadioTower,
    purpose: 'Networks, external systems, exchange, communications.',
    appKeys: ['comms', 'nostr-lounge', 'f-society', 'wallet-vault'],
    trayStyle: {
      left: 'calc(50% + clamp(17rem, 24vw, 19rem))',
      top: '50%',
    },
    trayClass: 'lg:-translate-y-1/2',
    nodeStyle: {
      left: 'calc(50% + clamp(13rem, 20vw, 16rem))',
      top: '50%',
    },
  },
  utility: {
    id: 'utility',
    label: 'UTILITY',
    direction: 'bottom',
    icon: Wrench,
    purpose: 'Execution, scheduling, tools, local operations.',
    appKeys: ['calendar', 'clocks', 'console', 'inventory'],
    trayStyle: {
      bottom: 'max(0.75rem, calc(50% - clamp(17rem, 22vw, 18.5rem)))',
      left: 'calc(50% + clamp(6.5rem, 10vw, 8rem))',
    },
    trayClass: '',
    nodeStyle: {
      left: '50%',
      top: 'calc(50% + clamp(13rem, 20vw, 16rem))',
    },
  },
  primary: {
    id: 'primary',
    label: 'PRIMARY',
    direction: 'left',
    icon: User,
    purpose: 'Operator identity, personal control, profile systems.',
    appKeys: ['overview', 'profiles', 'bps-engine', 'control-room'],
    trayStyle: {
      right: 'calc(50% + clamp(17rem, 24vw, 19rem))',
      top: '50%',
    },
    trayClass: 'lg:-translate-y-1/2',
    nodeStyle: {
      left: 'calc(50% - clamp(13rem, 20vw, 16rem))',
      top: '50%',
    },
  },
};

const DOCTRINE_ORDER = ['research', 'signal', 'utility', 'primary'];
const CONNECTOR_OFFSET = 'clamp(13rem, 20vw, 16rem)';

const getAppsForDoctrine = (orderedApps, doctrine) =>
  doctrine.appKeys
    .map((appKey) => orderedApps.find((app) => app.appKey === appKey))
    .filter(Boolean);

const ConnectorLines = ({ activeDoctrineId }) => {
  const connectorStyles = {
    research: {
      left: '50%',
      top: `calc(50% - ${CONNECTOR_OFFSET})`,
      height: CONNECTOR_OFFSET,
    },
    signal: {
      left: '50%',
      top: '50%',
      width: CONNECTOR_OFFSET,
    },
    utility: {
      left: '50%',
      top: '50%',
      height: CONNECTOR_OFFSET,
    },
    primary: {
      left: `calc(50% - ${CONNECTOR_OFFSET})`,
      top: '50%',
      width: CONNECTOR_OFFSET,
    },
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {DOCTRINE_ORDER.map((doctrineId) => {
        const vertical = doctrineId === 'research' || doctrineId === 'utility';
        const active = activeDoctrineId === doctrineId;

        return (
          <span
            key={doctrineId}
            style={connectorStyles[doctrineId]}
            className={`absolute ${
              vertical
                ? 'w-px -translate-x-1/2 bg-gradient-to-b'
                : 'h-px -translate-y-1/2 bg-gradient-to-r'
            } ${
              active
                ? 'from-transparent via-cyan-100/34 to-transparent'
                : 'from-transparent via-white/12 to-transparent'
            }`}
          />
        );
      })}
    </div>
  );
};

const DoctrineNode = ({
  doctrine,
  active,
  selected,
  expanded,
  onHover,
  onLeave,
  onSelect,
}) => {
  const Icon = doctrine.icon;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onMouseEnter={() => onHover(doctrine.id)}
      onMouseLeave={onLeave}
      onFocus={() => onHover(doctrine.id)}
      onBlur={onLeave}
      onClick={() => onSelect(doctrine.id)}
      style={doctrine.nodeStyle}
      className={`absolute z-20 grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center border bg-white/[0.06] shadow-2xl shadow-black/18 backdrop-blur-sm transition duration-200 focus:outline-none focus:ring-1 focus:ring-cyan-100/40 ${
        selected
          ? 'border-cyan-100/62 shadow-[0_0_30px_rgba(103,232,249,0.14),0_18px_56px_rgba(0,0,0,0.22)]'
          : active
            ? 'border-cyan-100/42 shadow-cyan-950/10'
            : 'border-white/12 hover:border-cyan-100/24'
      }`}
    >
      <span className="grid -rotate-45 place-items-center text-center">
        <Icon size={21} className={active ? 'text-cyan-100' : 'text-slate-400'} />
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-100">
          {doctrine.label}
        </span>
        <span className={`mt-1 text-[10px] uppercase tracking-[0.22em] ${selected ? 'text-cyan-100/68' : 'text-slate-500'}`}>
          {expanded ? 'Expanded' : `${doctrine.appKeys.length} apps`}
        </span>
      </span>
    </button>
  );
};

const CenterNode = ({ onOpenCockpit }) => (
  <button
    type="button"
    onClick={onOpenCockpit}
    className="absolute left-1/2 top-1/2 z-30 grid h-52 w-52 -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center border border-cyan-100/36 bg-[linear-gradient(135deg,rgba(22,30,36,0.82),rgba(14,21,26,0.88))] shadow-[0_0_42px_rgba(103,232,249,0.14),0_22px_76px_rgba(0,0,0,0.26)] backdrop-blur-md transition duration-200 hover:border-cyan-100/60 hover:shadow-[0_0_54px_rgba(103,232,249,0.18),0_22px_76px_rgba(0,0,0,0.3)] focus:outline-none focus:ring-1 focus:ring-cyan-100/50"
  >
    <span className="grid -rotate-45 place-items-center text-center">
      <Lock size={30} className="text-cyan-100/90" />
      <span className="mt-5 text-sm font-semibold uppercase tracking-[0.36em] text-white">Unlock Cockpit</span>
      <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-100">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-200" />
        local only
      </span>
      <span className="mt-2 text-xs text-slate-500">operator memory ready</span>
    </span>
  </button>
);

const DoctrineAppTray = ({ doctrine, apps, expanded, onExpand, onOpenModule, onHover, onLeave }) => {
  const visibleApps = expanded ? apps : apps.slice(0, 3);

  return (
    <section
      onMouseEnter={() => onHover(doctrine.id)}
      onMouseLeave={onLeave}
      style={doctrine.trayStyle}
      className={`z-20 rounded-2xl border border-white/12 bg-[rgba(24,31,36,0.72)] p-3 shadow-2xl shadow-black/18 backdrop-blur-md transition duration-200 lg:absolute lg:w-[30rem] ${doctrine.trayClass}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/70">
            {doctrine.label}
          </div>
          <div className="mt-1 text-xs text-slate-500">{doctrine.purpose}</div>
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-slate-600">{apps.length} apps</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {visibleApps.map((app) => {
          const Icon = app.icon;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onOpenModule(app.appKey)}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-white/12 bg-white/[0.055] px-3 py-3 text-left transition duration-150 hover:border-cyan-100/24 hover:bg-white/[0.085] focus:outline-none focus:ring-1 focus:ring-cyan-100/30"
            >
              <Icon size={16} className="shrink-0 text-cyan-100/78" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-100">{app.title}</span>
                <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-slate-600">
                  {app.category}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {apps.length > 3 ? (
        <button
          type="button"
          onClick={() => onExpand(doctrine.id)}
          className="mt-3 inline-flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-cyan-100/70 transition hover:text-cyan-50 focus:outline-none focus:text-cyan-50"
        >
          {expanded ? `Collapse ${doctrine.label} apps` : `Expand ${doctrine.label} apps`}
          <ChevronRight size={13} />
        </button>
      ) : null}
    </section>
  );
};

const EntrySurface = ({ orderedApps, data, time, shellTheme, onOpenModule, onOpenCockpit }) => {
  const [selectedDoctrine, setSelectedDoctrine] = useState('research');
  const [hoveredDoctrine, setHoveredDoctrine] = useState('');
  const [expandedDoctrine, setExpandedDoctrine] = useState('');
  const activeDoctrineId = hoveredDoctrine || selectedDoctrine;
  const activeDoctrine = DOCTRINES[activeDoctrineId] || DOCTRINES.research;
  const apps = useMemo(
    () => getAppsForDoctrine(orderedApps, activeDoctrine),
    [activeDoctrine, orderedApps],
  );
  const projectMemoryCount = Array.isArray(data.memoryItems) ? data.memoryItems.length : 0;
  const activeProject = Array.isArray(data.projects)
    ? data.projects.find((project) => project.id === data.activeProjectId) || data.projects[0]
    : null;

  const handleSelectDoctrine = (doctrineId) => {
    setSelectedDoctrine(doctrineId);
    setExpandedDoctrine((current) => (current === doctrineId ? '' : doctrineId));
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#111820] text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(103,232,249,0.09),transparent_30%),radial-gradient(circle_at_20%_35%,rgba(45,212,191,0.045),transparent_28%),linear-gradient(180deg,rgba(17,24,31,0.92),rgba(15,22,28,0.88)_48%,rgba(10,15,20,0.94))]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_bottom,rgba(31,41,55,0.48),transparent_68%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.34))]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(170,252,244,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(170,252,244,0.05)_1px,transparent_1px)] [background-size:88px_88px]" />

      <div className="relative z-10 grid h-full grid-rows-[auto_1fr]">
        <section className="px-7 pt-6 lg:px-9">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/82">
            Welcome, Operator
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Your data. Your keys. Your workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5">
              {activeProject?.name || 'Project ready'}
            </span>
            <span className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5">
              {shellTheme?.accentLabel || 'Host Glass'}
            </span>
            <span className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5">
              {projectMemoryCount} memory items
            </span>
            <span className="rounded-full border border-white/12 bg-white/[0.055] px-3 py-1.5">
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </section>

        <section className="relative min-h-0 px-4 pb-8 lg:px-8">
          <div className="relative mx-auto h-full min-h-[39rem] max-w-[118rem] lg:-translate-y-8">
            <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-white/12 bg-white/[0.025]" />
            <div className="absolute left-1/2 top-1/2 h-[21rem] w-[21rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-cyan-100/10" />
            <div className="absolute left-1/2 top-1/2 h-[16rem] w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/8" />
            <div className="absolute left-1/2 top-[14%] h-[72%] w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
            <div className="absolute left-[22%] top-1/2 h-px w-[56%] -translate-y-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <ConnectorLines activeDoctrineId={activeDoctrineId} />

            <CenterNode onOpenCockpit={onOpenCockpit} />

            {DOCTRINE_ORDER.map((doctrineId) => {
              const doctrine = DOCTRINES[doctrineId];
              const active = activeDoctrineId === doctrineId;
              return (
                <DoctrineNode
                  key={doctrine.id}
                  doctrine={doctrine}
                  active={active}
                  selected={selectedDoctrine === doctrineId}
                  expanded={expandedDoctrine === doctrineId}
                  onHover={setHoveredDoctrine}
                  onLeave={() => setHoveredDoctrine('')}
                  onSelect={handleSelectDoctrine}
                />
              );
            })}

            <div className="absolute inset-x-3 bottom-3 z-20 lg:static">
              <DoctrineAppTray
                doctrine={activeDoctrine}
                apps={apps}
                expanded={expandedDoctrine === activeDoctrine.id}
                onExpand={(doctrineId) => {
                  setSelectedDoctrine(doctrineId);
                  setExpandedDoctrine((current) => (current === doctrineId ? '' : doctrineId));
                }}
                onOpenModule={onOpenModule}
                onHover={setHoveredDoctrine}
                onLeave={() => setHoveredDoctrine('')}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EntrySurface;
