import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  Plus,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { decryptWalletSecret } from '../utils/cryptoVault';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const NETWORKS = ['Bitcoin', 'Ethereum', 'Solana', 'Monero', 'Litecoin', 'Nostr', 'Other'];
const PAPER_WALLET_TOOLS = [
  {
    id: 'zec-paper-wallet',
    label: 'ZEC Paper Wallet',
    url: 'https://github.com/adityapk00/zecpaperwallet/',
    notes: 'ZCash paper wallet reference repository.',
  },
  {
    id: 'btc-paper-wallet',
    label: 'Electrum BTC Paper Wallet',
    url: 'https://github.com/Fensterbank/electrum-bitcoin-paper-wallet',
    notes: 'Bitcoin paper wallet generator built around Electrum.',
  },
];

const EMPTY_FORM = {
  label: '',
  network: 'Bitcoin',
  addresses: '',
  secretMaterial: '',
  secretNotes: '',
};

const maskValue = (value) => {
  const source = String(value || '').trim();
  if (!source) {
    return 'Hidden';
  }

  if (source.length <= 8) {
    return `${source.slice(0, 2)}••••`;
  }

  return `${source.slice(0, 4)}••••${source.slice(-4)}`;
};

const parseWalletSecretNotes = (value = '') =>
  String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((map, line) => {
      const match = line.match(/^([a-z0-9 _-]+):\s*(.+)$/i);
      if (match) {
        map[match[1].trim().toLowerCase()] = match[2].trim();
      }
      return map;
    }, {});

const buildWalletSecretFields = (wallet, revealedSecret) => {
  if (!wallet || !revealedSecret) {
    return [];
  }

  const noteMap = parseWalletSecretNotes(revealedSecret.secretNotes);
  const npub =
    wallet.addresses.find((entry) => entry.startsWith('npub1')) || noteMap.npub || noteMap.address;
  const pubkey =
    wallet.addresses.find((entry) => /^[0-9a-f]{64}$/i.test(entry)) || noteMap.pubkey || noteMap.public;

  if (wallet.network !== 'Nostr' && !npub && !pubkey) {
    return [
      {
        label: 'Secret material',
        value: revealedSecret.secretMaterial,
        tone: 'primary',
      },
    ];
  }

  return [
    {
      label: 'nsec',
      value: revealedSecret.secretMaterial,
      tone: 'primary',
    },
    ...(npub ? [{ label: 'npub', value: npub, tone: 'secondary' }] : []),
    ...(pubkey ? [{ label: 'pubkey', value: pubkey, tone: 'secondary' }] : []),
  ];
};

