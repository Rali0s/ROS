import { useSyncExternalStore } from 'react';
import {
  PRODUCT_NAME,
  createEncryptedWorkspaceContainer,
  decryptWorkspaceContainer,
  isEncryptedWorkspaceContainer,
} from './cryptoVault';
import {
  getNativeVaultState,
  deleteNativeFileBlob,
  deleteNativeAttachmentRef,
  deleteNativeMessage,
  exportNativeIdentityCard,
  exportNativeSnapshot,
  createNativeCommsIdentity,
  createNativeConversation,
  fetchNativeRelayMessages,
  initializeNativeWorkspace,
  isNativeVaultRuntime,
  lockNativeWorkspace,
  importNativePeerCard,
  getNativeConversationMessages,
  listNativeConversations,
  migrateNativeBetaWorkspace,
  nukeNativeWorkspace,
  persistNativeWorkspace,
  readNativeFileBlob,
  resolveNativeAutoSnapshotPath,
  listNativeFileBlobs,
  purgeNativeOrphanedFileBlobs,
  rotateNativeCommsIdentity,
  scanNativeLanPeers,
  saveNativeDraft,
  sendNativeLanChat,
  sendNativeLanFile,
  setNativeLanEnabled,
  setNativeLanPresence,
  shareNativeLanNote,
  storeNativeFileBlob,
  syncNativeLanState,
  upsertNativeLanQueueItem,
  sendNativeMessage,
  unlockNativeWorkspace,
  verifyNativePeer,
  attachNativeFileToConversation,
} from './nativeVault';
import {
  clearBrowserVault,
  deleteBrowserVaultBlob,
  listBrowserVaultBlobs,
  readBrowserVaultBlob,
  storeBrowserVaultBlob,
} from './fileVault';
import { createDefaultNostrState } from './nostrDefaults';

const STORAGE_KEY = 'osa-midnight-oil.workspace';
const CHANGE_EVENT = 'osa-midnight-oil.workspace.change';
const PERSIST_DEBOUNCE_MS = 260;
const AUTO_SNAPSHOT_EXPORT_MODES = new Set(['off', 'quit', 'lock-quit']);
const DEFAULT_COMPARTMENTS = [
  { id: 'notes_vault', label: 'Vault Notes', sensitivity: 'standard' },
  { id: 'identity_vault', label: 'Identity Vault', sensitivity: 'sensitive' },
  { id: 'wallet_vault', label: 'Wallet Vault', sensitivity: 'high' },
  { id: 'calendar_refs_vault', label: 'Calendar & References', sensitivity: 'standard' },
  { id: 'operator_profiles_vault', label: 'Operator Profiles', sensitivity: 'sensitive' },
  { id: 'comms_vault', label: 'ROS Comms', sensitivity: 'sensitive' },
];

const createId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

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

const createSettings = () => ({
  codename: PRODUCT_NAME,
  operator: 'Guest Operator',
  theme: 'midnight_oil',
  wallpaper: 'midnight-oil-state-one',
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
  sessionDefenseEnabled: false,
  sessionDefenseBlurLock: false,
  sessionDefenseLastWindowAction: 'nuke',
  fileVaultDeleteMode: 'secure-delete',
  commsRequireVerifiedPeer: false,
  commsAllowClipboard: false,
  commsDefaultRelayMode: 'dead-drop',
  commsRetentionHours: 168,
  deadMansTriggerEnabled: false,
  betaInviteCode: '',
  betaWaitlistSource: 'waitlist',
  betaOnboardingCompletedAt: '',
  betaFirstVaultCreatedAt: '',
  betaLastOpenedAt: '',
  betaLastSnapshotExportAt: '',
  betaLastSnapshotImportAt: '',
  betaLastBackupValidationAt: '',
  betaLastSupportBundleAt: '',
  betaFeedbackDraft: '',
  betaFeedbackUpdatedAt: '',
  betaMetrics: {
    launchCount: 0,
    snapshotExportCount: 0,
    snapshotImportCount: 0,
    supportBundleCount: 0,
    feedbackDraftCount: 0,
  },
  snapshotAutoExportMode: 'off',
});

const createLanState = () => ({
  enabled: false,
  ports: {
    discovery: 45211,
    session: 45212,
    files: 45213,
  },
  identity: {
    hostname: '',
    codename: '',
    operator: '',
    localIp: '',
    status: 'online',
    role: 'peer',
  },
  peers: [],
  rememberedPeers: [],
  chat: [],
  sharedNotes: [],
  queue: [],
  transfers: [],
  session: {
    feedMode: 'lan-only',
    hostIp: '',
    hostName: '',
    joinedAt: '',
    warnings: [],
  },
  security: {
    bindScope: 'LAN only',
    openPorts: [],
    openPortCount: 0,
    warnings: [],
  },
  diagnostics: {
    lastScanAt: '',
    lastSyncAt: '',
  },
});

const createManagedArtifact = (artifact = {}) => ({
  id: artifact.id || createId('artifact'),
  kind: typeof artifact.kind === 'string' && artifact.kind.trim() ? artifact.kind : 'local-cache',
  label: typeof artifact.label === 'string' && artifact.label.trim() ? artifact.label : 'Local artifact',
  location: typeof artifact.location === 'string' ? artifact.location : 'workspace',
  createdAt: artifact.createdAt || now(),
});

const DEFAULT_RELAY_HOSTS = [
  {
    id: 'relay-localhost',
    routeId: 'relay-localhost',
    label: 'OSA Local Relay',
    relayUrl: 'ros://dead-drop/local',
    networkZone: 'LOCAL',
    priority: 1,
    requiresManualApproval: false,
    maxRetentionHours: 168,
    status: 'online',
  },
  {
    id: 'relay-tor',
    routeId: 'relay-tor',
    label: 'Noir Onion Relay',
    relayUrl: 'tor://citadel-noir/dead-drop',
    networkZone: 'TOR',
    priority: 2,
    requiresManualApproval: true,
    maxRetentionHours: 72,
    status: 'standby',
  },
  {
    id: 'relay-i2p',
    routeId: 'relay-i2p',
    label: 'Mesh Veil Relay',
    relayUrl: 'i2p://mesh-veil/dead-drop',
    networkZone: 'I2P',
    priority: 3,
    requiresManualApproval: true,
    maxRetentionHours: 96,
    status: 'standby',
  },
];

const DEFAULT_DIRECTORY_PEERS = [
  {
    id: 'peer-directory-1',
    peerId: 'peer-directory-1',
    displayName: 'Aven Soryn',
    knownKeyIds: ['CYD-7F31C0D2A891'],
    knownFingerprints: ['c2b148a34d0f7a2e57c39d1fd7c0c1835b1870d27ed65f59d2d0f6619a9f0e71'],
    signingPublicKey: '',
    encryptionPublicKey: 'ERERERERERERERERERERERERERERERERERERERERERE=',
    relayHints: ['ros://dead-drop/local'],
    directHints: [],
    networkZones: { clearnet: false, tor: true, freenet: false, i2p: false },
    verificationState: 'unknown',
    trustNotes: 'Directory auto-populated from local relay roster.',
    lastSeenAt: now(),
    rotationHistory: [],
  },
  {
    id: 'peer-directory-2',
    peerId: 'peer-directory-2',
    displayName: 'Kael Meriden',
    knownKeyIds: ['CYD-1D42BFF08C61'],
    knownFingerprints: ['a3904f2d6786cfb25a3c6435db4e87666e6d5d62268b7b6dc839cf1b54a80f22'],
    signingPublicKey: '',
    encryptionPublicKey: 'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiI=',
    relayHints: ['tor://citadel-noir/dead-drop'],
    directHints: [],
    networkZones: { clearnet: false, tor: true, freenet: false, i2p: true },
    verificationState: 'known-unverified',
    trustNotes: 'Known terminal. Awaiting fingerprint comparison.',
    lastSeenAt: now(),
    rotationHistory: [],
  },
  {
    id: 'peer-directory-3',
    peerId: 'peer-directory-3',
    displayName: 'Neris Vale',
    knownKeyIds: ['CYD-B4A71D9E30CF'],
    knownFingerprints: ['49b82ea5ccaeae118b8a751b5dc59b4d6670515a6b8dc8c2486d2db2d8bfa0c1'],
    signingPublicKey: '',
    encryptionPublicKey: 'MzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzMzM=',
    relayHints: ['i2p://mesh-veil/dead-drop'],
    directHints: [],
    networkZones: { clearnet: false, tor: false, freenet: false, i2p: true },
    verificationState: 'warning',
    trustNotes: 'Stale key reported by relay roster.',
    lastSeenAt: now(),
    rotationHistory: [],
  },
];

const createCommsState = () => ({
  identities: [],
  peers: DEFAULT_DIRECTORY_PEERS,
  conversations: [],
  messages: [],
  drafts: [],
  outbox: [],
  deadDrops: [],
  receipts: [],
  trustRecords: [],
  attachmentRefs: [],
  sessionAccessLog: [],
  relays: DEFAULT_RELAY_HOSTS,
});

const buildDefaultNostrState = () => createDefaultNostrState({ createId, now });

const normalizeLanPeer = (peer = {}) => ({
  id: peer.id || createId('lan-peer'),
  hostname: typeof peer.hostname === 'string' ? peer.hostname : '',
  codename: typeof peer.codename === 'string' ? peer.codename : '',
  operator: typeof peer.operator === 'string' ? peer.operator : '',
  ip: typeof peer.ip === 'string' ? peer.ip : '',
  status:
    typeof peer.status === 'string' && ['online', 'busy', 'away', 'offline'].includes(peer.status)
      ? peer.status
      : 'online',
  role:
    typeof peer.role === 'string' && ['host', 'client', 'peer'].includes(peer.role)
      ? peer.role
      : 'peer',
  lastSeenAt: typeof peer.lastSeenAt === 'string' ? peer.lastSeenAt : '',
  pinned: Boolean(peer.pinned),
});

const normalizeLanMessage = (message = {}) => ({
  id: message.id || createId('lan-msg'),
  senderHost: typeof message.senderHost === 'string' ? message.senderHost : '',
  senderIp: typeof message.senderIp === 'string' ? message.senderIp : '',
  content: typeof message.content === 'string' ? message.content : '',
  createdAt: typeof message.createdAt === 'string' ? message.createdAt : now(),
});

const normalizeLanSharedNote = (entry = {}) => ({
  id: entry.id || createId('lan-note'),
  noteId: typeof entry.noteId === 'string' ? entry.noteId : '',
  title: typeof entry.title === 'string' ? entry.title : 'Shared note',
  excerpt: typeof entry.excerpt === 'string' ? entry.excerpt : '',
  senderHost: typeof entry.senderHost === 'string' ? entry.senderHost : '',
  createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now(),
});

const normalizeLanQueueItem = (item = {}) => ({
  id: item.id || createId('lan-queue'),
  label: typeof item.label === 'string' ? item.label : '',
  owner: typeof item.owner === 'string' ? item.owner : '',
  state:
    typeof item.state === 'string' && ['open', 'working', 'callback', 'blocked', 'done'].includes(item.state)
      ? item.state
      : 'open',
  note: typeof item.note === 'string' ? item.note : '',
  updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : now(),
});

const normalizeLanTransfer = (transfer = {}) => ({
  id: transfer.id || createId('lan-transfer'),
  direction: transfer.direction === 'incoming' ? 'incoming' : 'outgoing',
  fileName: typeof transfer.fileName === 'string' ? transfer.fileName : '',
  senderHost: typeof transfer.senderHost === 'string' ? transfer.senderHost : '',
  targetHost: typeof transfer.targetHost === 'string' ? transfer.targetHost : '',
  bytes: Number.isFinite(transfer.bytes) ? transfer.bytes : 0,
  status:
    typeof transfer.status === 'string' && ['queued', 'received', 'sent', 'error'].includes(transfer.status)
      ? transfer.status
      : 'queued',
  savedPath: typeof transfer.savedPath === 'string' ? transfer.savedPath : '',
  detail: typeof transfer.detail === 'string' ? transfer.detail : '',
  createdAt: typeof transfer.createdAt === 'string' ? transfer.createdAt : now(),
});

