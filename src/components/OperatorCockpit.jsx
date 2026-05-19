/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Archive,
  ArrowLeft,
  BrainCircuit,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Database,
  Download,
  ExternalLink,
  FileText,
  FolderPlus,
  Lock,
  Moon,
  Network,
  Plus,
  RadioTower,
  Save,
  Search,
  Send,
  ShieldCheck,
  TerminalSquare,
  X,
} from 'lucide-react';
import { APP_ORDER, APPS, getAppInteriorTheme, getShellTheme } from '../utils/constants';
import {
  DEFAULT_MODEL_ID,
  HUGGINGFACE_GGUF_PRESETS,
  HUGGINGFACE_MODEL_ID,
  MODEL_CATALOG,
  MODEL_STATUS,
  MODEL_STATUS_LABELS,
  getModelById,
  getHuggingFaceModelConfig,
  getHuggingFaceSourceDetails,
} from '../utils/modelCatalog';
import {
  buildModelRequestContext,
  captureMemoryItem,
  createProject,
  getActiveProject,
  getProjectMemoryResults,
  now,
  setActiveProject,
  upsertAiConversation,
  useWorkspaceData,
} from '../utils/workspaceStore';
import { checkModelStatus, installModel, runModel } from '../utils/modelRuntime';

const MODES = [
  { id: 'operate', label: 'OPERATE' },
  { id: 'research', label: 'RESEARCH' },
  { id: 'memory', label: 'MEMORY' },
  { id: 'signal', label: 'SIGNAL' },
  { id: 'system', label: 'SYSTEM' },
];

const DOCTRINES = {
  operate: {
    id: 'operate',
    label: 'OPERATE',
    direction: 'left',
    summary: 'Execution, logistics, and local control.',
    icon: TerminalSquare,
    tone: 'border-cyan-100/16 bg-cyan-100/[0.045] text-cyan-50',
  },
  research: {
    id: 'research',
    label: 'RESEARCH',
    direction: 'top',
    summary: 'Knowledge capture, synthesis, and project memory.',
    icon: FileText,
    tone: 'border-teal-100/16 bg-teal-100/[0.045] text-teal-50',
  },
  signal: {
    id: 'signal',
    label: 'SIGNAL',
    direction: 'right',
    summary: 'Networks, exchange, and external systems.',
    icon: RadioTower,
    tone: 'border-sky-100/16 bg-sky-100/[0.045] text-sky-50',
  },
  identity: {
    id: 'identity',
    label: 'IDENTITY',
    direction: 'bottom',
    summary: 'Personas, operator state, and continuity.',
    icon: ShieldCheck,
    tone: 'border-amber-100/16 bg-amber-100/[0.045] text-amber-50',
  },
};

const DOCTRINE_ORDER = ['operate', 'research', 'signal', 'identity'];

const SECURITY_REVIEW_WORKFLOWS = [
  {
    id: 'review-project',
    label: 'Review this project',
    prompt:
      'Review this project memory for defensive security risk. Summarize the most important risks, cite evidence, and suggest safer next steps.',
  },
  {
    id: 'explain-alerts',
    label: 'Explain recent alerts',
    prompt:
      'Explain any recent alerts, anomalies, or concerning signals in this project memory. Keep the analysis defensive and cite the evidence.',
  },
  {
    id: 'summarize-risky-changes',
    label: 'Summarize risky changes',
    prompt:
      'Summarize risky changes, commands, or decisions represented in this project memory. Explain why they may matter and cite supporting artifacts.',
  },
  {
    id: 'check-next',
    label: 'What should I check next?',
    prompt:
      'Based on this project memory, suggest the next defensive checks the operator should perform. Prioritize evidence-backed, safer next steps.',
  },
];

const MODEL_OUTPUT_KINDS = [
  { id: 'security-review', label: 'Security review' },
  { id: 'risk-summary', label: 'Risk summary' },
  { id: 'deepnimsec-record', label: 'DeepNimSec record' },
  { id: 'training-scenario', label: 'Training scenario' },
  { id: 'model-note', label: 'Model note' },
  { id: 'action-plan', label: 'Action plan' },
  { id: 'ai-output', label: 'General output' },
];

const DEAD_MAN_SEQUENCE = ['rail', 'left'];
const DEAD_MAN_MODE_ID = 'DM-CCW-01';

const getCockpitTheme = (themeId) => {
  const interior = getAppInteriorTheme(themeId);
  const shell = getShellTheme(themeId);
  const isBlackGlass = shell.id === 'black_glass';

  if (!isBlackGlass) {
    return {
      root: `${interior.pageBg} text-slate-100`,
      panel: `${interior.panelBorder} ${interior.panelBg} shadow-black/20`,
      panelPrimary: `${interior.heroBorder} ${interior.heroBg} shadow-black/24`,
      subPanel: `${interior.panelMutedBorder} ${interior.panelMutedBg}`,
      subPanelHover: `${interior.card}`,
      input: interior.input,
      primaryButton: interior.primaryButton,
      primarySoftButton: interior.primaryButtonSoft,
      secondaryButton: interior.secondaryButton,
      activeTab: interior.activeChip,
      inactiveTab: interior.inactiveChip,
      tag: interior.tag,
      linkTag: interior.linkCard,
      warningTag: 'border-amber-300/15 bg-amber-500/10 text-amber-200',
      heading: interior.headingAccent,
      accent: interior.accentText,
      accentSoft: interior.accentSoftText,
      icon: interior.accentText,
      divider: interior.panelMutedBorder,
      ghost: 'border-white/6 bg-white/[0.025] text-slate-600',
      mono: interior.codeAccent,
    };
  }

  return {
    root:
      'bg-[radial-gradient(circle_at_18%_0%,rgba(203,213,225,0.13),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(125,211,252,0.06),transparent_26%),linear-gradient(180deg,rgba(18,24,28,0.96),rgba(12,17,21,0.98))] text-slate-100',
    panel:
      'border-white/12 bg-[rgba(21,28,33,0.64)] shadow-black/18 backdrop-blur-md',
    panelPrimary:
      'border-white/16 bg-[rgba(24,31,36,0.72)] shadow-black/16 backdrop-blur-lg',
    subPanel: 'border-white/10 bg-white/[0.055] backdrop-blur-sm',
    subPanelHover: 'border-white/10 bg-white/[0.055] hover:border-white/16 hover:bg-white/[0.08]',
    input:
      'border-white/12 bg-white/[0.06] text-slate-100 placeholder:text-slate-500 focus:border-cyan-100/30 focus:bg-white/[0.09]',
    primaryButton: 'bg-slate-100 text-slate-950 hover:bg-white',
    primarySoftButton: 'border-white/12 bg-white/[0.075] text-slate-100 hover:bg-white/[0.11]',
    secondaryButton: 'border-white/12 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]',
    activeTab: 'bg-slate-100 text-slate-950',
    inactiveTab: 'text-slate-300 hover:bg-white/[0.065] hover:text-slate-100',
    tag: 'border-white/12 bg-white/[0.06] text-slate-200',
    linkTag: 'border-white/12 bg-white/[0.06] text-slate-200',
    warningTag: 'border-amber-300/15 bg-amber-500/10 text-amber-200',
    heading: 'text-white',
    accent: 'text-cyan-100',
    accentSoft: 'text-slate-300',
    icon: 'text-cyan-100/80',
    divider: 'border-white/8',
    ghost: 'border-white/8 bg-white/[0.04] text-slate-500',
    mono: 'text-cyan-100',
  };
};

const DEFAULT_COCKPIT_THEME = getCockpitTheme('black_glass');

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

