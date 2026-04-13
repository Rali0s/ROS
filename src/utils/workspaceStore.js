import { useSyncExternalStore } from 'react';
import {
  PRODUCT_NAME,
  createEncryptedWorkspaceContainer,
  decryptWorkspaceContainer,
  isEncryptedWorkspaceContainer,
} from './cryptoVault';

const STORAGE_KEY = 'osa-midnight-oil.workspace';
const CHANGE_EVENT = 'osa-midnight-oil.workspace.change';
const PERSIST_DEBOUNCE_MS = 260;

const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

const createSettings = () => ({
  codename: PRODUCT_NAME,
  operator: 'Guest Operator',
  theme: 'midnight',
  wallpaper: 'violet-surge',
  startupApp: 'overview',
  autoOpenOverview: true,
  wipePhrase: 'MIDNIGHT',
  localOnly: true,
  securityMode: 'master-lock',
  autoLockMinutes: 10,
  privacyModeEnabled: false,
  privacyPressHoldReveal: true,
  privacyAutoRedactOnBlur: true,
  privacyTimedRehide: true,
  privacyTimedRehideSeconds: 20,
  privacyDisableClipboard: true,
  privacyMaskedPartialDisplay: true,
  privacySessionAccessLog: true,
  privacyElectronContentProtection: false,
  deadMansTriggerEnabled: false,
});

const createSeededWorkspace = () => ({
  version: 3,
  notes: [
    {
      id: createId('note'),
      title: 'Midnight Brief',
      category: 'briefing',
      tags: ['daily', 'planning'],
      pinned: true,
      body: `# Midnight Brief

- Priority: Keep the workspace current while work is live
- Deliverables: Notes, references, checklists, timelines, and secured vault entries in one local place
- Risks: Missing context when switching between tasks
- Next checkpoint: Capture wins, blockers, and follow-ups before sign-off`,
      updatedAt: now(),
    },
    {
      id: createId('note'),
      title: 'Authorized Engagement Checklist',
      category: 'checklist',
      tags: ['scope', 'compliance'],
      pinned: false,
      body: `# Authorized Engagement Checklist

- Confirm written scope and dates
- Record approved environments and owners
- Note communication channels and escalation contacts
- Track evidence, findings, and validation notes only inside approved scope`,
      updatedAt: now(),
    },
  ],
  bookmarks: [
    {
      id: createId('bookmark'),
      title: 'OWASP Testing Guide',
      url: 'https://owasp.org/www-project-web-security-testing-guide/',
      category: 'reference',
      notes: 'Baseline reference for authorized web application testing.',
      updatedAt: now(),
    },
    {
      id: createId('bookmark'),
      title: 'NIST Incident Response',
      url: 'https://csrc.nist.gov/publications/detail/sp/800-61/rev-2/final',
      category: 'process',
      notes: 'Useful playbook reference for response and documentation.',
      updatedAt: now(),
    },
    {
      id: createId('bookmark'),
      title: 'ZCash Paper Wallet',
      url: 'https://github.com/adityapk00/zecpaperwallet/',
      category: 'wallets',
      notes: 'Reference repository for an offline ZEC paper wallet tool.',
      updatedAt: now(),
    },
    {
      id: createId('bookmark'),
      title: 'Electrum Bitcoin Paper Wallet',
      url: 'https://github.com/Fensterbank/electrum-bitcoin-paper-wallet',
      category: 'wallets',
      notes: 'Reference repository for Bitcoin paper wallet generation with Electrum.',
      updatedAt: now(),
    },
  ],
  inventory: [
    {
      id: createId('asset'),
      name: 'macOS Sonoma',
      type: 'operating system',
      platform: 'macOS',
      status: 'active',
      notes: 'Primary workstation baseline.',
      updatedAt: now(),
    },
    {
      id: createId('asset'),
      name: 'Nmap',
      type: 'software',
      platform: 'Cross-platform',
      status: 'approved',
      notes: 'Only for authorized network discovery.',
      updatedAt: now(),
    },
    {
      id: createId('asset'),
      name: 'Agile live documentation',
      type: 'methodology',
      platform: 'Process',
      status: 'standard',
      notes: 'Capture planning, assumptions, and status in real time.',
      updatedAt: now(),
    },
  ],
  flowBoards: [
    {
      id: createId('flow'),
      title: 'Remote Ops Network',
      description: 'A wireframe map showing a generic approved access path.',
      nodes: [
        { id: createId('node'), type: 'workstation', label: 'Operator Workstation', x: 90, y: 110, notes: '' },
        { id: createId('node'), type: 'gateway', label: 'VPN Gateway', x: 360, y: 110, notes: '' },
        { id: createId('node'), type: 'service', label: 'Ticketing Service', x: 640, y: 90, notes: '' },
        { id: createId('node'), type: 'database', label: 'Evidence Store', x: 640, y: 260, notes: '' },
      ],
      links: [],
      updatedAt: now(),
    },
  ],
  calendarEvents: [
    {
      id: createId('event'),
      title: 'Weekly planning block',
      date: '2026-04-14',
      time: '09:00',
      category: 'planning',
      notes: 'Review priorities, capture blockers, and schedule deliverables for the week.',
      updatedAt: now(),
    },
  ],
  profiles: [],
  wallets: [],
  clocks: [
    { id: createId('clock'), label: 'New York', timezone: 'America/New_York' },
    { id: createId('clock'), label: 'UTC', timezone: 'UTC' },
    { id: createId('clock'), label: 'London', timezone: 'Europe/London' },
    { id: createId('clock'), label: 'Tokyo', timezone: 'Asia/Tokyo' },
  ],
  settings: createSettings(),
});

