import { useEffect, useRef, useState } from 'react';
import {
  BadgeInfo,
  Bug,
  ClipboardCheck,
  CopyX,
  EyeOff,
  Download,
  LifeBuoy,
  Lock,
  SearchCheck,
  RotateCcw,
  Shield,
  ShieldAlert,
  Sparkles,
  TimerReset,
  Trash2,
  Upload,
  Wand2,
} from 'lucide-react';
import {
  createEncryptedSnapshot,
  decryptSnapshotPayload,
  isEncryptedSnapshot,
} from '../utils/cryptoVault';
import {
  APP_RELEASE,
  buildSupportBundle,
  getAccountStatus,
  getBetaSignals,
  getEntitlementStatus,
  getReleaseStatus,
  getWorkspaceHealth,
} from '../utils/betaRuntime';
import { SHELL_THEMES, WALLPAPERS } from '../utils/constants';
import { isNativeVaultRuntime, openNativeTextFileDialog, saveNativeTextFileDialog } from '../utils/nativeVault';
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
    prepareWorkspaceSnapshotPayload,
    listFileVaultEntries,
    purgeOrphanedFileVaultBlobs,
    resetWorkspaceData,
    nukeWorkspaceData,
    lockWorkspace,
    clearSessionAccessLog,
    setLanPartyEnabled,
    syncLanPartyState,
  } = useWorkspaceData();
  const [codename, setCodename] = useState(data.settings.codename);
  const [operator, setOperator] = useState(data.settings.operator);
  const [status, setStatus] = useState('');
  const [wipePhrase, setWipePhrase] = useState('');
  const [snapshotPassphrase, setSnapshotPassphrase] = useState('');
  const [snapshotConfirm, setSnapshotConfirm] = useState('');
  const [feedbackDraft, setFeedbackDraft] = useState(data.settings.betaFeedbackDraft || '');
  const [fileVaultEntries, setFileVaultEntries] = useState([]);
  const [fileVaultBusy, setFileVaultBusy] = useState(false);
  const fileInputRef = useRef(null);
  const validationFileInputRef = useRef(null);
  const isNativeDesktop = isNativeVaultRuntime() && session.backend === 'tauri-native';

  useEffect(() => {
    setCodename(data.settings.codename);
    setOperator(data.settings.operator);
  }, [data.settings.codename, data.settings.operator]);

  useEffect(() => {
    setFeedbackDraft(data.settings.betaFeedbackDraft || '');
  }, [data.settings.betaFeedbackDraft]);

  useEffect(() => {
    let cancelled = false;

    const loadEntries = async () => {
      if (session.lifecycle !== 'unlocked') {
        setFileVaultEntries([]);
        return;
      }

      setFileVaultBusy(true);

      try {
        const entries = await listFileVaultEntries();
        if (!cancelled) {
          setFileVaultEntries(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error.message || 'Unable to inspect the encrypted file vault.');
        }
      } finally {
        if (!cancelled) {
          setFileVaultBusy(false);
        }
      }
    };

    loadEntries();

    return () => {
      cancelled = true;
    };
  }, [listFileVaultEntries, session.lifecycle, data.library, data.managedArtifacts]);

  const saveSettings = () => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        codename: codename.trim() || current.settings.codename,
        operator: operator.trim() || current.settings.operator,
        betaFeedbackDraft: feedbackDraft,
        betaFeedbackUpdatedAt: feedbackDraft.trim() ? new Date().toISOString() : current.settings.betaFeedbackUpdatedAt,
      },
    }));

    setStatus('Workspace profile saved.');
  };

  const updateBetaSettings = (updater) => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        ...(typeof updater === 'function' ? updater(current.settings) : updater),
      },
    }));
  };

  const bumpBetaMetric = (key) => {
    updateWorkspaceData((current) => ({
      ...current,
      settings: {
        ...current.settings,
        betaMetrics: {
          ...(current.settings.betaMetrics || {}),
          [key]: Number.isFinite(current.settings.betaMetrics?.[key])
            ? current.settings.betaMetrics[key] + 1
            : 1,
        },
      },
    }));
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
      const serialized = JSON.stringify(snapshot, null, 2);
      const filename = `osa-midnight-oil-${new Date().toISOString().slice(0, 10)}.osae`;

      if (isNativeDesktop) {
        const savedPath = await saveNativeTextFileDialog({
          suggestedName: filename,
          content: serialized,
        });

        if (!savedPath) {
          setStatus('Encrypted bundle export canceled.');
          return;
        }

        updateBetaSettings({
          betaLastSnapshotExportAt: new Date().toISOString(),
        });
        bumpBetaMetric('snapshotExportCount');
        setStatus(`Encrypted case bundle exported to ${savedPath}.`);
        return;
      }

      triggerDownload(serialized, filename);
      updateBetaSettings({
        betaLastSnapshotExportAt: new Date().toISOString(),
      });
      bumpBetaMetric('snapshotExportCount');
      setStatus('Encrypted case bundle exported.');
    } catch (error) {
      setStatus(error.message || 'Encrypted snapshot export failed.');
    }
  };

  const importSnapshotText = async ({ text, label }) => {
    try {
      const parsed = JSON.parse(text);

      if (isEncryptedSnapshot(parsed)) {
        if (!snapshotPassphrase.trim()) {
          setStatus('Enter the snapshot passphrase before importing encrypted data.');
          return;
        }

        const payload = await decryptSnapshotPayload(parsed, snapshotPassphrase);
        await importWorkspaceSnapshot(payload);
        updateBetaSettings({
          betaLastSnapshotImportAt: new Date().toISOString(),
        });
        bumpBetaMetric('snapshotImportCount');
        setStatus(`Imported encrypted snapshot: ${label}.`);
      } else {
        await importWorkspaceSnapshot(parsed);
        updateBetaSettings({
          betaLastSnapshotImportAt: new Date().toISOString(),
        });
        bumpBetaMetric('snapshotImportCount');
        setStatus(`Imported legacy plaintext snapshot: ${label}. Re-export it encrypted when ready.`);
      }
    } catch (error) {
      setStatus(error.message || 'Import failed. Check the file and passphrase.');
    }
  };

  const validateSnapshotText = async ({ text, label }) => {
    try {
      const parsed = JSON.parse(text);
      const workspace = isEncryptedSnapshot(parsed)
        ? (() => {
            if (!snapshotPassphrase.trim()) {
              throw new Error('Enter the snapshot passphrase before validating encrypted data.');
            }

            return decryptSnapshotPayload(parsed, snapshotPassphrase);
          })()
        : parsed;

      const normalized = prepareWorkspaceSnapshotPayload(await workspace);

      updateBetaSettings({
        betaLastBackupValidationAt: new Date().toISOString(),
      });

      setStatus(
        `Dry-run validated ${label}: ${normalized.notes.length} notes, ${normalized.library.length} library items, ${normalized.calendarEvents.length} events, ${normalized.bookmarks.length} bookmarks, and ${normalized.inventory.length} inventory items. Live workspace unchanged.`,
      );
    } catch (error) {
      setStatus(error.message || 'Dry-run validation failed. Check the file and passphrase.');
    }
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      await importSnapshotText({
        text,
        label: file.name,
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleValidationImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      await validateSnapshotText({
        text,
        label: file.name,
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleNativeImport = async () => {
    try {
      const selected = await openNativeTextFileDialog({
        allowExtensions: ['osae', 'json'],
      });

      if (!selected) {
        setStatus('Snapshot import canceled.');
        return;
      }

      await importSnapshotText({
        text: selected.content,
        label: selected.name,
      });
    } catch (error) {
      setStatus(error.message || 'Import failed. Check the selected file and passphrase.');
    }
  };

  const handleNativeValidation = async () => {
    try {
      const selected = await openNativeTextFileDialog({
        allowExtensions: ['osae', 'json'],
      });

      if (!selected) {
        setStatus('Dry-run validation canceled.');
        return;
      }

      await validateSnapshotText({
        text: selected.content,
        label: selected.name,
      });
    } catch (error) {
      setStatus(error.message || 'Dry-run validation failed. Check the selected file and passphrase.');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore the seeded baseline? This replaces the current workspace contents.')) {
      return;
    }

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

    if (!window.confirm('NUKE the workspace and remove the current encrypted container? This cannot be undone.')) {
      return;
    }

    nukeWorkspaceData().catch(() => {});
  };

  const refreshFileVaultEntries = async () => {
    const entries = await listFileVaultEntries();
    setFileVaultEntries(entries);
    return entries;
  };

  const handlePanicLock = () => {
    if (!window.confirm('Engage panic lock and clear sensitive views from this session?')) {
      return;
    }
    lockWorkspace('Panic lock engaged. Workspace memory cleared and sensitive views closed.');
    setStatus('Panic lock engaged.');
  };

  const handlePurgeOrphans = async () => {
    if (!window.confirm('Purge orphaned encrypted file-vault blobs? This removes unlinked encrypted artifacts.')) {
      return;
    }

    try {
      setFileVaultBusy(true);
      const result = await purgeOrphanedFileVaultBlobs(fileDeleteMode);
      await refreshFileVaultEntries();
      setStatus(
        result.failed
          ? `Purged ${result.removed} orphaned encrypted file vault blob${result.removed === 1 ? '' : 's'}, but ${result.failed} blob${result.failed === 1 ? '' : 's'} failed deletion.`
          : result.removed
            ? `Purged ${result.removed} orphaned encrypted file vault blob${result.removed === 1 ? '' : 's'}.`
            : 'No orphaned encrypted file blobs were found.',
      );
    } catch (error) {
      setStatus(error.message || 'Unable to purge orphaned encrypted file blobs.');
    } finally {
      setFileVaultBusy(false);
    }
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

  const totalFileVaultBytes = fileVaultEntries.reduce((sum, entry) => sum + (entry.sizeBytes || 0), 0);
  const orphanedFileVaultEntries = fileVaultEntries.filter((entry) => entry.orphaned);
  const linkedFileVaultEntries = fileVaultEntries.filter((entry) => !entry.orphaned);
  const fileDeleteMode = data.settings.fileVaultDeleteMode || 'secure-delete';
  const accountStatus = getAccountStatus(data.settings);
  const entitlementStatus = getEntitlementStatus();
  const releaseStatus = getReleaseStatus(session);
  const betaSignals = getBetaSignals(data.settings);
  const workspaceHealth = getWorkspaceHealth({ data, session, fileVaultEntries });
  const lanOpenSummary = data.lan?.enabled
    ? `${data.lan.security?.openPortCount || 0} open · ${(data.lan.security?.openPorts || []).join(' · ')}`
    : 'Closed';

  const handleBackupValidation = () => {
    if (!data.settings.betaLastSnapshotExportAt) {
      setStatus('Export an encrypted bundle first, then run a dry-run validation against that bundle.');
      return;
    }

    if (isNativeDesktop) {
      handleNativeValidation();
      return;
    }

    validationFileInputRef.current?.click();
  };

  const handleExportSupportBundle = async () => {
    try {
      const bundle = buildSupportBundle({
        data,
        session,
        fileVaultEntries,
        feedbackDraft,
      });
      const filename = `osa-midnight-oil-support-${new Date().toISOString().slice(0, 10)}.json`;
      const serialized = JSON.stringify(bundle, null, 2);

      if (isNativeDesktop) {
        const savedPath = await saveNativeTextFileDialog({
          suggestedName: filename,
          content: serialized,
        });

        if (!savedPath) {
          setStatus('Support bundle export canceled.');
          return;
        }

        updateBetaSettings({
          betaLastSupportBundleAt: new Date().toISOString(),
        });
        bumpBetaMetric('supportBundleCount');
        setStatus(`Support bundle exported to ${savedPath}.`);
        return;
      }

      triggerDownload(serialized, filename);
      updateBetaSettings({
        betaLastSupportBundleAt: new Date().toISOString(),
      });
      bumpBetaMetric('supportBundleCount');
      setStatus('Support bundle exported.');
    } catch (error) {
      setStatus(error.message || 'Unable to export a support bundle.');
    }
  };

  const handleSaveFeedbackDraft = () => {
    updateBetaSettings({
      betaFeedbackDraft: feedbackDraft,
      betaFeedbackUpdatedAt: feedbackDraft.trim() ? new Date().toISOString() : '',
    });
    bumpBetaMetric('feedbackDraftCount');
    setStatus('Beta feedback draft saved locally.');
  };

  const handleToggleLan = async () => {
    try {
      await setLanPartyEnabled({ enabled: !data.lan?.enabled });
      await syncLanPartyState();
      setStatus(data.lan?.enabled ? 'F*Society LAN mode disabled.' : 'F*Society LAN mode enabled.');
    } catch (error) {
      setStatus(error.message || 'Unable to update F*Society LAN mode.');
    }
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="w-80 overflow-y-auto border-r border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Shield size={18} className="text-rose-300" />
          Control Room
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Tune the workspace profile, move encrypted bundles in and out, lock the vault, and run a full nuke when you want a clean slate.
        </p>

        <div className="mt-5 rounded-2xl border border-violet-500/18 bg-violet-500/8 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-100">
            <BadgeInfo size={16} />
            {APP_RELEASE.channel}
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div>Version: {APP_RELEASE.version}</div>
            <div>Entitlement: {entitlementStatus.label}</div>
            <div>Install ID: {accountStatus.installId}</div>
          </div>

          <label className="mt-4 block space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Invite code</span>
            <input
              value={data.settings.betaInviteCode}
              onChange={(event) => updateBetaSettings({ betaInviteCode: event.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
              placeholder="Optional invite code"
            />
          </label>

          <label className="mt-3 block space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Waitlist source</span>
            <input
              value={data.settings.betaWaitlistSource}
              onChange={(event) => updateBetaSettings({ betaWaitlistSource: event.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
              placeholder="Waitlist / referral / direct"
            />
          </label>
        </div>

        <div className="mt-6 space-y-4">
          <div className="space-y-2 text-sm text-slate-300">
            <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Shell theme</span>
            <div className="grid gap-2">
              {Object.values(SHELL_THEMES).map((theme) => {
                const active = data.settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => {
                      updateWorkspaceData((current) => ({
                        ...current,
                        settings: {
                          ...current.settings,
                          theme: theme.id,
                        },
                      }));
                      setStatus(`Shell theme set to ${theme.name}.`);
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      active
                        ? 'border-cyan-300/22 bg-cyan-500/10'
                        : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{theme.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {theme.accentLabel}
                        </div>
                      </div>
                      <div
                        className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                          active
                            ? 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
                            : 'border-white/10 bg-white/5 text-slate-400'
                        }`}
                      >
                        {active ? 'Active' : 'Switch'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

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
            <div>Backend: {session.backend}</div>
            <div>Vaults: {(session.compartments ?? []).length}</div>
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
        <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
          <article className="rounded-2xl border border-emerald-500/18 bg-[linear-gradient(180deg,rgba(5,46,22,0.18),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <ClipboardCheck size={16} />
              Trust and continuity
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Use this panel as the beta trust gate. Backups, onboarding, file-vault hygiene, and native-vault posture
              should all be visible here before ROS becomes a daily system.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {workspaceHealth.checks.map((check) => (
                <div key={check.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 pr-2 text-sm font-semibold text-white">{check.label}</div>
                    <span
                      className={`shrink-0 whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        check.state === 'healthy'
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                          : 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                      }`}
                    >
                      {check.state}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">{check.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-emerald-100">{workspaceHealth.summary}</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                {(workspaceHealth.warnings.length ? workspaceHealth.warnings : ['No active trust warnings.']).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100">
                <SearchCheck size={16} />
                Backup drill now performs a dry-run bundle validation and leaves the live workspace untouched.
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-500/18 bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-amber-100">F*Society LAN posture</div>
                  <div className="mt-2 text-sm leading-6 text-slate-400">
                    LAN Party mode intentionally opens local-only discovery, session, and file-transfer ports.
                    Chat is unencrypted for beta and should be treated as room-local only.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleLan}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    data.lan?.enabled ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/5 text-slate-100 hover:bg-white/10'
                  }`}
                >
                  {data.lan?.enabled ? 'Disable LAN mode' : 'Enable LAN mode'}
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Security::Open Ports</div>
                  <div className="mt-2 text-sm font-semibold text-white">{lanOpenSummary}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">{data.lan?.security?.bindScope || 'LAN only'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Active terminals</div>
                  <div className="mt-2 text-sm font-semibold text-white">{data.lan?.peers?.length || 0}</div>
                  <div className="mt-2 text-xs leading-5 text-slate-500">
                    {data.lan?.identity?.hostname || 'hostname pending'} · {data.lan?.identity?.localIp || 'ip pending'}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-violet-500/18 bg-[linear-gradient(180deg,rgba(76,29,149,0.14),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <LifeBuoy size={16} />
              Beta support and release
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Keep the beta identity visible, capture support context locally, and make release posture explicit without
              requiring a connected account.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Release status</div>
                <div className="mt-2 text-lg font-semibold text-white">{releaseStatus.version}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {releaseStatus.channel} · {releaseStatus.runtime}
                </div>
                <div className="mt-3 text-xs leading-5 text-slate-500">
                  Waitlist source: {accountStatus.waitlistSource || 'waitlist'}{accountStatus.inviteCode ? ` · Invite ${accountStatus.inviteCode}` : ''}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Beta signals</div>
                <div className="mt-2 space-y-2 text-sm text-slate-300">
                  <div>Launches: {betaSignals.metrics.launchCount}</div>
                  <div>Exports: {betaSignals.metrics.snapshotExportCount}</div>
                  <div>Imports: {betaSignals.metrics.snapshotImportCount}</div>
                  <div>Support bundles: {betaSignals.metrics.supportBundleCount}</div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-violet-100">Release notes</div>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
                {releaseStatus.releaseNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>

            <label className="mt-4 block rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
              <span className="flex items-center gap-2 text-sm font-semibold text-violet-100">
                <Bug size={15} />
                Feedback / issue draft
              </span>
              <textarea
                value={feedbackDraft}
                onChange={(event) => setFeedbackDraft(event.target.value)}
                className="mt-3 h-28 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
                placeholder="Describe friction, confusion, recovery gaps, or reproducible issues."
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveFeedbackDraft}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
                >
                  <Sparkles size={15} />
                  Save draft
                </button>
                <button
                  type="button"
                  onClick={handleExportSupportBundle}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
                >
                  <Download size={15} />
                  Export support bundle
                </button>
              </div>
            </label>
          </article>
        </div>

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

            <label className="mt-4 block space-y-2 text-sm text-slate-300">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Auto export on quit / lock</span>
              <select
                value={data.settings.snapshotAutoExportMode || 'off'}
                onChange={(event) => updateBetaSettings({ snapshotAutoExportMode: event.target.value })}
                className="w-full rounded-xl border border-cyan-500/15 bg-black/30 px-3 py-2 outline-none transition focus:border-cyan-400/40"
              >
                <option value="off">Off</option>
                <option value="quit">Export snapshot on quit</option>
                <option value="lock-quit">Export snapshot on lock + quit</option>
              </select>
            </label>

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
                onClick={() => {
                  if (isNativeDesktop) {
                    handleNativeImport();
                    return;
                  }

                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <Upload size={16} />
                {isNativeDesktop ? 'Import bundle…' : 'Import bundle'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.osae,application/json"
                className="hidden"
                onChange={handleImport}
              />
              <input
                ref={validationFileInputRef}
                type="file"
                accept=".json,.osae,application/json"
                className="hidden"
                onChange={handleValidationImport}
              />

              <button
                type="button"
                onClick={handleBackupValidation}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <SearchCheck size={16} />
                {isNativeDesktop ? 'Dry-run validate…' : 'Dry-run validate'}
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
              Scheme: AES-256-GCM with PBKDF2-SHA256 key derivation. Legacy plaintext imports still work so older files are not stranded.
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              Auto-export uses the current unlocked master passphrase in memory and writes encrypted snapshots into your local Documents folder.
              {isNativeDesktop
                ? ' Native desktop can complete this automatically during quit or lock without prompting.'
                : ' Browser beta keeps this option visible, but automatic quit exports are primarily intended for the native desktop runtime.'}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Last export</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {betaSignals.lastSnapshotExportAt ? new Date(betaSignals.lastSnapshotExportAt).toLocaleString() : 'Not recorded'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Last import</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {betaSignals.lastSnapshotImportAt ? new Date(betaSignals.lastSnapshotImportAt).toLocaleString() : 'Not recorded'}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Backup drill</div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {betaSignals.lastBackupValidationAt ? new Date(betaSignals.lastBackupValidationAt).toLocaleString() : 'Pending'}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-red-500/20 bg-[linear-gradient(180deg,rgba(127,29,29,0.15),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-200">
              <ShieldAlert size={16} />
              NUKE and baseline
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              `Restore baseline` reloads the seeded starter content. `NUKE workspace` removes the encrypted container, library imports, origin caches, and browser-side saved state before returning ROS to secure setup.
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

            <div className="mt-4 rounded-2xl border border-red-500/15 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              Managed local artifacts queued for purge: {(data.managedArtifacts ?? []).length}. Browser-side caches, session storage, IndexedDB, beta leftovers, and encrypted library imports are purged with the vault.
            </div>
          </article>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-2xl border border-violet-500/20 bg-[linear-gradient(180deg,rgba(76,29,149,0.12),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-200">
              <ShieldAlert size={16} />
              Session Defense
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Consolidated protection for privacy controls, panic lock, blur locking, and final-window trigger behavior while the vault is unlocked.
            </p>

            <div className="mt-5 space-y-3">
              {[
                ['sessionDefenseEnabled', 'Enable Session Defense', ShieldAlert],
                ['sessionDefenseBlurLock', 'Lock workspace on app blur', Lock],
                ['deadMansTriggerEnabled', 'Arm final-window trigger', Shield],
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

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">Timed re-hide seconds</span>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={data.settings.privacyTimedRehideSeconds}
                  onChange={(event) => updateNumericSetting('privacyTimedRehideSeconds', event.target.value, 20)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
                />
              </label>

              <label className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">Final-window action</span>
                <select
                  value={data.settings.sessionDefenseLastWindowAction}
                  onChange={(event) =>
                    updateWorkspaceData((current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        sessionDefenseLastWindowAction: event.target.value === 'lock' ? 'lock' : 'nuke',
                      },
                    }))
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-violet-400/40"
                >
                  <option value="nuke">NUKE workspace</option>
                  <option value="lock">Lock workspace</option>
                </select>
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePanicLock}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-400"
              >
                <Lock size={16} />
                Panic lock now
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Electron content protection remains best-effort. Session Defense reduces plaintext exposure time, but it is not a guarantee against a compromised host.
            </p>

            <div className="mt-4 rounded-2xl border border-violet-400/15 bg-black/20 p-4 text-sm leading-6 text-slate-300">
              Dead-man trigger: when armed, closing the final open app window will{' '}
              {data.settings.sessionDefenseLastWindowAction === 'lock' ? 'lock the workspace' : 'NUKE the workspace'}
              . This trigger now works independently of the broader Session Defense toggle.
            </div>

            <div className="mt-5 rounded-2xl border border-cyan-500/15 bg-cyan-500/5 p-4">
              <div className="text-sm font-semibold text-cyan-200">ROS Comms policy</div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Control whether new dead-drop threads require verified peers, whether message bodies may use the clipboard, and how long relay envelopes should be considered live.
              </p>

              <div className="mt-4 space-y-3">
                {[
                  ['commsRequireVerifiedPeer', 'Require verified peers before sending', Shield],
                  ['commsAllowClipboard', 'Allow clipboard inside comms views', CopyX],
                ].map(([key, label, Icon]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex rounded-xl border border-white/10 bg-white/5 p-2 text-cyan-200">
                        <Icon size={15} />
                      </span>
                      <span className="text-sm text-slate-200">{label}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSetting(key)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                        data.settings[key] ? 'bg-cyan-500 text-slate-950' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {data.settings[key] ? 'On' : 'Off'}
                    </button>
                  </label>
                ))}
              </div>

              <label className="mt-4 block rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <span className="block text-xs uppercase tracking-[0.24em] text-slate-500">Relay retention hours</span>
                <input
                  type="number"
                  min="1"
                  max="720"
                  value={data.settings.commsRetentionHours}
                  onChange={(event) => updateNumericSetting('commsRetentionHours', event.target.value, 168)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-cyan-400/40"
                />
              </label>
            </div>
          </article>

          <article className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(180deg,rgba(120,53,15,0.16),rgba(2,6,23,0.96))] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Wand2 size={16} />
              Session access log
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Review what was revealed or blocked during the current unlocked session, then clear the log when you are done.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-amber-200">Access events</div>
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

        <div className="mt-5 rounded-2xl border border-cyan-500/20 bg-[linear-gradient(180deg,rgba(8,145,178,0.12),rgba(2,6,23,0.96))] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200">
                <Download size={16} />
                Encrypted File Vault
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Inspect encrypted PDF and EPUB blobs stored in the managed file vault, verify their linked library entry, and purge orphaned blobs that are no longer referenced.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setFileVaultBusy(true);
                  refreshFileVaultEntries()
                    .then(() => setStatus('Encrypted file vault refreshed.'))
                    .catch((error) => setStatus(error.message || 'Unable to refresh the encrypted file vault.'))
                    .finally(() => setFileVaultBusy(false));
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
              >
                <RotateCcw size={16} />
                Refresh
              </button>
              <button
                type="button"
                onClick={handlePurgeOrphans}
                disabled={fileVaultBusy}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={16} />
                Purge orphaned blobs
              </button>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Default delete mode</div>
            <select
              value={fileDeleteMode}
              onChange={(event) =>
                updateWorkspaceData((current) => ({
                  ...current,
                  settings: {
                    ...current.settings,
                    fileVaultDeleteMode: event.target.value,
                  },
                }))
              }
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 outline-none transition focus:border-cyan-400/40"
            >
              <option value="standard-delete">Standard delete</option>
              <option value="secure-delete">Secure delete (crypto-shred)</option>
              <option value="best-effort-overwrite">Best-effort physical overwrite</option>
            </select>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Standard delete removes the encrypted blob. Secure delete destroys the wrapped per-blob key before removing the file.
              Best-effort physical overwrite is native-only and attempts multiple overwrite passes, but reliability still depends on storage hardware and filesystem behavior.
            </p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Vault blobs</div>
              <div className="mt-2 text-2xl font-semibold text-white">{fileVaultEntries.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Linked entries</div>
              <div className="mt-2 text-2xl font-semibold text-white">{linkedFileVaultEntries.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Orphaned blobs</div>
              <div className="mt-2 text-2xl font-semibold text-white">{orphanedFileVaultEntries.length}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Approx. size</div>
              <div className="mt-2 text-2xl font-semibold text-white">
                {(totalFileVaultBytes / (1024 * 1024)).toFixed(2)} MB
              </div>
            </div>
          </div>

          <div className="mt-5 max-h-80 space-y-3 overflow-y-auto">
            {fileVaultBusy ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-500">
                Inspecting encrypted file vault…
              </div>
            ) : fileVaultEntries.length ? (
              fileVaultEntries.map((entry) => (
                <div key={entry.blobId} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {entry.linkedTitle || 'Unlinked vault blob'}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {entry.mimeType} · {(entry.sizeBytes / 1024).toFixed(1)} KB · {entry.storageMode}
                      </div>
                    </div>
                    <span
                      className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] ${
                        entry.orphaned
                          ? 'border-red-500/20 bg-red-500/10 text-red-100'
                          : 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100'
                      }`}
                    >
                      {entry.orphaned ? 'Orphaned' : 'Linked'}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-slate-300">
                    {entry.linkedFormat ? `Library format: ${entry.linkedFormat}` : 'No active library entry references this blob.'}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Stored: {entry.storedAt ? new Date(entry.storedAt).toLocaleString() : 'Unknown'}
                  </div>
                  <div className="mt-2 break-all text-xs text-slate-500">Blob ID: {entry.blobId}</div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-4 text-sm text-slate-500">
                No encrypted file vault blobs are stored right now.
              </div>
            )}
          </div>
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