const splitTags = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const formatShortTime = (value) => {
  if (!value) {
    return 'Not yet';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const asList = (value) => (Array.isArray(value) ? value : []);

const getWindowState = (app, windows = [], activeModuleId = null) => {
  if (activeModuleId && (activeModuleId === app.appKey || activeModuleId === app.id)) {
    return 'EMBEDDED';
  }

  const match = asList(windows).find((windowItem) => windowItem.id === app.id);

  if (!match) {
    return 'READY';
  }

  return match.isMinimized ? 'MINIMIZED' : 'OPEN';
};

const getOperationalState = ({ mode, data, activeProject, ollamaStatus }) => {
  if (ollamaStatus?.status === 'unavailable') {
    return 'OFFLINE';
  }

  if (mode === 'research') {
    return 'RESEARCHING';
  }

  const projectMemoryCount = asList(data.memoryItems).filter((item) => item.projectId === activeProject.id).length;
  const projectConversationCount = asList(data.aiConversations).filter((item) => item.projectId === activeProject.id).length;

  return projectMemoryCount || projectConversationCount ? 'ACTIVE' : 'PASSIVE';
};

const getAppIntelligence = ({ app, data, activeProject, windows, ollamaStatus, activeModuleId }) => {
  const projectMemory = asList(data.memoryItems).filter((item) => item.projectId === activeProject.id);
  const commandMemory = projectMemory.filter((item) => item.kind === 'command');
  const openState = getWindowState(app, windows, activeModuleId);
  const metricByApp = {
    overview: [`${projectMemory.length} memories`, activeProject.name],
    'bps-engine': [`${asList(data.bpsEntries).length + asList(data.bpsResearchNotes).length} BPS records`, 'Operator state analysis'],
    library: [`${asList(data.library).length} library items`, 'Local document catalog'],
    'research-vault': [`${asList(data.researchVault).length} studies`, 'Research method vault'],
    calendar: [`${asList(data.calendarEvents).length} events`, 'Planning timeline'],
    notes: [`${asList(data.notes).length} notes`, 'Markdown vault'],
    'music-list': [`${asList(data.musicList).length} tracks`, 'Ambient reference list'],
    profiles: [`${asList(data.profiles).length} profiles`, 'Identity continuity'],
    comms: [`${asList(data.comms?.identities).length} identities`, 'Vault-backed exchange'],
    'f-society': [data.lan?.enabled ? `${data.lan?.security?.openPortCount || 0} open ports` : 'LAN closed', 'Local peer surface'],
    'nostr-lounge': [`${asList(data.nostr?.relays).length} relays`, 'External signal room'],
    'flow-studio': [`${asList(data.flowBoards).length} boards`, 'Operational maps'],
    bookmarks: [`${asList(data.bookmarks).length} links`, 'Saved web references'],
    inventory: [`${asList(data.inventory).length} assets`, 'Tools and systems'],
    'wallet-vault': [`${asList(data.wallets).length} wallets`, 'Encrypted recovery material'],
    clocks: [`${asList(data.clocks).length} clocks`, 'Timing board'],
    console: [`${commandMemory.length} commands`, 'Deep terminal module'],
    'control-room': [data.settings.localOnly ? 'Local only' : 'Hybrid', ollamaStatus?.status ? `Model ${ollamaStatus.status}` : 'Workspace controls'],
  };
  const [metric, detail] = metricByApp[app.id] || [app.category, app.description];

  return {
    detail,
    metric,
    openState,
  };
};

const getMoonPhaseName = (age) => {
  if (age < 1.84566) return 'New';
  if (age < 5.53699) return 'Waxing Crescent';
  if (age < 9.22831) return 'First Quarter';
  if (age < 12.91963) return 'Waxing Gibbous';
  if (age < 16.61096) return 'Full';
  if (age < 20.30228) return 'Waning Gibbous';
  if (age < 23.99361) return 'Last Quarter';
  if (age < 27.68493) return 'Waning Crescent';
  return 'New';
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
    case 'Last Quarter':
      return '◐';
    case 'Waning Crescent':
      return '◓';
    default:
      return '◕';
  }
};

const getMoonPhaseData = (value) => {
  const phaseDays = (value - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const currentPhase = ((phaseDays % LUNAR_CYCLE_DAYS) + LUNAR_CYCLE_DAYS) % LUNAR_CYCLE_DAYS;
  const phaseName = getMoonPhaseName(currentPhase);
  const illumination =
    currentPhase <= LUNAR_CYCLE_DAYS / 2
      ? 0.5 * (1 - Math.cos(Math.PI * currentPhase / (LUNAR_CYCLE_DAYS / 2)))
      : 0.5 * (1 + Math.cos(Math.PI * (currentPhase - LUNAR_CYCLE_DAYS / 2) / (LUNAR_CYCLE_DAYS / 2)));

  return {
    phaseName,
    glyph: getMoonGlyph(phaseName),
    illumination: Math.round(illumination * 100),
  };
};

const Panel = ({
  title,
  eyebrow,
  icon: Icon,
  children,
  className = '',
  headerAction = null,
  primary = false,
  theme = DEFAULT_COCKPIT_THEME,
}) => (
  <section
    className={`min-h-0 rounded-lg border shadow-2xl ${primary ? theme.panelPrimary : theme.panel} ${className}`}
  >
    <div className={`flex items-center justify-between border-b px-4 py-3 ${theme.divider}`}>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-500">{eyebrow}</div>
        <div className={`mt-1 flex items-center gap-2 text-sm font-semibold ${theme.heading}`}>
          {Icon ? <Icon size={16} className={theme.icon} /> : null}
          {title}
        </div>
      </div>
      {headerAction}
    </div>
    <div className="min-h-0 p-4">{children}</div>
  </section>
);

const ModeTabs = ({ mode, onModeChange, theme = DEFAULT_COCKPIT_THEME }) => (
  <div className={`flex flex-wrap items-center gap-1 rounded-lg border p-1 ${theme.subPanel}`}>
    {MODES.map((entry) => (
      <button
        key={entry.id}
        type="button"
        onClick={() => onModeChange(entry.id)}
        className={`rounded-md px-3 py-2 text-[11px] font-semibold tracking-[0.16em] transition ${
          mode === entry.id ? theme.activeTab : theme.inactiveTab
        }`}
      >
        {entry.label}
      </button>
    ))}
  </div>
);

const MemoryCard = ({ item, compact = false, theme = DEFAULT_COCKPIT_THEME }) => (
  <article className={`rounded-md border p-3 ${theme.subPanel}`}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className={`truncate text-sm font-semibold ${theme.heading}`}>{item.title}</div>
        <div className={`mt-1 text-[11px] uppercase tracking-[0.18em] ${theme.accent}`}>{item.kind}</div>
      </div>
      {item.virtual ? (
        <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${theme.warningTag}`}>
          Legacy
        </span>
      ) : null}
    </div>
    <p className={`mt-2 text-xs leading-5 text-slate-400 ${compact ? 'line-clamp-2' : ''}`}>
      {item.excerpt || item.body || item.outputExcerpt || item.sourcePath || 'Awaiting first project-memory artifact.'}
    </p>
    {item.tags?.length ? (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.tags.slice(0, 4).map((tag) => (
          <span key={tag} className={`rounded border px-2 py-1 text-[11px] ${theme.tag}`}>
            {tag}
          </span>
        ))}
      </div>
    ) : null}
  </article>
);

const GhostRows = ({ theme = DEFAULT_COCKPIT_THEME }) => (
  <div className="space-y-2">
    {['Awaiting first project-memory artifact.', 'No operational captures linked to active project.', 'No citations saved into this project yet.'].map((line) => (
      <div key={line} className={`rounded-md border px-3 py-2 text-xs ${theme.ghost}`}>
        {line}
      </div>
    ))}
  </div>
);

const CommandDeck = ({
  activeProject,
  data,
  memoryResults,
  ollamaStatus,
  leftCollapsed = false,
  deadManArmed = false,
  deadManNotice = '',
  onToggleLeftCollapsed,
  onCreateProject,
  onSelectProject,
  onLockWorkspace,
  theme = DEFAULT_COCKPIT_THEME,
}) => {
  const [draftName, setDraftName] = useState('');
  const projectMemory = data.memoryItems.filter((item) => item.projectId === activeProject.id);
  const recentMemory = [...projectMemory]
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, 4);

  const handleCreate = (event) => {
    event.preventDefault();

    if (!draftName.trim()) {
      return;
    }

    onCreateProject({
      name: draftName.trim(),
      summary: 'Project workspace created from the command deck.',
      tags: ['project'],
    });
    setDraftName('');
  };

  if (leftCollapsed) {
    return (
      <aside className="min-h-0">
        <button
          type="button"
          onClick={() => onToggleLeftCollapsed?.(false)}
          title="Expand Left Rail"
          aria-label="Expand Left Rail"
          className={`group flex h-full min-h-[18rem] w-full flex-col items-center justify-start gap-3 rounded-lg border px-2 py-4 transition ${
            deadManArmed ? 'border-amber-300/30 bg-amber-500/[0.08] text-amber-100 shadow-lg shadow-amber-950/20' : theme.subPanelHover
          } focus:outline-none focus:ring-1 focus:ring-cyan-100/20`}
        >
          <ChevronRight size={16} className={deadManArmed ? 'text-amber-200' : theme.icon} />
          <Database size={15} className={deadManArmed ? 'text-amber-200' : 'text-slate-500 transition group-hover:text-cyan-100'} />
          <span
            className={`mt-2 [writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${
              deadManArmed ? 'text-amber-100' : 'text-slate-500 group-hover:text-slate-200'
            }`}
          >
            {deadManArmed ? 'Unavailable' : 'Left Rail'}
          </span>
          <span
            className={`mt-auto rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              deadManArmed ? 'border-amber-300/25 bg-amber-500/10 text-amber-100' : theme.tag
            }`}
          >
            {deadManArmed ? DEAD_MAN_MODE_ID : 'Control'}
          </span>
          {deadManArmed && deadManNotice ? (
            <span className="sr-only">{deadManNotice}</span>
          ) : null}
        </button>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 space-y-3">
      {deadManArmed ? (
        <div className={`rounded-lg border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${theme.warningTag}`}>
          <div>Dead-man disarm / DM-CCW-01</div>
          <div className="mt-1 normal-case tracking-normal text-amber-100/80">
            {deadManNotice || 'Expand Intel Rail, then the left rail.'}
          </div>
        </div>
      ) : null}

      <div className="flex justify-start">
        <button
          type="button"
          onClick={() => onToggleLeftCollapsed?.(true)}
          title="Collapse Left Rail"
          aria-label="Collapse Left Rail"
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${theme.secondaryButton}`}
        >
          <ChevronLeft size={14} />
          Collapse rail
        </button>
      </div>

      <Panel title="Left Rail" eyebrow="Control / Last activity" icon={Database} theme={theme}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            <Database size={13} className={theme.icon} />
            Command Deck
          </div>

          <label className="relative block">
            <select
              value={activeProject.id}
              onChange={(event) => onSelectProject(event.target.value)}
              className={`w-full appearance-none rounded-md border px-3 py-2.5 text-sm font-semibold outline-none ${theme.input}`}
            >
              {data.projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3 top-3 text-slate-500" />
          </label>

          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="New project"
              className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
            />
            <button
              type="submit"
              className={`rounded-md p-2 ${theme.primaryButton}`}
              title="Create project"
            >
              <FolderPlus size={16} />
            </button>
          </form>

          <p className="text-xs leading-5 text-slate-500">{activeProject.summary || 'No project summary saved yet.'}</p>

          <div className={`rounded-md border px-3 py-2.5 ${deadManArmed ? theme.warningTag : theme.subPanel}`}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Defense</span>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${deadManArmed ? 'text-amber-100' : 'text-slate-400'}`}>
                {deadManArmed ? 'True-Local' : 'Passive'}
              </span>
            </div>
            <div className={`mt-1 text-xs ${deadManArmed ? 'text-amber-100/80' : 'text-slate-500'}`}>
              {deadManArmed ? 'DM-CCW-01 armed. Expand Intel Rail, then Left Rail.' : 'Dead-man trigger is not armed.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              ['Memory', projectMemory.length],
              ['Search', memoryResults.length],
              ['Vault', 'local'],
              ['Model', ollamaStatus.status],
            ].map(([label, value]) => (
              <div key={label} className={`rounded-md border p-2.5 ${theme.subPanel}`}>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
                <div className={`mt-1 truncate text-sm font-semibold ${theme.heading}`}>{value}</div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onLockWorkspace}
            className={`flex w-full items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold ${theme.secondaryButton}`}
          >
            <Lock size={15} />
            Lock workspace
          </button>

          <div className={`border-t pt-3 ${theme.divider}`}>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
              <Activity size={13} className={theme.icon} />
              Last activity
            </div>
            <div className="space-y-2">
              {recentMemory.length ? recentMemory.map((item) => (
                <div key={item.id} className={`rounded-md border px-3 py-2 ${theme.subPanel}`}>
                  <div className="truncate text-xs font-semibold text-slate-200">{item.title}</div>
                  <div className={`mt-1 text-[10px] uppercase tracking-[0.18em] ${theme.accent}`}>{item.kind}</div>
                </div>
              )) : <GhostRows theme={theme} />}
            </div>
          </div>
        </div>
      </Panel>
    </aside>
  );
};

const CommandCaptureDrawer = ({ activeProject, theme = DEFAULT_COCKPIT_THEME }) => {
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState('');
  const [outputExcerpt, setOutputExcerpt] = useState('');
  const [tags, setTags] = useState('');

  const handleSave = () => {
    if (!command.trim() && !outputExcerpt.trim()) {
      return;
    }

    captureMemoryItem({
      projectId: activeProject.id,
      kind: 'command',
      title: command.trim() || 'Command output',
      command: command.trim(),
      outputExcerpt: outputExcerpt.trim(),
      body: outputExcerpt.trim(),
      tags: splitTags(tags),
    });
    setCommand('');
    setOutputExcerpt('');
    setTags('');
    setOpen(false);
  };

  return (
    <div className={`rounded-md border ${theme.subPanel}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-slate-200 ${theme.inactiveTab}`}
      >
        <span className="inline-flex items-center gap-2">
          <TerminalSquare size={15} className={theme.icon} />
          Capture command memory
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>

      {open ? (
        <div className={`space-y-2 border-t p-3 ${theme.divider}`}>
          <input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder="Command"
            className={`w-full rounded-md border px-3 py-2 font-mono text-sm outline-none ${theme.input} ${theme.mono}`}
          />
          <textarea
            value={outputExcerpt}
            onChange={(event) => setOutputExcerpt(event.target.value)}
            placeholder="Output excerpt or operational note"
            className={`h-24 w-full resize-none rounded-md border px-3 py-2 text-sm leading-5 outline-none ${theme.input}`}
          />
          <div className="flex gap-2">
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="tags"
              className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
            />
            <button
              type="button"
              onClick={handleSave}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${theme.primaryButton}`}
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const OperationalFeed = ({ activeProject, data, memoryResults, compact = false, theme = DEFAULT_COCKPIT_THEME }) => {
  const directMemory = [...data.memoryItems]
    .filter((item) => item.projectId === activeProject.id)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, compact ? 5 : 12)
    .map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      body: item.body,
      command: item.command,
      outputExcerpt: item.outputExcerpt,
      tags: item.tags,
      links: item.links,
      updatedAt: item.updatedAt,
      excerpt: item.command || item.outputExcerpt || item.body,
    }));

  const virtualHits = memoryResults.filter((item) => item.virtual).slice(0, compact ? 2 : 5);
  const feed = [...directMemory, ...virtualHits].slice(0, compact ? 7 : 14);

  return (
    <Panel title="Operational Feed" eyebrow="Rolling SITREP" icon={Activity} theme={theme}>
      <div className="space-y-3">
        <CommandCaptureDrawer activeProject={activeProject} theme={theme} />
        <div className={`space-y-2 overflow-y-auto ${compact ? 'max-h-72' : 'max-h-[34rem]'}`}>
          {feed.length ? feed.map((item) => <MemoryCard key={item.id} item={item} compact theme={theme} />) : <GhostRows theme={theme} />}
        </div>
      </div>
    </Panel>
  );
};