const normalizeLanState = (lan) => {
  const defaults = createLanState();
  const next = lan && typeof lan === 'object' ? lan : {};

  return {
    enabled: Boolean(next.enabled),
    ports: {
      discovery: Number.isFinite(next.ports?.discovery) ? next.ports.discovery : defaults.ports.discovery,
      session: Number.isFinite(next.ports?.session) ? next.ports.session : defaults.ports.session,
      files: Number.isFinite(next.ports?.files) ? next.ports.files : defaults.ports.files,
    },
    identity: {
      hostname: typeof next.identity?.hostname === 'string' ? next.identity.hostname : '',
      codename: typeof next.identity?.codename === 'string' ? next.identity.codename : '',
      operator: typeof next.identity?.operator === 'string' ? next.identity.operator : '',
      localIp: typeof next.identity?.localIp === 'string' ? next.identity.localIp : '',
      status:
        typeof next.identity?.status === 'string' &&
        ['online', 'busy', 'away', 'offline'].includes(next.identity.status)
          ? next.identity.status
          : defaults.identity.status,
      role:
        typeof next.identity?.role === 'string' && ['host', 'client', 'peer'].includes(next.identity.role)
          ? next.identity.role
          : defaults.identity.role,
    },
    peers: Array.isArray(next.peers) ? next.peers.map(normalizeLanPeer) : [],
    rememberedPeers: Array.isArray(next.rememberedPeers) ? next.rememberedPeers.map(normalizeLanPeer) : [],
    chat: Array.isArray(next.chat) ? next.chat.map(normalizeLanMessage) : [],
    sharedNotes: Array.isArray(next.sharedNotes) ? next.sharedNotes.map(normalizeLanSharedNote) : [],
    queue: Array.isArray(next.queue) ? next.queue.map(normalizeLanQueueItem) : [],
    transfers: Array.isArray(next.transfers) ? next.transfers.map(normalizeLanTransfer) : [],
    session: {
      feedMode: typeof next.session?.feedMode === 'string' ? next.session.feedMode : defaults.session.feedMode,
      hostIp: typeof next.session?.hostIp === 'string' ? next.session.hostIp : '',
      hostName: typeof next.session?.hostName === 'string' ? next.session.hostName : '',
      joinedAt: typeof next.session?.joinedAt === 'string' ? next.session.joinedAt : '',
      warnings: Array.isArray(next.session?.warnings) ? next.session.warnings.map((entry) => String(entry)) : [],
    },
    security: {
      bindScope: typeof next.security?.bindScope === 'string' ? next.security.bindScope : defaults.security.bindScope,
      openPorts: Array.isArray(next.security?.openPorts)
        ? next.security.openPorts.map((entry) => String(entry))
        : [],
      openPortCount: Number.isFinite(next.security?.openPortCount) ? next.security.openPortCount : 0,
      warnings: Array.isArray(next.security?.warnings) ? next.security.warnings.map((entry) => String(entry)) : [],
    },
    diagnostics: {
      lastScanAt: typeof next.diagnostics?.lastScanAt === 'string' ? next.diagnostics.lastScanAt : '',
      lastSyncAt: typeof next.diagnostics?.lastSyncAt === 'string' ? next.diagnostics.lastSyncAt : '',
    },
  };
};

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return globalThis.btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = globalThis.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

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
  library: [],
  researchVault: [
    normalizeResearchStudy({
      title: 'Loss Aversion Under Time Pressure',
      authors: ['J. Mercer', 'L. Kade'],
      year: '2024',
      journal: 'Journal of Experimental Decision Science',
      field: 'Behavioral Economics',
      subfield: 'Decision-Making',
      keywords: ['loss aversion', 'framing', 'time pressure'],
      researchType: 'Experimental',
      designType: 'Between Subjects',
      coreHypothesis: 'Time pressure amplifies loss-framed decision asymmetry.',
      researchQuestions: ['Does time pressure increase loss aversion in binary choice tasks?'],
      variables: {
        independent: ['Time pressure condition', 'Frame condition'],
        dependent: ['Choice preference', 'Decision latency'],
      },
      sample: {
        size: 312,
        populationType: 'General public',
        samplingMethod: 'Stratified online panel',
        geography: 'United States',
      },
      measurement: {
        type: 'Quantitative',
        statisticalTests: ['ANOVA', 'Logistic regression'],
        effectSize: '0.41',
        significanceLevel: 'p < .05',
      },
      results: {
        hypothesisOutcome: 'Supported',
        keyFindings: 'Loss-framed choices became more conservative under time pressure.',
      },
      discussion: {
        limitations: 'Online panel and short intervention window limit ecological validity.',
      },
      quality: {
        internalValidity: 82,
        externalValidity: 66,
        constructValidity: 79,
        statisticalValidity: 84,
      },
      cognitiveOverlay: {
        biasTags: ['Loss Aversion', 'Framing Effect'],
        susceptibilityScore: 0.72,
        domainRelevance: ['Behavioral Econ', 'Persuasion'],
        exploitability: 'High in constrained decision funnels.',
        defensibility: 'Counter with neutral framing and forced slow review.',
      },
      replication: {
        status: 'unknown',
        preregistered: true,
        openDataAvailable: true,
      },
      insight: {
        coreInsight: 'Time pressure appears to strengthen conservative responses to perceived downside.',
        soWhat: 'Useful when modeling how urgency can distort defensive decisions.',
      },
    }),
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
  managedArtifacts: [],
  comms: createCommsState(),
  nostr: buildDefaultNostrState(),
  lan: createLanState(),
});

const buildEmptyWorkspace = () => ({
  version: 3,
  notes: [],
  bookmarks: [],
  inventory: [],
  flowBoards: [],
  calendarEvents: [],
  library: [],
  researchVault: [],
  profiles: [],
  wallets: [],
  clocks: [],
  settings: createSettings(),
  managedArtifacts: [],
  comms: createCommsState(),
  nostr: buildDefaultNostrState(),
  lan: createLanState(),
});

const cloneWorkspace = (workspace) => JSON.parse(JSON.stringify(workspace));

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

const normalizeNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  mySudoExport: typeof profile.mySudoExport === 'string' ? profile.mySudoExport : '',
  pgpPublicBundle: typeof profile.pgpPublicBundle === 'string' ? profile.pgpPublicBundle : '',
  pgpPrivateBundle: typeof profile.pgpPrivateBundle === 'string' ? profile.pgpPrivateBundle : '',
  voipProfiles: Array.isArray(profile.voipProfiles)
    ? profile.voipProfiles
        .map((entry) => ({
          id: typeof entry?.id === 'string' && entry.id.trim() ? entry.id : createId('voip'),
          label: typeof entry?.label === 'string' ? entry.label : '',
          provider: typeof entry?.provider === 'string' && entry.provider.trim() ? entry.provider : 'MySudo',
          number: typeof entry?.number === 'string' ? entry.number : '',
          notes: typeof entry?.notes === 'string' ? entry.notes : '',
          useCount: Number.isFinite(entry?.useCount) ? entry.useCount : 0,
          updatedAt: entry?.updatedAt || now(),
        }))
        .filter((entry) => entry.label.trim() || entry.number.trim())
    : [],
  phoneBook: Array.isArray(profile.phoneBook)
    ? profile.phoneBook
        .map((entry) => ({
          id: typeof entry?.id === 'string' && entry.id.trim() ? entry.id : createId('call'),
          contactName: typeof entry?.contactName === 'string' ? entry.contactName : '',
          contactNumber: typeof entry?.contactNumber === 'string' ? entry.contactNumber : '',
          viaProfileId: typeof entry?.viaProfileId === 'string' ? entry.viaProfileId : '',
          viaLabel: typeof entry?.viaLabel === 'string' ? entry.viaLabel : '',
          viaNumber: typeof entry?.viaNumber === 'string' ? entry.viaNumber : '',
          disposition:
            typeof entry?.disposition === 'string' && entry.disposition.trim()
              ? entry.disposition
              : 'active',
          callbackAt: typeof entry?.callbackAt === 'string' ? entry.callbackAt : '',
          notes: typeof entry?.notes === 'string' ? entry.notes : '',
          useCount: Number.isFinite(entry?.useCount) ? entry.useCount : 0,
          lastCalledAt: entry?.lastCalledAt || '',
          updatedAt: entry?.updatedAt || now(),
        }))
        .filter((entry) => entry.contactName.trim() || entry.contactNumber.trim())
    : [],
  networkZones: normalizeNetworkZones(profile.networkZones ?? profile.zones),
  notes: typeof profile.notes === 'string' ? profile.notes : '',
  updatedAt: profile.updatedAt || now(),
});

const REFERENCE_NOTE_TEMPLATES = [
  {
    title: 'International Calling Codes Reference',
    category: 'reference',
    tags: ['reference', 'telephony', 'calling-codes'],
    pinned: false,
    body: `# International Calling Codes Reference

## NANP / +1
- United States / Canada / Caribbean NANP regions: +1

## Europe
- United Kingdom: +44
- Ireland: +353
- France: +33
- Germany: +49
- Netherlands: +31
- Spain: +34
- Italy: +39
- Portugal: +351
- Switzerland: +41
- Sweden: +46

## Americas
- Mexico: +52
- Brazil: +55
- Argentina: +54
- Colombia: +57
- Chile: +56

## Middle East / Africa
- Israel: +972
- United Arab Emirates: +971
- Saudi Arabia: +966
- South Africa: +27
- Egypt: +20
- Nigeria: +234

## Asia / Pacific
- India: +91
- Pakistan: +92
- Singapore: +65
- Japan: +81
- South Korea: +82
- China: +86
- Hong Kong: +852
- Taiwan: +886
- Australia: +61
- New Zealand: +64

## Notes
- International dialing usually starts with \`+\` followed by the country code.
- NANP territories all share \`+1\`, then separate area codes identify the destination.
- Keep carrier and VoIP-specific routing notes in the matching profile or phone-book record.`,
  },
];

const ensureReferenceNotes = (notes = []) => {
  const normalizedNotes = notes.map(normalizeNote);
  const existingTitles = new Set(normalizedNotes.map((note) => note.title.trim().toLowerCase()));
  const missingReferenceNotes = REFERENCE_NOTE_TEMPLATES.filter(
    (note) => !existingTitles.has(note.title.trim().toLowerCase()),
  ).map(normalizeNote);

  return [...missingReferenceNotes, ...normalizedNotes];
};

