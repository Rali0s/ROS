const defaultNow = () => new Date().toISOString();
const defaultCreateId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export const STARTER_NOSTR_RELAYS = [
  { url: 'wss://relay.damus.io', label: 'Damus', read: true, write: true, enabled: true },
  { url: 'wss://relay.primal.net', label: 'Primal', read: true, write: true, enabled: true },
  { url: 'wss://nos.lol', label: 'nos.lol', read: true, write: true, enabled: true },
];

export const createDefaultNostrState = ({ createId = defaultCreateId, now = defaultNow } = {}) => ({
  identities: [],
  activePubkey: '',
  relays: STARTER_NOSTR_RELAYS.map((relay) => ({
    id: createId('nostr-relay'),
    url: relay.url,
    label: relay.label,
    read: relay.read,
    write: relay.write,
    enabled: relay.enabled,
    status: 'idle',
    error: '',
    lastSyncAt: '',
    createdAt: now(),
    updatedAt: now(),
  })),
  profiles: [],
  follows: [],
  events: [],
  reactions: [],
  replyEdges: [],
  syncState: {
    lastTimelineSyncAt: '',
    lastProfileSyncAt: '',
    lastFollowSyncAt: '',
  },
});