const AiConsole = ({ activeProject, ollamaStatus, setOllamaStatus, theme = DEFAULT_COCKPIT_THEME }) => {
  const { data, updateWorkspaceData } = useWorkspaceData();
  const aiSettings = data.settings.ai || {};
  const selectedModelId = aiSettings.selectedModelId || DEFAULT_MODEL_ID;
  const selectedModel = getModelById(selectedModelId);
  const huggingFaceConfig = getHuggingFaceModelConfig(aiSettings);
  const isHuggingFaceSelected = selectedModel.id === HUGGINGFACE_MODEL_ID;
  const huggingFaceSourceDetails = getHuggingFaceSourceDetails(huggingFaceConfig.source);
  const huggingFaceSource = huggingFaceSourceDetails.runtimeSource;
  const huggingFaceInput = huggingFaceConfig.source.trim();
  const huggingFaceSourceIsNormalized = Boolean(huggingFaceInput && huggingFaceSource && huggingFaceInput !== huggingFaceSource);
  const selectedGgufPreset = HUGGINGFACE_GGUF_PRESETS.find((preset) => preset.source === huggingFaceSource) || null;
  const selectedGgufDownloadLabel = selectedGgufPreset ? `${selectedGgufPreset.downloadSizeGb} GB` : '';
  const effectiveTechnicalModel = isHuggingFaceSelected
    ? huggingFaceConfig.runtimeModel
    : selectedModel.technicalName;
  const modelStatuses = aiSettings.modelStatuses || {};
  const selectedStatus = {
    status: MODEL_STATUS.NOT_INSTALLED,
    installedVersion: '',
    lastCheckedAt: '',
    lastPreparedAt: '',
    lastError: '',
    rawStatus: '',
    ...(modelStatuses[selectedModelId] || {}),
  };
  const [prompt, setPrompt] = useState('');
  const [manualOutput, setManualOutput] = useState('');
  const [busy, setBusy] = useState(false);
  const [prepareBusy, setPrepareBusy] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [messages, setMessages] = useState([]);
  const [contextOpen, setContextOpen] = useState(false);
  const [outputKind, setOutputKind] = useState('security-review');
  const [activeWorkflowId, setActiveWorkflowId] = useState('freeform');
  const modelWorkflows = selectedModel.workflows?.length ? selectedModel.workflows : SECURITY_REVIEW_WORKFLOWS;
  const requestContext = useMemo(
    () => buildModelRequestContext(data, prompt || 'security review', { projectId: activeProject.id }),
    [activeProject.id, data, prompt],
  );
  const contextItems = requestContext.items;
  const statusLabel = MODEL_STATUS_LABELS[selectedStatus.status] || 'Not installed';
  const modelUnavailable = selectedStatus.status === MODEL_STATUS.UNAVAILABLE;
  const modelNeedsConversion = selectedStatus.status === MODEL_STATUS.NEEDS_CONVERSION;
  const modelInstalling = selectedStatus.status === MODEL_STATUS.INSTALLING;
  const prepareDisabled = prepareBusy || modelInstalling || (isHuggingFaceSelected && !huggingFaceSource);
  const prepareButtonLabel = (() => {
    if (prepareBusy || modelInstalling) {
      return isHuggingFaceSelected ? 'Downloading...' : 'Preparing...';
    }

    if (isHuggingFaceSelected && !huggingFaceSource) {
      return 'Configure source';
    }

    return isHuggingFaceSelected ? 'Download locally' : 'Prepare model';
  })();
  const modelStatusMessage = (() => {
    if (isHuggingFaceSelected && !huggingFaceSource) {
      return 'Add a Hugging Face repo or model reference before preparing this adapter.';
    }

    if (selectedStatus.lastError) {
      return selectedStatus.lastError;
    }

    if (modelUnavailable) {
      return `Start the local model service at ${aiSettings.ollamaBaseUrl || 'http://localhost:11434'}, then prepare the selected model.`;
    }

    if (modelNeedsConversion) {
      return 'This source needs a GGUF repo/file or a local converted import before ROS can prepare the runtime alias.';
    }

    if (selectedStatus.status === MODEL_STATUS.NOT_INSTALLED) {
      if (isHuggingFaceSelected) {
        return selectedGgufDownloadLabel
          ? `Download ${selectedGgufDownloadLabel} into the local Ollama runtime store before asking this model.`
          : 'Download this GGUF source into the local Ollama runtime store before asking this model.';
      }

      return 'Prepare this model before asking it to respond from project memory.';
    }

    return '';
  })();

  const updateAiSetting = (patch) => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ai: {
          ...current.settings.ai,
          ...patch,
        },
      },
    }));
  };

  const updateHuggingFaceConfig = (patch) => {
    updateAiSetting({
      huggingFace: {
        ...huggingFaceConfig,
        ...patch,
      },
    });
  };

  const handleGgufPresetChange = (presetId) => {
    const preset = HUGGINGFACE_GGUF_PRESETS.find((entry) => entry.id === presetId);

    if (!preset) {
      return;
    }

    updateHuggingFaceConfig({
      source: preset.source,
      displayName: preset.displayName,
      runtimeModel: preset.runtimeModel,
    });
  };

  useEffect(() => {
    setOutputKind(selectedModel.defaultOutputKind || 'security-review');
    setActiveWorkflowId('freeform');
  }, [selectedModel.id, selectedModel.defaultOutputKind]);

  const updateModelStatus = (modelId, statusPatch) => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ai: {
          ...current.settings.ai,
          modelStatuses: {
            ...(current.settings.ai?.modelStatuses || {}),
            [modelId]: {
              ...(current.settings.ai?.modelStatuses?.[modelId] || {}),
              ...statusPatch,
            },
          },
        },
      },
    }));
  };

  const handleCheckStatus = async () => {
    if (testBusy) {
      return;
    }

    setTestBusy(true);
    try {
      const status = await checkModelStatus(selectedModelId, aiSettings);
      updateModelStatus(selectedModelId, status);
      if (status.runtimeStatus) {
        setOllamaStatus(status.runtimeStatus);
      }
      updateAiSetting({
        lastStatus: status.status === MODEL_STATUS.READY ? 'online' : status.status,
      });
    } finally {
      setTestBusy(false);
    }
  };

  const handlePrepareModel = async () => {
    if (prepareDisabled) {
      return;
    }

    setPrepareBusy(true);
    updateModelStatus(selectedModelId, {
      status: MODEL_STATUS.INSTALLING,
      lastPreparedAt: now(),
      lastError: '',
    });

    try {
      const status = await installModel(selectedModelId, {
        ...aiSettings,
        modelStatuses: {
          ...modelStatuses,
          [selectedModelId]: {
            ...selectedStatus,
            status: MODEL_STATUS.INSTALLING,
          },
        },
      });
      updateModelStatus(selectedModelId, status);
      if (status.runtimeStatus) {
        setOllamaStatus(status.runtimeStatus);
      }
      updateAiSetting({
        lastStatus: status.status === MODEL_STATUS.READY ? 'online' : status.status,
      });
    } finally {
      setPrepareBusy(false);
    }
  };

  const handleAsk = async (question = prompt, workflowId = 'freeform') => {
    const trimmedQuestion = String(question || '').trim();

    if (!trimmedQuestion || busy) {
      return;
    }

    const localRequestContext = buildModelRequestContext(data, trimmedQuestion, { projectId: activeProject.id });
    const userMessage = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: trimmedQuestion,
      createdAt: now(),
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt('');
    setActiveWorkflowId(workflowId);
    setBusy(true);

    try {
      const result = await runModel(selectedModelId, nextMessages, localRequestContext, aiSettings);
      const generatedAt = now();
      const citations = localRequestContext.citations;
      const assistantMessage = {
        id: `local-assistant-${Date.now()}`,
        role: 'assistant',
        content: result.content,
        citations,
        workflowId,
        generatedAt,
        createdAt: generatedAt,
      };
      const conversationMessages = [...nextMessages, assistantMessage];
      setMessages(conversationMessages);
      upsertAiConversation({
        projectId: activeProject.id,
        backend: 'ollama',
        model: result.model,
        title: userMessage.content.slice(0, 80),
        messages: conversationMessages,
      });
      updateAiSetting({ lastStatus: 'online' });
      updateModelStatus(selectedModelId, {
        ...selectedStatus,
        status: MODEL_STATUS.READY,
        installedVersion: selectedModel.version,
        lastCheckedAt: now(),
        lastError: '',
      });
      setOllamaStatus((current) => ({ ...current, status: 'online', model: result.model }));
    } catch (error) {
      const detail = error instanceof Error
        ? error.message
        : 'Local model unavailable. You can still save a response manually.';
      setMessages([
        ...nextMessages,
        {
          id: `local-error-${Date.now()}`,
          role: 'assistant',
          content: detail,
          citations: [],
          error: true,
          createdAt: now(),
        },
      ]);
      updateAiSetting({ lastStatus: 'unavailable' });
      updateModelStatus(selectedModelId, {
        status: MODEL_STATUS.UNAVAILABLE,
        lastCheckedAt: now(),
        lastError: detail,
        rawStatus: detail,
      });
      setOllamaStatus((current) => ({ ...current, status: 'unavailable' }));
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => handleAsk(prompt, 'freeform');

  const handleWorkflow = (workflow) => {
    setPrompt(workflow.prompt);
    handleAsk(workflow.prompt, workflow.id);
  };

  const saveOutput = (content = manualOutput, options = {}) => {
    const trimmed = String(content || '').trim();

    if (!trimmed) {
      return;
    }

    const generatedAt = options.generatedAt || now();
    const citations = options.citations || requestContext.citations;
    const workflowId = options.workflowId || activeWorkflowId || 'manual-capture';
    captureMemoryItem({
      projectId: activeProject.id,
      kind: outputKind,
      title: `${isHuggingFaceSelected ? huggingFaceConfig.displayName : selectedModel.friendlyName} ${outputKind.replaceAll('-', ' ')} - ${new Date(generatedAt).toLocaleString()}`,
      body: trimmed,
      tags: ['model-output', effectiveTechnicalModel, selectedModel.type, outputKind],
      links: citations,
      modelId: selectedModel.id,
      modelName: effectiveTechnicalModel,
      workflowId,
      generatedAt,
    });
    if (options.clearManual !== false) {
      setManualOutput('');
    }
  };

  return (
    <Panel title="Model Workspace" eyebrow="Primary surface" icon={BrainCircuit} primary theme={theme}>
      <div className="flex min-h-[33rem] flex-col gap-3">
        <div className="grid gap-3 md:grid-cols-[0.95fr_1.05fr]">
          {MODEL_CATALOG.map((model) => {
            const active = selectedModel.id === model.id;
            const modelDisplayName = model.id === HUGGINGFACE_MODEL_ID
              ? `${huggingFaceConfig.displayName} / Modular Adapter`
              : model.displayName;
            return (
              <button
                key={model.id}
                type="button"
                onClick={() => updateAiSetting({
                  selectedModelId: model.id,
                  ...(model.id === HUGGINGFACE_MODEL_ID ? { advancedOpen: true, modelMode: 'advanced' } : {}),
                })}
                className={`rounded-md border p-3 text-left transition focus:outline-none focus:ring-1 focus:ring-cyan-100/25 ${
                  active ? theme.panelPrimary : theme.subPanelHover
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-sm font-semibold ${theme.heading}`}>{modelDisplayName}</div>
                    <div className={`mt-1 text-[11px] uppercase tracking-[0.18em] ${theme.accent}`}>
                      {model.role}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                    model.id === selectedModel.id && selectedStatus.status === MODEL_STATUS.READY
                      ? theme.linkTag
                      : theme.tag
                  }`}>
                    {MODEL_STATUS_LABELS[(modelStatuses[model.id] || {}).status] || 'Not installed'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-5 text-slate-400">{model.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {model.capabilities.map((capability) => (
                    <span key={capability} className={`rounded border px-2 py-1 text-[11px] ${theme.linkTag}`}>
                      {capability}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}

          <div className={`rounded-md border p-3 ${theme.subPanel}`}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
              Local model
            </div>
            <div className={`mt-2 text-lg font-semibold ${theme.heading}`}>
              {isHuggingFaceSelected
                ? `${huggingFaceConfig.displayName} / Modular Adapter`
                : selectedModel.displayName}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{selectedModel.summary}</p>
            {isHuggingFaceSelected ? (
              <div className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${theme.linkTag}`}>
                <div className="font-semibold uppercase tracking-[0.16em]">Hugging Face source</div>
                <div className="mt-1 break-all text-slate-300">
                  {huggingFaceSource || 'Open Advanced setup and add a Hugging Face model reference.'}
                </div>
                {selectedGgufDownloadLabel ? (
                  <div className="mt-1 text-slate-300">
                    Local download size: {selectedGgufDownloadLabel}.
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${theme.tag}`}>
                {statusLabel}
              </span>
              <button
                type="button"
                onClick={handlePrepareModel}
                disabled={prepareDisabled}
                className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${theme.primarySoftButton}`}
              >
                <Download size={14} />
                {prepareButtonLabel}
              </button>
            </div>
            {(modelUnavailable || modelNeedsConversion || modelStatusMessage) ? (
              <p className="mt-2 text-xs leading-5 text-amber-200/80">
                {modelStatusMessage || 'Model unavailable. You can still save a response manually.'}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => updateAiSetting({
                advancedOpen: !aiSettings.advancedOpen,
                modelMode: aiSettings.advancedOpen ? 'friendly' : 'advanced',
              })}
              className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${theme.secondaryButton}`}
            >
              {aiSettings.advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Advanced setup
            </button>
          </div>
        </div>

        {aiSettings.advancedOpen ? (
          <div className={`grid gap-2 rounded-md border p-3 md:grid-cols-2 ${theme.subPanel}`}>
            <label className="block space-y-1 text-xs text-slate-500">
              <span className="uppercase tracking-[0.2em]">Provider / runtime</span>
              <input
                value="Ollama-compatible local runtime"
                readOnly
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-500">
              <span className="uppercase tracking-[0.2em]">Local endpoint</span>
              <input
                value={aiSettings.ollamaBaseUrl || ''}
                onChange={(event) => updateAiSetting({ ollamaBaseUrl: event.target.value })}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-500">
              <span className="uppercase tracking-[0.2em]">
                {isHuggingFaceSelected ? 'Local alias' : 'Technical model'}
              </span>
              <input
                value={isHuggingFaceSelected ? huggingFaceConfig.runtimeModel : aiSettings.model || ''}
                onChange={(event) => {
                  if (isHuggingFaceSelected) {
                    updateHuggingFaceConfig({ runtimeModel: event.target.value });
                    return;
                  }

                  updateAiSetting({ model: event.target.value });
                }}
                placeholder={effectiveTechnicalModel}
                className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
              />
            </label>
            {isHuggingFaceSelected ? (
              <>
                <label className="block space-y-1 text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">GGUF preset</span>
                  <select
                    value={selectedGgufPreset?.id || ''}
                    onChange={(event) => handleGgufPresetChange(event.target.value)}
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  >
                    <option value="">Custom source</option>
                    {HUGGINGFACE_GGUF_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.displayName} / {preset.quant} / {preset.downloadSizeGb} GB
                      </option>
                    ))}
                  </select>
                </label>
                <div className={`rounded-md border px-3 py-2 text-xs leading-5 ${theme.linkTag}`}>
                  <div className="font-semibold uppercase tracking-[0.16em]">
                    {selectedGgufPreset ? selectedGgufPreset.sizeClass : 'Verified GGUF list'}
                  </div>
                  <div className="mt-1 text-slate-300">
                    {selectedGgufPreset
                      ? `${selectedGgufPreset.note} Download size: ${selectedGgufDownloadLabel}. Downloads locally into the Ollama runtime store. License: ${selectedGgufPreset.license}.`
                      : 'Choose a curated GGUF repo to populate the source and local alias automatically.'}
                  </div>
                </div>
                <label className="block space-y-1 text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Hugging Face model</span>
                  <input
                    value={huggingFaceConfig.source}
                    onChange={(event) => updateHuggingFaceConfig({ source: event.target.value })}
                    placeholder="https://huggingface.co/deepseek-ai/DeepSeek-V4-Flash/tree/main"
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Display label</span>
                  <input
                    value={huggingFaceConfig.displayName}
                    onChange={(event) => updateHuggingFaceConfig({ displayName: event.target.value })}
                    placeholder="Hugging Face LLM"
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Context window</span>
                  <input
                    type="number"
                    min="512"
                    step="512"
                    value={huggingFaceConfig.numCtx}
                    onChange={(event) => updateHuggingFaceConfig({ numCtx: event.target.value })}
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Max response tokens</span>
                  <input
                    type="number"
                    min="64"
                    step="64"
                    value={huggingFaceConfig.numPredict}
                    onChange={(event) => updateHuggingFaceConfig({ numPredict: event.target.value })}
                    className={`w-full rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  />
                </label>
                <label className="block space-y-1 text-xs text-slate-500 md:col-span-2">
                  <span className="uppercase tracking-[0.2em]">Adapter system prompt</span>
                  <textarea
                    value={huggingFaceConfig.systemPrompt}
                    onChange={(event) => updateHuggingFaceConfig({ systemPrompt: event.target.value })}
                    className={`h-28 w-full resize-none rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
                  />
                </label>
              </>
            ) : null}
            <div className={`rounded-md border p-3 text-sm leading-5 text-slate-400 ${theme.subPanel}`}>
              <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Runtime status</div>
              <div className={`mt-1 font-semibold ${theme.heading}`}>{ollamaStatus.status || selectedStatus.status || 'unknown'}</div>
              <div className="mt-1">Developer and AI-builder setup lives here. Regular use should start from model cards.</div>
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={testBusy}
                className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-50 ${theme.secondaryButton}`}
              >
                {testBusy ? 'Testing...' : 'Test connection'}
              </button>
            </div>
            <details className={`rounded-md border p-3 text-xs leading-5 text-slate-400 md:col-span-2 ${theme.subPanel}`}>
              <summary className={`cursor-pointer font-semibold uppercase tracking-[0.18em] ${theme.heading}`}>
                View request context and install logs
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-white/12 bg-white/[0.055] p-3">
                  {requestContext.promptBlock}
                </pre>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded border border-white/12 bg-white/[0.055] p-3">
                  {[
                    `technical model: ${effectiveTechnicalModel}`,
                    isHuggingFaceSelected ? `huggingface source: ${huggingFaceSource || 'not configured'}` : '',
                    isHuggingFaceSelected && huggingFaceSourceIsNormalized ? `input source: ${huggingFaceInput}` : '',
                    isHuggingFaceSelected && huggingFaceSourceDetails.revision ? `source revision: ${huggingFaceSourceDetails.revision}` : '',
                    isHuggingFaceSelected && huggingFaceSourceDetails.variant ? `source variant: ${huggingFaceSourceDetails.variant}` : '',
                    isHuggingFaceSelected && selectedGgufDownloadLabel ? `download size: ${selectedGgufDownloadLabel}` : '',
                    isHuggingFaceSelected ? 'download target: local Ollama runtime store' : '',
                    `status: ${selectedStatus.status}`,
                    `last checked: ${selectedStatus.lastCheckedAt || 'never'}`,
                    `last prepared: ${selectedStatus.lastPreparedAt || 'never'}`,
                    selectedStatus.lastError ? `friendly error: ${selectedStatus.lastError}` : '',
                    selectedStatus.rawStatus ? `raw status:\n${selectedStatus.rawStatus}` : 'raw status: none',
                  ].filter(Boolean).join('\n')}
                </pre>
              </div>
            </details>
          </div>
        ) : null}

        <div className={`rounded-md border p-3 ${theme.subPanel}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className={`text-sm font-semibold ${theme.heading}`}>{selectedModel.workflowLabel || 'Model workflow'}</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {selectedModel.workflowDescription || 'Run the selected local model against deterministic project context and citations.'}
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-500">
              Save as
              <select
                value={outputKind}
                onChange={(event) => setOutputKind(event.target.value)}
                className={`rounded-md border px-3 py-2 text-xs outline-none ${theme.input}`}
              >
                {MODEL_OUTPUT_KINDS.map((kind) => (
                  <option key={kind.id} value={kind.id}>{kind.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-4">
            {modelWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                type="button"
                onClick={() => handleWorkflow(workflow)}
                disabled={busy}
                className={`rounded-md border px-3 py-2 text-left text-xs font-semibold disabled:opacity-50 ${
                  activeWorkflowId === workflow.id ? theme.primarySoftButton : theme.subPanelHover
                }`}
              >
                {workflow.label}
              </button>
            ))}
          </div>
        </div>

        <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto rounded-md border p-3 ${theme.subPanel}`}>
          {messages.length ? messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-md border p-3 ${
                message.role === 'user'
                  ? theme.linkTag
                  : theme.subPanel
              }`}
            >
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{message.role}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.content}</p>
              {message.citations?.length ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {message.citations.map((citation) => (
                    <span key={`${message.id}-${citation.id}`} className={`rounded border px-2 py-1 text-[11px] ${theme.linkTag}`}>
                      {citation.title || citation.id}
                    </span>
                  ))}
                </div>
              ) : null}
              {message.role === 'assistant' && !message.error ? (
                <button
                  type="button"
                  onClick={() => saveOutput(message.content, {
                    citations: message.citations || [],
                    workflowId: message.workflowId,
                    generatedAt: message.generatedAt || message.createdAt,
                    clearManual: false,
                  })}
                  className={`mt-3 inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${theme.primarySoftButton}`}
                >
                  <Save size={14} />
                  Save response
                </button>
              ) : null}
            </div>
          )) : (
            <div className="grid h-full min-h-72 place-items-center rounded-md border border-white/6 bg-white/[0.02] p-6 text-center">
              <div>
                <BrainCircuit size={30} className={`mx-auto ${theme.icon}`} />
                <div className={`mt-3 text-lg font-semibold ${theme.heading}`}>Run a security review against project memory.</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  Review risk, explain alerts, summarize evidence, and save useful responses back into encrypted project memory.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask the local model about this project"
            className={`min-w-0 flex-1 rounded-md border px-3 py-2.5 text-sm outline-none ${theme.input}`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={busy || !prompt.trim()}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${theme.primaryButton}`}
          >
            <Send size={15} />
            Ask
          </button>
        </div>

        <button
          type="button"
          onClick={() => setContextOpen((current) => !current)}
          className={`flex items-center justify-between rounded-md border px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.18em] ${theme.subPanel} ${theme.inactiveTab}`}
        >
          What ROS is using - {contextItems.length} items
          {contextOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {contextOpen ? (
          <div className={`grid max-h-56 gap-2 overflow-y-auto rounded-md border p-2 md:grid-cols-2 ${theme.subPanel}`}>
            {contextItems.length ? contextItems.map((item) => (
              <div key={item.id} className={`rounded-md border p-3 ${theme.subPanel}`}>
                <div className={`text-sm font-semibold ${theme.heading}`}>{item.title}</div>
                <div className={`mt-1 text-[11px] ${theme.accent}`}>{item.id}</div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">{item.excerpt}</p>
              </div>
            )) : (
              <div className={`rounded-md border p-3 text-sm text-slate-500 ${theme.subPanel}`}>
                No matching memory for the current prompt yet.
              </div>
            )}
          </div>
        ) : null}

        <div className="grid gap-2 md:grid-cols-[1fr_auto]">
          <textarea
            value={manualOutput}
            onChange={(event) => setManualOutput(event.target.value)}
            placeholder="Paste a model response to save"
            className={`h-20 resize-none rounded-md border px-3 py-2 text-sm outline-none ${theme.input}`}
          />
          <button
            type="button"
            onClick={() => saveOutput(manualOutput, { workflowId: 'manual-capture' })}
            className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold ${theme.secondaryButton}`}
          >
            <Save size={15} />
            Save response
          </button>
        </div>
      </div>
    </Panel>
  );
};

const ResearchWorkspace = ({ activeProject, memoryResults, theme = DEFAULT_COCKPIT_THEME }) => {
  const researchResults = memoryResults.filter((item) => item.kind === 'research').slice(0, 10);

  const captureResearchNote = () => {
    captureMemoryItem({
      projectId: activeProject.id,
      kind: 'research',
      title: 'Research note',
      body: 'Finding:\nSource:\nWhy it matters:',
      tags: ['research'],
    });
  };

  return (
    <Panel title="Research Workspace" eyebrow="Project intelligence" icon={FileText} primary theme={theme}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-400">{researchResults.length} research-linked memories in scope</div>
        <button
          type="button"
          onClick={captureResearchNote}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${theme.primarySoftButton}`}
        >
          <Plus size={14} />
          Capture research
        </button>
      </div>
      <div className="mt-4 grid max-h-[42rem] gap-3 overflow-y-auto md:grid-cols-2">
        {researchResults.length ? researchResults.map((item) => <MemoryCard key={item.id} item={item} theme={theme} />) : <GhostRows theme={theme} />}
      </div>
    </Panel>
  );
};

const MemoryWorkspace = ({ memoryResults, theme = DEFAULT_COCKPIT_THEME }) => (
  <Panel title="Memory Search" eyebrow="Project context" icon={Archive} primary theme={theme}>
    <div className="grid max-h-[46rem] gap-3 overflow-y-auto md:grid-cols-2">
      {memoryResults.length ? memoryResults.map((item) => <MemoryCard key={item.id} item={item} theme={theme} />) : <GhostRows theme={theme} />}
    </div>
  </Panel>
);

const SignalWorkspace = ({ activeProject, memoryResults, theme = DEFAULT_COCKPIT_THEME }) => {
  const realMemory = memoryResults.filter((item) => !item.virtual);
  const linkedItems = realMemory.filter((item) => item.links?.length);
  const byKind = realMemory.reduce((accumulator, item) => {
    accumulator[item.kind] = (accumulator[item.kind] || 0) + 1;
    return accumulator;
  }, {});
  const tagCounts = realMemory
    .flatMap((item) => item.tags || [])
    .reduce((accumulator, tag) => {
      accumulator[tag] = (accumulator[tag] || 0) + 1;
      return accumulator;
    }, {});

  return (
    <Panel title="Signal Map" eyebrow="Linked intelligence" icon={Network} primary theme={theme}>
      <div className="grid gap-3 md:grid-cols-3">
        <div className={`rounded-md border p-3 ${theme.subPanel}`}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Project</div>
          <div className={`mt-2 text-lg font-semibold ${theme.heading}`}>{activeProject.name}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{activeProject.summary || 'No summary saved.'}</p>
        </div>
        <div className={`rounded-md border p-3 ${theme.subPanel}`}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Kinds</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(byKind).length ? Object.entries(byKind).map(([kind, count]) => (
              <span key={kind} className={`rounded border px-2.5 py-1.5 text-xs ${theme.tag}`}>
                {kind}: {count}
              </span>
            )) : <span className="text-sm text-slate-500">Awaiting first project-memory artifact.</span>}
          </div>
        </div>
        <div className={`rounded-md border p-3 ${theme.subPanel}`}>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Tag overlap</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(tagCounts).slice(0, 8).map(([tag, count]) => (
              <span key={tag} className={`rounded border px-2.5 py-1.5 text-xs ${theme.tag}`}>
                {tag}: {count}
              </span>
            ))}
            {!Object.entries(tagCounts).length ? <span className="text-sm text-slate-500">No shared tags yet.</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 grid max-h-96 gap-2 overflow-y-auto md:grid-cols-2">
        {linkedItems.length ? linkedItems.map((item) => (
          <div key={item.id} className={`rounded-md border p-3 ${theme.subPanel}`}>
            <div className={`text-sm font-semibold ${theme.heading}`}>{item.title}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.links.map((link) => (
                <span key={`${item.id}-${link.id}-${link.title}`} className={`rounded border px-2 py-1 text-[11px] ${theme.warningTag}`}>
                  {link.title || link.id}
                </span>
              ))}
            </div>
          </div>
        )) : (
          <div className={`rounded-md border p-3 text-sm text-slate-500 ${theme.subPanel}`}>
            No citations saved into this project yet.
          </div>
        )}
      </div>
    </Panel>
  );
};

const OrbitAppRow = ({
  app,
  activeProject,
  data,
  onOpenModule,
  windows = [],
  ollamaStatus,
  activeModuleId = null,
  theme = DEFAULT_COCKPIT_THEME,
  compact = false,
}) => {
  const Icon = app.icon;
  const intelligence = getAppIntelligence({
    app,
    data,
    activeProject,
    windows,
    ollamaStatus,
    activeModuleId,
  });

  return (
    <button
      type="button"
      onClick={() => onOpenModule(app.appKey)}
      className={`group flex w-full items-center gap-3 rounded-md border px-3 text-left transition ${compact ? 'py-2.5' : 'py-3'} ${theme.subPanelHover} focus:outline-none focus:ring-1 focus:ring-cyan-100/20`}
    >
      <span className={`wireframe-grid inline-flex shrink-0 rounded-md border p-2 ${theme.tag}`}>
        <Icon size={compact ? 14 : 16} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${theme.heading}`}>{app.title}</span>
        <span className="mt-0.5 block truncate text-xs text-slate-500">{app.description}</span>
        <span className="mt-2 hidden grid-cols-3 gap-1 text-[10px] uppercase tracking-[0.16em] text-slate-500 group-hover:grid group-focus:grid">
          <span className="truncate">{app.category}</span>
          <span className="truncate">{intelligence.openState}</span>
          <span className="truncate">{intelligence.metric}</span>
        </span>
      </span>
      <span className={`hidden shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:inline-flex ${theme.tag}`}>
        {intelligence.openState}
      </span>
    </button>
  );
};

export const OrbitMenu = ({
  activeProject: providedProject,
  data,
  orderedApps,
  onOpenModule,
  windows = [],
  activeModuleId = null,
  ollamaStatus,
  mode = 'system',
  theme = DEFAULT_COCKPIT_THEME,
  compact = false,
}) => {
  const [selectedDoctrine, setSelectedDoctrine] = useState('operate');
  const [allOpen, setAllOpen] = useState(false);
  const activeProject = providedProject || getActiveProject(data);
  const projectMemoryCount = asList(data.memoryItems).filter((item) => item.projectId === activeProject.id).length;
  const state = getOperationalState({ mode, data, activeProject, ollamaStatus });
  const localOnly = data.settings?.localOnly ? 'LOCAL ONLY' : 'HYBRID';
  const defenseArmed = Boolean(data.settings?.deadMansTriggerEnabled);
  const centerState = defenseArmed ? 'TRUE-LOCAL' : state;
  const selected = DOCTRINES[selectedDoctrine] || DOCTRINES.operate;
  const selectedApps = orderedApps.filter((app) => app.doctrine === selectedDoctrine);
  const visibleAllApps = allOpen ? orderedApps : [];
  const doctrineButtonPosition = {
    research: 'left-1/2 top-3 -translate-x-1/2',
    operate: 'left-3 top-1/2 -translate-y-1/2',
    signal: 'right-3 top-1/2 -translate-y-1/2',
    identity: 'bottom-3 left-1/2 -translate-x-1/2',
  };

  return (
    <section className={`rounded-lg border p-3 ${theme.panel}`}>
      <div className={`grid gap-3 ${compact ? '' : '2xl:grid-cols-[0.9fr_1.1fr]'}`}>
        <div className={`relative min-h-[17rem] overflow-hidden rounded-lg border ${theme.subPanel}`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.055),transparent_44%)]" />
          <div
            className={`absolute left-1/2 top-1/2 grid h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-45 place-items-center border bg-black/24 shadow-[0_0_38px_rgba(103,232,249,0.08)] ${
              defenseArmed ? 'border-amber-200/35' : 'border-white/12'
            }`}
          >
            <div className="-rotate-45 text-center">
              <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">Doctrine</div>
              <div className={`mt-1 truncate text-sm font-semibold ${theme.heading}`}>{activeProject.name}</div>
              <div
                className={`mt-2 inline-flex rounded border px-2 py-1 text-[10px] font-semibold tracking-[0.16em] ${
                  defenseArmed ? theme.warningTag : theme.tag
                }`}
              >
                {centerState}
              </div>
              {defenseArmed ? (
                <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-amber-100/80">
                  DM-CCW-01
                </div>
              ) : null}
            </div>
          </div>

          {DOCTRINE_ORDER.map((doctrineId) => {
            const doctrine = DOCTRINES[doctrineId];
            const Icon = doctrine.icon;
            const active = doctrineId === selectedDoctrine;

            return (
              <button
                key={doctrine.id}
                type="button"
                onClick={() => setSelectedDoctrine(doctrine.id)}
                aria-label={doctrine.label}
                title={doctrine.label}
                className={`absolute ${doctrineButtonPosition[doctrine.id]} inline-grid h-10 w-10 place-items-center rounded-md border transition focus:outline-none focus:ring-1 focus:ring-cyan-100/20 ${
                  active ? doctrine.tone : `${theme.subPanel} text-slate-400 hover:text-slate-100`
                }`}
              >
                <Icon size={17} />
              </button>
            );
          })}
        </div>

        <div className="min-w-0 space-y-3">
          <div className={`rounded-lg border p-3 ${theme.subPanel}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className={`text-sm font-semibold uppercase tracking-[0.22em] ${theme.accent}`}>{selected.label}</div>
                <p className="mt-1 text-sm leading-5 text-slate-400">{selected.summary}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>{localOnly}</span>
                <span>{projectMemoryCount} memories</span>
                <span>Model {ollamaStatus?.status || data.settings?.ai?.lastStatus || 'unknown'}</span>
              </div>
            </div>
          </div>

          <div className={`space-y-2 overflow-y-auto ${compact ? 'max-h-64' : 'max-h-[31rem]'}`}>
            {selectedApps.map((app) => (
              <OrbitAppRow
                key={app.id}
                app={app}
                activeProject={activeProject}
                data={data}
                onOpenModule={onOpenModule}
                windows={windows}
                activeModuleId={activeModuleId}
                ollamaStatus={ollamaStatus}
                theme={theme}
                compact={compact}
              />
            ))}
          </div>

          <div className={`rounded-lg border ${theme.subPanel}`}>
            <button
              type="button"
              onClick={() => setAllOpen((current) => !current)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.18em] ${theme.inactiveTab}`}
            >
              <span>All modules</span>
              {allOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {visibleAllApps.length ? (
              <div className={`space-y-2 border-t p-2 ${theme.divider} ${allOpen ? '' : 'max-h-36 overflow-y-auto'}`}>
                {visibleAllApps.map((app) => (
                  <OrbitAppRow
                    key={`all-${app.id}`}
                    app={app}
                    activeProject={activeProject}
                    data={data}
                    onOpenModule={onOpenModule}
                    windows={windows}
                    activeModuleId={activeModuleId}
                    ollamaStatus={ollamaStatus}
                    theme={theme}
                    compact
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

const SystemWorkspace = ({
  data,
  orderedApps,
  onOpenModule,
  ollamaStatus,
  windows = [],
  activeModuleId = null,
  activeProject,
  theme = DEFAULT_COCKPIT_THEME,
}) => (
  <Panel title="System Surface" eyebrow="Modules and state" icon={Boxes} primary theme={theme}>
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
      <OrbitMenu
        activeProject={activeProject}
        data={data}
        orderedApps={orderedApps}
        onOpenModule={onOpenModule}
        windows={windows}
        activeModuleId={activeModuleId}
        ollamaStatus={ollamaStatus}
        theme={theme}
      />
      <div className="space-y-3">
        {[
          ['Vault', data.settings.localOnly ? 'local only' : 'hybrid'],
          ['Local model', ollamaStatus.status],
          ['Notes', data.notes.length],
          ['Research', data.researchVault.length],
        ].map(([label, value]) => (
          <div key={label} className={`rounded-md border p-3 ${theme.subPanel}`}>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
            <div className={`mt-1 text-lg font-semibold ${theme.heading}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  </Panel>
);

const IntelligenceRailCard = ({
  id,
  title,
  summary,
  icon: Icon,
  expanded,
  onToggle,
  children,
  theme = DEFAULT_COCKPIT_THEME,
}) => (
  <section className={`rounded-lg border ${theme.subPanel}`}>
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left ${theme.inactiveTab}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon size={15} className={`shrink-0 ${theme.icon}`} />
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</span>
          <span className="mt-1 block truncate text-sm text-slate-200">{summary}</span>
        </span>
      </span>
      {expanded ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
    </button>
    {expanded ? <div className={`border-t px-3 py-3 text-xs leading-5 text-slate-400 ${theme.divider}`}>{children}</div> : null}
  </section>
);

const IntelligenceRail = ({
  nowValue,
  lan,
  ollamaStatus,
  activeProject,
  data,
  collapsed = false,
  deadManArmed = false,
  deadManNotice = '',
  onToggleCollapsed,
  theme = DEFAULT_COCKPIT_THEME,
}) => {
  const [expanded, setExpanded] = useState('model');
  const moon = getMoonPhaseData(nowValue);
  const timeString = nowValue.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const spirit = SPIRITS_BY_HOUR[nowValue.getHours()] ?? 'Unknown';

  const toggle = (id) => {
    setExpanded((current) => (current === id ? '' : id));
  };

  if (collapsed) {
    return (
      <aside className="min-h-0">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Expand Intelligence Rail"
          aria-label="Expand Intelligence Rail"
          className={`group flex h-full min-h-[18rem] w-full flex-col items-center justify-start gap-3 rounded-lg border px-2 py-4 transition ${
            deadManArmed ? 'border-amber-300/30 bg-amber-500/[0.08] text-amber-100 shadow-lg shadow-amber-950/20' : theme.subPanelHover
          } focus:outline-none focus:ring-1 focus:ring-cyan-100/20`}
        >
          <ChevronLeft size={16} className={deadManArmed ? 'text-amber-200' : theme.icon} />
          <CircleDot size={15} className={deadManArmed ? 'text-amber-200' : 'text-slate-500 transition group-hover:text-cyan-100'} />
          <span
            className={`mt-2 [writing-mode:vertical-rl] rotate-180 text-[10px] font-semibold uppercase tracking-[0.22em] transition ${
              deadManArmed ? 'text-amber-100' : 'text-slate-500 group-hover:text-slate-200'
            }`}
          >
            {deadManArmed ? 'Unavailable' : 'Intelligence Rail'}
          </span>
          <span
            className={`mt-auto rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
              deadManArmed ? 'border-amber-300/25 bg-amber-500/10 text-amber-100' : theme.tag
            }`}
          >
            {deadManArmed ? DEAD_MAN_MODE_ID : (ollamaStatus.status || 'idle')}
          </span>
          {deadManArmed && deadManNotice ? (
            <span className="sr-only">{deadManNotice}</span>
          ) : null}
        </button>
      </aside>
    );
  }

  return (
    <aside className="min-h-0 space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Collapse Intelligence Rail"
          aria-label="Collapse Intelligence Rail"
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${theme.secondaryButton}`}
        >
          <ChevronRight size={14} />
          Collapse rail
        </button>
      </div>
      <Panel title="Intelligence Rail" eyebrow="Ambient" icon={CircleDot} theme={theme}>
        <div className="space-y-2">
          <IntelligenceRailCard
            id="model"
            title="Model"
            summary={`Local model ${ollamaStatus.status}`}
            icon={RadioTower}
            expanded={expanded === 'model'}
            onToggle={toggle}
            theme={theme}
          >
            <div>{ollamaStatus.model || 'No model selected'}</div>
            <div className="mt-1">You can still save a response manually if the model is unavailable.</div>
          </IntelligenceRailCard>

          <IntelligenceRailCard
            id="vault"
            title="Vault"
            summary={`${data.memoryItems.filter((item) => item.projectId === activeProject.id).length} captures`}
            icon={ShieldCheck}
            expanded={expanded === 'vault'}
            onToggle={toggle}
            theme={theme}
          >
            <div>Encrypted local workspace is unlocked for this session.</div>
            <div className="mt-1">Active project: {activeProject.name}</div>
          </IntelligenceRailCard>

          <IntelligenceRailCard
            id="phase"
            title="Phase"
            summary={`${moon.phaseName} ${moon.illumination}%`}
            icon={Moon}
            expanded={expanded === 'phase'}
            onToggle={toggle}
            theme={theme}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{moon.phaseName}</span>
              <span className={`text-2xl ${theme.accent}`}>{moon.glyph}</span>
            </div>
            <div className="mt-1">Illumination {moon.illumination}%</div>
          </IntelligenceRailCard>

          <IntelligenceRailCard
            id="clock"
            title="Clock"
            summary={timeString}
            icon={Activity}
            expanded={expanded === 'clock'}
            onToggle={toggle}
            theme={theme}
          >
            <div>Local time: {nowValue.toLocaleString()}</div>
            <div className="mt-1">Governing signal: {spirit}</div>
          </IntelligenceRailCard>

          <IntelligenceRailCard
            id="ports"
            title="Ports"
            summary={lan?.enabled ? `${lan.security?.openPortCount || 0} open` : 'LAN closed'}
            icon={Network}
            expanded={expanded === 'ports'}
            onToggle={toggle}
            theme={theme}
          >
            {lan?.enabled
              ? `${lan.security?.bindScope || 'LAN only'} / ${(lan.security?.openPorts || []).join(' / ') || 'No ports reported'}`
              : 'F*Society LAN mode disabled.'}
          </IntelligenceRailCard>
        </div>
      </Panel>
    </aside>
  );
};

const SURFACE_LABELS = {
  entry: 'Entry Surface',
  modules: 'Modules',
  operate: 'Operate',
  research: 'Research',
  memory: 'Memory',
  signal: 'Signal',
  system: 'System Surface',
  search: 'Search',
};

const ActiveModuleSurface = ({
  activeModuleApp,
  ActiveModuleComponent,
  previousSurface,
  activeModuleView = 'default',
  onBackToSystemSurface,
  onOpenModuleWindow,
  onCloseActiveModule,
  onSetActiveModuleView,
  theme = DEFAULT_COCKPIT_THEME,
  shellThemeId = 'black_glass',
}) => {
  if (!activeModuleApp || !ActiveModuleComponent) {
    return (
      <Panel title="Active Module" eyebrow="Module surface" icon={Boxes} primary theme={theme}>
        <div className={`rounded-md border p-4 text-sm text-slate-500 ${theme.subPanel}`}>
          No module is currently loaded.
        </div>
      </Panel>
    );
  }

  const Icon = activeModuleApp.icon;
  const surfaceLabel = SURFACE_LABELS[previousSurface] || 'System Surface';
  const isVaultNotes = activeModuleApp.appKey === 'notes';
  const isNeuralNotes = isVaultNotes && activeModuleView === 'neural-notes';

  return (
    <section className={`flex h-[calc(100vh-15rem)] min-h-[32rem] flex-col overflow-hidden rounded-lg border shadow-2xl ${theme.panelPrimary}`}>
      <div className={`flex flex-col gap-3 border-b px-4 py-3 ${theme.divider} 2xl:flex-row 2xl:items-center 2xl:justify-between`}>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <span>Cockpit</span>
            <ChevronRight size={12} />
            <span>{surfaceLabel}</span>
            <ChevronRight size={12} />
            <span className={theme.accent}>{activeModuleApp.title}</span>
          </div>
          <div className={`mt-2 flex min-w-0 items-center gap-3 text-lg font-semibold ${theme.heading}`}>
            <span className={`wireframe-grid inline-flex shrink-0 rounded-md border p-2 ${theme.tag}`}>
              <Icon size={17} />
            </span>
            <span className="truncate">{activeModuleApp.title}</span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{activeModuleApp.description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBackToSystemSurface}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${theme.secondaryButton}`}
          >
            <ArrowLeft size={14} />
            Back to System Surface
          </button>
          <button
            type="button"
            onClick={() => onOpenModuleWindow(activeModuleApp.appKey)}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${theme.primarySoftButton}`}
          >
            <ExternalLink size={14} />
            Open as Window
          </button>
          {isVaultNotes ? (
            <button
              type="button"
              onClick={() => onSetActiveModuleView?.(isNeuralNotes ? 'default' : 'neural-notes')}
              className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                isNeuralNotes ? theme.activeTab : theme.secondaryButton
              }`}
            >
              <BrainCircuit size={14} />
              Neural Notes
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCloseActiveModule}
            className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${theme.inactiveTab}`}
          >
            <X size={14} />
            Close Module
          </button>
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain bg-slate-950/40 ${
          shellThemeId === 'black_glass' ? 'ros-black-glass-app' : ''
        }`}
      >
        <div className="h-full min-h-full">
          <ActiveModuleComponent
            moduleView={activeModuleView}
            onRequestDefaultView={() => onSetActiveModuleView?.('default')}
          />
        </div>
      </div>
    </section>
  );
};