const buildEmptyWorkspace = () => ({
  version: 3,
  notes: [],
  bookmarks: [],
  inventory: [],
  flowBoards: [],
  calendarEvents: [],
  profiles: [],
  wallets: [],
  clocks: [],
  settings: createSettings(),
});

const cloneWorkspace = (workspace) => JSON.parse(JSON.stringify(workspace));

const DEFAULT_WORKSPACE = createSeededWorkspace();
const EMPTY_WORKSPACE = buildEmptyWorkspace();
const DEFAULT_BOOT = {
  codename: DEFAULT_WORKSPACE.settings.codename,
  operator: DEFAULT_WORKSPACE.settings.operator,
  wallpaper: DEFAULT_WORKSPACE.settings.wallpaper,
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const normalizeNote = (note = {}) => ({
  id: note.id || createId('note'),
  title: typeof note.title === 'string' && note.title.trim() ? note.title : 'Untitled note',
  category: typeof note.category === 'string' && note.category.trim() ? note.category : 'briefing',
  tags: Array.isArray(note.tags)
    ? note.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [],
  pinned: Boolean(note.pinned),
  body: typeof note.body === 'string' ? note.body : '',
  updatedAt: note.updatedAt || now(),
});

const normalizeBookmark = (bookmark = {}) => ({
  id: bookmark.id || createId('bookmark'),
  title: typeof bookmark.title === 'string' && bookmark.title.trim() ? bookmark.title : 'Untitled bookmark',
  url: typeof bookmark.url === 'string' ? bookmark.url : '',
  category: typeof bookmark.category === 'string' && bookmark.category.trim() ? bookmark.category : 'reference',
  notes: typeof bookmark.notes === 'string' ? bookmark.notes : '',
  updatedAt: bookmark.updatedAt || now(),
});

const normalizeInventoryItem = (item = {}) => ({
  id: item.id || createId('asset'),
  name: typeof item.name === 'string' && item.name.trim() ? item.name : 'Untitled item',
  type: typeof item.type === 'string' && item.type.trim() ? item.type : 'software',
  platform: typeof item.platform === 'string' && item.platform.trim() ? item.platform : 'Cross-platform',
  status: typeof item.status === 'string' && item.status.trim() ? item.status : 'active',
  notes: typeof item.notes === 'string' ? item.notes : '',
  updatedAt: item.updatedAt || now(),
});

const normalizeFlowNode = (node = {}) => ({
  id: node.id || createId('node'),
  type: typeof node.type === 'string' && node.type.trim() ? node.type : 'workstation',
  label: typeof node.label === 'string' && node.label.trim() ? node.label : 'Untitled node',
  x: Number.isFinite(node.x) ? node.x : 96,
  y: Number.isFinite(node.y) ? node.y : 96,
  notes: typeof node.notes === 'string' ? node.notes : '',
});

const normalizeFlowLink = (link = {}) => ({
  id: link.id || createId('link'),
  from: typeof link.from === 'string' ? link.from : '',
  to: typeof link.to === 'string' ? link.to : '',
  label: typeof link.label === 'string' ? link.label : '',
});

const normalizeFlowBoard = (board = {}) => ({
  id: board.id || createId('flow'),
  title: typeof board.title === 'string' && board.title.trim() ? board.title : 'Untitled flow board',
  description: typeof board.description === 'string' ? board.description : '',
  nodes: Array.isArray(board.nodes) ? board.nodes.map(normalizeFlowNode) : [],
  links: Array.isArray(board.links) ? board.links.map(normalizeFlowLink) : [],
  updatedAt: board.updatedAt || now(),
});

const normalizeCalendarEvent = (event = {}) => ({
  id: event.id || createId('event'),
  title: typeof event.title === 'string' && event.title.trim() ? event.title : 'Untitled event',
  date:
    typeof event.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(event.date)
      ? event.date
      : now().slice(0, 10),
  time:
    typeof event.time === 'string' && /^\d{2}:\d{2}$/.test(event.time)
      ? event.time
      : '',
  category: typeof event.category === 'string' && event.category.trim() ? event.category : 'planning',
  notes: typeof event.notes === 'string' ? event.notes : '',
  updatedAt: event.updatedAt || now(),
});

const normalizeWallet = (wallet = {}) => ({
  id: wallet.id || createId('wallet'),
  label: typeof wallet.label === 'string' && wallet.label.trim() ? wallet.label : 'Wallet entry',
  network: typeof wallet.network === 'string' && wallet.network.trim() ? wallet.network : 'Bitcoin',
  addresses: Array.isArray(wallet.addresses)
    ? wallet.addresses.map((address) => String(address).trim()).filter(Boolean)
    : [],
  secretMaterial: typeof wallet.secretMaterial === 'string' ? wallet.secretMaterial : '',
  secretNotes:
    typeof wallet.secretNotes === 'string'
      ? wallet.secretNotes
      : typeof wallet.notes === 'string'
        ? wallet.notes
        : '',
  secret: wallet.secret && typeof wallet.secret === 'object' ? wallet.secret : null,
  updatedAt: wallet.updatedAt || now(),
});

const normalizeClock = (clock = {}) => ({
  id: clock.id || createId('clock'),
  label: typeof clock.label === 'string' && clock.label.trim() ? clock.label : 'UTC',
  timezone: typeof clock.timezone === 'string' && clock.timezone.trim() ? clock.timezone : 'UTC',
});

const normalizeStringList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeNetworkZones = (zones) => {
  const defaults = {
    clearnet: false,
    tor: false,
    freenet: false,
    i2p: false,
  };

  if (Array.isArray(zones)) {
    return zones.reduce((current, zone) => {
      const key = String(zone).trim().toLowerCase();

      if (key in current) {
        current[key] = true;
      }

      return current;
    }, { ...defaults });
  }

  if (zones && typeof zones === 'object') {
    return {
      clearnet: Boolean(zones.clearnet),
      tor: Boolean(zones.tor),
      freenet: Boolean(zones.freenet),
      i2p: Boolean(zones.i2p),
    };
  }

  return defaults;
};

const normalizeProfile = (profile = {}) => ({
  id: profile.id || createId('profile'),
  name: typeof profile.name === 'string' && profile.name.trim() ? profile.name : 'Untitled profile',
  address: typeof profile.address === 'string' ? profile.address : '',
  emails: normalizeStringList(profile.emails),
  socialLogins: normalizeStringList(profile.socialLogins),
  vpnZones: normalizeStringList(profile.vpnZones),
  pgpKeys: normalizeStringList(profile.pgpKeys),
  networkZones: normalizeNetworkZones(profile.networkZones ?? profile.zones),
  notes: typeof profile.notes === 'string' ? profile.notes : '',
  updatedAt: profile.updatedAt || now(),
});

const normalizeWorkspace = (workspace) => {
  const next = workspace && typeof workspace === 'object' ? workspace : {};
  const defaults = DEFAULT_WORKSPACE;

  return {
    version: 3,
    notes: Array.isArray(next.notes) ? next.notes.map(normalizeNote) : defaults.notes.map(normalizeNote),
    bookmarks: Array.isArray(next.bookmarks)
      ? next.bookmarks.map(normalizeBookmark)
      : defaults.bookmarks.map(normalizeBookmark),
    inventory: Array.isArray(next.inventory)
      ? next.inventory.map(normalizeInventoryItem)
      : defaults.inventory.map(normalizeInventoryItem),
    flowBoards: Array.isArray(next.flowBoards)
      ? next.flowBoards.map(normalizeFlowBoard)
      : defaults.flowBoards.map(normalizeFlowBoard),
    calendarEvents: Array.isArray(next.calendarEvents)
      ? next.calendarEvents.map(normalizeCalendarEvent)
      : defaults.calendarEvents.map(normalizeCalendarEvent),
    profiles: Array.isArray(next.profiles) ? next.profiles.map(normalizeProfile) : [],
    wallets: Array.isArray(next.wallets) ? next.wallets.map(normalizeWallet) : [],
    clocks: Array.isArray(next.clocks) ? next.clocks.map(normalizeClock) : defaults.clocks.map(normalizeClock),
    settings: {
      ...createSettings(),
      ...(next.settings && typeof next.settings === 'object' ? next.settings : {}),
      securityMode: 'master-lock',
      autoLockMinutes:
        Number.isFinite(next.settings?.autoLockMinutes) && next.settings.autoLockMinutes > 0
          ? next.settings.autoLockMinutes
          : 10,
      privacyModeEnabled: Boolean(next.settings?.privacyModeEnabled),
      privacyPressHoldReveal:
        next.settings?.privacyPressHoldReveal !== undefined ? Boolean(next.settings.privacyPressHoldReveal) : true,
      privacyAutoRedactOnBlur:
        next.settings?.privacyAutoRedactOnBlur !== undefined ? Boolean(next.settings.privacyAutoRedactOnBlur) : true,
      privacyTimedRehide:
        next.settings?.privacyTimedRehide !== undefined ? Boolean(next.settings.privacyTimedRehide) : true,
      privacyTimedRehideSeconds:
        Number.isFinite(next.settings?.privacyTimedRehideSeconds) && next.settings.privacyTimedRehideSeconds > 0
          ? next.settings.privacyTimedRehideSeconds
          : 20,
      privacyDisableClipboard:
        next.settings?.privacyDisableClipboard !== undefined ? Boolean(next.settings.privacyDisableClipboard) : true,
      privacyMaskedPartialDisplay:
        next.settings?.privacyMaskedPartialDisplay !== undefined
          ? Boolean(next.settings.privacyMaskedPartialDisplay)
          : true,
      privacySessionAccessLog:
        next.settings?.privacySessionAccessLog !== undefined ? Boolean(next.settings.privacySessionAccessLog) : true,
      privacyElectronContentProtection: Boolean(next.settings?.privacyElectronContentProtection),
      deadMansTriggerEnabled: Boolean(next.settings?.deadMansTriggerEnabled),
    },
  };
};

const getBootMetadata = (workspace) => ({
  codename: workspace?.settings?.codename || DEFAULT_BOOT.codename,
  operator: workspace?.settings?.operator || DEFAULT_BOOT.operator,
  wallpaper: workspace?.settings?.wallpaper || DEFAULT_BOOT.wallpaper,
});

const trimExcerpt = (value, query) => {
  const source = String(value || '').replace(/\s+/g, ' ').trim();
  if (!source) {
    return '';
  }

  if (!query) {
    return source.slice(0, 120);
  }

  const lowerSource = source.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerSource.indexOf(lowerQuery);

  if (matchIndex === -1) {
    return source.slice(0, 120);
  }

  const start = Math.max(0, matchIndex - 36);
  const end = Math.min(source.length, matchIndex + query.length + 72);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < source.length ? '...' : '';

  return `${prefix}${source.slice(start, end)}${suffix}`;
};

const matchQuery = (value, query) => String(value || '').toLowerCase().includes(query);

const formatProfileZones = (profile) =>
  Object.entries(profile.networkZones)
    .filter(([, active]) => active)
    .map(([zone]) => zone.toUpperCase());

export const searchWorkspaceData = (workspace, rawQuery) => {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return [];
  }

  const normalized = normalizeWorkspace(workspace);

  const notes = normalized.notes
    .filter((note) =>
      matchQuery(
        `${note.title} ${note.category} ${note.tags.join(' ')} ${note.body}`,
        query,
      ),
    )
    .slice(0, 8)
    .map((note) => ({
      id: note.id,
      appKey: 'notes',
      title: note.title,
      subtitle: `${note.category} · ${trimExcerpt(note.body, query)}`,
      navigation: {
        appKey: 'notes',
        itemId: note.id,
      },
    }));

  const bookmarks = normalized.bookmarks
    .filter((bookmark) =>
      matchQuery(
        `${bookmark.title} ${bookmark.url} ${bookmark.category} ${bookmark.notes}`,
        query,
      ),
    )
    .slice(0, 8)
    .map((bookmark) => ({
      id: bookmark.id,
      appKey: 'bookmarks',
      title: bookmark.title,
      subtitle: trimExcerpt(`${bookmark.category} · ${bookmark.url} · ${bookmark.notes}`, query),
      navigation: {
        appKey: 'bookmarks',
        itemId: bookmark.id,
      },
    }));

  const inventory = normalized.inventory
    .filter((item) =>
      matchQuery(
        `${item.name} ${item.type} ${item.platform} ${item.status} ${item.notes}`,
        query,
      ),
    )
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      appKey: 'inventory',
      title: item.name,
      subtitle: trimExcerpt(`${item.type} · ${item.platform} · ${item.status} · ${item.notes}`, query),
      navigation: {
        appKey: 'inventory',
        itemId: item.id,
      },
    }));

  const calendar = normalized.calendarEvents
    .filter((event) => matchQuery(`${event.title} ${event.date} ${event.time} ${event.category} ${event.notes}`, query))
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      appKey: 'calendar',
      title: event.title,
      subtitle: trimExcerpt(`${event.date} ${event.time} · ${event.category} · ${event.notes}`, query),
      navigation: {
        appKey: 'calendar',
        itemId: event.id,
      },
    }));

  const flows = normalized.flowBoards
    .flatMap((board) => {
      const boardMatches = matchQuery(`${board.title} ${board.description}`, query)
        ? [
            {
              id: board.id,
              appKey: 'flow-studio',
              title: board.title,
              subtitle: trimExcerpt(board.description || 'Flow board', query),
              navigation: {
                appKey: 'flow-studio',
                itemId: board.id,
              },
            },
          ]
        : [];

      const nodeMatches = board.nodes
        .filter((node) => matchQuery(node.label, query))
        .map((node) => ({
          id: `${board.id}:${node.id}`,
          appKey: 'flow-studio',
          title: `${board.title} · ${node.label}`,
          subtitle: 'Node label match',
          navigation: {
            appKey: 'flow-studio',
            itemId: board.id,
            subItemId: node.id,
            subItemType: 'node',
          },
        }));

      const linkMatches = board.links
        .filter((link) => matchQuery(link.label, query))
        .map((link) => ({
          id: `${board.id}:${link.id}`,
          appKey: 'flow-studio',
          title: `${board.title} · ${link.label}`,
          subtitle: 'Link label match',
          navigation: {
            appKey: 'flow-studio',
            itemId: board.id,
            subItemId: link.id,
            subItemType: 'link',
          },
        }));

      return [...boardMatches, ...nodeMatches, ...linkMatches];
    })
    .slice(0, 10);

  const profiles = normalized.profiles
    .filter((profile) =>
      matchQuery(
        [
          profile.name,
          profile.address,
          profile.emails.join(' '),
          profile.socialLogins.join(' '),
          profile.vpnZones.join(' '),
          profile.pgpKeys.join(' '),
          formatProfileZones(profile).join(' '),
          profile.notes,
        ].join(' '),
        query,
      ),
    )
    .slice(0, 8)
    .map((profile) => ({
      id: profile.id,
      appKey: 'profiles',
      title: profile.name,
      subtitle: trimExcerpt(
        [
          profile.emails.join(' · '),
          profile.socialLogins.join(' · '),
          profile.vpnZones.join(' · '),
          formatProfileZones(profile).join(' · '),
          profile.notes,
        ]
          .filter(Boolean)
          .join(' · '),
        query,
      ),
      navigation: {
        appKey: 'profiles',
        itemId: profile.id,
      },
    }));

  const wallets = normalized.wallets
    .filter((wallet) =>
      matchQuery(`${wallet.label} ${wallet.network} ${wallet.addresses.join(' ')}`, query),
    )
    .slice(0, 8)
    .map((wallet) => ({
      id: wallet.id,
      appKey: 'wallet-vault',
      title: wallet.label,
      subtitle: trimExcerpt(`${wallet.network} · ${wallet.addresses.join(' · ')}`, query),
      navigation: {
        appKey: 'wallet-vault',
        itemId: wallet.id,
      },
    }));

  return [
    { key: 'notes', label: 'Vault Notes', results: notes },
    { key: 'calendar', label: 'Calendar', results: calendar },
    { key: 'bookmarks', label: 'Bookmarks', results: bookmarks },
    { key: 'inventory', label: 'Inventory', results: inventory },
    { key: 'flows', label: 'Flow Studio', results: flows },
    { key: 'profiles', label: 'Profile Organizer', results: profiles },
    { key: 'wallets', label: 'Wallet Vault', results: wallets },
  ].filter((group) => group.results.length);
};

