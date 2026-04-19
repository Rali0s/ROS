/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ExternalLink,
  Heart,
  Import,
  MessageCircle,
  Plus,
  Radio,
  RefreshCcw,
  Send,
  UserPlus,
  Download,
  KeyRound,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { createDefaultNostrState } from '../utils/nostrDefaults';
import {
  buildLocalReplyEdge,
  fetchNostrFollowList,
  fetchNostrProfiles,
  fetchNostrRelayFeed,
  fetchNostrTimeline,
  generateNostrIdentity,
  getEnabledNostrRelayUrls,
  parseImportedNostrSecret,
  parseNostrPubkeyInput,
  publishNostrFollowList,
  publishNostrProfile,
  publishNostrReaction,
  publishNostrReply,
  publishNostrTextNote,
  secretHexToNsec,
} from '../utils/nostrClient';
import {
  isNativeVaultRuntime,
  loadNativeNostrSecret,
  saveNativeNostrSecret,
  saveNativeTextFileDialog,
} from '../utils/nativeVault';
import { createId, now as timestampNow, useWorkspaceData } from '../utils/workspaceStore';

const INPUT =
  'w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-[12px] text-white outline-none transition focus:border-cyan-300/35';
const TEXTAREA = `${INPUT} min-h-[110px] resize-none`;

const formatEventTime = (value) =>
  new Intl.DateTimeFormat([], {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })
    .format(new Date(value))
    .replace(',', '');

const byNewest = (left, right) => new Date(right.createdAt) - new Date(left.createdAt);

const mergeByKey = (existing, incoming, key) => {
  const map = new Map(existing.map((entry) => [entry[key], entry]));
  incoming.forEach((entry) => {
    if (entry?.[key]) {
      map.set(entry[key], { ...(map.get(entry[key]) ?? {}), ...entry });
    }
  });
  return [...map.values()];
};

const createFallbackNostrState = () => createDefaultNostrState({ createId, now: timestampNow });

