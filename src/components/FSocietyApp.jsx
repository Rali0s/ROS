import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Cable,
  FileText,
  FileUp,
  Network,
  RefreshCw,
  Router,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { isNativeVaultRuntime } from '../utils/nativeVault';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const fsOfflineSplash = new URL('../../HD/FSAPP_NoCnn.png', import.meta.url).href;
const fsSearchSplash = new URL('../../HD/Search_Mode.png', import.meta.url).href;

const formatStamp = (value) => {
  if (!value) {
    return 'pending';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString([], {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const queueStates = ['open', 'working', 'callback', 'blocked', 'done'];
const presenceStates = ['online', 'busy', 'away', 'offline'];
const roles = ['peer', 'host', 'client'];

const FSocietyApp = () => {
  const {
    data,
    session,
    syncLanPartyState,
    setLanPartyEnabled,
    scanLanPartyPeers,
    connectLanPartyPeer,
    setLanPartyPresence,
    sendLanPartyChat,
    shareLanPartyNote,
    upsertLanPartyQueueItem,
    sendLanPartyFile,
  } = useWorkspaceData();
  const [busy, setBusy] = useState(false);
  const [discoveryBusy, setDiscoveryBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [manualIp, setManualIp] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(data.notes[0]?.id || '');
  const [fileName, setFileName] = useState('handoff.txt');
  const [fileContent, setFileContent] = useState('');
  const [queueLabel, setQueueLabel] = useState('');
  const [queueOwner, setQueueOwner] = useState(data.settings.operator || '');
  const [queueState, setQueueState] = useState('open');
  const [queueNote, setQueueNote] = useState('');
  const [presence, setPresence] = useState(data.lan?.identity?.status || 'online');
  const [role, setRole] = useState(data.lan?.identity?.role || 'peer');
  const theme = getAppInteriorTheme(data.settings.theme);
  const isNativeDesktop = isNativeVaultRuntime() && session.backend === 'tauri-native';
  const lan = data.lan;

  useEffect(() => {
    setSelectedNoteId((current) => current || data.notes[0]?.id || '');
  }, [data.notes]);

  useEffect(() => {
    setPresence(lan.identity?.status || 'online');
    setRole(lan.identity?.role || 'peer');
  }, [lan.identity?.status, lan.identity?.role]);

  useEffect(() => {
    if (!isNativeDesktop || session.lifecycle !== 'unlocked') {
      return undefined;
    }

    syncLanPartyState().catch(() => {});
    const timer = window.setInterval(() => {
      syncLanPartyState().catch(() => {});
    }, 2500);

    return () => window.clearInterval(timer);
  }, [isNativeDesktop, session.lifecycle, syncLanPartyState]);

  const runTask = async (task, successMessage = '') => {
    setBusy(true);
    setStatus('');

    try {
      await task();
      if (successMessage) {
        setStatus(successMessage);
      }
    } catch (error) {
      setStatus(error?.message || 'F*Society action failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectedNote = useMemo(
    () => data.notes.find((entry) => entry.id === selectedNoteId) ?? null,
    [data.notes, selectedNoteId],
  );

  const queueItems = [...(lan.queue || [])].sort(
    (left, right) => new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0),
  );

  const peerCount = lan.peers?.length || 0;
  const modeLabel = lan.peers?.length ? (lan.session?.hostIp ? 'session-linked' : 'live LAN feed') : 'scan-to-connect';
  const splashMode = peerCount > 0 ? 'connected' : discoveryBusy ? 'searching' : 'offline';

  const ensureLanEnabled = async () => {
    if (!lan.enabled) {
      await setLanPartyEnabled({ enabled: true });
    }
  };

  const handleSearch = async () => {
    setDiscoveryBusy(true);
    setStatus('');

    try {
      await ensureLanEnabled();
      await scanLanPartyPeers();
      if ((data.lan?.peers?.length || 0) === 0) {
        setStatus('Search finished. No ROS terminals answered yet.');
      }
    } catch (error) {
      setStatus(error?.message || 'LAN search failed.');
    } finally {
      setDiscoveryBusy(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualIp.trim()) {
      setStatus('Enter a LAN IPv4 address first.');
      return;
    }

    setDiscoveryBusy(true);
    setStatus('');

    try {
      await ensureLanEnabled();
      await connectLanPartyPeer({ ip: manualIp.trim() });
      setStatus(`Probe sent to ${manualIp.trim()}.`);
    } catch (error) {
      setStatus(error?.message || 'Direct LAN probe failed.');
    } finally {
      setDiscoveryBusy(false);
    }
  };

  if (!isNativeDesktop) {
    return (
      <div className={`flex h-full items-center justify-center ${theme.pageBg} p-6 text-slate-100`}>
        <div className={`max-w-2xl rounded-[28px] border ${theme.panelBorder} ${theme.panelBg} p-6`}>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.26em] ${theme.heroPill}`}>
            <ShieldAlert size={12} />
            Native only
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-white">F*Society</h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            LAN Party mode only exists in the native desktop runtime. Open the packaged desktop build to
            scan the local subnet, expose LAN-only ports, and work a shared room-style desk.
          </p>
        </div>
      </div>
    );
  }

  if (splashMode !== 'connected') {
    const splashImage = splashMode === 'searching' ? fsSearchSplash : fsOfflineSplash;
    const splashTitle = splashMode === 'searching' ? 'Searching Local ROS Mesh' : 'F*Society LAN Party';
    const splashCopy =
      splashMode === 'searching'
        ? 'Subnet discovery is active. ROS is probing the room for reachable terminals, host names, and direct IPv4 handshakes.'
        : 'No active ROS terminals are visible yet. Start with a local LAN search or probe a known IPv4 address to bring the room online.';

    return (
      <div className={`relative h-full overflow-hidden ${theme.pageBg} text-slate-100`}>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 3, 2, 0.46), rgba(4, 4, 7, 0.82)), url(${splashImage})` }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(251,146,60,0.08),transparent_24%),linear-gradient(180deg,rgba(3,3,5,0.26),rgba(3,3,5,0.86)_100%)]" />
        <div className="relative z-10 flex h-full items-end justify-start p-6 sm:p-8">
          <section className="w-full max-w-[38rem] rounded-[30px] border border-amber-500/16 bg-[linear-gradient(180deg,rgba(10,7,6,0.52),rgba(7,6,6,0.80))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.46)] backdrop-blur-[14px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/18 bg-black/18 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-100">
              <Network size={12} />
              LAN ONLY
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-[3.2rem]">
              {splashTitle}
            </h1>
            <p className="mt-4 max-w-[32rem] text-sm leading-7 text-slate-300">{splashCopy}</p>

            <div className="mt-6 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Same subnet / same site</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">No relay / no internet</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                {splashMode === 'searching' ? 'Scanning for terminals' : 'Awaiting first connection'}
              </span>
            </div>

            {splashMode === 'searching' ? (
              <div className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-amber-500/18 bg-black/20 px-4 py-3 text-sm font-semibold text-amber-100">
                <RefreshCw size={15} className="animate-spin" />
                Searching local subnet for ROS terminals…
              </div>
            ) : (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={discoveryBusy}
                  onClick={handleSearch}
                  className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${theme.primaryButton} ${discoveryBusy ? 'cursor-not-allowed opacity-70' : ''}`}
                >
                  <RefreshCw size={15} />
                  Search
                </button>
                <div className="flex flex-1 gap-2">
                  <input
                    value={manualIp}
                    onChange={(event) => setManualIp(event.target.value)}
                    placeholder="Direct IPv4 connect"
                    className={`flex-1 rounded-2xl border px-3 py-3 text-sm ${theme.input}`}
                  />
                  <button
                    type="button"
                    disabled={discoveryBusy || !manualIp.trim()}
                    onClick={handleManualConnect}
                    className={`rounded-2xl px-4 py-3 text-sm font-semibold ${theme.primaryButtonSoft}`}
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}

            {status ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200">
                {status}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-y-auto ${theme.pageBg} text-slate-100`}>
      <div className="space-y-3.5 p-3.5">
        <section className={`rounded-[24px] border ${theme.heroBorder} ${theme.heroBg} p-4 shadow-2xl shadow-black/30`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${theme.heroPill}`}>
                <Network size={12} />
                LAN ONLY
              </div>
              <h1 className="mt-3 text-[1.9rem] font-semibold tracking-tight text-white">F*Society</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Same subnet. Same site. No relay. No internet. Built for room-scale ROS terminals that
                need lightweight chat, note handoff, callback sharing, and ad hoc file sends.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Same subnet / same site</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">LAN chat · Unencrypted</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Mode: {modeLabel}</span>
              </div>
            </div>

            <div className={`rounded-[22px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-4 py-3 text-right`}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Security::Open Ports</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {lan.enabled ? `${lan.security?.openPortCount || 0} open` : 'Closed'}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {(lan.security?.openPorts || []).join(' · ') || 'LAN mode disabled'}
              </div>
            </div>
          </div>
        </section>

        {status ? (
          <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelBg} px-4 py-3 text-sm text-slate-200`}>
            {status}
          </div>
        ) : null}

        <section className="grid gap-3.5 xl:grid-cols-[0.9fr_1.25fr_0.95fr]">
          <div className={`space-y-3.5 rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                  <Router size={16} />
                  LAN posture
                </div>
                <div className="mt-1 text-xs text-slate-400">User-opened ports only. Beta intentionally unencrypted.</div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => runTask(() => setLanPartyEnabled({ enabled: !lan.enabled }))}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  lan.enabled ? theme.primaryButton : theme.secondaryButton
                } ${busy ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {lan.enabled ? 'Disable LAN mode' : 'Enable LAN mode'}
              </button>
            </div>

            <div className={`rounded-[20px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} p-3`}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Local terminal</div>
              <div className="mt-2 text-lg font-semibold text-white">{lan.identity?.codename || data.settings.codename}</div>
              <div className="mt-1 text-xs text-slate-400">
                {lan.identity?.hostname || 'hostname pending'} · {lan.identity?.localIp || 'ip pending'}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                <select
                  value={presence}
                  onChange={(event) => {
                    const value = event.target.value;
                    setPresence(value);
                    runTask(() => setLanPartyPresence({ status: value, role }));
                  }}
                  className={`rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                >
                  {presenceStates.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <select
                  value={role}
                  onChange={(event) => {
                    const value = event.target.value;
                    setRole(value);
                    runTask(() => setLanPartyPresence({ status: presence, role: value }));
                  }}
                  className={`rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                >
                  {roles.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`rounded-[20px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} p-3`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Peer discovery</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {peerCount} active ROS terminal{peerCount === 1 ? '' : 's'} · last scan {formatStamp(lan.diagnostics?.lastScanAt)}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy || !lan.enabled}
                  onClick={() => runTask(() => scanLanPartyPeers())}
                  className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm ${theme.primaryButtonSoft} ${!lan.enabled ? 'opacity-50' : ''}`}
                >
                  <RefreshCw size={14} />
                  Scan
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={manualIp}
                  onChange={(event) => setManualIp(event.target.value)}
                  placeholder="Direct IPv4 connect"
                  className={`flex-1 rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                />
                <button
                  type="button"
                  disabled={busy || !lan.enabled || !manualIp.trim()}
                  onClick={() => runTask(() => connectLanPartyPeer({ ip: manualIp.trim() }))}
                  className={`rounded-2xl px-3 py-2 text-sm ${theme.primaryButtonSoft}`}
                >
                  Probe
                </button>
              </div>
            </div>

            <div className={`rounded-[20px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} p-3`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <AlertTriangle size={15} />
                Trust warnings
              </div>
              <div className="mt-3 space-y-2 text-xs leading-5 text-slate-400">
                {lan.security?.warnings?.length ? lan.security.warnings.map((warning) => (
                  <div key={warning} className="rounded-2xl border border-amber-500/15 bg-amber-500/8 px-3 py-2">
                    {warning}
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2">No LAN warnings while ports are closed.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                    <Cable size={16} />
                    LAN chat
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-amber-200">Unencrypted · Same network only</div>
                </div>
                <div className="text-xs text-slate-500">{lan.chat?.length || 0} messages</div>
              </div>
              <div className={`mt-3 h-64 overflow-y-auto rounded-[20px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} p-3`}>
                {(lan.chat || []).length ? lan.chat.map((entry) => (
                  <div key={entry.id} className="mb-3 rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{entry.senderHost || 'LAN peer'}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{formatStamp(entry.createdAt)}</div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">{entry.content}</div>
                  </div>
                )) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    No LAN chat yet. Enable LAN mode, scan the room, and send the first message.
                  </div>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <textarea
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  rows={3}
                  placeholder="Broadcast to the LAN room..."
                  className={`min-h-[5.5rem] flex-1 rounded-[20px] border px-3 py-3 text-sm ${theme.input}`}
                />
                <button
                  type="button"
                  disabled={busy || !lan.enabled || !chatDraft.trim()}
                  onClick={() =>
                    runTask(async () => {
                      await sendLanPartyChat({ content: chatDraft.trim() });
                      setChatDraft('');
                    })
                  }
                  className={`inline-flex items-center gap-2 self-end rounded-2xl px-4 py-3 text-sm font-semibold ${theme.primaryButton}`}
                >
                  <Send size={15} />
                  Send
                </button>
              </div>
            </div>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className="grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
                <div>
                  <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                    <FileText size={16} />
                    Note handoff
                  </div>
                  <div className="mt-3 space-y-2">
                    <select
                      value={selectedNoteId}
                      onChange={(event) => setSelectedNoteId(event.target.value)}
                      className={`w-full rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                    >
                      {data.notes.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.title}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !lan.enabled || !selectedNote}
                      onClick={() => selectedNote && runTask(() => shareLanPartyNote({ noteId: selectedNote.id }))}
                      className={`w-full rounded-2xl px-3 py-2 text-sm font-semibold ${theme.primaryButtonSoft}`}
                    >
                      Share selected note
                    </button>
                    {selectedNote ? (
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-xs leading-5 text-slate-400">
                        {selectedNote.body.slice(0, 220)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div>
                  <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                    <Users size={16} />
                    Shared callback queue
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    <input
                      value={queueLabel}
                      onChange={(event) => setQueueLabel(event.target.value)}
                      placeholder="Contact or item label"
                      className={`rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                    />
                    <input
                      value={queueOwner}
                      onChange={(event) => setQueueOwner(event.target.value)}
                      placeholder="Owner terminal / operator"
                      className={`rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                    />
                    <select
                      value={queueState}
                      onChange={(event) => setQueueState(event.target.value)}
                      className={`rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                    >
                      {queueStates.map((entry) => (
                        <option key={entry} value={entry}>
                          {entry}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy || !lan.enabled || !queueLabel.trim()}
                      onClick={() =>
                        runTask(async () => {
                          await upsertLanPartyQueueItem({
                            item: {
                              id: createId('lan-queue'),
                              label: queueLabel.trim(),
                              owner: queueOwner.trim() || data.settings.operator,
                              state: queueState,
                              note: queueNote.trim(),
                              updatedAt: now(),
                            },
                          });
                          setQueueLabel('');
                          setQueueNote('');
                        })
                      }
                      className={`rounded-2xl px-3 py-2 text-sm font-semibold ${theme.primaryButtonSoft}`}
                    >
                      Add queue item
                    </button>
                  </div>
                  <textarea
                    value={queueNote}
                    onChange={(event) => setQueueNote(event.target.value)}
                    rows={3}
                    placeholder="Callback note / handoff detail"
                    className={`mt-2 min-h-[5rem] w-full rounded-2xl border px-3 py-3 text-sm ${theme.input}`}
                  />
                  <div className="mt-3 max-h-56 space-y-2 overflow-y-auto">
                    {queueItems.length ? queueItems.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-white">{item.label}</div>
                          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.state}</div>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{item.owner || 'Unassigned'} · {formatStamp(item.updatedAt)}</div>
                        {item.note ? <div className="mt-2 text-sm leading-6 text-slate-300">{item.note}</div> : null}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-500">
                        No shared callback items yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <Users size={16} />
                Active ROS terminals
              </div>
              <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
                {(lan.peers || []).length ? lan.peers.map((peer) => (
                  <div key={peer.id} className="rounded-[20px] border border-white/8 bg-black/15 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{peer.codename || peer.hostname}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{peer.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{peer.hostname} · {peer.ip}</div>
                    <div className="mt-2 text-xs text-slate-400">
                      {peer.operator || 'Unknown operator'} · {peer.role} · seen {formatStamp(peer.lastSeenAt)}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[20px] border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-500">
                    No peers yet. Enable LAN mode and scan the subnet.
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
                <FileUp size={16} />
                ROS-managed file transfer
              </div>
              <div className="mt-3 space-y-2">
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  placeholder="handoff.txt"
                  className={`w-full rounded-2xl border px-3 py-2 text-sm ${theme.input}`}
                />
                <textarea
                  value={fileContent}
                  onChange={(event) => setFileContent(event.target.value)}
                  rows={5}
                  placeholder="Paste note bundle, quick export, or text payload to stream across the room..."
                  className={`min-h-[8rem] w-full rounded-2xl border px-3 py-3 text-sm ${theme.input}`}
                />
                <button
                  type="button"
                  disabled={busy || !lan.enabled || !fileName.trim() || !fileContent.trim()}
                  onClick={() =>
                    runTask(async () => {
                      await sendLanPartyFile({
                        name: fileName.trim(),
                        content: fileContent,
                      });
                      setFileContent('');
                    })
                  }
                  className={`w-full rounded-2xl px-3 py-2 text-sm font-semibold ${theme.primaryButton}`}
                >
                  Send to active peers
                </button>
              </div>
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
                {(lan.transfers || []).length ? lan.transfers.map((transfer) => (
                  <div key={transfer.id} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{transfer.fileName}</div>
                      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{transfer.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {transfer.direction} · {transfer.bytes} bytes · {formatStamp(transfer.createdAt)}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-slate-400">
                      {transfer.detail}
                      {transfer.savedPath ? ` · ${transfer.savedPath}` : ''}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-sm text-slate-500">
                    No transfers yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FSocietyApp;