const CenterWorkspace = ({
  mode,
  activeProject,
  data,
  memoryResults,
  orderedApps,
  onOpenModule,
  cockpitState,
  activeModuleApp,
  ActiveModuleComponent,
  onOpenModuleWindow,
  onBackToSystemSurface,
  onCloseActiveModule,
  onSetActiveModuleView,
  ollamaStatus,
  setOllamaStatus,
  windows = [],
  theme = DEFAULT_COCKPIT_THEME,
}) => {
  if (cockpitState?.activeSurface === 'module') {
    return (
      <ActiveModuleSurface
        activeModuleApp={activeModuleApp}
        ActiveModuleComponent={ActiveModuleComponent}
        previousSurface={cockpitState.previousSurface}
        activeModuleView={cockpitState.activeModuleView || 'default'}
        onBackToSystemSurface={onBackToSystemSurface}
        onOpenModuleWindow={onOpenModuleWindow}
        onCloseActiveModule={onCloseActiveModule}
        onSetActiveModuleView={onSetActiveModuleView}
        shellThemeId={data.settings.theme}
        theme={theme}
      />
    );
  }

  if (mode === 'research') {
    return <ResearchWorkspace activeProject={activeProject} memoryResults={memoryResults} theme={theme} />;
  }

  if (mode === 'memory') {
    return <MemoryWorkspace memoryResults={memoryResults} theme={theme} />;
  }

  if (mode === 'signal') {
    return <SignalWorkspace activeProject={activeProject} memoryResults={memoryResults} theme={theme} />;
  }

  if (mode === 'system') {
    return (
      <SystemWorkspace
        data={data}
        orderedApps={orderedApps}
        onOpenModule={onOpenModule}
        ollamaStatus={ollamaStatus}
        windows={windows}
        activeModuleId={cockpitState?.activeModuleId}
        activeProject={activeProject}
        theme={theme}
      />
    );
  }

  return (
    <div className="grid min-h-0 gap-3">
      <AiConsole
        activeProject={activeProject}
        ollamaStatus={ollamaStatus}
        setOllamaStatus={setOllamaStatus}
        theme={theme}
      />
      <OperationalFeed activeProject={activeProject} data={data} memoryResults={memoryResults} compact theme={theme} />
    </div>
  );
};