const normalizeLibraryItem = (item = {}) => ({
  id: item.id || createId('library'),
  title: typeof item.title === 'string' && item.title.trim() ? item.title : 'Untitled document',
  format: typeof item.format === 'string' && item.format.trim() ? item.format : 'pdf',
  fileName: typeof item.fileName === 'string' ? item.fileName : '',
  source: typeof item.source === 'string' && item.source.trim() ? item.source : 'import',
  authors: normalizeStringList(item.authors),
  tags: normalizeStringList(item.tags),
  identifiers: normalizeStringList(item.identifiers),
  publisher: typeof item.publisher === 'string' ? item.publisher : '',
  series: typeof item.series === 'string' ? item.series : '',
  seriesIndex: typeof item.seriesIndex === 'string' ? item.seriesIndex : '',
  language: typeof item.language === 'string' ? item.language : '',
  availableFormats: normalizeStringList(item.availableFormats),
  sourcePath: typeof item.sourcePath === 'string' ? item.sourcePath : '',
  publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : '',
  description: typeof item.description === 'string' ? item.description : '',
  coverDataUrl: typeof item.coverDataUrl === 'string' ? item.coverDataUrl : '',
  fileVaultId: typeof item.fileVaultId === 'string' ? item.fileVaultId : '',
  vaultMimeType: typeof item.vaultMimeType === 'string' ? item.vaultMimeType : '',
  readerKind: typeof item.readerKind === 'string' ? item.readerKind : '',
  fileDataUrl: typeof item.fileDataUrl === 'string' ? item.fileDataUrl : '',
  sections: Array.isArray(item.sections)
    ? item.sections
        .map((section, index) => ({
          id:
            typeof section?.id === 'string' && section.id.trim()
              ? section.id
              : createId(`section-${index + 1}`),
          title:
            typeof section?.title === 'string' && section.title.trim()
              ? section.title
              : `Section ${index + 1}`,
          html: typeof section?.html === 'string' ? section.html : '',
        }))
        .filter((section) => section.html.trim())
    : [],
  annotations: Array.isArray(item.annotations)
    ? item.annotations
        .map((annotation, index) => ({
          id:
            typeof annotation?.id === 'string' && annotation.id.trim()
              ? annotation.id
              : createId(`annotation-${index + 1}`),
          quote: typeof annotation?.quote === 'string' ? annotation.quote : '',
          note: typeof annotation?.note === 'string' ? annotation.note : '',
          location: typeof annotation?.location === 'string' ? annotation.location : '',
          createdAt: annotation?.createdAt || now(),
        }))
        .filter((annotation) => annotation.quote.trim() || annotation.note.trim())
    : [],
  readingProgress: typeof item.readingProgress === 'string' ? item.readingProgress : '',
  importedAt: item.importedAt || now(),
  updatedAt: item.updatedAt || now(),
});

function normalizeResearchStudy(study = {}) {
  const normalizeScore = (value) => {
    const parsed = normalizeNumberOrNull(value);
    if (parsed === null) {
      return null;
    }

    return parsed > 1 ? Math.min(1, parsed / 100) : parsed;
  };

  const normalizeAuthorObjects = (value) => {
    if (Array.isArray(value)) {
      return value
        .map((author) => {
          if (author && typeof author === 'object') {
            return {
              name: typeof author.name === 'string' ? author.name : '',
              affiliation: typeof author.affiliation === 'string' ? author.affiliation : '',
            };
          }

          return {
            name: String(author || '').trim(),
            affiliation: '',
          };
        })
        .filter((author) => author.name);
    }

    return normalizeStringList(value).map((name) => ({ name, affiliation: '' }));
  };

  const meta = study.meta && typeof study.meta === 'object' ? study.meta : {};
  const abstractThesis = study.abstractThesis && typeof study.abstractThesis === 'object' ? study.abstractThesis : {};
  const variables = study.variables && typeof study.variables === 'object' ? study.variables : {};
  const design = study.design && typeof study.design === 'object' ? study.design : {};
  const sample = study.sample && typeof study.sample === 'object' ? study.sample : {};
  const measurement = study.measurement && typeof study.measurement === 'object' ? study.measurement : {};
  const results = study.results && typeof study.results === 'object' ? study.results : {};
  const discussion = study.discussion && typeof study.discussion === 'object' ? study.discussion : {};
  const citations = study.citations && typeof study.citations === 'object' ? study.citations : {};
  const quality = study.quality && typeof study.quality === 'object' ? study.quality : {};
  const cognitiveOverlay =
    study.cognitiveOverlay && typeof study.cognitiveOverlay === 'object' ? study.cognitiveOverlay : {};
  const replication = study.replication && typeof study.replication === 'object' ? study.replication : {};
  const insight = study.insight && typeof study.insight === 'object' ? study.insight : {};
  const links = study.links && typeof study.links === 'object' ? study.links : {};

  return {
    id: study.id || createId('study'),
    meta: {
      title:
        typeof meta.title === 'string' && meta.title.trim()
          ? meta.title
          : typeof study.title === 'string' && study.title.trim()
            ? study.title
            : 'Untitled study',
      subtitle: typeof meta.subtitle === 'string' ? meta.subtitle : typeof study.subtitle === 'string' ? study.subtitle : '',
      authors: normalizeAuthorObjects(meta.authors ?? study.authors),
      affiliations: normalizeStringList(meta.affiliations ?? study.affiliations),
      correspondingAuthor:
        typeof meta.correspondingAuthor === 'string'
          ? meta.correspondingAuthor
          : typeof study.correspondingAuthor === 'string'
            ? study.correspondingAuthor
            : '',
      year: normalizeNumberOrNull(meta.year ?? study.year),
      journal: typeof meta.journal === 'string' ? meta.journal : typeof study.journal === 'string' ? study.journal : '',
      conference:
        typeof meta.conference === 'string' ? meta.conference : typeof study.conference === 'string' ? study.conference : '',
      doi: typeof meta.doi === 'string' ? meta.doi : typeof study.doi === 'string' ? study.doi : '',
      url: typeof meta.url === 'string' ? meta.url : typeof study.url === 'string' ? study.url : '',
      volume:
        typeof meta.volume === 'string' ? meta.volume : typeof study.volume === 'string' ? study.volume : '',
      issue: typeof meta.issue === 'string' ? meta.issue : typeof study.issue === 'string' ? study.issue : '',
      pages: typeof meta.pages === 'string' ? meta.pages : typeof study.pages === 'string' ? study.pages : '',
      field: typeof meta.field === 'string' ? meta.field : typeof study.field === 'string' ? study.field : '',
      subfield:
        typeof meta.subfield === 'string' ? meta.subfield : typeof study.subfield === 'string' ? study.subfield : '',
      keywords: normalizeStringList(meta.keywords ?? study.keywords),
      researchType:
        typeof meta.researchType === 'string'
          ? meta.researchType
          : typeof study.researchType === 'string'
            ? study.researchType
            : '',
      studyDesignType:
        typeof meta.studyDesignType === 'string'
          ? meta.studyDesignType
          : typeof study.designType === 'string'
            ? study.designType
            : '',
    },
    abstractThesis: {
      abstractRaw:
        typeof abstractThesis.abstractRaw === 'string'
          ? abstractThesis.abstractRaw
          : typeof study.abstractRaw === 'string'
            ? study.abstractRaw
            : '',
      abstractRewritten:
        typeof abstractThesis.abstractRewritten === 'string'
          ? abstractThesis.abstractRewritten
          : typeof study.abstractRewritten === 'string'
            ? study.abstractRewritten
            : '',
      coreHypothesis:
        typeof abstractThesis.coreHypothesis === 'string'
          ? abstractThesis.coreHypothesis
          : typeof study.coreHypothesis === 'string'
            ? study.coreHypothesis
            : '',
      researchQuestions: normalizeStringList(abstractThesis.researchQuestions ?? study.researchQuestions),
      theoreticalFramework:
        typeof abstractThesis.theoreticalFramework === 'string'
          ? abstractThesis.theoreticalFramework
          : typeof study.theoreticalFramework === 'string'
            ? study.theoreticalFramework
            : '',
      nullHypothesis:
        typeof abstractThesis.nullHypothesis === 'string'
          ? abstractThesis.nullHypothesis
          : typeof study.nullHypothesis === 'string'
            ? study.nullHypothesis
            : '',
      alternativeHypothesis:
        typeof abstractThesis.alternativeHypothesis === 'string'
          ? abstractThesis.alternativeHypothesis
          : typeof study.alternativeHypothesis === 'string'
            ? study.alternativeHypothesis
            : '',
    },
    variables: {
      independent: normalizeStringList(variables.independent),
      dependent: normalizeStringList(variables.dependent),
      controls: normalizeStringList(variables.controls ?? variables.control),
      confounds: normalizeStringList(variables.confounds ?? variables.confounding),
      moderators: normalizeStringList(variables.moderators ?? variables.moderator),
      mediators: normalizeStringList(variables.mediators ?? variables.mediator),
    },
    design: {
      designType:
        typeof design.designType === 'string'
          ? design.designType
          : typeof design.experimentalDesignType === 'string'
            ? design.experimentalDesignType
            : typeof study.designType === 'string'
              ? study.designType
              : '',
      randomizationMethod: typeof design.randomizationMethod === 'string' ? design.randomizationMethod : '',
      blinding: typeof design.blinding === 'string' ? design.blinding : '',
      controlGroupType: typeof design.controlGroupType === 'string' ? design.controlGroupType : '',
      procedure: typeof design.procedure === 'string' ? design.procedure : '',
      stimuli: normalizeStringList(design.stimuli),
      instruments: normalizeStringList(design.instruments),
      durationPerTrial: typeof design.durationPerTrial === 'string' ? design.durationPerTrial : '',
      durationTotal:
        typeof design.durationTotal === 'string' ? design.durationTotal : typeof design.duration === 'string' ? design.duration : '',
    },
    sample: {
      size: normalizeNumberOrNull(sample.size),
      populationType: typeof sample.populationType === 'string' ? sample.populationType : '',
      ageRange:
        typeof sample.ageRange === 'string'
          ? sample.ageRange
          : typeof sample.demographics?.age === 'string'
            ? sample.demographics.age
            : '',
      genderBreakdown:
        typeof sample.genderBreakdown === 'string'
          ? sample.genderBreakdown
          : typeof sample.demographics?.gender === 'string'
            ? sample.demographics.gender
            : '',
      ethnicity:
        typeof sample.ethnicity === 'string'
          ? sample.ethnicity
          : typeof sample.demographics?.ethnicity === 'string'
            ? sample.demographics.ethnicity
            : '',
      socioeconomicStatus:
        typeof sample.socioeconomicStatus === 'string'
          ? sample.socioeconomicStatus
          : typeof sample.demographics?.socioeconomicStatus === 'string'
            ? sample.demographics.socioeconomicStatus
            : '',
      inclusionCriteria: normalizeStringList(sample.inclusionCriteria),
      exclusionCriteria: normalizeStringList(sample.exclusionCriteria),
      samplingMethod: typeof sample.samplingMethod === 'string' ? sample.samplingMethod : '',
      geography: typeof sample.geography === 'string' ? sample.geography : '',
    },
    measurement: {
      measurementType:
        typeof measurement.measurementType === 'string'
          ? measurement.measurementType
          : typeof measurement.type === 'string'
            ? measurement.type
            : '',
      scales: normalizeStringList(measurement.scales),
      operationalDefinitions: normalizeStringList(measurement.operationalDefinitions),
      collectionMethod: typeof measurement.collectionMethod === 'string' ? measurement.collectionMethod : '',
      statisticalTests: normalizeStringList(measurement.statisticalTests),
      significanceThreshold:
        typeof measurement.significanceThreshold === 'string'
          ? measurement.significanceThreshold
          : typeof measurement.significanceLevel === 'string'
            ? measurement.significanceLevel
            : '',
      effectSizes: normalizeStringList(measurement.effectSizes ?? measurement.effectSize),
      confidenceIntervals: normalizeStringList(measurement.confidenceIntervals),
      powerAnalysis: typeof measurement.powerAnalysis === 'string' ? measurement.powerAnalysis : '',
    },
    results: {
      findings: normalizeStringList(results.findings ?? results.keyFindings),
      statisticalOutcomes: normalizeStringList(results.statisticalOutcomes),
      graphTableSummary: typeof results.graphTableSummary === 'string' ? results.graphTableSummary : '',
      hypothesisOutcome: typeof results.hypothesisOutcome === 'string' ? results.hypothesisOutcome : 'Unknown',
      unexpectedFindings: normalizeStringList(results.unexpectedFindings),
    },
    discussion: {
      interpretation:
        typeof discussion.interpretation === 'string'
          ? discussion.interpretation
          : typeof discussion.authorsInterpretation === 'string'
            ? discussion.authorsInterpretation
            : '',
      theoreticalImplications: typeof discussion.theoreticalImplications === 'string' ? discussion.theoreticalImplications : '',
      practicalImplications: typeof discussion.practicalImplications === 'string' ? discussion.practicalImplications : '',
      limitations: normalizeStringList(discussion.limitations),
      futureResearch: normalizeStringList(discussion.futureResearch),
    },
    citations: {
      references: normalizeStringList(citations.references),
      keyCitations: normalizeStringList(citations.keyCitations),
      citationCount: normalizeNumberOrNull(citations.citationCount),
      relatedStudyIds: normalizeStringList(citations.relatedStudyIds),
    },
    quality: {
      internalValidity: normalizeScore(quality.internalValidity),
      externalValidity: normalizeScore(quality.externalValidity),
      constructValidity: normalizeScore(quality.constructValidity),
      statisticalValidity: normalizeScore(quality.statisticalValidity),
      controlStrength: typeof quality.controlStrength === 'string' ? quality.controlStrength : '',
      confoundRisk: typeof quality.confoundRisk === 'string' ? quality.confoundRisk : '',
      biasRisk: typeof quality.biasRisk === 'string' ? quality.biasRisk : '',
      generalizability: typeof quality.generalizability === 'string' ? quality.generalizability : '',
      populationMismatch: typeof quality.populationMismatch === 'string' ? quality.populationMismatch : '',
      measurementAccuracy: typeof quality.measurementAccuracy === 'string' ? quality.measurementAccuracy : '',
      properTestUsage: typeof quality.properTestUsage === 'string' ? quality.properTestUsage : '',
      powerSufficiency: typeof quality.powerSufficiency === 'string' ? quality.powerSufficiency : '',
    },
    cognitiveOverlay: {
      biasTags: normalizeStringList(cognitiveOverlay.biasTags),
      susceptibilityScore: normalizeNumberOrNull(cognitiveOverlay.susceptibilityScore),
      biasCategory: typeof cognitiveOverlay.biasCategory === 'string' ? cognitiveOverlay.biasCategory : '',
      psychologicalTrigger:
        typeof cognitiveOverlay.psychologicalTrigger === 'string'
          ? cognitiveOverlay.psychologicalTrigger
          : normalizeStringList(cognitiveOverlay.psychologicalTriggers).join(', '),
      riskMultiplier: typeof cognitiveOverlay.riskMultiplier === 'string' ? cognitiveOverlay.riskMultiplier : '',
      cmuBetaIds: normalizeStringList(cognitiveOverlay.cmuBetaIds),
      persuasionCoefficient: typeof cognitiveOverlay.persuasionCoefficient === 'string' ? cognitiveOverlay.persuasionCoefficient : '',
      nimScore: typeof cognitiveOverlay.nimScore === 'string' ? cognitiveOverlay.nimScore : '',
    },
    replication: {
      status: typeof replication.status === 'string' ? replication.status : 'Unknown',
      sampleSizeAdequacy:
        typeof replication.sampleSizeAdequacy === 'string'
          ? replication.sampleSizeAdequacy
          : typeof replication.sampleAdequacy === 'string'
            ? replication.sampleAdequacy
            : '',
      pHackingRisk: typeof replication.pHackingRisk === 'string' ? replication.pHackingRisk : '',
      publicationBiasRisk: typeof replication.publicationBiasRisk === 'string' ? replication.publicationBiasRisk : '',
      openDataAvailable: Boolean(replication.openDataAvailable),
      preregistered: Boolean(replication.preregistered),
    },
    insight: {
      coreInsight: typeof insight.coreInsight === 'string' ? insight.coreInsight : '',
      soWhat: typeof insight.soWhat === 'string' ? insight.soWhat : '',
      domainRelevance:
        normalizeStringList(insight.domainRelevance ?? cognitiveOverlay.domainRelevance),
      exploitability:
        typeof insight.exploitability === 'string'
          ? insight.exploitability
          : typeof cognitiveOverlay.exploitability === 'string'
            ? cognitiveOverlay.exploitability
            : '',
      defensibility:
        typeof insight.defensibility === 'string'
          ? insight.defensibility
          : typeof cognitiveOverlay.defensibility === 'string'
            ? cognitiveOverlay.defensibility
            : '',
    },
    links: {
      confirmsStudyIds: normalizeStringList(links.confirmsStudyIds),
      contradictsStudyIds: normalizeStringList(links.contradictsStudyIds),
      extendsTheoryIds: normalizeStringList(links.extendsTheoryIds),
      usesMethodIds: normalizeStringList(links.usesMethodIds),
      sameDatasetStudyIds: normalizeStringList(links.sameDatasetStudyIds),
    },
    linkedLibraryIds: normalizeStringList(study.linkedLibraryIds),
    createdAt: study.createdAt || now(),
    updatedAt: study.updatedAt || now(),
  };
}

