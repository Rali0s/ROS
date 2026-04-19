/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FilePlus2,
  FlaskConical,
  KeyRound,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { isNativeVaultRuntime, openNativeTextFileDialog, saveNativeTextFileDialog } from '../utils/nativeVault';
import { createId, useWorkspaceData } from '../utils/workspaceStore';

const INPUT =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white outline-none transition focus:border-cyan-300/35';
const TEXTAREA = `${INPUT} resize-none`;

const NAME_PREFIXES = [
  'Aven',
  'Kael',
  'Neris',
  'Soren',
  'Vale',
  'Tarin',
  'Mira',
  'Riven',
  'Lucan',
  'Selene',
];

const NAME_SUFFIXES = [
  'Soryn',
  'Meriden',
  'Vale',
  'Noctis',
  'Ardent',
  'Voss',
  'Kestrel',
  'Morrow',
  'Thane',
  'Ilyr',
];

const ROLE_SUFFIXES = ['Relay', 'Cipher', 'Desk', 'Signal', 'Node', 'Watch'];

const createPilotName = () => {
  const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
  const role = ROLE_SUFFIXES[Math.floor(Math.random() * ROLE_SUFFIXES.length)];
  return `${prefix} ${suffix} ${role}`;
};

const CommsApp = () => {
  const {
    data,
    session,
    clearWorkspaceNavigation,
    updateWorkspaceData,
    createCommsIdentity,
    rotateCommsIdentity,
    exportIdentityCard,
    importPeerCard,
    verifyPeer,
    createConversation,
    saveCommsDraft,
    sendCommsMessage,
    fetchRelayMessages,
    attachFileToConversation,
    deleteCommsMessage,
    deleteCommsAttachment,
  } = useWorkspaceData();
  const theme = getAppInteriorTheme(data.settings.theme);
  const isNativeDesktop = isNativeVaultRuntime() && session.backend === 'tauri-native';
  const [selectedConversationId, setSelectedConversationId] = useState(data.comms.conversations[0]?.id ?? null);
  const [selectedIdentityId, setSelectedIdentityId] = useState(data.comms.identities[0]?.id ?? '');
  const [selectedPeerId, setSelectedPeerId] = useState(data.comms.peers[0]?.id ?? '');
  const [identityForm, setIdentityForm] = useState({
    profileId: data.profiles[0]?.id ?? '',
    displayName: createPilotName(),
    relayHints: 'ros://dead-drop/local',
    directHints: '',
  });
  const [conversationForm, setConversationForm] = useState({
    title: '',
    tags: '',
  });
  const [relayForm, setRelayForm] = useState({
    id: null,
    label: '',
    relayUrl: '',
    networkZone: 'LOCAL',
    priority: 1,
    requiresManualApproval: false,
    maxRetentionHours: data.settings.commsRetentionHours || 168,
    status: 'standby',
  });
  const [draftBody, setDraftBody] = useState('');
  const [status, setStatus] = useState(
    'ROS Comms runs as a local dead-drop console. Identities, peers, threads, and attachments stay inside the encrypted workspace.',
  );

  useEffect(() => {
    if (session.navigation?.appKey !== 'comms') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedConversationId(session.navigation.itemId);
      setTimeout(() => {
        document.getElementById(`conversation-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      }, 0);
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  useEffect(() => {
    if (!data.comms.conversations.find((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(data.comms.conversations[0]?.id ?? null);
    }
  }, [data.comms.conversations, selectedConversationId]);

  useEffect(() => {
    if (!data.comms.identities.find((identity) => identity.id === selectedIdentityId)) {
      setSelectedIdentityId(data.comms.identities[0]?.id ?? '');
    }
  }, [data.comms.identities, selectedIdentityId]);

  useEffect(() => {
    if (!data.comms.peers.find((peer) => peer.id === selectedPeerId)) {
      setSelectedPeerId(data.comms.peers[0]?.id ?? '');
    }
  }, [data.comms.peers, selectedPeerId]);

  const selectedConversation =
    data.comms.conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;

  const conversationMessages = useMemo(
    () =>
      data.comms.messages
        .filter((message) => message.conversationId === selectedConversationId)
        .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt)),
    [data.comms.messages, selectedConversationId],
  );

  const conversationAttachments = useMemo(
    () =>
      data.comms.attachmentRefs.filter((attachment) => attachment.sourceRecordId === selectedConversationId),
    [data.comms.attachmentRefs, selectedConversationId],
  );

  const libraryCandidates = useMemo(
    () => data.library.filter((entry) => entry.fileVaultId),
    [data.library],
  );
  const relays = useMemo(
    () => [...(data.comms.relays ?? [])].sort((left, right) => left.priority - right.priority),
    [data.comms.relays],
  );
  const cypherMode = data.settings.theme === 'cypher';

  const preventClipboardIfBlocked = (event) => {
    if (data.settings.commsAllowClipboard) {
      return;
    }

    event.preventDefault();
    setStatus('Clipboard access is blocked for ROS Comms by current policy.');
  };

  const handleCreateIdentity = async (event) => {
    event.preventDefault();

    if (!identityForm.profileId || !identityForm.displayName.trim()) {
      setStatus('Choose a profile and identity display name before creating a CypherID.');
      return;
    }

    try {
      await createCommsIdentity({
        profileId: identityForm.profileId,
        displayName: identityForm.displayName.trim(),
        relayHints: identityForm.relayHints
          .split('\n')
          .map((entry) => entry.trim())
          .filter(Boolean),
        directHints: identityForm.directHints
          .split('\n')
          .map((entry) => entry.trim())
          .filter(Boolean),
        networkPolicy: { relay: true, direct: false },
        trustPolicy: { requireVerifiedPeer: data.settings.commsRequireVerifiedPeer },
      });
      setIdentityForm((current) => ({
        ...current,
        displayName: createPilotName(),
      }));
      setStatus('ROS comms identity created and sealed into the native vault.');
    } catch (error) {
      setStatus(error.message || 'Unable to create the ROS comms identity.');
    }
  };

  const handleExportIdentity = async (identityId) => {
    try {
      const exported = await exportIdentityCard({ identityId });
      if (!exported?.serialized) {
        setStatus('Unable to export that identity card.');
        return;
      }

      const identity = data.comms.identities.find((entry) => entry.id === identityId);
      const fileName = `${identity?.keyId || 'ros-identity'}.roscard.json`;
      const savedPath = await saveNativeTextFileDialog({
        suggestedName: fileName,
        content: exported.serialized,
      });

      setStatus(savedPath ? `Identity card exported to ${savedPath}.` : 'Identity export canceled.');
    } catch (error) {
      setStatus(error.message || 'Unable to export the identity card.');
    }
  };

  const handleImportPeer = async () => {
    try {
      const selected = await openNativeTextFileDialog({
        allowExtensions: ['json', 'roscard'],
      });
      if (!selected) {
        setStatus('Peer card import canceled.');
        return;
      }

      await importPeerCard({
        source: selected.content,
        trustMode: 'known-unverified',
      });
      setStatus(`Peer card imported from ${selected.name}.`);
    } catch (error) {
      setStatus(error.message || 'Unable to import the peer card.');
    }
  };

  const handleVerifyPeer = async (peer) => {
    try {
      await verifyPeer({
        peerId: peer.id,
        fingerprint: peer.knownFingerprints[0] || '',
        keyId: peer.knownKeyIds[0] || '',
      });
      setStatus(`${peer.displayName} marked as verified.`);
    } catch (error) {
      setStatus(error.message || 'Unable to verify that peer.');
    }
  };

  const handleCreateConversation = async (event) => {
    event.preventDefault();

    if (!selectedIdentityId || !selectedPeerId) {
      setStatus('Select both a local identity and a peer before creating a conversation.');
      return;
    }

    try {
      await createConversation({
        localIdentityId: selectedIdentityId,
        peerId: selectedPeerId,
        title: conversationForm.title.trim(),
        tags: conversationForm.tags
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
        requireVerifiedPeer: data.settings.commsRequireVerifiedPeer,
      });
      setConversationForm({
        title: '',
        tags: '',
      });
      setStatus('Conversation created in the local dead-drop console.');
    } catch (error) {
      setStatus(error.message || 'Unable to create the conversation.');
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedConversationId) {
      setStatus('Select a conversation before saving a draft.');
      return;
    }

    try {
      await saveCommsDraft({
        conversationId: selectedConversationId,
        draft: {
          id: createId('draft'),
          body: draftBody,
          attachmentRefs: conversationAttachments.map((attachment) => attachment.id),
        },
      });
      setStatus('Draft saved into the encrypted comms compartment.');
    } catch (error) {
      setStatus(error.message || 'Unable to save the draft.');
    }
  };

  const handleSend = async () => {
    if (!selectedConversationId || !draftBody.trim()) {
      setStatus('Select a conversation and enter a message before sending.');
      return;
    }

    try {
      await sendCommsMessage({
        conversationId: selectedConversationId,
        draft: {
          body: draftBody.trim(),
          attachmentRefs: conversationAttachments.map((attachment) => attachment.id),
          policy: {
            requireVerifiedPeer: data.settings.commsRequireVerifiedPeer,
          },
        },
        deliveryMode: data.settings.commsDefaultRelayMode,
      });
      setDraftBody('');
      setStatus('Envelope sealed and queued in the local dead-drop outbox.');
    } catch (error) {
      setStatus(error.message || 'Unable to send the message.');
    }
  };

  const handleFetchRelay = async () => {
    try {
      await fetchRelayMessages();
      setStatus('Relay queue checked and matching envelopes were imported.');
    } catch (error) {
      setStatus(error.message || 'Unable to fetch relay envelopes.');
    }
  };

  const handleAttachLibraryItem = async (entry) => {
    if (!selectedConversationId) {
      setStatus('Create or select a conversation before attaching a file-vault item.');
      return;
    }

    try {
      await attachFileToConversation({
        conversationId: selectedConversationId,
        fileBlobId: entry.fileVaultId,
        displayName: entry.fileName || entry.title,
        mediaType: entry.vaultMimeType || 'application/octet-stream',
        byteLength: 0,
        integrityHash: `vault:${entry.fileVaultId}`,
      });
      setStatus(`${entry.title} linked from the encrypted file vault.`);
    } catch (error) {
      setStatus(error.message || 'Unable to attach that file-vault item.');
    }
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await deleteCommsMessage({
        messageId,
        deleteMode: data.settings.fileVaultDeleteMode,
      });
      setStatus('Message removed from the local conversation view.');
    } catch (error) {
      setStatus(error.message || 'Unable to delete the message.');
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await deleteCommsAttachment({
        attachmentId,
        deleteMode: data.settings.fileVaultDeleteMode,
      });
      setStatus('Attachment reference removed using the configured vault delete mode.');
    } catch (error) {
      setStatus(error.message || 'Unable to remove the attachment reference.');
    }
  };

  const resetRelayForm = () => {
    setRelayForm({
      id: null,
      label: '',
      relayUrl: '',
      networkZone: 'LOCAL',
      priority: (relays.at(-1)?.priority || 0) + 1,
      requiresManualApproval: false,
      maxRetentionHours: data.settings.commsRetentionHours || 168,
      status: 'standby',
    });
  };

  const handleRelaySave = (event) => {
    event.preventDefault();

    if (!relayForm.label.trim() || !relayForm.relayUrl.trim()) {
      setStatus('Relay label and endpoint are required.');
      return;
    }

    const relayId = relayForm.id || createId('relay');
    const relayRecord = {
      id: relayId,
      routeId: relayId,
      label: relayForm.label.trim(),
      relayUrl: relayForm.relayUrl.trim(),
      networkZone: relayForm.networkZone,
      priority: Number(relayForm.priority) > 0 ? Number(relayForm.priority) : relays.length + 1,
      requiresManualApproval: Boolean(relayForm.requiresManualApproval),
      maxRetentionHours: Number(relayForm.maxRetentionHours) > 0 ? Number(relayForm.maxRetentionHours) : 168,
      status: relayForm.status,
    };

    updateWorkspaceData((current) => {
      const currentRelays = current.comms?.relays ?? [];
      const nextRelays = currentRelays.some((relay) => relay.id === relayRecord.id)
        ? currentRelays.map((relay) => (relay.id === relayRecord.id ? relayRecord : relay))
        : [...currentRelays, relayRecord];

      return {
        ...current,
        comms: {
          ...current.comms,
          relays: nextRelays,
        },
      };
    });

    setStatus(relayForm.id ? 'Relay host updated.' : 'Relay host added to the local roster.');
    resetRelayForm();
  };

  const handleRelayEdit = (relay) => {
    setRelayForm({
      id: relay.id,
      label: relay.label,
      relayUrl: relay.relayUrl,
      networkZone: relay.networkZone,
      priority: relay.priority,
      requiresManualApproval: Boolean(relay.requiresManualApproval),
      maxRetentionHours: relay.maxRetentionHours,
      status: relay.status,
    });
    setStatus(`Editing relay ${relay.label}.`);
  };

  const handleRelayDelete = (relayId) => {
    updateWorkspaceData((current) => ({
      ...current,
      comms: {
        ...current.comms,
        relays: (current.comms?.relays ?? []).filter((relay) => relay.id !== relayId),
      },
    }));
    if (relayForm.id === relayId) {
      resetRelayForm();
    }
    setStatus('Relay host removed from the local roster.');
  };

  const handleRelayToggle = (relayId, nextStatus) => {
    updateWorkspaceData((current) => ({
      ...current,
      comms: {
        ...current.comms,
        relays: (current.comms?.relays ?? []).map((relay) =>
          relay.id === relayId
            ? {
                ...relay,
                status: nextStatus,
              }
            : relay,
        ),
      },
    }));
    setStatus(`Relay status changed to ${nextStatus}.`);
  };

  const handleRelayMove = (relayId, direction) => {
    updateWorkspaceData((current) => {
      const ordered = [...(current.comms?.relays ?? [])].sort((left, right) => left.priority - right.priority);
      const index = ordered.findIndex((relay) => relay.id === relayId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= ordered.length) {
        return current;
      }

      const [selected] = ordered.splice(index, 1);
      ordered.splice(targetIndex, 0, selected);
      const reprioritized = ordered.map((relay, priorityIndex) => ({
        ...relay,
        priority: priorityIndex + 1,
      }));

      return {
        ...current,
        comms: {
          ...current.comms,
          relays: reprioritized,
        },
      };
    });
    setStatus(`Relay priority updated.`);
  };

  if (!isNativeDesktop) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.pageBg} p-8 text-slate-200`}>
        <div className={`max-w-2xl rounded-[28px] border ${theme.heroBorder} ${theme.heroBg} p-8`}>
          <div className={`inline-flex rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] ${theme.heroPill}`}>
            Native desktop required
          </div>
          <h2 className="mt-6 text-3xl font-semibold text-white">ROS Comms lives behind the native vault boundary</h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            This app depends on the Rust secure core for CypherID generation, envelope sealing, peer-card import, and
            dead-drop queue handling. Open ROS through the desktop runtime to use the comms console.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-full min-h-0 ${theme.pageBg} text-slate-100 ${cypherMode ? 'text-[12px]' : ''}`}>
      <aside className={`flex w-[16.5rem] flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} ${cypherMode ? 'bg-[rgba(6,18,22,0.92)]' : ''} p-3`}>
        <div className={`rounded-[24px] border ${theme.heroBorder} ${theme.heroBg} ${cypherMode ? 'bg-[linear-gradient(135deg,rgba(5,24,28,0.92),rgba(6,18,22,0.84)_55%,rgba(2,10,14,0.96)_100%)] shadow-[0_0_40px_rgba(34,211,238,0.08)]' : ''} p-3`}>
          <div className={`inline-flex rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.28em] ${theme.heroPill}`}>
            CypherID-bound dead-drop
          </div>
          <h2 className={`mt-3 font-semibold text-white ${cypherMode ? 'text-[1.15rem] tracking-[0.08em] uppercase' : 'text-2xl'}`}>ROS Comms</h2>
          <p className={`mt-2.5 leading-6 text-slate-300 ${cypherMode ? 'text-[11px]' : 'text-sm'}`}>
            Peer-native, relay-first messaging where identities, envelopes, and attachments stay inside the encrypted
            workspace.
          </p>
          <div className={`mt-3 grid grid-cols-2 gap-2.5 ${cypherMode ? 'text-[11px]' : 'text-sm'}`}>
            <div className={`rounded-2xl border ${theme.panelBorder} ${theme.panelMutedBg} p-3`}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Identities</div>
              <div className={`mt-1.5 font-semibold text-white ${cypherMode ? 'text-[1.25rem]' : 'text-2xl'}`}>{data.comms.identities.length}</div>
            </div>
            <div className={`rounded-2xl border ${theme.panelBorder} ${theme.panelMutedBg} p-3`}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Known nodes</div>
              <div className={`mt-1.5 font-semibold text-white ${cypherMode ? 'text-[1.25rem]' : 'text-2xl'}`}>{data.comms.peers.length}</div>
            </div>
          </div>
        </div>

        <div className="mt-3.5 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleImportPeer}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${theme.primaryButtonSoft}`}
            >
              <Upload className="h-4 w-4" />
              Import peer card
            </button>
            <button
              type="button"
              onClick={handleFetchRelay}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${theme.secondaryButton}`}
            >
              <RefreshCcw className="h-4 w-4" />
              Fetch relay
            </button>
          </div>

          <div className="mt-3.5 rounded-[22px] border border-cyan-400/12 bg-black/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-200">Relay hosts</div>
              <button
                type="button"
                onClick={resetRelayForm}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.secondaryButton}`}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </button>
            </div>
            <form className="mt-3 space-y-2" onSubmit={handleRelaySave}>
              <input
                className={INPUT}
                value={relayForm.label}
                onChange={(event) => setRelayForm((current) => ({ ...current, label: event.target.value }))}
                placeholder="Relay label"
              />
              <input
                className={INPUT}
                value={relayForm.relayUrl}
                onChange={(event) => setRelayForm((current) => ({ ...current, relayUrl: event.target.value }))}
                placeholder="ros://dead-drop/local"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={INPUT}
                  value={relayForm.networkZone}
                  onChange={(event) => setRelayForm((current) => ({ ...current, networkZone: event.target.value }))}
                >
                  {['LOCAL', 'TOR', 'I2P', 'FREENET', 'CLEAR'].map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
                <select
                  className={INPUT}
                  value={relayForm.status}
                  onChange={(event) => setRelayForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {['online', 'standby', 'disabled'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  className={INPUT}
                  value={relayForm.priority}
                  onChange={(event) => setRelayForm((current) => ({ ...current, priority: Number(event.target.value) || 1 }))}
                  placeholder="Priority"
                />
                <input
                  type="number"
                  min="1"
                  className={INPUT}
                  value={relayForm.maxRetentionHours}
                  onChange={(event) =>
                    setRelayForm((current) => ({ ...current, maxRetentionHours: Number(event.target.value) || 168 }))
                  }
                  placeholder="Retention hours"
                />
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={relayForm.requiresManualApproval}
                  onChange={(event) =>
                    setRelayForm((current) => ({ ...current, requiresManualApproval: event.target.checked }))
                  }
                />
                Require manual approval
              </label>
              <button
                type="submit"
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ${theme.primaryButtonSoft}`}
              >
                <Save className="h-3.5 w-3.5" />
                {relayForm.id ? 'Update relay' : 'Add relay'}
              </button>
            </form>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {relays.map((relay, index) => (
                <div key={relay.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-white">{relay.label}</div>
                    <div className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                      relay.status === 'online'
                        ? 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
                        : relay.status === 'disabled'
                          ? 'border-red-400/20 bg-red-500/10 text-red-100'
                          : 'border-white/10 bg-white/5 text-slate-400'
                    }`}>
                      {relay.status}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{relay.relayUrl}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    <span>{relay.networkZone}</span>
                    <span>•</span>
                    <span>prio {relay.priority}</span>
                    <span>•</span>
                    <span>{relay.maxRetentionHours}h hold</span>
                    <span>•</span>
                    <span>{relay.requiresManualApproval ? 'manual' : 'auto'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRelayMove(relay.id, 'up')}
                      disabled={index === 0}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.secondaryButton} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelayMove(relay.id, 'down')}
                      disabled={index === relays.length - 1}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.secondaryButton} disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelayEdit(relay)}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.primaryButtonSoft}`}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelayToggle(relay.id, relay.status === 'disabled' ? 'standby' : 'disabled')}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.secondaryButton}`}
                    >
                      {relay.status === 'disabled' ? 'Enable' : 'Disable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRelayDelete(relay.id)}
                      className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-medium ${theme.secondaryButton}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs uppercase tracking-[0.28em] text-slate-500">Conversations</div>
            <div className="mt-3 space-y-2">
              {data.comms.conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                return (
                  <button
                    key={conversation.id}
                    id={`conversation-${conversation.id}`}
                    type="button"
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full rounded-2xl border ${cypherMode ? 'p-3' : 'p-4'} text-left transition ${
                      isActive ? theme.selectedCard : theme.card
                    }`}
                  >
                    <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>{conversation.title}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                      {conversation.peerDisplayName || conversation.peerKeyId || 'Pending peer'}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleString()
                        : 'No relay activity yet'}
                    </div>
                  </button>
                );
              })}
              {!data.comms.conversations.length ? (
                <div className={`rounded-2xl border border-dashed ${theme.panelBorder} bg-black/10 p-4 text-sm text-slate-500`}>
                  No conversations yet.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <main className={`grid min-h-0 flex-1 grid-cols-[0.82fr_1.46fr_0.88fr] ${cypherMode ? 'gap-3 p-3' : 'gap-5 p-5'}`}>
        <section className={`min-h-0 rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} ${cypherMode ? 'bg-[rgba(7,20,24,0.82)] p-3.5' : 'p-5'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-xs uppercase tracking-[0.28em] ${theme.accentText}`}>Local identities</div>
              <div className={`mt-1.5 font-semibold text-white ${cypherMode ? 'text-[14px] uppercase tracking-[0.08em]' : 'text-lg'}`}>Workspace CypherIDs</div>
            </div>
          </div>

          <form className="mt-3.5 space-y-2" onSubmit={handleCreateIdentity}>
            <select
              className={INPUT}
              value={identityForm.profileId}
              onChange={(event) => setIdentityForm((current) => ({ ...current, profileId: event.target.value }))}
            >
              <option value="">Choose profile</option>
              {data.profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
            <input
              className={INPUT}
              value={identityForm.displayName}
              onChange={(event) => setIdentityForm((current) => ({ ...current, displayName: event.target.value }))}
              placeholder="Randomized operator handle"
            />
            <button
              type="button"
              onClick={() => setIdentityForm((current) => ({ ...current, displayName: createPilotName() }))}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${theme.secondaryButton}`}
            >
              <FlaskConical className="h-3.5 w-3.5" />
              Randomize handle
            </button>
            <textarea
              className={TEXTAREA}
              rows={3}
              value={identityForm.relayHints}
              onChange={(event) => setIdentityForm((current) => ({ ...current, relayHints: event.target.value }))}
              placeholder="Relay hints, one per line"
            />
            <textarea
              className={TEXTAREA}
              rows={2}
              value={identityForm.directHints}
              onChange={(event) => setIdentityForm((current) => ({ ...current, directHints: event.target.value }))}
              placeholder="Direct endpoint hints, one per line"
            />
            <button type="submit" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${theme.primaryButton}`}>
              <UserPlus className="h-4 w-4" />
              Create identity
            </button>
          </form>

          <div className="mt-3.5 space-y-2 overflow-y-auto">
            {data.comms.identities.map((identity) => (
              <div key={identity.id} className={`rounded-2xl border ${theme.card} ${cypherMode ? 'p-3' : 'p-4'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>{identity.displayName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{identity.keyId}</div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.22em] ${theme.tag}`}>
                    {identity.rotationState}
                  </div>
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-400">{identity.fingerprint.slice(0, 32)}…</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIdentityId(identity.id)}
                    className={`rounded-xl px-3 py-2 text-[11px] font-medium ${theme.secondaryButton}`}
                  >
                    Use for new thread
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportIdentity(identity.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ${theme.primaryButtonSoft}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export card
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateCommsIdentity(identity.id).catch((error) => setStatus(error.message || 'Unable to rotate the identity.'))}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ${theme.secondaryButton}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Rotate
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`flex min-h-0 flex-col rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} ${cypherMode ? 'bg-[rgba(7,20,24,0.78)] p-3.5' : 'p-5'}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`text-xs uppercase tracking-[0.28em] ${theme.accentText}`}>Dead-drop thread</div>
              <div className={`mt-1.5 font-semibold text-white ${cypherMode ? 'text-[1.05rem] uppercase tracking-[0.08em]' : 'text-2xl'}`}>
                {selectedConversation?.title || 'Choose a conversation'}
              </div>
              <div className={`mt-1.5 text-slate-400 ${cypherMode ? 'text-[11px]' : 'text-sm'}`}>
                {selectedConversation
                  ? `${selectedConversation.peerDisplayName || selectedConversation.peerKeyId} · ${selectedConversation.deliveryMode}`
                  : 'Messages are sealed as envelopes and queued through the local relay-first workflow.'}
              </div>
            </div>
            <div className={`rounded-2xl border ${theme.panelBorder} ${theme.panelMutedBg} px-4 py-3 text-right`}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Outbox</div>
              <div className={`mt-1.5 font-semibold text-white ${cypherMode ? 'text-[1.15rem]' : 'text-2xl'}`}>{data.comms.outbox.length}</div>
            </div>
          </div>

          <div className={`mt-3.5 rounded-[22px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
            <div className="flex items-center justify-between gap-3">
              <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>Compose envelope</div>
              <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {data.settings.commsRequireVerifiedPeer ? 'Verified peers required' : 'Known peers allowed'}
              </div>
            </div>
            <textarea
              className={`${TEXTAREA} mt-4`}
              rows={cypherMode ? 5 : 6}
              value={draftBody}
              onChange={(event) => setDraftBody(event.target.value)}
              onCopy={preventClipboardIfBlocked}
              onCut={preventClipboardIfBlocked}
              onPaste={preventClipboardIfBlocked}
              placeholder="Message body stored only inside the encrypted workspace"
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${theme.secondaryButton}`}
              >
                <Save className="h-4 w-4" />
                Save draft
              </button>
              <button
                type="button"
                onClick={handleSend}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${theme.primaryButton}`}
              >
                <Send className="h-4 w-4" />
                Seal envelope
              </button>
            </div>
          </div>

          <div className="mt-3.5 min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-2.5">
              {conversationMessages.map((message) => (
                <div key={message.id} className={`rounded-2xl border ${theme.card} ${cypherMode ? 'p-3' : 'p-4'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>
                      {message.direction === 'inbound' ? 'Inbound envelope' : 'Outbound envelope'}
                    </div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{message.status}</div>
                  </div>
                  <div
                    className={`mt-3 leading-6 text-slate-200 ${cypherMode ? 'text-[12px]' : 'text-sm'} ${data.settings.commsAllowClipboard ? '' : 'select-none'}`}
                    onCopy={preventClipboardIfBlocked}
                    onCut={preventClipboardIfBlocked}
                    onContextMenu={preventClipboardIfBlocked}
                  >
                    {message.preview || 'No preview available.'}
                  </div>
                  <div className="mt-3 text-xs text-slate-500">
                    Seq {message.sequenceNumber} · {message.senderKeyId} → {message.recipientKeyId}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeleteMessage(message.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ${theme.secondaryButton}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {!conversationMessages.length ? (
                <div className={`rounded-2xl border border-dashed ${theme.panelBorder} bg-black/10 p-6 text-sm text-slate-500`}>
                  No envelopes stored for this thread yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className={`min-h-0 rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} ${cypherMode ? 'bg-[rgba(7,20,24,0.82)] p-3.5' : 'p-5'}`}>
          <div className={`text-xs uppercase tracking-[0.28em] ${theme.accentText}`}>Directory and attachments</div>

          <div className="mt-3.5 grid gap-3.5">
            <form onSubmit={handleCreateConversation} className={`rounded-[22px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
              <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>Start thread</div>
              <div className="mt-4 space-y-2.5">
                <select className={INPUT} value={selectedIdentityId} onChange={(event) => setSelectedIdentityId(event.target.value)}>
                  <option value="">Choose local identity</option>
                  {data.comms.identities.map((identity) => (
                    <option key={identity.id} value={identity.id}>
                      {identity.displayName} · {identity.keyId}
                    </option>
                  ))}
                </select>
                <select className={INPUT} value={selectedPeerId} onChange={(event) => setSelectedPeerId(event.target.value)}>
                  <option value="">Choose peer</option>
                  {data.comms.peers.map((peer) => (
                    <option key={peer.id} value={peer.id}>
                      {peer.displayName} · {peer.knownKeyIds[0] || 'No CYD'}
                    </option>
                  ))}
                </select>
                <input
                  className={INPUT}
                  value={conversationForm.title}
                  onChange={(event) => setConversationForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Optional thread title"
                />
                <input
                  className={INPUT}
                  value={conversationForm.tags}
                  onChange={(event) => setConversationForm((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="Tags, comma separated"
                />
                <button type="submit" className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium ${theme.primaryButtonSoft}`}>
                  <KeyRound className="h-4 w-4" />
                  Create thread
                </button>
              </div>
            </form>

            <div className={`rounded-[22px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
              <div className="flex items-center justify-between gap-3">
                <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>Known ROS terminals</div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {data.comms.peers.length} stored
                </div>
              </div>
              <div className="mt-3.5 space-y-2 max-h-64 overflow-y-auto pr-1">
                {data.comms.peers.map((peer) => (
                  <div key={peer.id} className={`rounded-2xl border ${theme.card} ${cypherMode ? 'p-3' : 'p-4'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>{peer.displayName}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                          {peer.knownKeyIds[0] || 'No CYD'}
                        </div>
                      </div>
                      <div className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${
                        peer.verificationState === 'verified'
                          ? 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
                          : peer.verificationState === 'warning'
                            ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                            : theme.tag
                      }`}>
                        {peer.verificationState}
                      </div>
                    </div>
                    <div className="mt-3 text-xs leading-5 text-slate-400">{(peer.knownFingerprints[0] || '').slice(0, 32)}…</div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      {(peer.relayHints?.[0] || 'No relay hint')} · {peer.trustNotes || 'No trust note'}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyPeer(peer)}
                        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ${theme.primaryButtonSoft}`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[22px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
              <div className="flex items-center justify-between gap-3">
                <div className={`${cypherMode ? 'text-[12px]' : 'text-sm'} font-semibold text-white`}>Attachment refs</div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{conversationAttachments.length} linked</div>
              </div>
              <div className="mt-4 space-y-2">
                {conversationAttachments.map((attachment) => (
                  <div key={attachment.id} className={`rounded-2xl border ${theme.card} p-3`}>
                    <div className="text-sm font-medium text-white">{attachment.displayName}</div>
                    <div className="mt-1 text-xs text-slate-400">{attachment.mediaType}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(attachment.id)}
                      className={`mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${theme.secondaryButton}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete ref
                    </button>
                  </div>
                ))}
                {!conversationAttachments.length ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-500">
                    No file-vault attachments linked to this thread.
                  </div>
                ) : null}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Encrypted file-vault candidates</div>
                <div className="mt-3 space-y-2">
                  {libraryCandidates.slice(0, 6).map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleAttachLibraryItem(entry)}
                      className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${theme.card}`}
                    >
                      <div>
                        <div className="text-sm font-medium text-white">{entry.title}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {entry.format.toUpperCase()} · stored in encrypted file vault
                        </div>
                      </div>
                      <FilePlus2 className="h-4 w-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-5 py-2 text-sm text-slate-200 shadow-lg shadow-black/30 backdrop-blur-xl">
        {status}
      </div>
    </div>
  );
};

export default CommsApp;