const OperatorCockpit = ({
  orderedApps,
  cockpitState,
  activeModuleApp,
  ActiveModuleComponent,
  onOpenModule,
  onOpenModuleWindow,
  onBackToSystemSurface,
  onCloseActiveModule,
  onSetActiveModuleView,
  onLockWorkspace,
  onDeadManTrigger,
  now: nowValue = new Date(),
  lan,
  windows = [],
}) => {
  const { data, updateWorkspaceData } = useWorkspaceData();
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('operate');
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [deadManStep, setDeadManStep] = useState(0);
  const [deadManNotice, setDeadManNotice] = useState('');
  const [deadManWasArmed, setDeadManWasArmed] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({
    status: data.settings.ai?.lastStatus || 'unknown',
    model: data.settings.ai?.model || '',
    models: [],
  });
  const activeProject = getActiveProject(data);
  const deadManArmed = Boolean(data.settings.deadMansTriggerEnabled);
  const memoryResults = getProjectMemoryResults(data, searchQuery, {
    projectId: activeProject.id,
    includeLegacy: true,
    limit: 16,
  });
  const cockpitTheme = useMemo(() => getCockpitTheme(data.settings.theme), [data.settings.theme]);
  const cockpitGridClass =
    leftCollapsed && railCollapsed
      ? 'xl:grid-cols-[3.5rem_minmax(560px,3.9fr)_3.5rem]'
      : leftCollapsed
        ? 'xl:grid-cols-[3.5rem_minmax(560px,3.12fr)_minmax(250px,0.85fr)]'
        : railCollapsed
          ? 'xl:grid-cols-[minmax(250px,0.78fr)_minmax(560px,3.12fr)_3.5rem]'
          : 'xl:grid-cols-[minmax(250px,0.8fr)_minmax(560px,2.4fr)_minmax(250px,0.85fr)]';
  const aiBaseUrl = data.settings.ai?.ollamaBaseUrl;
  const aiModelName = data.settings.ai?.model;
  const aiHuggingFace = data.settings.ai?.huggingFace || {};
  const aiHuggingFaceSource = aiHuggingFace.source || '';
  const aiHuggingFaceRuntimeModel = aiHuggingFace.runtimeModel || '';
  const aiSelectedModelId = data.settings.ai?.selectedModelId || DEFAULT_MODEL_ID;

  useEffect(() => {
    if (deadManArmed && !deadManWasArmed) {
      setRailCollapsed(true);
      setLeftCollapsed(true);
      setDeadManStep(0);
      setDeadManNotice(`Armed ${DEAD_MAN_MODE_ID}: expand Intel Rail, then the left rail.`);
      setDeadManWasArmed(true);
      return;
    }

    if (!deadManArmed && deadManWasArmed) {
      setDeadManStep(0);
      setDeadManNotice('');
      setDeadManWasArmed(false);
    }
  }, [deadManArmed, deadManWasArmed]);

  useEffect(() => {
    let cancelled = false;

    checkModelStatus(aiSelectedModelId, {
      ollamaBaseUrl: aiBaseUrl,
      model: aiModelName,
      huggingFace: {
        source: aiHuggingFaceSource,
        runtimeModel: aiHuggingFaceRuntimeModel,
      },
    })
      .then((status) => {
        if (cancelled) {
          return;
        }

        if (status.runtimeStatus) {
          setOllamaStatus(status.runtimeStatus);
        }
        updateWorkspaceData((current) => ({
          ...current,
          settings: {
            ...current.settings,
            ai: {
              ...current.settings.ai,
              lastStatus: status.status === MODEL_STATUS.READY ? 'online' : status.status,
              modelStatuses: {
                ...(current.settings.ai?.modelStatuses || {}),
                [aiSelectedModelId]: {
                  ...(current.settings.ai?.modelStatuses?.[aiSelectedModelId] || {}),
                  ...status,
                },
              },
            },
          },
        }));
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setOllamaStatus((current) => ({ ...current, status: 'unavailable' }));
        updateWorkspaceData((current) => ({
          ...current,
          settings: {
            ...current.settings,
            ai: {
              ...current.settings.ai,
              lastStatus: 'unavailable',
              modelStatuses: {
                ...(current.settings.ai?.modelStatuses || {}),
                [aiSelectedModelId]: {
                  ...(current.settings.ai?.modelStatuses?.[aiSelectedModelId] || {}),
                  status: MODEL_STATUS.UNAVAILABLE,
                  lastCheckedAt: now(),
                  lastError: error instanceof Error ? error.message : 'Local model unavailable.',
                  rawStatus: error instanceof Error ? error.message : String(error || ''),
                },
              },
            },
          },
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [
    aiBaseUrl,
    aiModelName,
    aiHuggingFaceRuntimeModel,
    aiHuggingFaceSource,
    aiSelectedModelId,
    updateWorkspaceData,
  ]);

  const appList = orderedApps?.length ? orderedApps : APP_ORDER.map((key) => ({ appKey: key, ...APPS[key] })).filter(Boolean);
  const isDeadManSequencePartial = deadManArmed && deadManStep > 0 && deadManStep < DEAD_MAN_SEQUENCE.length;
  const handleOpenModule = (appKey) => {
    if (isDeadManSequencePartial) {
      triggerDeadManViolation(`Dead-man ${DEAD_MAN_MODE_ID}: module opened before the disarm sequence completed.`);
      return;
    }

    onOpenModule(appKey, mode);
  };
  const triggerDeadManViolation = (reason) => {
    setDeadManNotice(reason);
    onDeadManTrigger?.(reason, {
      action: 'lock',
      modeId: DEAD_MAN_MODE_ID,
    });
  };
  const registerDeadManPanelAction = (panelId, action) => {
    if (!deadManArmed) {
      return true;
    }

    if (action !== 'expand') {
      triggerDeadManViolation(`Dead-man ${DEAD_MAN_MODE_ID}: ${panelId} collapsed during the disarm sequence.`);
      return false;
    }

    const expectedPanelId = DEAD_MAN_SEQUENCE[deadManStep];

    if (panelId !== expectedPanelId) {
      triggerDeadManViolation(`Dead-man ${DEAD_MAN_MODE_ID}: expected ${expectedPanelId}, received ${panelId}.`);
      return false;
    }

    if (deadManStep === DEAD_MAN_SEQUENCE.length - 1) {
      updateWorkspaceData((current) => ({
        ...current,
        settings: {
          ...current.settings,
          deadMansTriggerEnabled: false,
        },
      }));
      setDeadManStep(0);
      setDeadManNotice('Dead-man trigger disarmed by cockpit sequence.');
      return true;
    }

    setDeadManStep((current) => current + 1);
    setDeadManNotice(`Step ${deadManStep + 1} accepted. Continue counter-clockwise.`);
    return true;
  };
  const handleLeftCollapsedChange = (nextCollapsed) => {
    if (!registerDeadManPanelAction('left', nextCollapsed ? 'collapse' : 'expand')) {
      return;
    }

    setLeftCollapsed(nextCollapsed);
  };
  const handleRailCollapsedChange = (nextCollapsed) => {
    if (!registerDeadManPanelAction('rail', nextCollapsed ? 'collapse' : 'expand')) {
      return;
    }

    setRailCollapsed(nextCollapsed);
  };
  const handleModeChange = (nextMode) => {
    if (isDeadManSequencePartial) {
      triggerDeadManViolation(`Dead-man ${DEAD_MAN_MODE_ID}: cockpit mode changed before the disarm sequence completed.`);
      return;
    }

    setMode(nextMode);

    if (cockpitState?.activeSurface === 'module') {
      onCloseActiveModule();
    }
  };
  const handleBackToSystemSurface = () => {
    setMode('system');
    onBackToSystemSurface();
  };
  const handleCloseActiveModule = () => {
    setMode('system');
    onCloseActiveModule();
  };

  return (
    <div className={`h-full overflow-y-auto ${cockpitTheme.root}`}>
      <div className="mx-auto flex min-h-full max-w-[1900px] flex-col gap-4 p-4">
        <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div>
            <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.32em] ${cockpitTheme.accent}`}>
              <ShieldCheck size={14} />
              ROS v2.0
            </div>
            <h1 className={`mt-2 text-3xl font-semibold tracking-tight ${cockpitTheme.heading}`}>Operator Memory Cockpit</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {activeProject.name} / last updated {formatShortTime(activeProject.updatedAt)}
            </p>
          </div>
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
            <ModeTabs mode={mode} onModeChange={handleModeChange} theme={cockpitTheme} />
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${cockpitTheme.subPanel}`}>
              <Search size={15} className="text-slate-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search active project memory"
                className="w-72 max-w-[48vw] bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        </div>

        <div className={`grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-200 ${cockpitGridClass}`}>
          <CommandDeck
            activeProject={activeProject}
            data={data}
            memoryResults={memoryResults}
            ollamaStatus={ollamaStatus}
            leftCollapsed={leftCollapsed}
            deadManArmed={deadManArmed}
            deadManNotice={deadManNotice}
            onToggleLeftCollapsed={handleLeftCollapsedChange}
            onCreateProject={createProject}
            onSelectProject={setActiveProject}
            onLockWorkspace={onLockWorkspace}
            theme={cockpitTheme}
          />
          <main className="min-h-0">
            <CenterWorkspace
              mode={mode}
              activeProject={activeProject}
              data={data}
              memoryResults={memoryResults}
              orderedApps={appList}
              onOpenModule={handleOpenModule}
              cockpitState={cockpitState}
              activeModuleApp={activeModuleApp}
              ActiveModuleComponent={ActiveModuleComponent}
              onOpenModuleWindow={onOpenModuleWindow}
              onBackToSystemSurface={handleBackToSystemSurface}
              onCloseActiveModule={handleCloseActiveModule}
              onSetActiveModuleView={onSetActiveModuleView}
              ollamaStatus={ollamaStatus}
              setOllamaStatus={setOllamaStatus}
              windows={windows}
              theme={cockpitTheme}
            />
          </main>
          <IntelligenceRail
            nowValue={nowValue}
            lan={lan || data.lan}
            ollamaStatus={ollamaStatus}
            activeProject={activeProject}
            data={data}
            collapsed={railCollapsed}
            deadManArmed={deadManArmed}
            deadManNotice={deadManNotice}
            onToggleCollapsed={() => handleRailCollapsedChange(!railCollapsed)}
            theme={cockpitTheme}
          />
        </div>
      </div>
    </div>
  );
};

export default OperatorCockpit;