const DEFAULT_WORKSPACE = createSeededWorkspace();
const EMPTY_WORKSPACE = buildEmptyWorkspace();
const DEFAULT_BOOT = {
  codename: DEFAULT_WORKSPACE.settings.codename,
  operator: DEFAULT_WORKSPACE.settings.operator,
  theme: DEFAULT_WORKSPACE.settings.theme,
  wallpaper: DEFAULT_WORKSPACE.settings.wallpaper,
};

const normalizeCypherId = (value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^(kid|cyd)-/i.test(trimmed)) {
    return `CYD-${trimmed.slice(4).toUpperCase()}`;
  }
  return trimmed;
};

const normalizeCommsIdentity = (identity = {}) => ({
  id: identity.id || identity.identityId || createId('identity'),
  identityId: identity.identityId || identity.id || createId('identity'),
  profileId: typeof identity.profileId === 'string' ? identity.profileId : '',
  displayName:
    typeof identity.displayName === 'string' && identity.displayName.trim()
      ? identity.displayName
      : 'Untitled identity',
  keyId: normalizeCypherId(identity.keyId),
  signingPublicKey: typeof identity.signingPublicKey === 'string' ? identity.signingPublicKey : '',
  signingSecretRef: typeof identity.signingSecretRef === 'string' ? identity.signingSecretRef : '',
  encryptionPublicKey: typeof identity.encryptionPublicKey === 'string' ? identity.encryptionPublicKey : '',
  encryptionSecretRef: typeof identity.encryptionSecretRef === 'string' ? identity.encryptionSecretRef : '',
  fingerprint: typeof identity.fingerprint === 'string' ? identity.fingerprint : '',
  relayHints: normalizeStringList(identity.relayHints),
  directHints: normalizeStringList(identity.directHints),
  networkPolicy: identity.networkPolicy && typeof identity.networkPolicy === 'object' ? identity.networkPolicy : {},
  trustPolicy: identity.trustPolicy && typeof identity.trustPolicy === 'object' ? identity.trustPolicy : {},
  rotationState: typeof identity.rotationState === 'string' ? identity.rotationState : 'active',
  createdAt: identity.createdAt || now(),
  rotatedAt: identity.rotatedAt || null,
  revokedAt: identity.revokedAt || null,
});

const normalizePeerRecord = (peer = {}) => ({
  id: peer.id || peer.peerId || createId('peer'),
  peerId: peer.peerId || peer.id || createId('peer'),
  displayName:
    typeof peer.displayName === 'string' && peer.displayName.trim() ? peer.displayName : 'Unknown peer',
  knownKeyIds: normalizeStringList(peer.knownKeyIds).map(normalizeCypherId).filter(Boolean),
  knownFingerprints: normalizeStringList(peer.knownFingerprints),
  signingPublicKey: typeof peer.signingPublicKey === 'string' ? peer.signingPublicKey : '',
  encryptionPublicKey: typeof peer.encryptionPublicKey === 'string' ? peer.encryptionPublicKey : '',
  relayHints: normalizeStringList(peer.relayHints),
  directHints: normalizeStringList(peer.directHints),
  networkZones: peer.networkZones && typeof peer.networkZones === 'object' ? peer.networkZones : {},
  verificationState:
    typeof peer.verificationState === 'string' ? peer.verificationState : 'known-unverified',
  trustNotes: typeof peer.trustNotes === 'string' ? peer.trustNotes : '',
  lastSeenAt: peer.lastSeenAt || now(),
  rotationHistory: Array.isArray(peer.rotationHistory) ? peer.rotationHistory : [],
});

const normalizeConversation = (conversation = {}) => ({
  id: conversation.id || conversation.conversationId || createId('conversation'),
  conversationId: conversation.conversationId || conversation.id || createId('conversation'),
  title:
    typeof conversation.title === 'string' && conversation.title.trim()
      ? conversation.title
      : 'Untitled conversation',
  localIdentityId: typeof conversation.localIdentityId === 'string' ? conversation.localIdentityId : '',
  localIdentityKeyId: normalizeCypherId(conversation.localIdentityKeyId),
  peerId: typeof conversation.peerId === 'string' ? conversation.peerId : '',
  peerKeyId: normalizeCypherId(conversation.peerKeyId),
  peerDisplayName: typeof conversation.peerDisplayName === 'string' ? conversation.peerDisplayName : '',
  deliveryMode: typeof conversation.deliveryMode === 'string' ? conversation.deliveryMode : 'dead-drop',
  status: typeof conversation.status === 'string' ? conversation.status : 'active',
  sequenceNumber: Number.isFinite(conversation.sequenceNumber) ? conversation.sequenceNumber : 0,
  tags: normalizeStringList(conversation.tags),
  createdAt: conversation.createdAt || now(),
  updatedAt: conversation.updatedAt || now(),
  lastMessageAt: conversation.lastMessageAt || null,
});

const normalizeMessageRecord = (message = {}) => ({
  id: message.id || createId('message'),
  conversationId: typeof message.conversationId === 'string' ? message.conversationId : '',
  conversationTitle: typeof message.conversationTitle === 'string' ? message.conversationTitle : '',
  direction: typeof message.direction === 'string' ? message.direction : 'outbound',
  senderKeyId: normalizeCypherId(message.senderKeyId),
  recipientKeyId: normalizeCypherId(message.recipientKeyId),
  preview: typeof message.preview === 'string' ? message.preview : '',
  attachmentCount: Number.isFinite(message.attachmentCount) ? message.attachmentCount : 0,
  status: typeof message.status === 'string' ? message.status : 'queued',
  createdAt: message.createdAt || now(),
  sequenceNumber: Number.isFinite(message.sequenceNumber) ? message.sequenceNumber : 0,
  envelopeId: typeof message.envelopeId === 'string' ? message.envelopeId : '',
});

const normalizeAttachmentRef = (attachment = {}) => ({
  id: attachment.id || attachment.attachmentId || createId('attachment'),
  attachmentId: attachment.attachmentId || attachment.id || createId('attachment'),
  fileVaultBlobId: typeof attachment.fileVaultBlobId === 'string' ? attachment.fileVaultBlobId : '',
  displayName: typeof attachment.displayName === 'string' ? attachment.displayName : 'Attachment',
  mediaType: typeof attachment.mediaType === 'string' ? attachment.mediaType : 'application/octet-stream',
  byteLength: Number.isFinite(attachment.byteLength) ? attachment.byteLength : 0,
  integrityHash: typeof attachment.integrityHash === 'string' ? attachment.integrityHash : '',
  deletePolicy: typeof attachment.deletePolicy === 'string' ? attachment.deletePolicy : 'secure-delete',
  sourceRecordType: typeof attachment.sourceRecordType === 'string' ? attachment.sourceRecordType : 'conversation',
  sourceRecordId: typeof attachment.sourceRecordId === 'string' ? attachment.sourceRecordId : '',
  createdAt: attachment.createdAt || now(),
});