let initialized = false;
let persistTimer = null;
let sessionPassphrase = '';
let sessionToken = 0;
let storeState = {
  lifecycle: 'booting',
  boot: DEFAULT_BOOT,
  data: null,
  pendingLegacyWorkspace: null,
  navigation: null,
  notice: '',
  error: '',
  dataRevision: 0,
  sessionAccessLog: [],
};

const emitWorkspaceChange = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
};

const setStoreState = (patch) => {
  storeState = {
    ...storeState,
    ...patch,
  };
  emitWorkspaceChange();
  return storeState;
};

const clearPersistTimer = () => {
  if (persistTimer) {
    window.clearTimeout(persistTimer);
    persistTimer = null;
  }
};

const persistWorkspaceSnapshot = async (workspace, token, revision) => {
  if (!canUseStorage() || !sessionPassphrase.trim()) {
    return null;
  }

  const container = await createEncryptedWorkspaceContainer(
    workspace,
    sessionPassphrase,
    getBootMetadata(workspace),
  );

  if (token !== sessionToken || revision !== storeState.dataRevision || storeState.lifecycle !== 'unlocked') {
    return null;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
  setStoreState({
    boot: container.boot,
    error: '',
  });

  return container;
};

const schedulePersist = () => {
  if (storeState.lifecycle !== 'unlocked' || !storeState.data) {
    return;
  }

  clearPersistTimer();
  const token = sessionToken;
  const revision = storeState.dataRevision;

  persistTimer = window.setTimeout(async () => {
    persistTimer = null;

    try {
      await persistWorkspaceSnapshot(cloneWorkspace(storeState.data), token, revision);
    } catch (error) {
      setStoreState({
        error: error.message || 'Unable to persist the encrypted workspace.',
      });
    }
  }, PERSIST_DEBOUNCE_MS);
};

const readPersistedPayload = () => {
  if (!canUseStorage()) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
};

const scanPersistedWorkspace = () => {
  const raw = readPersistedPayload();

  if (!raw) {
    setStoreState({
      lifecycle: 'setup',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      error: '',
      navigation: null,
      sessionAccessLog: [],
    });
    return storeState;
  }

  try {
    const parsed = JSON.parse(raw);

    if (isEncryptedWorkspaceContainer(parsed)) {
      setStoreState({
        lifecycle: 'locked',
        boot: {
          ...DEFAULT_BOOT,
          ...(parsed.boot && typeof parsed.boot === 'object' ? parsed.boot : {}),
        },
        data: null,
        pendingLegacyWorkspace: null,
        error: '',
        navigation: null,
      });
      return storeState;
    }

    const legacyWorkspace = normalizeWorkspace(parsed?.workspace ?? parsed);
    setStoreState({
      lifecycle: 'migration',
      boot: getBootMetadata(legacyWorkspace),
      data: null,
      pendingLegacyWorkspace: legacyWorkspace,
      error: '',
      navigation: null,
      sessionAccessLog: [],
    });
  } catch (error) {
    setStoreState({
      lifecycle: 'setup',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      error: 'Stored workspace data could not be read. Create a new secure workspace to continue.',
      navigation: null,
      sessionAccessLog: [],
    });
  }

  return storeState;
};

const ensureStoreInitialized = () => {
  if (!initialized) {
    initialized = true;
    scanPersistedWorkspace();
  }

  return storeState;
};

const setUnlockedWorkspace = (workspace, passphrase, notice = '') => {
  sessionPassphrase = passphrase;
  sessionToken += 1;

  const normalized = normalizeWorkspace(workspace);

  return setStoreState({
    lifecycle: 'unlocked',
    boot: getBootMetadata(normalized),
    data: normalized,
    pendingLegacyWorkspace: null,
    navigation: null,
    notice,
    error: '',
    dataRevision: storeState.dataRevision + 1,
    sessionAccessLog: [],
  });
};

const replaceWorkspaceData = (workspace, persistMode = 'debounced') => {
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Workspace must be unlocked before it can be updated.');
  }

  const normalized = normalizeWorkspace(workspace);

  setStoreState({
    data: normalized,
    boot: getBootMetadata(normalized),
    dataRevision: storeState.dataRevision + 1,
    error: '',
  });

  if (persistMode === 'immediate') {
    clearPersistTimer();
    return persistWorkspaceSnapshot(
      cloneWorkspace(normalized),
      sessionToken,
      storeState.dataRevision,
    );
  }

  if (persistMode === 'debounced') {
    schedulePersist();
  }

  return normalized;
};

