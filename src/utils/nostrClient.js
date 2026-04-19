import { SimplePool, finalizeEvent, generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';

const pool = new SimplePool();
const DEFAULT_TIMEOUT_MS = 2800;
const FEED_LOOKBACK_WINDOWS = [60 * 60 * 24 * 3, 60 * 60 * 24 * 14, 60 * 60 * 24 * 60];

const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (value) => {
  const normalized = value.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error('Expected a 64-character hex private key or an nsec key.');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }
  return bytes;
};

const unixToIso = (value) => new Date((value || 0) * 1000).toISOString();
const isoToUnix = (value) => Math.floor(new Date(value).getTime() / 1000);

const uniqueRelayUrls = (relays = [], mode = 'read') =>
  [...new Set(
    relays
      .filter((relay) => relay?.enabled && relay?.url && (mode === 'write' ? relay.write : relay.read))
      .map((relay) => relay.url.trim())
      .filter(Boolean),
  )];

const dedupeEvents = (events = []) =>
  [...new Map(events.filter(Boolean).map((event) => [event.id, event])).values()];

const latestPerPubkey = (events = []) =>
  [...events]
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .reduce((map, event) => {
      if (!map.has(event.pubkey)) {
        map.set(event.pubkey, event);
      }
      return map;
    }, new Map());

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const signEvent = (template, secretHex) => finalizeEvent(template, hexToBytes(secretHex));

export const getEnabledNostrRelayUrls = uniqueRelayUrls;

export const generateNostrIdentity = (label = '') => {
  const secretBytes = generateSecretKey();
  const secretHex = bytesToHex(secretBytes);
  const pubkey = getPublicKey(secretBytes);

  return {
    secretHex,
    pubkey,
    npub: nip19.npubEncode(pubkey),
    label: label.trim() || `Lounge ${pubkey.slice(0, 8)}`,
    source: 'generated',
  };
};

export const parseImportedNostrSecret = (input) => {
  const trimmed = input.trim();
  let secretBytes;

  if (trimmed.startsWith('nsec1')) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== 'nsec') {
      throw new Error('The imported Nostr key is not an nsec private key.');
    }
    secretBytes = decoded.data;
  } else {
    secretBytes = hexToBytes(trimmed);
  }

  const secretHex = bytesToHex(secretBytes);
  const pubkey = getPublicKey(secretBytes);

  return {
    secretHex,
    pubkey,
    npub: nip19.npubEncode(pubkey),
    label: `Imported ${pubkey.slice(0, 8)}`,
    source: 'imported',
  };
};

export const secretHexToNsec = (secretHex) => nip19.nsecEncode(hexToBytes(secretHex));

export const parseNostrPubkeyInput = (input) => {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Enter a pubkey or npub value.');
  }

  if (trimmed.startsWith('npub1')) {
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== 'npub') {
      throw new Error('That value is not an npub public key.');
    }
    return decoded.data;
  }

  if (!/^[0-9a-f]{64}$/i.test(trimmed)) {
    throw new Error('Public keys must be 64-character hex or an npub value.');
  }

  return trimmed.toLowerCase();
};

export const fetchNostrTimeline = async ({ relays, authors = [], limit = 40 }) => {
  const relayUrls = uniqueRelayUrls(relays, 'read');
  const uniqueAuthors = [...new Set(authors.filter(Boolean))];
  if (!relayUrls.length || !uniqueAuthors.length) {
    return [];
  }

  const events = await pool.querySync(
    relayUrls,
    { kinds: [1], authors: uniqueAuthors, limit },
    { maxWait: DEFAULT_TIMEOUT_MS },
  );

  return dedupeEvents(events)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .map((event) => ({
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      content: event.content,
      createdAt: unixToIso(event.created_at),
      tags: event.tags ?? [],
      replyToId: event.tags?.find((tag) => tag[0] === 'e')?.[1] ?? '',
    }));
};