const WalletVaultApp = () => {
  const {
    data,
    session,
    updateWorkspaceData,
    clearWorkspaceNavigation,
    appendSessionAccessLog,
  } = useWorkspaceData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedWalletId, setSelectedWalletId] = useState(data.wallets[0]?.id ?? null);
  const [revealedSecrets, setRevealedSecrets] = useState({});
  const [legacyPassphrase, setLegacyPassphrase] = useState('');
  const [status, setStatus] = useState('New wallet entries are protected by the master-locked workspace.');
  const privacyEnabled = data.settings.privacyModeEnabled;

  useEffect(() => {
    if (!data.wallets.find((wallet) => wallet.id === selectedWalletId)) {
      setSelectedWalletId(data.wallets[0]?.id ?? null);
    }
  }, [data.wallets, selectedWalletId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'wallet-vault') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedWalletId(session.navigation.itemId);
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const selectedWallet =
    data.wallets.find((wallet) => wallet.id === selectedWalletId) ?? data.wallets[0] ?? null;

  const revealedSecret = selectedWallet ? revealedSecrets[selectedWallet.id] : null;
  const isLegacyWallet = Boolean(selectedWallet?.secret && !selectedWallet.secretMaterial);
  const secretFields = useMemo(
    () => buildWalletSecretFields(selectedWallet, revealedSecret),
    [revealedSecret, selectedWallet],
  );
  const maskedSecret = useMemo(
    () => 'Protected by the master-locked workspace. Reveal it inside this unlocked session when needed.',
    [],
  );

  const logAccess = useCallback((action, wallet) => {
    if (!data.settings.privacySessionAccessLog || !wallet) {
      return;
    }

    appendSessionAccessLog({
      action,
      recordType: 'wallet',
      recordId: wallet.id,
      recordLabel: wallet.label,
    });
  }, [appendSessionAccessLog, data.settings.privacySessionAccessLog]);

  useEffect(() => {
    if (!(privacyEnabled && data.settings.privacyAutoRedactOnBlur)) {
      return undefined;
    }

    const handleRedact = () => {
      setRevealedSecrets({});
      setStatus('Privacy Mode auto-redacted secret material on blur.');
      if (selectedWallet) {
        logAccess('Auto-redacted on blur', selectedWallet);
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleRedact();
      }
    };

    window.addEventListener('blur', handleRedact);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('blur', handleRedact);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [
    appendSessionAccessLog,
    data.settings.privacyAutoRedactOnBlur,
    data.settings.privacySessionAccessLog,
    logAccess,
    privacyEnabled,
    selectedWallet,
  ]);

  useEffect(() => {
    if (!(privacyEnabled && data.settings.privacyTimedRehide && revealedSecret && selectedWallet)) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setRevealedSecrets((current) => {
        const next = { ...current };
        delete next[selectedWallet.id];
        return next;
      });
      setStatus(`Privacy Mode re-hid ${selectedWallet.label}.`);
      logAccess('Timed re-hide', selectedWallet);
    }, data.settings.privacyTimedRehideSeconds * 1000);

    return () => window.clearTimeout(timeoutId);
  }, [
    data.settings.privacyTimedRehide,
    data.settings.privacyTimedRehideSeconds,
    logAccess,
    privacyEnabled,
    revealedSecret,
    selectedWallet,
  ]);

  const preventSensitiveClipboard = (event, wallet, reason = 'Clipboard blocked by Privacy Mode.') => {
    if (!(privacyEnabled && data.settings.privacyDisableClipboard)) {
      return;
    }

    event.preventDefault();
    setStatus(reason);
    logAccess('Blocked clipboard attempt', wallet);
  };

  const handleSaveWallet = (event) => {
    event.preventDefault();

    if (!form.label.trim() || !form.secretMaterial.trim()) {
      setStatus('A label and secret material are required.');
      return;
    }

    const walletRecord = {
      id: createId('wallet'),
      label: form.label.trim(),
      network: form.network,
      addresses: form.addresses
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      secretMaterial: form.secretMaterial.trim(),
      secretNotes: form.secretNotes.trim(),
      secret: null,
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      wallets: [walletRecord, ...current.wallets],
    }));

    setRevealedSecrets((current) => ({
      ...current,
      [walletRecord.id]: {
        secretMaterial: walletRecord.secretMaterial,
        secretNotes: walletRecord.secretNotes,
      },
    }));
    setSelectedWalletId(walletRecord.id);
    setForm(EMPTY_FORM);
    setLegacyPassphrase('');
    setStatus('Wallet entry saved inside the encrypted workspace.');
  };

  const handleReveal = async (wallet) => {
    if (!wallet) {
      return;
    }

    if (!wallet.secret) {
      setRevealedSecrets((current) => ({
        ...current,
        [wallet.id]: {
          secretMaterial: wallet.secretMaterial,
          secretNotes: wallet.secretNotes,
        },
      }));
      setStatus(`Unlocked ${wallet.label} for this session.`);
      logAccess('Revealed secret material', wallet);
      return;
    }

    if (!legacyPassphrase.trim()) {
      setStatus('Enter the legacy wallet passphrase to reveal this older entry.');
      return;
    }

    try {
      const decrypted = await decryptWalletSecret(wallet.secret, legacyPassphrase);
      const parsed = JSON.parse(decrypted);
      setRevealedSecrets((current) => ({
        ...current,
        [wallet.id]: {
          secretMaterial: parsed.secretMaterial || '',
          secretNotes: parsed.notes || '',
        },
      }));
      setStatus(`Unlocked legacy wallet ${wallet.label} for this session.`);
      logAccess('Revealed legacy secret material', wallet);
    } catch (error) {
      setStatus(error.message || 'Unable to decrypt the legacy wallet entry.');
    }
  };

  const handleHide = (walletId) => {
    setRevealedSecrets((current) => {
      const next = { ...current };
      delete next[walletId];
      return next;
    });
    setStatus('Secret material hidden again.');
    if (selectedWallet) {
      logAccess('Manually hid secret material', selectedWallet);
    }
  };

  const handleDelete = (walletId) => {
    const remainingWallets = data.wallets.filter((wallet) => wallet.id !== walletId);

    updateWorkspaceData((current) => ({
      ...current,
      wallets: current.wallets.filter((wallet) => wallet.id !== walletId),
    }));

    setRevealedSecrets((current) => {
      const next = { ...current };
      delete next[walletId];
      return next;
    });

    if (selectedWalletId === walletId) {
      setSelectedWalletId(remainingWallets[0]?.id ?? null);
    }

    setLegacyPassphrase('');
    setStatus('Wallet entry removed.');
  };

  const handlePressRevealStart = (wallet) => {
    if (!(privacyEnabled && data.settings.privacyPressHoldReveal)) {
      return;
    }

    handleReveal(wallet);
  };

  const handlePressRevealEnd = (wallet) => {
    if (!(privacyEnabled && data.settings.privacyPressHoldReveal)) {
      return;
    }

    handleHide(wallet.id);
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="min-h-0 w-80 overflow-y-auto border-r border-cyan-500/15 bg-slate-900/85 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <WalletCards size={18} className="text-cyan-300" />
          Wallet Vault
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Wallet labels, addresses, and recovery material are stored inside the master-locked workspace and only decrypted into memory during an unlocked session.
        </p>

        <form onSubmit={handleSaveWallet} className="mt-5 space-y-3">
          <input
            value={form.label}
            onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
            placeholder="Label"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/40"
          />

          <select
            value={form.network}
            onChange={(event) => setForm((current) => ({ ...current, network: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/40"
          >
            {NETWORKS.map((network) => (
              <option key={network} value={network}>
                {network}
              </option>
            ))}
          </select>

          <textarea
            value={form.addresses}
            onChange={(event) => setForm((current) => ({ ...current, addresses: event.target.value }))}
            placeholder="Public addresses, one per line"
            className="h-24 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/40"
          />

          <textarea
            value={form.secretMaterial}
            onChange={(event) => setForm((current) => ({ ...current, secretMaterial: event.target.value }))}
            onCopy={(event) => preventSensitiveClipboard(event, null)}
            onCut={(event) => preventSensitiveClipboard(event, null)}
            onPaste={(event) => preventSensitiveClipboard(event, null, 'Paste blocked on sensitive field by Privacy Mode.')}
            placeholder="Recovery phrase / private material"
            className="h-28 w-full resize-none rounded-xl border border-cyan-500/15 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/40"
          />

          <textarea
            value={form.secretNotes}
            onChange={(event) => setForm((current) => ({ ...current, secretNotes: event.target.value }))}
            onCopy={(event) => preventSensitiveClipboard(event, null)}
            onCut={(event) => preventSensitiveClipboard(event, null)}
            onPaste={(event) => preventSensitiveClipboard(event, null, 'Paste blocked on sensitive field by Privacy Mode.')}
            placeholder="Optional secret notes"
            className="h-20 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-cyan-400/40"
          />

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <Plus size={16} />
            Save wallet entry
          </button>
        </form>

        <div className="mt-5 rounded-2xl border border-white/5 bg-black/15 p-4">
          <div className="text-sm font-semibold text-cyan-300">Paper wallet tools</div>
          <div className="mt-3 space-y-3">
            {PAPER_WALLET_TOOLS.map((tool) => (
              <a
                key={tool.id}
                href={tool.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-cyan-400/25 hover:bg-white/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-white">{tool.label}</div>
                  <ExternalLink size={14} className="text-cyan-300" />
                </div>
                <div className="mt-1 text-xs leading-5 text-slate-400">{tool.notes}</div>
              </a>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-sm font-semibold text-cyan-300">Vault status</div>
          <p className="mt-2 text-sm text-slate-300">{status}</p>
        </div>

        <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="min-h-0 overflow-y-auto border-r border-white/10 p-5">
            <div className="space-y-3">
              {data.wallets.length ? (
                data.wallets.map((wallet) => (
                  <button
                    key={wallet.id}
                    type="button"
                    onClick={() => {
                      setSelectedWalletId(wallet.id);
                      setLegacyPassphrase('');
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedWallet?.id === wallet.id
                        ? 'border-cyan-400/30 bg-cyan-500/10'
                        : 'border-white/5 bg-black/15 hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-white">{wallet.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {wallet.network}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-400">
                        {wallet.addresses.length} addresses
                      </div>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                      {wallet.addresses.slice(0, 2).map((address) => (
                        <div key={`${wallet.id}-${address}`} className="truncate">
                          {address}
                        </div>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-5 text-sm text-slate-400">
                  No wallet entries yet.
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-5">
            {selectedWallet ? (
              <article className="rounded-3xl border border-cyan-500/15 bg-slate-900/75 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      {selectedWallet.network}
                    </div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{selectedWallet.label}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {revealedSecret ? (
                      <button
                        type="button"
                        onClick={() => handleHide(selectedWallet.id)}
                        className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
                      >
                        <EyeOff size={16} />
                        Hide
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!(privacyEnabled && data.settings.privacyPressHoldReveal)) {
                            handleReveal(selectedWallet);
                          }
                        }}
                        onMouseDown={() => handlePressRevealStart(selectedWallet)}
                        onMouseUp={() => handlePressRevealEnd(selectedWallet)}
                        onMouseLeave={() => handlePressRevealEnd(selectedWallet)}
                        onTouchStart={() => handlePressRevealStart(selectedWallet)}
                        onTouchEnd={() => handlePressRevealEnd(selectedWallet)}
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/10 px-3 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                      >
                        <Eye size={16} />
                        {privacyEnabled && data.settings.privacyPressHoldReveal ? 'Hold to reveal' : 'Reveal'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(selectedWallet.id)}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>

                {isLegacyWallet ? (
                  <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-100">
                      <Lock size={16} />
                      Legacy wallet compatibility
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      This entry was created before ROS moved to the master-locked vault. Enter the original wallet passphrase to reveal it inside the current session.
                    </p>
                    <input
                      type="password"
                      value={legacyPassphrase}
                      onChange={(event) => setLegacyPassphrase(event.target.value)}
                      className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/35"
                      placeholder="Legacy wallet passphrase"
                    />
                  </div>
                ) : null}

                <div className="mt-6 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-sm font-semibold text-cyan-300">Addresses</div>
                    <div className="mt-4 space-y-2 text-sm text-slate-200">
                      {selectedWallet.addresses.length ? (
                        selectedWallet.addresses.map((address) => (
                          <div
                            key={`${selectedWallet.id}-${address}`}
                            className="rounded-xl border border-white/5 bg-white/5 px-3 py-2 break-all"
                          >
                            {privacyEnabled && data.settings.privacyMaskedPartialDisplay ? maskValue(address) : address}
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-500">No public addresses saved.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-cyan-500/15 bg-black/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
                      <Lock size={16} />
                      Secret material
                    </div>
                    {revealedSecret ? (
                      <div className="mt-4 space-y-4">
                        <div className="grid gap-3">
                          {secretFields.map((field) => (
                            <div
                              key={`${selectedWallet.id}-${field.label}`}
                              onCopy={(event) => preventSensitiveClipboard(event, selectedWallet)}
                              onCut={(event) => preventSensitiveClipboard(event, selectedWallet)}
                              onContextMenu={(event) =>
                                preventSensitiveClipboard(
                                  event,
                                  selectedWallet,
                                  'Context menu blocked by Privacy Mode.',
                                )
                              }
                              className={`rounded-2xl border p-4 ${
                                field.tone === 'primary'
                                  ? 'border-cyan-500/15 bg-slate-950/80'
                                  : 'border-white/10 bg-black/25'
                              } ${
                                privacyEnabled && data.settings.privacyDisableClipboard ? 'select-none' : ''
                              }`}
                            >
                              <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                {field.label}
                              </div>
                              <div
                                className={`mt-3 whitespace-pre-wrap break-all text-[13px] leading-6 ${
                                  field.tone === 'primary' ? 'text-cyan-100' : 'text-slate-200'
                                }`}
                              >
                                {field.value}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          onCopy={(event) => preventSensitiveClipboard(event, selectedWallet)}
                          onCut={(event) => preventSensitiveClipboard(event, selectedWallet)}
                          onContextMenu={(event) => preventSensitiveClipboard(event, selectedWallet, 'Context menu blocked by Privacy Mode.')}
                          className={`rounded-2xl border border-white/10 bg-black/25 p-4 ${
                            privacyEnabled && data.settings.privacyDisableClipboard ? 'select-none' : ''
                          }`}
                        >
                          <div className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
                            Secret notes
                          </div>
                          <div className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                            {revealedSecret.secretNotes || 'No secret notes stored.'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-slate-300">
                        {data.settings.privacyMaskedPartialDisplay && selectedWallet.secretMaterial
                          ? `Masked: ${maskValue(selectedWallet.secretMaterial)}`
                          : maskedSecret}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-slate-500">
                Add a wallet entry to start using the vault.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default WalletVaultApp;