export const createDefaultWorkspace = () => normalizeWorkspace(createSeededWorkspace());
export const createEmptyWorkspace = () => normalizeWorkspace(EMPTY_WORKSPACE);

export const readWorkspaceData = () => ensureStoreInitialized().data;

export const initializeSecureWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    const workspace = createDefaultWorkspace();
    const container = await createEncryptedWorkspaceContainer(
      workspace,
      passphrase,
      getBootMetadata(workspace),
    );

    if (canUseStorage()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
    }

    setUnlockedWorkspace(workspace, passphrase, 'Secure workspace initialized.');
    return workspace;
  } catch (error) {
    setStoreState({
      error: error.message || 'Unable to initialize the secure workspace.',
    });
    throw error;
  }
};

export const migrateLegacyWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    const legacyWorkspace = storeState.pendingLegacyWorkspace
      ? cloneWorkspace(storeState.pendingLegacyWorkspace)
      : createDefaultWorkspace();
    const workspace = normalizeWorkspace(legacyWorkspace);
    const container = await createEncryptedWorkspaceContainer(
      workspace,
      passphrase,
      getBootMetadata(workspace),
    );

    if (canUseStorage()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
    }

    setUnlockedWorkspace(workspace, passphrase, 'Legacy workspace migrated into the encrypted vault.');
    return workspace;
  } catch (error) {
    setStoreState({
      error: error.message || 'Unable to migrate the legacy workspace.',
    });
    throw error;
  }
};