export const fetchNostrRelayFeed = async ({ relays, limit = 40 }) => {
  const relayUrls = uniqueRelayUrls(relays, 'read');
  if (!relayUrls.length) {
    return [];
  }

  let events = [];

  for (const lookbackSeconds of FEED_LOOKBACK_WINDOWS) {
    events = await pool.querySync(
      relayUrls,
      {
        kinds: [1],
        since: Math.floor(Date.now() / 1000) - lookbackSeconds,
        limit,
      },
      { maxWait: Math.max(DEFAULT_TIMEOUT_MS, 4200) },
    );

    if (events.length) {
      break;
    }
  }

  if (!events.length) {
    const perRelay = await Promise.all(
      relayUrls.map((relayUrl) =>
        pool.querySync(
          [relayUrl],
          {
            kinds: [1],
            since: Math.floor(Date.now() / 1000) - FEED_LOOKBACK_WINDOWS[FEED_LOOKBACK_WINDOWS.length - 1],
            limit: Math.max(12, Math.floor(limit / Math.max(relayUrls.length, 1))),
          },
          { maxWait: 5000 },
        ),
      ),
    );
    events = perRelay.flat();
  }

  return dedupeEvents(events)
    .sort((left, right) => (right.created_at || 0) - (left.created_at || 0))
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      content: event.content,
      createdAt: unixToIso(event.created_at),
      tags: event.tags ?? [],
      replyToId: event.tags?.find((tag) => tag[0] === 'e')?.[1] ?? '',
    }));
};

export const fetchNostrProfiles = async ({ relays, pubkeys = [] }) => {
  const relayUrls = uniqueRelayUrls(relays, 'read');
  const uniquePubkeys = [...new Set(pubkeys.filter(Boolean))];
  if (!relayUrls.length || !uniquePubkeys.length) {
    return [];
  }

  const events = await pool.querySync(
    relayUrls,
    { kinds: [0], authors: uniquePubkeys, limit: uniquePubkeys.length * 2 },
    { maxWait: DEFAULT_TIMEOUT_MS },
  );

  return [...latestPerPubkey(events).values()].map((event) => {
    const parsed = safeJsonParse(event.content);
    return {
      pubkey: event.pubkey,
      name: typeof parsed.name === 'string' ? parsed.name : '',
      about: typeof parsed.about === 'string' ? parsed.about : '',
      picture: typeof parsed.picture === 'string' ? parsed.picture : '',
      nip05: typeof parsed.nip05 === 'string' ? parsed.nip05 : '',
      updatedAt: unixToIso(event.created_at),
    };
  });
};

export const fetchNostrFollowList = async ({ relays, pubkey }) => {
  const relayUrls = uniqueRelayUrls(relays, 'read');
  if (!relayUrls.length || !pubkey) {
    return [];
  }

  const events = await pool.querySync(
    relayUrls,
    { kinds: [3], authors: [pubkey], limit: 1 },
    { maxWait: DEFAULT_TIMEOUT_MS },
  );

  const latest = [...events].sort((left, right) => (right.created_at || 0) - (left.created_at || 0))[0];
  if (!latest) {
    return [];
  }

  return (latest.tags ?? [])
    .filter((tag) => tag[0] === 'p' && tag[1])
    .map((tag) => ({
      pubkey,
      followedPubkey: tag[1],
      petname: tag[3] || '',
      updatedAt: unixToIso(latest.created_at),
    }));
};

export const publishNostrTextNote = async ({ relays, secretHex, content, tags = [] }) => {
  const relayUrls = uniqueRelayUrls(relays, 'write');
  if (!relayUrls.length) {
    throw new Error('Enable at least one writable relay before posting.');
  }

  const event = signEvent(
    {
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    },
    secretHex,
  );

  await Promise.allSettled(pool.publish(relayUrls, event));

  return {
    id: event.id,
    pubkey: event.pubkey,
    kind: event.kind,
    content: event.content,
    createdAt: unixToIso(event.created_at),
    tags: event.tags ?? [],
    replyToId: event.tags?.find((tag) => tag[0] === 'e')?.[1] ?? '',
  };
};