const normalizeRelayHost = (relay = {}) => ({
  id: relay.id || relay.routeId || createId('relay'),
  routeId: relay.routeId || relay.id || createId('relay'),
  label: typeof relay.label === 'string' && relay.label.trim() ? relay.label : 'Relay host',
  relayUrl: typeof relay.relayUrl === 'string' ? relay.relayUrl : '',
  networkZone: typeof relay.networkZone === 'string' ? relay.networkZone : 'LOCAL',
  priority: Number.isFinite(relay.priority) ? relay.priority : 1,
  requiresManualApproval: Boolean(relay.requiresManualApproval),
  maxRetentionHours: Number.isFinite(relay.maxRetentionHours) ? relay.maxRetentionHours : 168,
  status: typeof relay.status === 'string' ? relay.status : 'standby',
});

const normalizeCommsState = (comms) => {
  const next = comms && typeof comms === 'object' ? comms : {};
  return {
    identities: Array.isArray(next.identities) ? next.identities.map(normalizeCommsIdentity) : [],
    peers: Array.isArray(next.peers) && next.peers.length
      ? next.peers.map(normalizePeerRecord)
      : DEFAULT_DIRECTORY_PEERS.map(normalizePeerRecord),
    conversations: Array.isArray(next.conversations) ? next.conversations.map(normalizeConversation) : [],
    messages: Array.isArray(next.messages) ? next.messages.map(normalizeMessageRecord) : [],
    drafts: Array.isArray(next.drafts)
      ? next.drafts.map((draft) => ({
          id: draft.id || createId('draft'),
          conversationId: typeof draft.conversationId === 'string' ? draft.conversationId : '',
          body: typeof draft.body === 'string' ? draft.body : '',
          attachmentRefs: normalizeStringList(draft.attachmentRefs),
          replyToMessageId: typeof draft.replyToMessageId === 'string' ? draft.replyToMessageId : '',
          updatedAt: draft.updatedAt || now(),
        }))
      : [],
    outbox: Array.isArray(next.outbox) ? next.outbox : [],
    deadDrops: Array.isArray(next.deadDrops) ? next.deadDrops : [],
    receipts: Array.isArray(next.receipts) ? next.receipts : [],
    trustRecords: Array.isArray(next.trustRecords) ? next.trustRecords : [],
    attachmentRefs: Array.isArray(next.attachmentRefs) ? next.attachmentRefs.map(normalizeAttachmentRef) : [],
    sessionAccessLog: Array.isArray(next.sessionAccessLog) ? next.sessionAccessLog : [],
    relays: Array.isArray(next.relays) && next.relays.length
      ? next.relays.map(normalizeRelayHost)
      : DEFAULT_RELAY_HOSTS.map(normalizeRelayHost),
  };
};

const normalizeNostrIdentity = (identity = {}) => ({
  id: identity.id || createId('nostr-identity'),
  pubkey: typeof identity.pubkey === 'string' ? identity.pubkey : '',
  npub: typeof identity.npub === 'string' ? identity.npub : '',
  label:
    typeof identity.label === 'string' && identity.label.trim() ? identity.label : 'Nostr identity',
  source: identity.source === 'imported' ? 'imported' : 'generated',
  createdAt: identity.createdAt || now(),
  lastUsedAt: identity.lastUsedAt || '',
});