export const unlockWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    const raw = readPersistedPayload();
    if (!raw) {
      throw new Error('No encrypted workspace was found on this system.');
    }

    const decrypted = await decryptWorkspaceContainer(JSON.parse(raw), passphrase);
    const workspace = normalizeWorkspace(decrypted.workspace ?? decrypted);
    setUnlockedWorkspace(workspace, passphrase, 'Workspace unlocked.');
    return workspace;
  } catch (error) {
    setStoreState({
      error: error.message || 'Unable to unlock the workspace.',
    });
    throw error;
  }
};

export const lockWorkspace = (notice = 'Workspace locked.') => {
  ensureStoreInitialized();
  clearPersistTimer();
  sessionPassphrase = '';
  sessionToken += 1;
  const raw = readPersistedPayload();

  if (!raw) {
    setStoreState({
      lifecycle: 'setup',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      navigation: null,
      notice,
      error: '',
    });
    return;
  }

  try {
    const parsed = JSON.parse(raw);

    if (isEncryptedWorkspaceContainer(parsed)) {
      setStoreState({
        lifecycle: 'locked',
        boot: {
          ...DEFAULT_BOOT,
          ...(parsed.boot && typeof parsed.boot === 'object' ? parsed.boot : {}),
        },
        data: null,
        pendingLegacyWorkspace: null,
        navigation: null,
        notice,
        error: '',
        sessionAccessLog: [],
      });
      return;
    }

    const legacyWorkspace = normalizeWorkspace(parsed?.workspace ?? parsed);
    setStoreState({
      lifecycle: 'migration',
      boot: getBootMetadata(legacyWorkspace),
      data: null,
      pendingLegacyWorkspace: legacyWorkspace,
      navigation: null,
      notice,
      error: '',
      sessionAccessLog: [],
    });
  } catch (error) {
    setStoreState({
      lifecycle: 'setup',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      navigation: null,
      notice,
      error: 'Stored workspace data could not be read. Create a new secure workspace to continue.',
      sessionAccessLog: [],
    });
  }
};

