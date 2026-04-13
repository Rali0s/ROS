import { useEffect, useRef, useState } from 'react';
import {
  CopyX,
  EyeOff,
  Download,
  Lock,
  RotateCcw,
  Shield,
  ShieldAlert,
  TimerReset,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  createEncryptedSnapshot,
  decryptSnapshotPayload,
  isEncryptedSnapshot,
} from '../utils/cryptoVault';
import { WALLPAPERS } from '../utils/constants';
import { useWorkspaceData } from '../utils/workspaceStore';

const triggerDownload = (content, filename) => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const SettingsApp = () => {
  const {
    data,
    session,
    updateWorkspaceData,
    importWorkspaceSnapshot,
    resetWorkspaceData,
    nukeWorkspaceData,
    lockWorkspace,
    clearSessionAccessLog,
  } = useWorkspaceData();
  const [codename, setCodename] = useState(data.settings.codename);
  const [operator, setOperator] = useState(data.settings.operator);
  const [status, setStatus] = useState('');
  const [wipePhrase, setWipePhrase] = useState('');
  const [snapshotPassphrase, setSnapshotPassphrase] = useState('');
  const [snapshotConfirm, setSnapshotConfirm] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setCodename(data.settings.codename);
    setOperator(data.settings.operator);
  }, [data.settings.codename, data.settings.operator]);

  const saveSettings = () => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        codename: codename.trim() || current.settings.codename,
        operator: operator.trim() || current.settings.operator,
      },
    }));

    setStatus('Workspace profile saved.');
  };

  const handleExport = async () => {
    if (!snapshotPassphrase.trim()) {
      setStatus('Set an export passphrase first.');
      return;
    }

    if (snapshotPassphrase !== snapshotConfirm) {
      setStatus('Export passphrase and confirmation do not match.');
      return;
    }

    try {
      const snapshot = await createEncryptedSnapshot(data, snapshotPassphrase);
      triggerDownload(
        JSON.stringify(snapshot, null, 2),
        `osa-midnight-oil-${new Date().toISOString().slice(0, 10)}.osae`,
      );
      setStatus('Encrypted case bundle exported.');
    } catch (error) {
      setStatus(error.message || 'Encrypted snapshot export failed.');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (isEncryptedSnapshot(parsed)) {
        if (!snapshotPassphrase.trim()) {
          setStatus('Enter the snapshot passphrase before importing encrypted data.');
          return;
        }

        const payload = await decryptSnapshotPayload(parsed, snapshotPassphrase);
        await importWorkspaceSnapshot(payload);
        setStatus(`Imported encrypted snapshot: ${file.name}.`);
      } else {
        await importWorkspaceSnapshot(parsed);
        setStatus(`Imported legacy plaintext snapshot: ${file.name}. Re-export it encrypted when ready.`);
      }
    } catch (error) {
      setStatus(error.message || 'Import failed. Check the file and passphrase.');
    } finally {
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    try {
      await resetWorkspaceData();
      setStatus('Seeded baseline restored.');
      setWipePhrase('');
    } catch (error) {
      setStatus(error.message || 'Unable to restore the baseline.');
    }
  };

  const handleLock = () => {
    lockWorkspace('Workspace locked from Control Room.');
  };

  const handleNuke = () => {
    if (wipePhrase !== data.settings.wipePhrase) {
      setStatus(`Type ${data.settings.wipePhrase} to confirm the nuke.`);
      return;
    }

    nukeWorkspaceData();
  };

  const toggleSetting = (key) => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: !current.settings[key],
      },
    }));
  };

  const updateNumericSetting = (key, value, fallback) => {
    const parsed = Number(value);
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        [key]: Number.isFinite(parsed) && parsed > 0 ? parsed : fallback,
      },
    }));
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="w-80 border-r border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Shield size={18} className="text-rose-300" />
          Control Room
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tune the workspace profile, move encrypted bundles in and out, lock the vault, and run a full nuke when you want a clean slate.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Codename</span>
            <input
              value={codename}
              onChange={(event) => setCodename(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-amber-400/40"
            />
          </label>

          <label className="block space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Operator</span>
            <input
              value={operator}
              onChange={(event) => setOperator(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-amber-400/40"
            />
          </label>

          <button
            type="button"
            onClick={saveSettings}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <Wand2 size={16} />
            Save profile
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/15 bg-black/20 p-4">
          <div className="text-sm font-semibold text-amber-200">Security posture</div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div>Mode: {data.settings.securityMode}</div>
            <div>Auto-lock: {data.settings.autoLockMinutes} minutes</div>
            <div>Session: {session.lifecycle}</div>
          </div>
          <button
            type="button"
            onClick={handleLock}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            <Lock size={16} />
            Lock workspace now
          </button>
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-2xl border border-cyan-500/15 bg-slate-900/70 p-5">
            <div className="text-sm font-semibold text-cyan-300">Encrypted case bundle</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Exports are encrypted before they hit disk. Imports decrypt locally and are immediately re-sealed into the master-locked workspace.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Bundle passphrase</span>
                <input
                  type="password"
                  value={snapshotPassphrase}
                  onChange={(event) => setSnapshotPassphrase(event.target.value)}
                  className="w-full rounded-xl border border-cyan-500/15 bg-black/30 px-3 py-2 outline-none transition focus:border-cyan-400/40"
                />
              </label>

              <label className="space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Confirm export passphrase</span>
                <input
                  type="password"
                  value={snapshotConfirm}
                  onChange={(event) => setSnapshotConfirm(event.target.value)}
                  className="w-full rounded-xl border border-cyan-500/15 bg-black/30 px-3 py-2 outline-none transition focus:border-cyan-400/40"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <Download size={16} />
                Export encrypted bundle
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Upload size={16} />
                Import bundle
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.osae,application/json"
                className="hidden"
                onChange={handleImport}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
              Scheme: AES-256-GCM with PBKDF2-SHA256 key derivation. Legacy plaintext imports still work so older files are not stranded.
            </div>
          </article>

          <article className="rounded-2xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.15),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-200">
              <ShieldAlert size={16} />
              NUKE and baseline
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              `Restore baseline` reloads the seeded starter content. `NUKE workspace` removes the encrypted container entirely and returns ROS to secure setup.
            </p>

            <div className="mt-5 space-y-3">
              <label className="block space-y-2 text-sm text-slate-200">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Type {data.settings.wipePhrase} to confirm the nuke
                </span>
                <input
                  value={wipePhrase}
                  onChange={(event) => setWipePhrase(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-red-300/50"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleNuke}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-400"
                >
                  <ShieldAlert size={16} />
                  NUKE workspace
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <RotateCcw size={16} />
                  Restore baseline
                </button>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-2xl border border-violet-500/20 bg-[linear-gradient(180deg,rgba(76,29,149,0.12),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <EyeOff size={16} />
              Privacy Mode
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Reduce accidental exposure on sensitive views. These controls affect wallet secrets and other protected record surfaces during unlocked sessions.
            </p>

            <div className="mt-5 space-y-3">
              {[
                ['privacyModeEnabled', 'Enable privacy mode', Shield],
                ['privacyPressHoldReveal', 'Press-and-hold reveal', EyeOff],
                ['privacyAutoRedactOnBlur', 'Auto-redact on blur', Shield],
                ['privacyTimedRehide', 'Timed re-hide', TimerReset],
                ['privacyDisableClipboard', 'No clipboard on sensitive fields', CopyX],
                ['privacyMaskedPartialDisplay', 'Masked partial display', Lock],
                ['privacySessionAccessLog', 'Per-record access log in session', Wand2],
                ['privacyElectronContentProtection', 'Optional Electron content protection', ShieldAlert],
              ].map(([key, label, Icon]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-violet-200">
                      <Icon size={15} />
                    </span>
                    <span className="text-sm text-slate-200">{label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSetting(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                      data.settings[key] ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {data.settings[key] ? 'On' : 'Off'}
                  </button>
                </label>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <label className="block space-y-2 text-sm text-slate-300">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Timed re-hide seconds</span>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={data.settings.privacyTimedRehideSeconds}
                  onChange={(event) => updateNumericSetting('privacyTimedRehideSeconds', event.target.value, 20)}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
                />
              </label>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Electron content protection is a best-effort toggle for desktop-packaged builds. In the browser it remains informational unless a native bridge exists.
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.16),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <ShieldAlert size={16} />
              Dead Man&apos;s Trigger
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              When enabled, ROS expects at least one window to remain open. If every window is closed, the workspace is automatically nuked and returned to secure setup.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white">Require one active window</div>
                  <div className="mt-1 text-sm text-slate-400">Closing the final window becomes the trigger event.</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSetting('deadMansTriggerEnabled')}
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    data.settings.deadMansTriggerEnabled ? 'bg-red-500 text-white' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {data.settings.deadMansTriggerEnabled ? 'Armed' : 'Off'}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-200">Session access log</div>
                <button
                  type="button"
                  onClick={() => {
                    clearSessionAccessLog();
                    setStatus('Session access log cleared.');
                  }}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Clear log
                </button>
              </div>
              <div className="mt-4 max-h-72 space-y-3 overflow-y-auto">
                {session.sessionAccessLog?.length ? (
                  session.sessionAccessLog.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
                      <div className="font-medium text-white">{entry.action}</div>
                      <div className="mt-1 text-slate-400">
                        {entry.recordLabel || entry.recordType || 'Sensitive record'}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-500">
                    No access events recorded in this session.
                  </div>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="text-sm font-semibold text-amber-300">Wallpapers</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Choose the desktop backdrop for Midnight Oil. The shell uses your provided `HD/` wallpapers.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                type="button"
                onClick={() => {
                  updateWorkspaceData((current) => ({
                    ...current,
                    settings: {
                      ...current.settings,
                      wallpaper: wallpaper.id,
                    },
                  }));
                  setStatus(`Wallpaper set to ${wallpaper.title}.`);
                }}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  data.settings.wallpaper === wallpaper.id
                    ? 'border-amber-400/40 bg-amber-500/10'
                    : 'border-white/10 bg-black/10 hover:border-white/20'
                }`}
              >
                <img src={wallpaper.image} alt={wallpaper.title} className="h-36 w-full object-cover" />
                <div className="p-4">
                  <div className="font-semibold text-white">{wallpaper.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{wallpaper.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="text-sm font-semibold text-amber-300">Status</div>
          <p className="mt-3 text-sm text-slate-300">{status || session.notice || session.error || 'Standing by.'}</p>
        </div>
      </section>
    </div>
  );
};

export default SettingsApp;