const normalizeNostrRelay = (relay = {}) => ({
  id: relay.id || createId('nostr-relay'),
  url: typeof relay.url === 'string' ? relay.url.trim() : '',
  label:
    typeof relay.label === 'string' && relay.label.trim()
      ? relay.label
      : typeof relay.url === 'string' && relay.url.trim()
        ? relay.url.replace(/^wss?:\/\//, '')
        : 'Relay',
  read: relay.read !== undefined ? Boolean(relay.read) : true,
  write: relay.write !== undefined ? Boolean(relay.write) : true,
  enabled: relay.enabled !== undefined ? Boolean(relay.enabled) : true,
  status: typeof relay.status === 'string' ? relay.status : 'idle',
  error: typeof relay.error === 'string' ? relay.error : '',
  lastSyncAt: typeof relay.lastSyncAt === 'string' ? relay.lastSyncAt : '',
  createdAt: relay.createdAt || now(),
  updatedAt: relay.updatedAt || now(),
});

const normalizeNostrProfile = (profile = {}) => ({
  pubkey: typeof profile.pubkey === 'string' ? profile.pubkey : '',
  name: typeof profile.name === 'string' ? profile.name : '',
  about: typeof profile.about === 'string' ? profile.about : '',
  picture: typeof profile.picture === 'string' ? profile.picture : '',
  nip05: typeof profile.nip05 === 'string' ? profile.nip05 : '',
  updatedAt: profile.updatedAt || now(),
});

const normalizeNostrFollow = (follow = {}) => ({
  id: follow.id || createId('nostr-follow'),
  pubkey: typeof follow.pubkey === 'string' ? follow.pubkey : '',
  followedPubkey: typeof follow.followedPubkey === 'string' ? follow.followedPubkey : '',
  petname: typeof follow.petname === 'string' ? follow.petname : '',
  updatedAt: follow.updatedAt || now(),
});

const normalizeNostrEvent = (event = {}) => ({
  id: typeof event.id === 'string' ? event.id : createId('nostr-event'),
  pubkey: typeof event.pubkey === 'string' ? event.pubkey : '',
  kind: Number.isFinite(event.kind) ? event.kind : 1,
  content: typeof event.content === 'string' ? event.content : '',
  createdAt: typeof event.createdAt === 'string' ? event.createdAt : now(),
  tags: Array.isArray(event.tags)
    ? event.tags.map((tag) => (Array.isArray(tag) ? tag.map((value) => String(value ?? '')) : []))
    : [],
  relayUrl: typeof event.relayUrl === 'string' ? event.relayUrl : '',
  replyToId: typeof event.replyToId === 'string' ? event.replyToId : '',
});

const normalizeNostrReaction = (reaction = {}) => ({
  id: reaction.id || createId('nostr-reaction'),
  eventId: typeof reaction.eventId === 'string' ? reaction.eventId : '',
  pubkey: typeof reaction.pubkey === 'string' ? reaction.pubkey : '',
  content: typeof reaction.content === 'string' && reaction.content.trim() ? reaction.content : '+',
  createdAt: reaction.createdAt || now(),
});

const normalizeNostrReplyEdge = (edge = {}) => ({
  eventId: typeof edge.eventId === 'string' ? edge.eventId : '',
  parentId: typeof edge.parentId === 'string' ? edge.parentId : '',
});

const normalizeNostrState = (nostr) => {
  const defaults = buildDefaultNostrState();
  const next = nostr && typeof nostr === 'object' ? nostr : {};

  return {
    identities: Array.isArray(next.identities) ? next.identities.map(normalizeNostrIdentity) : [],
    activePubkey: typeof next.activePubkey === 'string' ? next.activePubkey : '',
    relays: Array.isArray(next.relays) && next.relays.length
      ? next.relays.map(normalizeNostrRelay).filter((relay) => relay.url)
      : defaults.relays.map(normalizeNostrRelay),
    profiles: Array.isArray(next.profiles) ? next.profiles.map(normalizeNostrProfile) : [],
    follows: Array.isArray(next.follows) ? next.follows.map(normalizeNostrFollow) : [],
    events: Array.isArray(next.events) ? next.events.map(normalizeNostrEvent) : [],
    reactions: Array.isArray(next.reactions) ? next.reactions.map(normalizeNostrReaction) : [],
    replyEdges: Array.isArray(next.replyEdges) ? next.replyEdges.map(normalizeNostrReplyEdge) : [],
    syncState: {
      lastTimelineSyncAt: typeof next.syncState?.lastTimelineSyncAt === 'string' ? next.syncState.lastTimelineSyncAt : '',
      lastProfileSyncAt: typeof next.syncState?.lastProfileSyncAt === 'string' ? next.syncState.lastProfileSyncAt : '',
      lastFollowSyncAt: typeof next.syncState?.lastFollowSyncAt === 'string' ? next.syncState.lastFollowSyncAt : '',
    },
  };
};

const normalizeWorkspace = (workspace) => {
  const next = workspace && typeof workspace === 'object' ? workspace : {};
  const defaults = DEFAULT_WORKSPACE;

  return {
    version: 3,
    notes: ensureReferenceNotes(Array.isArray(next.notes) ? next.notes : defaults.notes),
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
    library: Array.isArray(next.library) ? next.library.map(normalizeLibraryItem) : [],
    researchVault: Array.isArray(next.researchVault) ? next.researchVault.map(normalizeResearchStudy) : [],
    profiles: Array.isArray(next.profiles) ? next.profiles.map(normalizeProfile) : [],
    wallets: Array.isArray(next.wallets) ? next.wallets.map(normalizeWallet) : [],
    clocks: Array.isArray(next.clocks) ? next.clocks.map(normalizeClock) : defaults.clocks.map(normalizeClock),
    managedArtifacts: Array.isArray(next.managedArtifacts)
      ? next.managedArtifacts.map(createManagedArtifact)
      : [],
    comms: normalizeCommsState(next.comms),
    nostr: normalizeNostrState(next.nostr),
    lan: normalizeLanState(next.lan),
    settings: {
      ...createSettings(),
      ...(next.settings && typeof next.settings === 'object' ? next.settings : {}),
      betaMetrics: {
        ...createSettings().betaMetrics,
        ...(next.settings?.betaMetrics && typeof next.settings.betaMetrics === 'object'
          ? next.settings.betaMetrics
          : {}),
      },
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
      sessionDefenseEnabled: Boolean(next.settings?.sessionDefenseEnabled),
      sessionDefenseBlurLock: Boolean(next.settings?.sessionDefenseBlurLock),
      sessionDefenseLastWindowAction:
        next.settings?.sessionDefenseLastWindowAction === 'lock' ? 'lock' : 'nuke',
      fileVaultDeleteMode:
        next.settings?.fileVaultDeleteMode === 'standard-delete'
          ? 'standard-delete'
          : next.settings?.fileVaultDeleteMode === 'best-effort-overwrite'
            ? 'best-effort-overwrite'
            : 'secure-delete',
      commsRequireVerifiedPeer: Boolean(next.settings?.commsRequireVerifiedPeer),
      commsAllowClipboard: Boolean(next.settings?.commsAllowClipboard),
      commsDefaultRelayMode:
        next.settings?.commsDefaultRelayMode === 'direct' ? 'direct' : 'dead-drop',
      commsRetentionHours:
        Number.isFinite(next.settings?.commsRetentionHours) && next.settings.commsRetentionHours > 0
          ? next.settings.commsRetentionHours
          : 168,
      deadMansTriggerEnabled: Boolean(next.settings?.deadMansTriggerEnabled),
      snapshotAutoExportMode: AUTO_SNAPSHOT_EXPORT_MODES.has(next.settings?.snapshotAutoExportMode)
        ? next.settings.snapshotAutoExportMode
        : 'off',
    },
  };
};

const getBootMetadata = (workspace) => ({
  codename: workspace?.settings?.codename || DEFAULT_BOOT.codename,
  operator: workspace?.settings?.operator || DEFAULT_BOOT.operator,
  theme: workspace?.settings?.theme || 'cypher',
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

  const library = normalized.library
    .filter((entry) =>
      matchQuery(
        [
          entry.title,
          entry.format,
          entry.availableFormats.join(' '),
          entry.fileName,
          entry.sourcePath,
          entry.authors.join(' '),
          entry.tags.join(' '),
          entry.publisher,
          entry.series,
          entry.seriesIndex,
          entry.language,
          entry.description,
          entry.identifiers.join(' '),
          (entry.annotations ?? []).map((annotation) => `${annotation.location} ${annotation.quote} ${annotation.note}`).join(' '),
        ].join(' '),
        query,
      ),
    )
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      appKey: 'library',
      title: entry.title,
      subtitle: trimExcerpt(
        [
          entry.format.toUpperCase(),
          entry.authors.join(' · '),
          entry.publisher,
          entry.series ? `${entry.series}${entry.seriesIndex ? ` #${entry.seriesIndex}` : ''}` : '',
          entry.tags.join(' · '),
          entry.annotations?.length ? `${entry.annotations.length} annotations` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        query,
      ),
      navigation: {
        appKey: 'library',
        itemId: entry.id,
      },
    }));

  const researchVault = normalized.researchVault
    .filter((study) =>
      matchQuery(
        [
          study.meta.title,
          study.meta.field,
          study.meta.subfield,
          study.meta.authors.map((author) => author.name).join(' '),
          study.meta.keywords.join(' '),
          study.cognitiveOverlay.biasTags.join(' '),
          study.abstractThesis.coreHypothesis,
          study.results.findings.join(' '),
        ].join(' '),
        query,
      ),
    )
    .slice(0, 8)
    .map((study) => ({
      id: study.id,
      appKey: 'research-vault',
      title: study.meta.title,
      subtitle: trimExcerpt(
        [
          study.meta.field,
          study.meta.subfield,
          study.cognitiveOverlay.biasTags.join(' · '),
          study.sample.size ? `N=${study.sample.size}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        query,
      ),
      navigation: {
        appKey: 'research-vault',
        itemId: study.id,
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
          profile.mySudoExport,
          profile.pgpPublicBundle,
          profile.pgpPrivateBundle,
          profile.voipProfiles
            .map((entry) => `${entry.provider} ${entry.label} ${entry.number} ${entry.notes}`)
            .join(' '),
          profile.phoneBook
            .map(
              (entry) =>
                `${entry.contactName} ${entry.contactNumber} ${entry.viaLabel} ${entry.viaNumber} ${entry.disposition} ${entry.callbackAt} ${entry.notes}`,
            )
            .join(' '),
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
          profile.mySudoExport ? 'mysudo export' : '',
          profile.pgpPublicBundle ? 'pgp public' : '',
          profile.pgpPrivateBundle ? 'pgp private' : '',
          profile.voipProfiles.length ? `${profile.voipProfiles.length} voip lines` : '',
          profile.phoneBook.length ? `${profile.phoneBook.length} contacts` : '',
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

  const comms = normalized.comms.conversations
    .filter((conversation) =>
      matchQuery(
        [
          conversation.title,
          conversation.localIdentityKeyId,
          conversation.peerKeyId,
          conversation.peerDisplayName,
          conversation.tags.join(' '),
          normalized.comms.messages
            .filter((message) => message.conversationId === conversation.id)
            .map((message) => `${message.senderKeyId} ${message.recipientKeyId} ${message.status}`)
            .join(' '),
        ].join(' '),
        query,
      ),
    )
    .slice(0, 8)
    .map((conversation) => ({
      id: conversation.id,
      appKey: 'comms',
      title: conversation.title,
      subtitle: trimExcerpt(
        [
          conversation.peerDisplayName,
          conversation.localIdentityKeyId,
          conversation.peerKeyId,
          conversation.tags.join(' · '),
        ]
          .filter(Boolean)
          .join(' · '),
        query,
      ),
      navigation: {
        appKey: 'comms',
        itemId: conversation.id,
      },
    }));

  const nostr = normalized.nostr.events
    .filter((event) => {
      const profile = normalized.nostr.profiles.find((entry) => entry.pubkey === event.pubkey);
      return matchQuery(
        [
          event.content,
          event.pubkey,
          event.replyToId,
          profile?.name,
          profile?.about,
          normalized.nostr.reactions
            .filter((reaction) => reaction.eventId === event.id)
            .map((reaction) => reaction.content)
            .join(' '),
        ]
          .filter(Boolean)
          .join(' '),
        query,
      );
    })
    .slice(0, 8)
    .map((event) => {
      const profile = normalized.nostr.profiles.find((entry) => entry.pubkey === event.pubkey);
      return {
        id: event.id,
        appKey: 'nostr-lounge',
        title: profile?.name || `nostr:${event.pubkey.slice(0, 12)}`,
        subtitle: trimExcerpt(event.content || 'Empty note', query),
        navigation: {
          appKey: 'nostr-lounge',
          itemId: event.id,
        },
      };
    });

  const lan = normalized.lan.peers
    .filter((peer) =>
      matchQuery(
        [peer.hostname, peer.codename, peer.operator, peer.ip, peer.status, peer.role].join(' '),
        query,
      ),
    )
    .slice(0, 8)
    .map((peer) => ({
      id: peer.id,
      appKey: 'f-society',
      title: peer.codename || peer.hostname || peer.ip || 'LAN peer',
      subtitle: trimExcerpt(
        [peer.hostname, peer.operator, peer.ip, peer.status, peer.role].filter(Boolean).join(' · '),
        query,
      ),
      navigation: {
        appKey: 'f-society',
        itemId: peer.id,
      },
    }));

  return [
    { key: 'notes', label: 'Vault Notes', results: notes },
    { key: 'library', label: 'Library', results: library },
    { key: 'researchVault', label: 'Research Vault', results: researchVault },
    { key: 'calendar', label: 'Calendar', results: calendar },
    { key: 'bookmarks', label: 'Bookmarks', results: bookmarks },
    { key: 'inventory', label: 'Inventory', results: inventory },
    { key: 'flows', label: 'Flow Studio', results: flows },
    { key: 'profiles', label: 'Profile Organizer', results: profiles },
    { key: 'comms', label: 'ROS Comms', results: comms },
    { key: 'lan', label: 'F*Society', results: lan },
    { key: 'nostr', label: 'Nostr Lounge', results: nostr },
    { key: 'wallets', label: 'Wallet Vault', results: wallets },
  ].filter((group) => group.results.length);
};

let initialized = false;
let persistTimer = null;
let sessionPassphrase = '';
let sessionToken = 0;
let storeState = {
  lifecycle: 'booting',
  backend: isNativeVaultRuntime() ? 'tauri-native' : 'web-beta',
  boot: DEFAULT_BOOT,
  data: null,
  pendingLegacyWorkspace: null,
  navigation: null,
  notice: '',
  error: '',
  dataRevision: 0,
  sessionAccessLog: [],
  compartments: DEFAULT_COMPARTMENTS,
  sensitiveCompartments: DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
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
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    await persistNativeWorkspace({ workspace });

    if (token !== sessionToken || revision !== storeState.dataRevision || storeState.lifecycle !== 'unlocked') {
      return null;
    }

    setStoreState({
      boot: getBootMetadata(workspace),
      error: '',
    });

    return workspace;
  }

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

const clearBrowserPersistedPayload = () => {
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
};

const purgeBrowserManagedState = async () => {
  if (typeof window === 'undefined') {
    return;
  }

  clearBrowserPersistedPayload();

  try {
    window.sessionStorage?.clear();
  } catch (error) {
    // Ignore session storage failures during destructive cleanup.
  }

  if ('caches' in window) {
    try {
      const cacheKeys = await window.caches.keys();
      await Promise.allSettled(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
    } catch (error) {
      // Ignore cache cleanup failures during destructive cleanup.
    }
  }

  if ('indexedDB' in window) {
    try {
      const databases = typeof window.indexedDB.databases === 'function'
        ? await window.indexedDB.databases()
        : [];
      await Promise.allSettled(
        databases
          .map((database) => database?.name)
          .filter(Boolean)
          .map(
            (name) =>
              new Promise((resolve) => {
                const request = window.indexedDB.deleteDatabase(name);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
                request.onblocked = () => resolve();
              }),
          ),
      );
    } catch (error) {
      // Ignore IndexedDB cleanup failures during destructive cleanup.
    }
  }

  await clearBrowserVault().catch(() => {});
};

const detectBrowserWorkspacePayload = () => {
  const raw = readPersistedPayload();

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);

    if (isEncryptedWorkspaceContainer(parsed)) {
      return {
        sourceKind: 'beta-encrypted',
        payload: parsed,
        boot: {
          ...DEFAULT_BOOT,
          ...(parsed.boot && typeof parsed.boot === 'object' ? parsed.boot : {}),
        },
      };
    }

    const legacyWorkspace = normalizeWorkspace(parsed?.workspace ?? parsed);
    return {
      sourceKind: 'beta-legacy',
      workspace: legacyWorkspace,
      boot: getBootMetadata(legacyWorkspace),
    };
  } catch (error) {
    return {
      sourceKind: 'beta-corrupt',
      workspace: createDefaultWorkspace(),
      boot: DEFAULT_BOOT,
      error: 'Stored browser beta workspace data could not be read.',
    };
  }
};

const scanPersistedWorkspace = () => {
  const raw = readPersistedPayload();

  if (!raw) {
    setStoreState({
      lifecycle: 'setup',
      backend: 'web-beta',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      error: '',
      navigation: null,
      sessionAccessLog: [],
      compartments: DEFAULT_COMPARTMENTS,
      sensitiveCompartments: DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
    });
    return storeState;
  }

  try {
    const parsed = JSON.parse(raw);

    if (isEncryptedWorkspaceContainer(parsed)) {
      setStoreState({
        lifecycle: 'locked',
        backend: 'web-beta',
        boot: {
          ...DEFAULT_BOOT,
          ...(parsed.boot && typeof parsed.boot === 'object' ? parsed.boot : {}),
        },
        data: null,
        pendingLegacyWorkspace: null,
        error: '',
        navigation: null,
        compartments: DEFAULT_COMPARTMENTS,
        sensitiveCompartments: DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
      });
      return storeState;
    }

    const legacyWorkspace = normalizeWorkspace(parsed?.workspace ?? parsed);
    setStoreState({
      lifecycle: 'migration',
      backend: 'web-beta',
      boot: getBootMetadata(legacyWorkspace),
      data: null,
      pendingLegacyWorkspace: {
        sourceKind: 'beta-legacy',
        workspace: legacyWorkspace,
        boot: getBootMetadata(legacyWorkspace),
      },
      error: '',
      navigation: null,
      sessionAccessLog: [],
      compartments: DEFAULT_COMPARTMENTS,
      sensitiveCompartments: DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
    });
  } catch (error) {
    setStoreState({
      lifecycle: 'setup',
      backend: 'web-beta',
      boot: DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: null,
      error: 'Stored workspace data could not be read. Create a new secure workspace to continue.',
      navigation: null,
      sessionAccessLog: [],
      compartments: DEFAULT_COMPARTMENTS,
      sensitiveCompartments: DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
    });
  }

  return storeState;
};

const scanNativeVaultState = async () => {
  const nativeState = await getNativeVaultState();

  if (!nativeState) {
    return scanPersistedWorkspace();
  }

  const browserPayload = detectBrowserWorkspacePayload();

  if (browserPayload && nativeState.lifecycle !== 'locked') {
    setStoreState({
      lifecycle: 'migration',
      backend: 'tauri-native',
      boot: browserPayload.boot || nativeState.boot || DEFAULT_BOOT,
      data: null,
      pendingLegacyWorkspace: browserPayload,
      error: browserPayload.error || '',
      navigation: null,
      sessionAccessLog: [],
      compartments: nativeState.compartments || DEFAULT_COMPARTMENTS,
      sensitiveCompartments: nativeState.sensitiveCompartments || storeState.sensitiveCompartments,
    });
    return storeState;
  }

  setStoreState({
    lifecycle: nativeState.lifecycle || 'setup',
    backend: 'tauri-native',
    boot: nativeState.boot || DEFAULT_BOOT,
    data: null,
    pendingLegacyWorkspace: null,
    error: '',
    navigation: null,
    sessionAccessLog: [],
    compartments: nativeState.compartments || DEFAULT_COMPARTMENTS,
    sensitiveCompartments:
      nativeState.sensitiveCompartments ||
      DEFAULT_COMPARTMENTS.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id),
  });

  return storeState;
};

const ensureStoreInitialized = () => {
  if (!initialized) {
    initialized = true;
    if (isNativeVaultRuntime()) {
      scanNativeVaultState().catch(() => {
        scanPersistedWorkspace();
      });
    } else {
      scanPersistedWorkspace();
    }
  }

  return storeState;
};

function scheduleStartupFileVaultMaintenance() {
  if (typeof window === 'undefined') {
    return;
  }

  window.setTimeout(async () => {
    if (storeState.lifecycle !== 'unlocked') {
      return;
    }

    try {
      const result = await purgeOrphanedFileVaultBlobs(
        storeState.data?.settings?.fileVaultDeleteMode || 'secure-delete',
      );

      if (!result?.removed && !result?.failed) {
        return;
      }

      setStoreState({
        notice: result.failed
          ? `Startup maintenance purged ${result.removed} orphaned file-vault blob${result.removed === 1 ? '' : 's'}, but ${result.failed} blob${result.failed === 1 ? '' : 's'} failed deletion.`
          : `Startup maintenance purged ${result.removed} orphaned file-vault blob${result.removed === 1 ? '' : 's'}.`,
      });
    } catch (error) {
      setStoreState({
        notice: getErrorMessage(error, 'Startup file-vault maintenance could not complete.'),
      });
    }
  }, 120);
}

const setUnlockedWorkspace = (workspace, notice = '', options = {}) => {
  sessionPassphrase = options.persistPassphrase ? options.passphrase || '' : '';
  sessionToken += 1;

  const normalized = normalizeWorkspace(workspace);
  const compartments = options.compartments || DEFAULT_COMPARTMENTS;
  const sensitiveCompartments =
    options.sensitiveCompartments ||
    compartments.filter((entry) => entry.sensitivity !== 'standard').map((entry) => entry.id);

  const nextState = setStoreState({
    lifecycle: 'unlocked',
    backend: options.backend || storeState.backend,
    boot: getBootMetadata(normalized),
    data: normalized,
    pendingLegacyWorkspace: null,
    navigation: null,
    notice,
    error: '',
    dataRevision: storeState.dataRevision + 1,
    sessionAccessLog: [],
    compartments,
    sensitiveCompartments,
  });

  if (options.runFileVaultMaintenance !== false) {
    scheduleStartupFileVaultMaintenance();
  }

  return nextState;
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

const adoptNativeWorkspaceUpdate = (workspace, notice = '') => {
  if (!workspace) {
    return storeState.data;
  }

  const normalized = normalizeWorkspace(workspace);
  setStoreState({
    data: normalized,
    boot: getBootMetadata(normalized),
    notice,
    error: '',
    dataRevision: storeState.dataRevision + 1,
  });
  return normalized;
};

export const createDefaultWorkspace = () => normalizeWorkspace(createSeededWorkspace());
export const createEmptyWorkspace = () => normalizeWorkspace(EMPTY_WORKSPACE);

export const readWorkspaceData = () => ensureStoreInitialized().data;

export const initializeSecureWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    const workspace = createDefaultWorkspace();

    if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
      const nativeWorkspace =
        (await initializeNativeWorkspace({
          passphrase,
          operatorProfile: {
            operator: workspace.settings.operator,
          },
          workspace,
        })) || workspace;

      setUnlockedWorkspace(nativeWorkspace, 'Secure workspace initialized in the native vault.', {
        backend: 'tauri-native',
        persistPassphrase: true,
        passphrase,
      });
      return nativeWorkspace;
    }

    const container = await createEncryptedWorkspaceContainer(
      workspace,
      passphrase,
      getBootMetadata(workspace),
    );

    if (canUseStorage()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
    }

    setUnlockedWorkspace(workspace, 'Secure workspace initialized.', {
      backend: 'web-beta',
      persistPassphrase: true,
      passphrase,
    });
    return workspace;
  } catch (error) {
    setStoreState({
      error: getErrorMessage(error, 'Unable to initialize the secure workspace.'),
    });
    throw error;
  }
};

export const migrateLegacyWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    const pendingMigration = storeState.pendingLegacyWorkspace;
    let workspace = createDefaultWorkspace();

    if (pendingMigration?.sourceKind === 'beta-encrypted') {
      const decrypted = await decryptWorkspaceContainer(pendingMigration.payload, passphrase);
      workspace = normalizeWorkspace(decrypted.workspace ?? decrypted);
    } else if (pendingMigration?.workspace) {
      workspace = normalizeWorkspace(cloneWorkspace(pendingMigration.workspace));
    }

    if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
      const nativeWorkspace =
        (await migrateNativeBetaWorkspace({
          sourceKind: pendingMigration?.sourceKind || 'beta-legacy',
          passphrase,
          legacyWorkspace: workspace,
        })) || workspace;
      clearBrowserPersistedPayload();
      setUnlockedWorkspace(nativeWorkspace, 'Beta workspace migrated into the native compartmented vault.', {
        backend: 'tauri-native',
        persistPassphrase: true,
        passphrase,
      });
      return nativeWorkspace;
    }

    const container = await createEncryptedWorkspaceContainer(
      workspace,
      passphrase,
      getBootMetadata(workspace),
    );

    if (canUseStorage()) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(container));
    }

    setUnlockedWorkspace(workspace, 'Legacy workspace migrated into the encrypted vault.', {
      backend: 'web-beta',
      persistPassphrase: true,
      passphrase,
    });
    return workspace;
  } catch (error) {
    setStoreState({
      error: getErrorMessage(error, 'Unable to migrate the legacy workspace.'),
    });
    throw error;
  }
};

export const unlockWorkspace = async (passphrase) => {
  ensureStoreInitialized();
  try {
    if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
      const nativeWorkspace = await unlockNativeWorkspace({ passphrase });
      setUnlockedWorkspace(nativeWorkspace, 'Workspace unlocked through the native vault.', {
        backend: 'tauri-native',
        persistPassphrase: true,
        passphrase,
      });
      return nativeWorkspace;
    }

    const raw = readPersistedPayload();
    if (!raw) {
      throw new Error('No encrypted workspace was found on this system.');
    }

    const decrypted = await decryptWorkspaceContainer(JSON.parse(raw), passphrase);
    const workspace = normalizeWorkspace(decrypted.workspace ?? decrypted);
    setUnlockedWorkspace(workspace, 'Workspace unlocked.', {
      backend: 'web-beta',
      persistPassphrase: true,
      passphrase,
    });
    return workspace;
  } catch (error) {
    setStoreState({
      error: getErrorMessage(error, 'Unable to unlock the workspace.'),
    });
    throw error;
  }
};

export const lockWorkspace = (notice = 'Workspace locked.') => {
  ensureStoreInitialized();
  const finalizeLock = () => {
    clearPersistTimer();
    sessionPassphrase = '';
    sessionToken += 1;

    if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
      lockNativeWorkspace().catch(() => {});
      setStoreState({
        lifecycle: 'locked',
        backend: 'tauri-native',
        data: null,
        pendingLegacyWorkspace: null,
        navigation: null,
        notice,
        error: '',
        sessionAccessLog: [],
      });
      return;
    }

    const raw = readPersistedPayload();

    if (!raw) {
      setStoreState({
        lifecycle: 'setup',
        backend: 'web-beta',
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
          backend: 'web-beta',
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
        backend: 'web-beta',
        boot: getBootMetadata(legacyWorkspace),
        data: null,
        pendingLegacyWorkspace: {
          sourceKind: 'beta-legacy',
          workspace: legacyWorkspace,
          boot: getBootMetadata(legacyWorkspace),
        },
        navigation: null,
        notice,
        error: '',
        sessionAccessLog: [],
      });
    } catch (error) {
      setStoreState({
        lifecycle: 'setup',
        backend: 'web-beta',
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

  runAutoSnapshotExport({ trigger: 'lock' })
    .catch((error) => {
      setStoreState({
        notice: getErrorMessage(error, 'Auto snapshot export failed before locking the workspace.'),
      });
    })
    .finally(() => {
      finalizeLock();
    });
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

export const nukeWorkspaceData = async () => {
  ensureStoreInitialized();
  clearPersistTimer();
  sessionPassphrase = '';
  sessionToken += 1;

  const cleanupTasks = [purgeBrowserManagedState()];

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    cleanupTasks.push(nukeNativeWorkspace());
  }

  await Promise.allSettled(cleanupTasks);

  setStoreState({
    lifecycle: 'setup',
    backend: isNativeVaultRuntime() ? 'tauri-native' : 'web-beta',
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

export const storeLibraryFileBlob = async ({ blobId, mimeType, bytes }) => {
  ensureStoreInitialized();

  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before storing encrypted files.');
  }

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    await storeNativeFileBlob({
      blobId,
      mimeType,
      payloadBase64: bytesToBase64(bytes),
    });
    return blobId;
  }

  if (!sessionPassphrase.trim()) {
    throw new Error('Session passphrase is unavailable for the browser file vault.');
  }

  await storeBrowserVaultBlob({
    blobId,
    mimeType,
    bytes,
    passphrase: sessionPassphrase,
  });

  return blobId;
};

export const readLibraryFileBlob = async (blobId) => {
  ensureStoreInitialized();

  if (!blobId) {
    return null;
  }

  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before opening encrypted files.');
  }

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    const response = await readNativeFileBlob({ blobId });

    if (!response) {
      return null;
    }

    return {
      mimeType: response.mimeType,
      bytes: base64ToBytes(response.payloadBase64),
    };
  }

  if (!sessionPassphrase.trim()) {
    throw new Error('Session passphrase is unavailable for the browser file vault.');
  }

  const response = await readBrowserVaultBlob({
    blobId,
    passphrase: sessionPassphrase,
  });

  if (!response) {
    return null;
  }

  return {
    mimeType: response.mimeType,
    bytes: response.bytes,
  };
};

export const deleteLibraryFileBlob = async (blobId, mode = 'standard-delete') => {
  ensureStoreInitialized();

  if (!blobId) {
    return;
  }

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    await deleteNativeFileBlob({ blobId, mode });
    return;
  }

  await deleteBrowserVaultBlob(blobId, mode);
};

export const listFileVaultEntries = async () => {
  ensureStoreInitialized();

  const libraryIndex = new Map(
    (storeState.data?.library ?? [])
      .filter((entry) => entry.fileVaultId)
      .map((entry) => [entry.fileVaultId, entry]),
  );
  const commsAttachmentIndex = new Map(
    (storeState.data?.comms?.attachmentRefs ?? [])
      .filter((entry) => entry.fileVaultBlobId)
      .map((entry) => [entry.fileVaultBlobId, entry]),
  );

  const rawEntries =
    isNativeVaultRuntime() && storeState.backend === 'tauri-native'
      ? await listNativeFileBlobs()
      : await listBrowserVaultBlobs();

  return (rawEntries ?? []).map((entry) => {
    const linkedLibrary = libraryIndex.get(entry.blobId);
    const linkedAttachment = commsAttachmentIndex.get(entry.blobId);
    const linked = linkedLibrary || linkedAttachment;
      return {
        blobId: entry.blobId,
        mimeType: entry.mimeType || 'application/octet-stream',
        storedAt: entry.storedAt || '',
        sizeBytes: Number.isFinite(entry.sizeBytes) ? entry.sizeBytes : 0,
        storageMode: typeof entry.storageMode === 'string' ? entry.storageMode : 'unknown',
        linkedEntryId: linkedLibrary?.id || linkedAttachment?.attachmentId || linkedAttachment?.id || '',
        linkedTitle: linkedLibrary?.title || linkedAttachment?.displayName || '',
        linkedFormat: linkedLibrary?.format || linkedAttachment?.mediaType || '',
        linkedRecordType: linkedLibrary ? 'library' : linkedAttachment ? 'comms-attachment' : '',
        orphaned: !linked,
      };
  });
};

export const purgeOrphanedFileVaultBlobs = async (mode = 'secure-delete') => {
  ensureStoreInitialized();

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    const result = await purgeNativeOrphanedFileBlobs({ mode });
    return {
      removed: Number.isFinite(result?.removed) ? result.removed : 0,
      failed: Number.isFinite(result?.failed) ? result.failed : 0,
    };
  }

  const entries = await listFileVaultEntries();
  const orphaned = entries.filter((entry) => entry.orphaned);

  if (!orphaned.length) {
    return {
      removed: 0,
      failed: 0,
    };
  }

  const results = await Promise.allSettled(
    orphaned.map((entry) => deleteLibraryFileBlob(entry.blobId, mode)),
  );
  const failed = results.filter((result) => result.status === 'rejected').length;

  return {
    removed: orphaned.length - failed,
    failed,
  };
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

const shouldAutoExportSnapshot = (mode, trigger) => {
  if (mode === 'quit') {
    return trigger === 'quit';
  }

  if (mode === 'lock-quit') {
    return trigger === 'lock' || trigger === 'quit';
  }

  return false;
};

export const runAutoSnapshotExport = async ({ trigger = 'quit' } = {}) => {
  ensureStoreInitialized();

  if (storeState.lifecycle !== 'unlocked' || !storeState.data) {
    return { status: 'skipped', reason: 'locked' };
  }

  const mode = storeState.data.settings?.snapshotAutoExportMode || 'off';

  if (!shouldAutoExportSnapshot(mode, trigger)) {
    return { status: 'skipped', reason: 'disabled' };
  }

  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    return { status: 'skipped', reason: 'unsupported-runtime' };
  }

  if (!sessionPassphrase.trim()) {
    setStoreState({
      notice: 'Auto snapshot export skipped because the session passphrase is unavailable.',
    });
    return { status: 'skipped', reason: 'missing-passphrase' };
  }

  const exportedAt = now();
  const timestamp = exportedAt.replace(/[:]/g, '-');
  const filename = `osa-midnight-oil-auto-${trigger}-${timestamp}.osae`;
  const targetPath = await resolveNativeAutoSnapshotPath({ suggestedName: filename });
  const nextWorkspace = cloneWorkspace(storeState.data);

  nextWorkspace.settings = {
    ...nextWorkspace.settings,
    betaLastSnapshotExportAt: exportedAt,
    betaMetrics: {
      ...(nextWorkspace.settings?.betaMetrics || {}),
      snapshotExportCount: Number.isFinite(nextWorkspace.settings?.betaMetrics?.snapshotExportCount)
        ? nextWorkspace.settings.betaMetrics.snapshotExportCount + 1
        : 1,
    },
  };

  await replaceWorkspaceData(nextWorkspace, 'immediate');
  await exportNativeSnapshot({
    targetPath,
    passphrase: sessionPassphrase,
  });

  setStoreState({
    notice: `Auto-exported encrypted snapshot to ${targetPath}.`,
    error: '',
  });

  return {
    status: 'exported',
    path: targetPath,
    exportedAt,
  };
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

export const prepareWorkspaceSnapshotPayload = (payload) => {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
  return normalizeWorkspace(parsed?.workspace ?? parsed);
};

export const createCommsIdentity = async ({
  profileId,
  displayName,
  relayHints = [],
  directHints = [],
  networkPolicy = {},
  trustPolicy = {},
}) => {
  ensureStoreInitialized();

  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before creating comms identities.');
  }

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    const workspace = await createNativeCommsIdentity({
      profileId,
      displayName,
      relayHints,
      directHints,
      networkPolicy,
      trustPolicy,
    });
    return adoptNativeWorkspaceUpdate(workspace, 'ROS comms identity created.');
  }

  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const rotateCommsIdentity = async (identityId) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before rotating identities.');
  }

  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await rotateNativeCommsIdentity({ identityId }),
      'ROS comms identity rotated.',
    );
  }

  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const exportIdentityCard = async ({ identityId, targetPath }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before exporting identity cards.');
  }
  return exportNativeIdentityCard({ identityId, targetPath });
};

export const importPeerCard = async ({ source, trustMode }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before importing peer cards.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await importNativePeerCard({ source, trustMode }),
      'Peer card imported into ROS Comms.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const verifyPeer = async ({ peerId, fingerprint, keyId }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before verifying peers.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await verifyNativePeer({ peerId, fingerprint, keyId }),
      'Peer verified.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const createConversation = async ({
  localIdentityId,
  peerId,
  title,
  tags = [],
  requireVerifiedPeer = false,
}) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before creating conversations.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await createNativeConversation({
        localIdentityId,
        peerId,
        title,
        tags,
        requireVerifiedPeer,
      }),
      'Conversation created.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const listCommsConversations = async () => {
  ensureStoreInitialized();
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return (await listNativeConversations()) ?? [];
  }
  return storeState.data?.comms?.conversations ?? [];
};

export const getConversationMessages = async (conversationId) => {
  ensureStoreInitialized();
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return (await getNativeConversationMessages({ conversationId })) ?? [];
  }
  return (storeState.data?.comms?.messages ?? []).filter((message) => message.conversationId === conversationId);
};

export const saveCommsDraft = async ({ conversationId, draft }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before saving drafts.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await saveNativeDraft({ conversationId, draft }),
      'Draft saved.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const sendCommsMessage = async ({ conversationId, draft, deliveryMode }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before sending messages.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await sendNativeMessage({ conversationId, draft, deliveryMode }),
      'Envelope sealed into the local dead-drop outbox.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const fetchRelayMessages = async ({ routeScope } = {}) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before fetching relay messages.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await fetchNativeRelayMessages({ routeScope }),
      'Relay queue checked.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const attachFileToConversation = async ({
  conversationId,
  fileBlobId,
  displayName,
  mediaType,
  byteLength,
  integrityHash,
}) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before attaching vault files.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await attachNativeFileToConversation({
        conversationId,
        fileBlobId,
        displayName,
        mediaType,
        byteLength,
        integrityHash,
      }),
      'File-vault attachment linked.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const deleteCommsMessage = async ({ messageId, deleteMode }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before deleting messages.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await deleteNativeMessage({ messageId, deleteMode }),
      'Message removed from the local vault view.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

export const deleteCommsAttachment = async ({ attachmentId, deleteMode }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before deleting attachments.');
  }
  if (isNativeVaultRuntime() && storeState.backend === 'tauri-native') {
    return adoptNativeWorkspaceUpdate(
      await deleteNativeAttachmentRef({ attachmentId, deleteMode }),
      'Attachment reference removed.',
    );
  }
  throw new Error('ROS Comms currently requires the native desktop runtime.');
};

const syncLanStateIntoWorkspace = (snapshot, notice = '') => {
  ensureStoreInitialized();

  if (!snapshot) {
    return storeState.data?.lan ?? createLanState();
  }

  if (storeState.lifecycle !== 'unlocked' || !storeState.data) {
    return normalizeLanState(snapshot);
  }

  const nextLan = normalizeLanState(snapshot);
  setStoreState({
    data: {
      ...storeState.data,
      lan: nextLan,
    },
    notice: notice || storeState.notice,
    error: '',
    dataRevision: storeState.dataRevision + 1,
  });

  return nextLan;
};

export const syncLanPartyState = async () => {
  ensureStoreInitialized();

  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    return normalizeLanState(storeState.data?.lan);
  }

  const snapshot = await syncNativeLanState({
    codename: storeState.data?.settings?.codename || PRODUCT_NAME,
    operator: storeState.data?.settings?.operator || 'Guest Operator',
  });

  return syncLanStateIntoWorkspace(snapshot);
};

export const setLanPartyEnabled = async ({ enabled }) => {
  ensureStoreInitialized();
  if (storeState.lifecycle !== 'unlocked') {
    throw new Error('Unlock the workspace before enabling LAN mode.');
  }
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society LAN mode currently requires the native desktop runtime.');
  }

  const snapshot = await setNativeLanEnabled({
    enabled,
    codename: storeState.data?.settings?.codename || PRODUCT_NAME,
    operator: storeState.data?.settings?.operator || 'Guest Operator',
    defaultStatus: storeState.data?.lan?.identity?.status || 'online',
  });

  return syncLanStateIntoWorkspace(snapshot, enabled ? 'F*Society LAN mode enabled.' : 'F*Society LAN mode disabled.');
};

export const scanLanPartyPeers = async () => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society LAN scanning currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(await scanNativeLanPeers(), 'LAN peer scan finished.');
};

export const connectLanPartyPeer = async ({ ip }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society direct connect currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(await scanNativeLanPeers({ targetIp: ip }), `Peer probe sent to ${ip}.`);
};

export const setLanPartyPresence = async ({ status, role }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society presence currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(await setNativeLanPresence({ status, role }), 'LAN presence updated.');
};

export const sendLanPartyChat = async ({ content }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society chat currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(await sendNativeLanChat({ content }), 'LAN chat broadcast sent.');
};

export const shareLanPartyNote = async ({ noteId }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society note sharing currently requires the native desktop runtime.');
  }

  const note = (storeState.data?.notes ?? []).find((entry) => entry.id === noteId);
  if (!note) {
    throw new Error('Select a valid note before sharing it into F*Society.');
  }

  return syncLanStateIntoWorkspace(
    await shareNativeLanNote({
      noteId,
      title: note.title,
      excerpt: trimExcerpt(note.body, ''),
    }),
    'LAN note handoff sent.',
  );
};

export const upsertLanPartyQueueItem = async ({ item }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society shared queue currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(await upsertNativeLanQueueItem({ item }), 'Shared callback queue updated.');
};

export const sendLanPartyFile = async ({ name, content }) => {
  ensureStoreInitialized();
  if (!(isNativeVaultRuntime() && storeState.backend === 'tauri-native')) {
    throw new Error('F*Society file transfer currently requires the native desktop runtime.');
  }
  return syncLanStateIntoWorkspace(
    await sendNativeLanFile({ name, content }),
    `LAN file transfer sent: ${name}.`,
  );
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

export const skipLegacyMigration = () => {
  ensureStoreInitialized();

  setStoreState({
    lifecycle: 'setup',
    pendingLegacyWorkspace: null,
    notice: isNativeVaultRuntime()
      ? 'Beta browser workspace left untouched. You can create a fresh native vault now.'
      : 'Legacy migration skipped.',
    error: '',
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
    runAutoSnapshotExport,
    exportWorkspaceSnapshot,
    importWorkspaceSnapshot,
    prepareWorkspaceSnapshotPayload,
    initializeSecureWorkspace,
    migrateLegacyWorkspace,
    unlockWorkspace,
    lockWorkspace,
    nukeWorkspaceData,
    storeLibraryFileBlob,
    readLibraryFileBlob,
    deleteLibraryFileBlob,
    setWorkspaceNavigation,
    clearWorkspaceNavigation,
    skipLegacyMigration,
    searchWorkspace,
    appendSessionAccessLog,
    clearSessionAccessLog,
    listFileVaultEntries,
    purgeOrphanedFileVaultBlobs,
    createCommsIdentity,
    rotateCommsIdentity,
    exportIdentityCard,
    importPeerCard,
    verifyPeer,
    createConversation,
    listCommsConversations,
    getConversationMessages,
    saveCommsDraft,
    sendCommsMessage,
    fetchRelayMessages,
    attachFileToConversation,
    deleteCommsMessage,
    deleteCommsAttachment,
    syncLanPartyState,
    setLanPartyEnabled,
    scanLanPartyPeers,
    connectLanPartyPeer,
    setLanPartyPresence,
    sendLanPartyChat,
    shareLanPartyNote,
    upsertLanPartyQueueItem,
    sendLanPartyFile,
  };
};

export { createId, now };