export const updateWorkspaceData = (updater) => {
  ensureStoreInitialized();

  if (storeState.lifecycle !== 'unlocked' || !storeState.data) {
    return storeState.data;
  }

  const current = cloneWorkspace(storeState.data);
  const next = typeof updater === 'function' ? updater(current) : updater;

  replaceWorkspaceData(next, 'debounced');
  return next;
};

export const resetWorkspaceData = async () => {
  ensureStoreInitialized();
  const workspace = createDefaultWorkspace();
  await replaceWorkspaceData(workspace, 'immediate');
  setStoreState({
    notice: 'Seeded baseline restored.',
    error: '',
  });
  return workspace;
};

export const nukeWorkspaceData = () => {
  ensureStoreInitialized();
  clearPersistTimer();
  sessionPassphrase = '';
  sessionToken += 1;

  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  setStoreState({
    lifecycle: 'setup',
    boot: DEFAULT_BOOT,
    data: null,
    pendingLegacyWorkspace: null,
    navigation: null,
    notice: 'Workspace wiped. Configure a new secure workspace to continue.',
    error: '',
    dataRevision: storeState.dataRevision + 1,
    sessionAccessLog: [],
  });
};

export const appendSessionAccessLog = (entry) => {
  ensureStoreInitialized();

  if (!entry || storeState.lifecycle !== 'unlocked') {
    return;
  }

  const nextEntry = {
    id: createId('access'),
    timestamp: now(),
    ...entry,
  };

  setStoreState({
    sessionAccessLog: [nextEntry, ...(storeState.sessionAccessLog ?? [])].slice(0, 100),
  });
};