const NostrLoungeApp = () => {
  const { data, session, clearWorkspaceNavigation, updateWorkspaceData } = useWorkspaceData();
  const theme = getAppInteriorTheme(data.settings.theme);
  const nostrState = data.nostr ?? createFallbackNostrState();
  const isNativeDesktop = isNativeVaultRuntime() && session.backend === 'tauri-native';
  const [identityLabel, setIdentityLabel] = useState('');
  const [importSecret, setImportSecret] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [followInput, setFollowInput] = useState('');
  const [relayInput, setRelayInput] = useState('');
  const [replyTargetId, setReplyTargetId] = useState('');
  const [selectedAuthorPubkey, setSelectedAuthorPubkey] = useState('');
  const [profileDraft, setProfileDraft] = useState({
    name: '',
    about: '',
    nip05: '',
  });
  const [status, setStatus] = useState(
    'Nostr Lounge is a lighter social corner inside ROS. Public cache stays local; the active secret key stays in the native vault.',
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [relayDiagnostics, setRelayDiagnostics] = useState([]);
  const autoSyncKeyRef = useRef('');
  const profileDraftHydratedRef = useRef(false);

  const patchNostrState = useCallback((mutator) =>
    updateWorkspaceData((current) => ({
      ...current,
      nostr: mutator(current.nostr ?? createFallbackNostrState()),
    })), [updateWorkspaceData]);

  const activeIdentity =
    nostrState.identities.find((identity) => identity.pubkey === nostrState.activePubkey) ??
    nostrState.identities[0] ??
    null;
  const activePubkey = activeIdentity?.pubkey ?? '';
  const follows = nostrState.follows.filter((follow) => follow.pubkey === activePubkey);
  const followedPubkeys = follows.map((follow) => follow.followedPubkey);
  const relayUrls = useMemo(
    () => getEnabledNostrRelayUrls(nostrState.relays, 'read'),
    [nostrState.relays],
  );
  const usePersonalTimeline = follows.length > 0;

  useEffect(() => {
    if (session.navigation?.appKey !== 'nostr-lounge') {
      return;
    }

    if (session.navigation.itemId) {
      const matchedEvent = nostrState.events.find((event) => event.id === session.navigation.itemId);
      if (matchedEvent) {
        setSelectedAuthorPubkey(matchedEvent.pubkey);
      }
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, nostrState.events, session.navigation]);

  useEffect(() => {
    if (!selectedAuthorPubkey && activePubkey) {
      setSelectedAuthorPubkey(activePubkey);
    }
  }, [activePubkey, selectedAuthorPubkey]);

  const profileMap = useMemo(
    () => new Map(nostrState.profiles.map((profile) => [profile.pubkey, profile])),
    [nostrState.profiles],
  );

  const visibleAuthorSet = useMemo(
    () => new Set([activePubkey, ...followedPubkeys].filter(Boolean)),
    [activePubkey, followedPubkeys],
  );

  const timelineEvents = useMemo(
    () =>
      [...nostrState.events]
        .filter((event) => (!usePersonalTimeline ? true : visibleAuthorSet.has(event.pubkey)))
        .sort(byNewest),
    [nostrState.events, usePersonalTimeline, visibleAuthorSet],
  );

  const selectedAuthor = profileMap.get(selectedAuthorPubkey) ?? null;
  const activeProfile = profileMap.get(activePubkey) ?? null;
  const selectedAuthorEvents = useMemo(
    () => timelineEvents.filter((event) => event.pubkey === selectedAuthorPubkey).slice(0, 6),
    [selectedAuthorPubkey, timelineEvents],
  );
  const canWrite = Boolean(activePubkey && activeProfile?.publishedAt && activeProfile?.name?.trim());

  useEffect(() => {
    setProfileDraft({
      name: activeProfile?.name || activeIdentity?.label || '',
      about: activeProfile?.about || '',
      nip05: activeProfile?.nip05 || '',
    });
    profileDraftHydratedRef.current = true;
  }, [activeIdentity?.label, activeProfile?.about, activeProfile?.name, activeProfile?.nip05]);

  useEffect(() => {
    if (!profileDraftHydratedRef.current || !activePubkey) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      patchNostrState((currentNostr) => ({
        ...currentNostr,
        identities: currentNostr.identities.map((identity) =>
          identity.pubkey === activePubkey && profileDraft.name.trim()
            ? { ...identity, label: profileDraft.name.trim(), lastUsedAt: timestampNow() }
            : identity,
        ),
        profiles: mergeByKey(
          currentNostr.profiles,
          [
            {
              pubkey: activePubkey,
              name: profileDraft.name.trim(),
              about: profileDraft.about,
              picture: currentNostr.profiles.find((profile) => profile.pubkey === activePubkey)?.picture || '',
              nip05: profileDraft.nip05.trim(),
              updatedAt:
                currentNostr.profiles.find((profile) => profile.pubkey === activePubkey)?.updatedAt || '',
              draftUpdatedAt: timestampNow(),
              publishedAt:
                currentNostr.profiles.find((profile) => profile.pubkey === activePubkey)?.publishedAt || '',
            },
          ],
          'pubkey',
        ),
      }));
    }, 220);

    return () => window.clearTimeout(saveTimer);
  }, [activePubkey, patchNostrState, profileDraft]);

  const replyTarget = nostrState.events.find((event) => event.id === replyTargetId) ?? null;

  const reactionCounts = useMemo(
    () =>
      nostrState.reactions.reduce((counts, reaction) => {
        counts.set(reaction.eventId, (counts.get(reaction.eventId) ?? 0) + 1);
        return counts;
      }, new Map()),
    [nostrState.reactions],
  );

  const markActiveIdentity = (pubkey) => {
    patchNostrState((currentNostr) => ({
      ...currentNostr,
      activePubkey: pubkey,
      identities: currentNostr.identities.map((identity) =>
        identity.pubkey === pubkey
          ? { ...identity, lastUsedAt: timestampNow() }
          : identity,
      ),
    }));
    setSelectedAuthorPubkey(pubkey);
  };

  const requireSecretHex = async () => {
    if (!activePubkey) {
      throw new Error('Create or import a Nostr identity first.');
    }

    const loaded = await loadNativeNostrSecret({ pubkey: activePubkey });
    if (!loaded?.secretHex) {
      throw new Error('The active Nostr secret is not available in the native vault.');
    }

    return loaded.secretHex;
  };

  const syncTimeline = useCallback(async () => {
    if (!isNativeDesktop) {
      setStatus('Nostr Lounge is currently native-desktop only.');
      return;
    }

    if (!activeIdentity) {
      setStatus('Create or import a Nostr identity to start syncing.');
      return;
    }

    setIsSyncing(true);
    setStatus('Refreshing relays, follows, profiles, and the latest home timeline...');
    setRelayDiagnostics(
      relayUrls.map((url) => ({
        url,
        phase: 'querying',
        noteCount: 0,
        detail: 'Connecting...',
      })),
    );

    try {
      const remoteFollows = await fetchNostrFollowList({
        relays: nostrState.relays,
        pubkey: activeIdentity.pubkey,
      });
      const remoteFollowRecords = remoteFollows.map((entry) => ({
        id: `${entry.pubkey}:${entry.followedPubkey}`,
        ...entry,
      }));
      const remoteFollowedPubkeys = remoteFollows.map((entry) => entry.followedPubkey);
      const authorSet = [...new Set([activeIdentity.pubkey, ...followedPubkeys, ...remoteFollowedPubkeys])];
      const feedMode = authorSet.length > 1 || remoteFollows.length ? 'personal follow feed' : 'global relay feed';
      const timeline =
        feedMode === 'personal follow feed'
          ? await fetchNostrTimeline({
              relays: nostrState.relays,
              authors: authorSet,
              limit: 48,
            })
          : await fetchNostrRelayFeed({
              relays: nostrState.relays,
              limit: 48,
            });
      const diagnosticRelayScope = nostrState.relays.filter(
        (relay) => relay?.enabled && relay?.read && relayUrls.includes(relay.url),
      );
      const diagnostics = await Promise.all(
        diagnosticRelayScope.map(async (relay) => {
          try {
            const relayEvents =
              feedMode === 'personal follow feed'
                ? await fetchNostrTimeline({
                    relays: [{ ...relay, enabled: true, read: true }],
                    authors: authorSet,
                    limit: 18,
                  })
                : await fetchNostrRelayFeed({
                    relays: [{ ...relay, enabled: true, read: true }],
                    limit: 18,
                  });

            return {
              url: relay.url,
              phase: relayEvents.length ? 'live' : 'empty',
              noteCount: relayEvents.length,
              detail: relayEvents.length
                ? `${relayEvents.length} notes returned in ${feedMode}`
                : `Connected, but no notes matched the ${feedMode}.`,
            };
          } catch (error) {
            return {
              url: relay.url,
              phase: 'error',
              noteCount: 0,
              detail: error.message || 'Relay query failed.',
            };
          }
        }),
      );
      const profilePubkeys = [...new Set([activeIdentity.pubkey, ...authorSet, ...timeline.map((event) => event.pubkey)])];
      const profiles = await fetchNostrProfiles({
        relays: nostrState.relays,
        pubkeys: profilePubkeys,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        profiles: mergeByKey(currentNostr.profiles, profiles, 'pubkey'),
        follows: mergeByKey(
          currentNostr.follows.filter((entry) => entry.pubkey !== activeIdentity.pubkey),
          remoteFollowRecords,
          'id',
        ),
        events: mergeByKey(currentNostr.events, timeline, 'id').sort(byNewest).slice(0, 160),
        replyEdges: mergeByKey(
          currentNostr.replyEdges,
          timeline
            .map(buildLocalReplyEdge)
            .filter((edge) => edge.parentId),
          'eventId',
        ),
        syncState: {
          ...currentNostr.syncState,
          lastTimelineSyncAt: timestampNow(),
          lastProfileSyncAt: timestampNow(),
          lastFollowSyncAt: timestampNow(),
        },
        relays: currentNostr.relays.map((relay) =>
          relayUrls.includes(relay.url)
            ? { ...relay, status: 'online', error: '', lastSyncAt: timestampNow(), updatedAt: timestampNow() }
            : relay,
        ),
      }));

      setRelayDiagnostics(diagnostics);

      setStatus(
        timeline.length
          ? `Timeline refreshed from ${relayUrls.length || 0} relay${relayUrls.length === 1 ? '' : 's'} in ${feedMode}.`
          : `Relays responded, but no notes were returned for the current ${feedMode}.`,
      );
    } catch (error) {
      setRelayDiagnostics(
        relayUrls.map((url) => ({
          url,
          phase: 'error',
          noteCount: 0,
          detail: error.message || 'Query failed.',
        })),
      );
      setStatus(error.message || 'Unable to refresh the Nostr timeline right now.');
    } finally {
      setIsSyncing(false);
    }
  }, [activeIdentity, followedPubkeys, isNativeDesktop, nostrState.relays, patchNostrState, relayUrls]);

  useEffect(() => {
    const relayKey = relayUrls.join('|');
    if (!activeIdentity || !relayKey || isSyncing) {
      return;
    }

    const nextKey = `${activeIdentity.pubkey}:${relayKey}`;
    const shouldAutoSync =
      !nostrState.events.length ||
      !nostrState.syncState?.lastTimelineSyncAt ||
      autoSyncKeyRef.current !== nextKey;

    if (!shouldAutoSync) {
      return;
    }

    autoSyncKeyRef.current = nextKey;
    syncTimeline().catch(() => {});
  }, [
    activeIdentity,
    isSyncing,
    nostrState.events.length,
    nostrState.syncState?.lastTimelineSyncAt,
    relayUrls,
    syncTimeline,
  ]);

  const handleGenerateIdentity = async () => {
    try {
      const identity = generateNostrIdentity(identityLabel);
      await saveNativeNostrSecret({ pubkey: identity.pubkey, secretHex: identity.secretHex });
      await ensureWalletMirror({
        pubkey: identity.pubkey,
        npub: identity.npub,
        label: identity.label,
        secretHex: identity.secretHex,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        activePubkey: identity.pubkey,
        identities: mergeByKey(
          currentNostr.identities,
          [
            {
              id: createId('nostr-identity'),
              pubkey: identity.pubkey,
              npub: identity.npub,
              label: identity.label,
              source: identity.source,
              createdAt: timestampNow(),
              lastUsedAt: timestampNow(),
            },
          ],
          'pubkey',
        ),
        profiles: mergeByKey(
          currentNostr.profiles,
          [
            {
              pubkey: identity.pubkey,
              name: identity.label,
              about: '',
              picture: '',
              nip05: '',
              updatedAt: '',
              draftUpdatedAt: '',
              publishedAt: '',
            },
          ],
          'pubkey',
        ),
      }));

      setIdentityLabel('');
      setSelectedAuthorPubkey(identity.pubkey);
      setStatus(`Created ${identity.label} and sealed the secret key into the native vault.`);
    } catch (error) {
      setStatus(error.message || 'Unable to create a new Nostr identity.');
    }
  };

  const handleImportIdentity = async () => {
    try {
      const imported = parseImportedNostrSecret(importSecret);
      await saveNativeNostrSecret({ pubkey: imported.pubkey, secretHex: imported.secretHex });
      await ensureWalletMirror({
        pubkey: imported.pubkey,
        npub: imported.npub,
        label: imported.label,
        secretHex: imported.secretHex,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        activePubkey: imported.pubkey,
        identities: mergeByKey(
          currentNostr.identities,
          [
            {
              id: createId('nostr-identity'),
              pubkey: imported.pubkey,
              npub: imported.npub,
              label: imported.label,
              source: imported.source,
              createdAt: timestampNow(),
              lastUsedAt: timestampNow(),
            },
          ],
          'pubkey',
        ),
        profiles: mergeByKey(
          currentNostr.profiles,
          [
            {
              pubkey: imported.pubkey,
              name: imported.label,
              about: '',
              picture: '',
              nip05: '',
              updatedAt: '',
              draftUpdatedAt: '',
              publishedAt: '',
            },
          ],
          'pubkey',
        ),
      }));

      setImportSecret('');
      setSelectedAuthorPubkey(imported.pubkey);
      setStatus(`Imported ${imported.npub.slice(0, 16)}... and stored its secret key in the native vault.`);
    } catch (error) {
      setStatus(error.message || 'Unable to import that Nostr private key.');
    }
  };

  const handlePublish = async () => {
    if (!canWrite) {
      setStatus('Set up a basic profile first so your lounge posts have a readable identity.');
      return;
    }

    if (!composerBody.trim()) {
      setStatus('Write something first.');
      return;
    }

    try {
      const secretHex = await requireSecretHex();
      const published = replyTarget
        ? await publishNostrReply({
            relays: nostrState.relays,
            secretHex,
            content: composerBody.trim(),
            parentEvent: replyTarget,
          })
        : await publishNostrTextNote({
            relays: nostrState.relays,
            secretHex,
            content: composerBody.trim(),
          });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        events: mergeByKey(currentNostr.events, [published], 'id').sort(byNewest).slice(0, 160),
        replyEdges: replyTarget
          ? mergeByKey(currentNostr.replyEdges, [{ eventId: published.id, parentId: replyTarget.id }], 'eventId')
          : currentNostr.replyEdges,
      }));

      setComposerBody('');
      setReplyTargetId('');
      setStatus(replyTarget ? 'Reply published to your current relays.' : 'Text note published to your current relays.');
    } catch (error) {
      setStatus(error.message || 'Unable to publish that note.');
    }
  };

  const handleReact = async (eventItem) => {
    try {
      const secretHex = await requireSecretHex();
      const reaction = await publishNostrReaction({
        relays: nostrState.relays,
        secretHex,
        targetEvent: eventItem,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        reactions: mergeByKey(currentNostr.reactions, [reaction], 'id'),
      }));

      setStatus('Reaction published.');
    } catch (error) {
      setStatus(error.message || 'Unable to publish the reaction.');
    }
  };

  const handleFollow = async () => {
    try {
      const followedPubkey = parseNostrPubkeyInput(followInput);
      const secretHex = await requireSecretHex();
      const nextFollowedPubkeys = [...new Set([...followedPubkeys, followedPubkey])];

      await publishNostrFollowList({
        relays: nostrState.relays,
        secretHex,
        followedPubkeys: nextFollowedPubkeys,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        follows: mergeByKey(
          currentNostr.follows,
          [
            {
              id: `${activePubkey}:${followedPubkey}`,
              pubkey: activePubkey,
              followedPubkey,
              petname: '',
              updatedAt: timestampNow(),
            },
          ],
          'id',
        ),
      }));

      setFollowInput('');
      setSelectedAuthorPubkey(followedPubkey);
      setStatus(`Now following ${followedPubkey.slice(0, 12)}...`);
    } catch (error) {
      setStatus(error.message || 'Unable to follow that pubkey.');
    }
  };

  const handleUnfollow = async (followedPubkey) => {
    try {
      const secretHex = await requireSecretHex();
      const nextFollowedPubkeys = followedPubkeys.filter((entry) => entry !== followedPubkey);

      await publishNostrFollowList({
        relays: nostrState.relays,
        secretHex,
        followedPubkeys: nextFollowedPubkeys,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        follows: currentNostr.follows.filter(
          (entry) => !(entry.pubkey === activePubkey && entry.followedPubkey === followedPubkey),
        ),
      }));

      setStatus(`Unfollowed ${followedPubkey.slice(0, 12)}...`);
    } catch (error) {
      setStatus(error.message || 'Unable to update the follow list.');
    }
  };

  const handleAddRelay = () => {
    const url = relayInput.trim();
    if (!url) {
      setStatus('Enter a relay URL first.');
      return;
    }

    patchNostrState((currentNostr) => ({
      ...currentNostr,
      relays: mergeByKey(
        currentNostr.relays,
        [
          {
            id: createId('nostr-relay'),
            url,
            label: url.replace(/^wss?:\/\//, ''),
            read: true,
            write: true,
            enabled: true,
            status: 'idle',
            error: '',
            lastSyncAt: '',
            createdAt: timestampNow(),
            updatedAt: timestampNow(),
          },
        ],
        'url',
      ),
    }));

    setRelayInput('');
    setStatus(`Added relay ${url}.`);
  };

  const toggleRelay = (relayId, key) => {
    patchNostrState((currentNostr) => ({
      ...currentNostr,
      relays: currentNostr.relays.map((relay) =>
        relay.id === relayId ? { ...relay, [key]: !relay[key], updatedAt: timestampNow() } : relay,
      ),
    }));
  };

  const removeRelay = (relayId) => {
    patchNostrState((currentNostr) => ({
      ...currentNostr,
      relays: currentNostr.relays.filter((relay) => relay.id !== relayId),
    }));
  };

  const ensureWalletMirror = useCallback(async ({ pubkey, npub, label, secretHex }) => {
    if (!pubkey || !secretHex) {
      return;
    }

    const nsec = secretHexToNsec(secretHex);
    updateWorkspaceData((current) => {
      const walletId = `nostr-wallet:${pubkey}`;
      const nextWallet = {
        id: walletId,
        label: `${label || 'Nostr identity'} keypair`,
        network: 'Nostr',
        addresses: [npub, pubkey],
        secretMaterial: nsec,
        secretNotes: `ROS Nostr Lounge identity\nnpub: ${npub}\npubkey: ${pubkey}\nsecret: nsec`,
        secret: null,
        updatedAt: timestampNow(),
      };

      const existingIndex = current.wallets.findIndex((wallet) => wallet.id === walletId);
      if (existingIndex === -1) {
        return {
          ...current,
          wallets: [nextWallet, ...current.wallets],
        };
      }

      const wallets = [...current.wallets];
      wallets[existingIndex] = {
        ...wallets[existingIndex],
        ...nextWallet,
      };
      return {
        ...current,
        wallets,
      };
    });
  }, [updateWorkspaceData]);

  const handleExportActiveIdentity = async () => {
    if (!activeIdentity?.pubkey) {
      setStatus('Create or import a Nostr identity before exporting it.');
      return;
    }

    try {
      const loaded = await loadNativeNostrSecret({ pubkey: activeIdentity.pubkey });
      if (!loaded?.secretHex) {
        setStatus('No native secret key was found for the active identity.');
        return;
      }

      const nsec = secretHexToNsec(loaded.secretHex);
      const exported = JSON.stringify(
        {
          label: activeIdentity.label,
          pubkey: activeIdentity.pubkey,
          npub: activeIdentity.npub,
          nsec,
        },
        null,
        2,
      );
      const savedPath = await saveNativeTextFileDialog({
        suggestedName: `${activeIdentity.label.replace(/\s+/g, '-').toLowerCase() || 'nostr-identity'}.nostr.json`,
        content: exported,
      });

      await ensureWalletMirror({
        pubkey: activeIdentity.pubkey,
        npub: activeIdentity.npub,
        label: activeIdentity.label,
        secretHex: loaded.secretHex,
      });

      setStatus(savedPath ? `Nostr identity exported to ${savedPath}.` : 'Nostr identity export canceled.');
    } catch (error) {
      setStatus(error.message || 'Unable to export the active Nostr identity.');
    }
  };

  const handleSaveProfile = async () => {
    if (!activePubkey) {
      setStatus('Create or import a Nostr identity before saving a profile.');
      return;
    }

    if (!profileDraft.name.trim()) {
      setStatus('Give the profile at least a display name first.');
      return;
    }

    try {
      const secretHex = await requireSecretHex();
      const publishedProfile = await publishNostrProfile({
        relays: nostrState.relays,
        secretHex,
        profile: profileDraft,
      });

      patchNostrState((currentNostr) => ({
        ...currentNostr,
        identities: currentNostr.identities.map((identity) =>
          identity.pubkey === activePubkey
            ? { ...identity, label: profileDraft.name.trim(), lastUsedAt: timestampNow() }
            : identity,
        ),
        profiles: mergeByKey(
          currentNostr.profiles,
          [
            {
              ...publishedProfile,
              draftUpdatedAt: timestampNow(),
              publishedAt: timestampNow(),
            },
          ],
          'pubkey',
        ),
      }));

      await ensureWalletMirror({
        pubkey: activePubkey,
        npub: activeIdentity?.npub || '',
        label: profileDraft.name.trim() || activeIdentity?.label || 'Nostr identity',
        secretHex,
      });

      setStatus('Profile published. Reading is live, and posting is now unlocked.');
    } catch (error) {
      setStatus(error.message || 'Unable to publish the profile right now.');
    }
  };

  if (!isNativeDesktop) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.pageBg} p-4 text-slate-100`}>
        <div className={`max-w-xl rounded-[28px] border ${theme.panelBorder} ${theme.panelBg} p-6 text-center`}>
          <div className={`mx-auto inline-flex rounded-2xl border ${theme.heroPill} p-3`}>
            <Radio size={20} />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-white">Nostr Lounge is desktop-native</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            The lounge keeps Nostr secret keys in the native vault, so this app is intentionally limited
            to the Tauri desktop build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto ${theme.pageBg} text-slate-100`}>
      <div className="space-y-3.5 p-3.5">
        <section className={`rounded-[24px] border ${theme.heroBorder} ${theme.heroBg} p-4 shadow-2xl shadow-black/20`}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 rounded-full border bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${theme.heroPill}`}>
                <Radio size={12} />
                after-hours social relay
              </div>
              <h1 className="mt-3 text-[1.85rem] font-semibold tracking-tight text-white">Nostr Lounge</h1>
              <p className={`mt-2 max-w-2xl text-[13px] leading-6 ${theme.accentSoftText}`}>
                A minimalist desk for reading a home timeline, posting quick notes, and staying loosely connected
                after the serious work is done.
              </p>
            </div>

            <div className={`rounded-2xl border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-4 py-3 text-right`}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Active identity</div>
              <div className="mt-1 text-sm font-semibold text-white">{activeIdentity?.label || 'No identity yet'}</div>
              <div className="mt-1 text-[11px] text-slate-500">
                {activeIdentity?.npub ? `${activeIdentity.npub.slice(0, 18)}...` : 'Create or import a key'}
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                {relayUrls.length} readable relay{relayUrls.length === 1 ? '' : 's'} · {timelineEvents.length} cached note{timelineEvents.length === 1 ? '' : 's'}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                {usePersonalTimeline ? 'personal follow feed' : 'global relay feed'}
              </div>
            </div>
          </div>
        </section>

        <div className={`rounded-[22px] border ${theme.panelBorder} ${theme.panelBg} px-4 py-3 text-sm text-slate-300`}>
          {status}
        </div>

        <section className={`rounded-[22px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-[13px] font-semibold ${theme.accentText}`}>Relay diagnostics</div>
              <div className="mt-1 text-[12px] text-slate-500">
                Quick visibility into what the current feed query is doing.
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
              {relayDiagnostics.length || relayUrls.length} relays
            </div>
          </div>

          <div className="mt-3 grid gap-2.5 xl:grid-cols-3">
            {(relayDiagnostics.length
              ? relayDiagnostics
              : relayUrls.map((url) => ({
                  url,
                  phase: 'idle',
                  noteCount: 0,
                  detail: 'Waiting for next refresh.',
                }))).map((relay) => (
              <div
                key={relay.url}
                className={`rounded-[18px] border ${theme.card} px-3 py-3`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">
                    {relay.url.replace(/^wss?:\/\//, '')}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    {relay.phase}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">{relay.detail}</div>
                <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                  {relay.noteCount} notes
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-3.5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <aside className="space-y-3.5">
            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <Plus size={16} />
                Identity
              </div>
              <div className="mt-3 space-y-2.5">
                <input
                  value={identityLabel}
                  onChange={(event) => setIdentityLabel(event.target.value)}
                  placeholder="Operator Lounge"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={handleGenerateIdentity}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${theme.primaryButton}`}
                >
                  <Plus size={15} />
                  Generate keypair
                </button>
              </div>

              <div className="mt-4 space-y-2.5">
                <textarea
                  value={importSecret}
                  onChange={(event) => setImportSecret(event.target.value)}
                  placeholder="Paste nsec or 64-char hex private key"
                  className={`${TEXTAREA} min-h-[84px]`}
                />
                <button
                  type="button"
                  onClick={handleImportIdentity}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${theme.primaryButtonSoft}`}
                >
                  <Import size={15} />
                  Import existing key
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {nostrState.identities.map((identity) => (
                  <button
                    key={identity.pubkey}
                    type="button"
                    onClick={() => markActiveIdentity(identity.pubkey)}
                    className={`w-full rounded-[18px] border px-3 py-2.5 text-left transition ${
                      identity.pubkey === activePubkey ? theme.selectedCard : theme.card
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{identity.label}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      {identity.npub ? `${identity.npub.slice(0, 20)}...` : identity.pubkey.slice(0, 20)}
                    </div>
                  </button>
                ))}
              </div>

              {activeIdentity ? (
                <div className={`mt-4 rounded-[18px] border ${theme.card} px-3 py-3`}>
                  <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
                    <KeyRound size={14} />
                    Active key material
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">npub</div>
                  <div className="mt-1 break-all text-[12px] leading-5 text-slate-300">{activeIdentity.npub}</div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">pubkey</div>
                  <div className="mt-1 break-all text-[12px] leading-5 text-slate-300">{activeIdentity.pubkey}</div>
                  <button
                    type="button"
                    onClick={handleExportActiveIdentity}
                    className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${theme.primaryButtonSoft}`}
                  >
                    <Download size={14} />
                    Export nsec bundle
                  </button>
                </div>
              ) : null}
            </section>

            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <Radio size={16} />
                Basic profile
              </div>
              <p className="mt-2 text-[12px] leading-5 text-slate-500">
                Read first, then write. Set a simple profile here so your posts have a real readable identity.
              </p>
              <div className="mt-3 space-y-2.5">
                <input
                  value={profileDraft.name}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Display name"
                  className={INPUT}
                />
                <input
                  value={profileDraft.nip05}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, nip05: event.target.value }))}
                  placeholder="nip05 (optional)"
                  className={INPUT}
                />
                <textarea
                  value={profileDraft.about}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, about: event.target.value }))}
                  placeholder="Short bio or after-hours note"
                  className={`${TEXTAREA} min-h-[96px]`}
                />
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${theme.primaryButtonSoft}`}
                >
                  <Send size={14} />
                  Save profile
                </button>
                <div className="text-[11px] leading-5 text-slate-500">
                  Draft fields auto-save locally. This button publishes the profile out to your relays.
                </div>
                <div className="rounded-[16px] border border-white/10 bg-black/20 px-3 py-2.5 text-[11px] leading-5 text-slate-400">
                  <div>Local draft: {activeProfile?.draftUpdatedAt ? `${formatEventTime(activeProfile.draftUpdatedAt)} UTC` : 'not saved yet'}</div>
                  <div className="mt-1">
                    Published: {activeProfile?.publishedAt ? `${formatEventTime(activeProfile.publishedAt)} UTC` : 'save profile to publish and unlock posting'}
                  </div>
                </div>
              </div>
            </section>

            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <UserPlus size={16} />
                Follows
              </div>
              <div className="mt-3 space-y-2.5">
                <input
                  value={followInput}
                  onChange={(event) => setFollowInput(event.target.value)}
                  placeholder="npub or hex pubkey"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={handleFollow}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${theme.primaryButtonSoft}`}
                >
                  <UserPlus size={15} />
                  Follow pubkey
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {follows.length ? (
                  follows.map((follow) => {
                    const followProfile = profileMap.get(follow.followedPubkey);
                    return (
                      <div
                        key={follow.id || follow.followedPubkey}
                        className={`rounded-[18px] border ${theme.card} px-3 py-2.5`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedAuthorPubkey(follow.followedPubkey)}
                          className="block text-left"
                        >
                          <div className="text-sm font-semibold text-white">
                            {followProfile?.name || follow.followedPubkey.slice(0, 12)}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{follow.followedPubkey.slice(0, 22)}...</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUnfollow(follow.followedPubkey)}
                          className="mt-2 text-[11px] uppercase tracking-[0.2em] text-amber-300 transition hover:text-amber-200"
                        >
                          unfollow
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                    Follow a few pubkeys to turn this into a real home timeline.
                  </div>
                )}
              </div>
            </section>
          </aside>

          <main className="space-y-3.5">
            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className={`text-[13px] font-semibold ${theme.accentText}`}>Composer</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {replyTarget
                      ? `Replying to ${replyTarget.pubkey.slice(0, 12)}...`
                      : canWrite
                        ? 'Post a short note to your lounge timeline.'
                        : 'Reading is live. Save a basic profile on the left to unlock posting.'}
                  </div>
                </div>
                <div className="flex gap-2">
                  {replyTarget ? (
                    <button
                      type="button"
                      onClick={() => setReplyTargetId('')}
                      className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.secondaryButton}`}
                    >
                      Clear reply
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={syncTimeline}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.primaryButtonSoft} ${isSyncing ? 'opacity-60' : ''}`}
                  >
                    <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
              </div>
              <textarea
                value={composerBody}
                onChange={(event) => setComposerBody(event.target.value)}
                placeholder="What’s worth saying after hours?"
                disabled={!canWrite}
                className={`${TEXTAREA} mt-3`}
              />
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!canWrite}
                  className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${theme.primaryButton} ${canWrite ? '' : 'cursor-not-allowed opacity-60'}`}
                >
                  <Send size={15} />
                  {replyTarget ? 'Publish reply' : 'Publish note'}
                </button>
              </div>
            </section>

            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className={`text-[13px] font-semibold ${theme.accentText}`}>Home timeline</div>
                  <div className="mt-1 text-[12px] text-slate-500">
                    {usePersonalTimeline
                      ? 'Followed authors plus your own posts, cached locally for quick rereads.'
                      : 'Live relay feed first. Follow people to turn this into a more personal home timeline.'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                    {timelineEvents.length} notes
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-cyan-300">
                    {usePersonalTimeline ? 'personal follow feed' : 'global relay feed'}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {timelineEvents.length ? (
                  timelineEvents.map((eventItem) => {
                    const authorProfile = profileMap.get(eventItem.pubkey);
                    return (
                      <article
                        key={eventItem.id}
                        className={`rounded-[22px] border ${theme.card} p-4`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedAuthorPubkey(eventItem.pubkey)}
                            className="text-left"
                          >
                            <div className="text-sm font-semibold text-white">
                              {authorProfile?.name || eventItem.pubkey.slice(0, 12)}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {formatEventTime(eventItem.createdAt)} UTC
                            </div>
                          </button>
                          {eventItem.replyToId ? (
                            <div className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-slate-400">
                              reply
                            </div>
                          ) : null}
                        </div>

                        <p className="mt-3 whitespace-pre-wrap text-[14px] leading-7 text-slate-100">{eventItem.content}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReplyTargetId(eventItem.id)}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.primaryButtonSoft}`}
                          >
                            <MessageCircle size={14} />
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReact(eventItem)}
                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.primaryButtonSoft}`}
                          >
                            <Heart size={14} />
                            {reactionCounts.get(eventItem.id) ?? 0}
                          </button>
                          {eventItem.pubkey ? (
                            <button
                              type="button"
                              onClick={() => window.open(`https://njump.me/${eventItem.pubkey}`, '_blank', 'noopener,noreferrer')}
                              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition ${theme.secondaryButton}`}
                            >
                              <ExternalLink size={14} />
                              Profile
                            </button>
                          ) : null}
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                    No cached notes yet. Refresh the global relay feed, then follow people to make this timeline more personal.
                  </div>
                )}
              </div>
            </section>
          </main>

          <aside className="space-y-3.5">
            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <Radio size={16} />
                Profile & presence
              </div>
              <div className="mt-3 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                <div className="text-lg font-semibold text-white">
                  {selectedAuthor?.name || (selectedAuthorPubkey ? selectedAuthorPubkey.slice(0, 14) : 'No author selected')}
                </div>
                {selectedAuthorPubkey === activePubkey ? (
                  <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-cyan-300">
                    {selectedAuthor?.publishedAt ? 'published profile' : 'local draft only'}
                  </div>
                ) : null}
                <div className="mt-1 text-[11px] text-slate-500">
                  {selectedAuthorPubkey ? `${selectedAuthorPubkey.slice(0, 26)}...` : 'Select an author from the timeline or follows list.'}
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {selectedAuthor?.about || 'No profile metadata cached yet for this author.'}
                </p>
                {selectedAuthor?.nip05 ? (
                  <div className="mt-3 text-[11px] uppercase tracking-[0.2em] text-emerald-300">
                    {selectedAuthor.nip05}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {selectedAuthorEvents.length ? (
                  selectedAuthorEvents.map((eventItem) => (
                    <div
                      key={eventItem.id}
                      className={`rounded-[18px] border ${theme.card} px-3 py-2.5`}
                    >
                      <div className="text-[11px] text-slate-500">{formatEventTime(eventItem.createdAt)} UTC</div>
                      <div className="mt-2 line-clamp-4 text-sm leading-6 text-slate-100">{eventItem.content}</div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
                    This author does not have cached notes yet.
                  </div>
                )}
              </div>
            </section>

            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <Plus size={16} />
                Relay desk
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={relayInput}
                  onChange={(event) => setRelayInput(event.target.value)}
                  placeholder="wss://relay.example"
                  className={INPUT}
                />
                <button
                  type="button"
                  onClick={handleAddRelay}
                  className={`rounded-2xl px-3 text-sm font-semibold transition ${theme.primaryButton}`}
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {nostrState.relays.map((relay) => (
                  <div
                    key={relay.id}
                    className={`rounded-[18px] border ${theme.card} px-3 py-3`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{relay.label}</div>
                        <div className="mt-1 text-[11px] text-slate-500">{relay.url}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRelay(relay.id)}
                        className="text-[11px] uppercase tracking-[0.2em] text-slate-500 transition hover:text-white"
                      >
                        remove
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRelay(relay.id, 'enabled')}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${relay.enabled ? theme.primaryButtonSoft : theme.secondaryButton}`}
                      >
                        {relay.enabled ? 'enabled' : 'disabled'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRelay(relay.id, 'read')}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${relay.read ? theme.primaryButtonSoft : theme.secondaryButton}`}
                      >
                        read
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleRelay(relay.id, 'write')}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${relay.write ? theme.primaryButtonSoft : theme.secondaryButton}`}
                      >
                        write
                      </button>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-500">
                      {relay.status || 'idle'}
                      {relay.lastSyncAt ? ` · synced ${formatEventTime(relay.lastSyncAt)} UTC` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default NostrLoungeApp;