export const publishNostrReply = async ({ relays, secretHex, content, parentEvent }) =>
  publishNostrTextNote({
    relays,
    secretHex,
    content,
    tags: [
      ['e', parentEvent.id, '', 'reply'],
      ['p', parentEvent.pubkey],
    ],
  });

export const publishNostrReaction = async ({ relays, secretHex, targetEvent, content = '+' }) => {
  const relayUrls = uniqueRelayUrls(relays, 'write');
  if (!relayUrls.length) {
    throw new Error('Enable at least one writable relay before reacting.');
  }

  const event = signEvent(
    {
      kind: 7,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['e', targetEvent.id],
        ['p', targetEvent.pubkey],
      ],
      content,
    },
    secretHex,
  );

  await Promise.allSettled(pool.publish(relayUrls, event));

  return {
    id: event.id,
    eventId: targetEvent.id,
    pubkey: event.pubkey,
    content: event.content,
    createdAt: unixToIso(event.created_at),
  };
};

export const publishNostrFollowList = async ({ relays, secretHex, followedPubkeys = [] }) => {
  const relayUrls = uniqueRelayUrls(relays, 'write');
  if (!relayUrls.length) {
    throw new Error('Enable at least one writable relay before publishing a follow list.');
  }

  const uniquePubkeys = [...new Set(followedPubkeys.filter(Boolean))];
  const event = signEvent(
    {
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      tags: uniquePubkeys.map((pubkey) => ['p', pubkey]),
      content: '',
    },
    secretHex,
  );

  await Promise.allSettled(pool.publish(relayUrls, event));
  return {
    id: event.id,
    pubkey: event.pubkey,
    followedPubkeys: uniquePubkeys,
    createdAt: unixToIso(event.created_at),
  };
};

export const publishNostrProfile = async ({ relays, secretHex, profile = {} }) => {
  const relayUrls = uniqueRelayUrls(relays, 'write');
  if (!relayUrls.length) {
    throw new Error('Enable at least one writable relay before publishing your profile.');
  }

  const content = JSON.stringify({
    name: typeof profile.name === 'string' ? profile.name.trim() : '',
    about: typeof profile.about === 'string' ? profile.about.trim() : '',
    picture: typeof profile.picture === 'string' ? profile.picture.trim() : '',
    nip05: typeof profile.nip05 === 'string' ? profile.nip05.trim() : '',
  });

  const event = signEvent(
    {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content,
    },
    secretHex,
  );

  await Promise.allSettled(pool.publish(relayUrls, event));

  const parsed = safeJsonParse(content);
  return {
    pubkey: event.pubkey,
    name: typeof parsed.name === 'string' ? parsed.name : '',
    about: typeof parsed.about === 'string' ? parsed.about : '',
    picture: typeof parsed.picture === 'string' ? parsed.picture : '',
    nip05: typeof parsed.nip05 === 'string' ? parsed.nip05 : '',
    updatedAt: unixToIso(event.created_at),
  };
};

export const buildLocalReplyEdge = (event) => ({
  eventId: event.id,
  parentId: event.replyToId || event.tags?.find((tag) => tag[0] === 'e')?.[1] || '',
});

export const buildOptimisticTimelineEvent = ({ pubkey, content, replyToId = '', tags = [] }) => ({
  id: `local-${pubkey.slice(0, 8)}-${Date.now().toString(36)}`,
  pubkey,
  kind: 1,
  content,
  createdAt: new Date().toISOString(),
  tags,
  replyToId,
});

export const toNostrEventSummary = (event) => ({
  id: event.id,
  createdAt: event.createdAt,
  createdAtUnix: isoToUnix(event.createdAt),
});