export const clearSessionAccessLog = () => {
  ensureStoreInitialized();
  setStoreState({
    sessionAccessLog: [],
  });
};

export const clearWorkspaceData = () => {
  nukeWorkspaceData();
  return null;
};

export const exportWorkspaceSnapshot = () => ({
  exportedAt: now(),
  product: PRODUCT_NAME,
  workspace: cloneWorkspace(readWorkspaceData() ?? createDefaultWorkspace()),
});

export const importWorkspaceSnapshot = async (payload) => {
  ensureStoreInitialized();

  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before importing a snapshot.');
  }

  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  const workspace = normalizeWorkspace(parsed?.workspace ?? parsed);
  await replaceWorkspaceData(workspace, 'immediate');
  setStoreState({
    notice: 'Workspace snapshot imported.',
    error: '',
  });
  return workspace;
};

export const setWorkspaceNavigation = (navigation) => {
  ensureStoreInitialized();
  setStoreState({
    navigation: navigation
      ? {
          ...navigation,
          token: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }
      : null,
  });
};

export const clearWorkspaceNavigation = () => {
  ensureStoreInitialized();
  setStoreState({
    navigation: null,
  });
};

export const searchWorkspace = (query) => {
  ensureStoreInitialized();
  return searchWorkspaceData(storeState.data ?? EMPTY_WORKSPACE, query);
};

const subscribe = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  ensureStoreInitialized();

  const handleChange = () => callback();
  const handleStorage = (event) => {
    if (event.key === STORAGE_KEY) {
      clearPersistTimer();
      sessionPassphrase = '';
      scanPersistedWorkspace();
      callback();
    }
  };

  window.addEventListener(CHANGE_EVENT, handleChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleChange);
    window.removeEventListener('storage', handleStorage);
  };
};

export const useWorkspaceSession = () =>
  useSyncExternalStore(subscribe, ensureStoreInitialized, () => storeState);

export const useWorkspaceData = () => {
  const session = useWorkspaceSession();

  return {
    data: session.data ?? EMPTY_WORKSPACE,
    session,
    updateWorkspaceData,
    resetWorkspaceData,
    clearWorkspaceData,
    exportWorkspaceSnapshot,
    importWorkspaceSnapshot,
    initializeSecureWorkspace,
    migrateLegacyWorkspace,
    unlockWorkspace,
    lockWorkspace,
    nukeWorkspaceData,
    setWorkspaceNavigation,
    clearWorkspaceNavigation,
    searchWorkspace,
    appendSessionAccessLog,
    clearSessionAccessLog,
  };
};

export { createId, now };
