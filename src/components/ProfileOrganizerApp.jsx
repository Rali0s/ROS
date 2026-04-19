/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Contact2,
  Copy,
  KeyRound,
  Mail,
  Phone,
  PhoneCall,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
} from 'lucide-react';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const NETWORK_ZONE_OPTIONS = [
  { key: 'clearnet', label: 'Clearnet' },
  { key: 'tor', label: 'TOR' },
  { key: 'freenet', label: 'Freenet' },
  { key: 'i2p', label: 'I2P' },
];

const EMPTY_FORM = {
  id: null,
  name: '',
  address: '',
  emails: '',
  socialLogins: '',
  vpnZones: '',
  pgpKeys: '',
  mySudoExport: '',
  pgpPublicBundle: '',
  pgpPrivateBundle: '',
  voipProfiles: [],
  phoneBook: [],
  notes: '',
  networkZones: {
    clearnet: false,
    tor: false,
    freenet: false,
    i2p: false,
  },
};

const INPUT_CLASS =
  'w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-teal-400/40';

const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;
const VOIP_PROVIDERS = ['MySudo', 'Burner Phone', 'Google Voice', 'Line2', 'Other'];
const EMPTY_VOIP_DRAFT = {
  label: '',
  provider: 'MySudo',
  number: '',
  notes: '',
};
const EMPTY_CALL_DRAFT = {
  contactName: '',
  contactNumber: '',
  viaProfileId: '',
  viaNumber: '',
  disposition: 'active',
  callbackAt: '',
  notes: '',
};
const CALL_DISPOSITIONS = [
  { value: 'active', label: 'Active' },
  { value: 'callback', label: 'Call Back' },
  { value: 'do-not-call', label: 'Do Not Call' },
];

const splitLines = (value) =>
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const joinLines = (values) => (Array.isArray(values) ? values.join('\n') : '');

const profileToForm = (profile) => ({
  id: profile?.id ?? null,
  name: profile?.name ?? '',
  address: profile?.address ?? '',
  emails: joinLines(profile?.emails),
  socialLogins: joinLines(profile?.socialLogins),
  vpnZones: joinLines(profile?.vpnZones),
  pgpKeys: joinLines(profile?.pgpKeys),
  mySudoExport: profile?.mySudoExport ?? '',
  pgpPublicBundle: profile?.pgpPublicBundle ?? '',
  pgpPrivateBundle: profile?.pgpPrivateBundle ?? '',
  voipProfiles: Array.isArray(profile?.voipProfiles) ? profile.voipProfiles : [],
  phoneBook: Array.isArray(profile?.phoneBook) ? profile.phoneBook : [],
  notes: profile?.notes ?? '',
  networkZones: {
    ...EMPTY_FORM.networkZones,
    ...(profile?.networkZones ?? {}),
  },
});

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const activeZonesForProfile = (profile) =>
  NETWORK_ZONE_OPTIONS.filter((zone) => profile?.networkZones?.[zone.key]).map((zone) => zone.label);

const matchesProfile = (profile, query) => {
  const haystack = [
    profile.name,
    profile.address,
    profile.emails.join(' '),
    profile.socialLogins.join(' '),
    profile.vpnZones.join(' '),
    profile.pgpKeys.join(' '),
    profile.mySudoExport,
    profile.pgpPublicBundle,
    profile.pgpPrivateBundle,
    (profile.voipProfiles ?? [])
      .map((entry) => `${entry.provider} ${entry.label} ${entry.number} ${entry.notes}`)
      .join(' '),
    (profile.phoneBook ?? [])
      .map(
        (entry) =>
          `${entry.contactName} ${entry.contactNumber} ${entry.viaLabel} ${entry.viaNumber} ${entry.notes}`,
      )
      .join(' '),
    activeZonesForProfile(profile).join(' '),
    profile.notes,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(query);
};

const SectionList = ({ title, items, emptyLabel }) => (
  <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
    <div className="text-sm font-semibold text-teal-300">{title}</div>
    {items.length ? (
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div
            key={`${title}-${item}`}
            className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-200"
          >
            {item}
          </div>
        ))}
      </div>
    ) : (
      <div className="mt-3 rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-4 text-sm text-slate-500">
        {emptyLabel}
      </div>
    )}
  </div>
);

const buildProfileWalletEntries = (profileRecord) => {
  const profileLabel = profileRecord.name || 'Untitled profile';
  const emailHints = Array.isArray(profileRecord.emails) ? profileRecord.emails.slice(0, 3) : [];

  return [
    profileRecord.mySudoExport.trim()
      ? {
          id: `profile-wallet:mysudo:${profileRecord.id}`,
          label: `${profileLabel} · MySudo export`,
          network: 'Other',
          addresses: emailHints,
          secretMaterial: profileRecord.mySudoExport.trim(),
          secretNotes: `profile: ${profileLabel}\nkind: mysudo-export`,
          secret: null,
          updatedAt: now(),
        }
      : null,
    profileRecord.pgpPublicBundle.trim()
      ? {
          id: `profile-wallet:pgp-public:${profileRecord.id}`,
          label: `${profileLabel} · PGP public bundle`,
          network: 'Other',
          addresses: profileRecord.pgpKeys,
          secretMaterial: profileRecord.pgpPublicBundle.trim(),
          secretNotes: `profile: ${profileLabel}\nkind: pgp-public`,
          secret: null,
          updatedAt: now(),
        }
      : null,
    profileRecord.pgpPrivateBundle.trim()
      ? {
          id: `profile-wallet:pgp-private:${profileRecord.id}`,
          label: `${profileLabel} · PGP private bundle`,
          network: 'Other',
          addresses: profileRecord.pgpKeys,
          secretMaterial: profileRecord.pgpPrivateBundle.trim(),
          secretNotes: `profile: ${profileLabel}\nkind: pgp-private`,
          secret: null,
          updatedAt: now(),
        }
      : null,
  ].filter(Boolean);
};

const ProfileOrganizerApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedProfileId, setSelectedProfileId] = useState(data.profiles[0]?.id ?? null);
  const [filterQuery, setFilterQuery] = useState('');
  const [voipDraft, setVoipDraft] = useState(EMPTY_VOIP_DRAFT);
  const [callDraft, setCallDraft] = useState(EMPTY_CALL_DRAFT);
  const [phoneBookSort, setPhoneBookSort] = useState('recent');
  const [status, setStatus] = useState(
    'Use one record per identity, persona, or account cluster. Everything stays inside the encrypted workspace.',
  );

  const selectedProfile =
    selectedProfileId === null
      ? null
      : data.profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  useEffect(() => {
    if (selectedProfileId === null) {
      return;
    }

    if (!data.profiles.find((profile) => profile.id === selectedProfileId)) {
      setSelectedProfileId(data.profiles[0]?.id ?? null);
    }
  }, [data.profiles, selectedProfileId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'profiles') {
      return;
    }

    if (session.navigation.itemId) {
      setFilterQuery('');
      setSelectedProfileId(session.navigation.itemId);
      window.requestAnimationFrame(() => {
        document.getElementById(`profile-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      });
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  useEffect(() => {
    if (selectedProfile) {
      setForm(profileToForm(selectedProfile));
      setVoipDraft(EMPTY_VOIP_DRAFT);
      setCallDraft(EMPTY_CALL_DRAFT);
      return;
    }

    setForm((current) => (current.id ? EMPTY_FORM : current));
  }, [selectedProfile]);

  const filteredProfiles = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    const ordered = [...data.profiles].sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));

    if (!query) {
      return ordered;
    }

    return ordered.filter((profile) => matchesProfile(profile, query));
  }, [data.profiles, filterQuery]);

  const handleFieldChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleZoneToggle = (zoneKey) => {
    setForm((current) => ({
      ...current,
      networkZones: {
        ...current.networkZones,
        [zoneKey]: !current.networkZones[zoneKey],
      },
    }));
  };

  const handleNewProfile = () => {
    setSelectedProfileId(null);
    setForm(EMPTY_FORM);
    setStatus('Blank profile draft ready.');
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setStatus('A profile name is required.');
      return;
    }

    const profileRecord = {
      id: form.id || createId('profile'),
      name: form.name.trim(),
      address: form.address.trim(),
      emails: splitLines(form.emails),
      socialLogins: splitLines(form.socialLogins),
      vpnZones: splitLines(form.vpnZones),
      pgpKeys: splitLines(form.pgpKeys),
      mySudoExport: form.mySudoExport.trim(),
      pgpPublicBundle: form.pgpPublicBundle.trim(),
      pgpPrivateBundle: form.pgpPrivateBundle.trim(),
      voipProfiles: Array.isArray(form.voipProfiles) ? form.voipProfiles : [],
      phoneBook: Array.isArray(form.phoneBook) ? form.phoneBook : [],
      notes: form.notes.trim(),
      networkZones: { ...form.networkZones },
      updatedAt: now(),
    };
    const mirroredWalletEntries = buildProfileWalletEntries(profileRecord);
    const mirroredWalletIds = new Set([
      `profile-wallet:mysudo:${profileRecord.id}`,
      `profile-wallet:pgp-public:${profileRecord.id}`,
      `profile-wallet:pgp-private:${profileRecord.id}`,
    ]);

    const isUpdate = Boolean(form.id && data.profiles.some((profile) => profile.id === form.id));

    updateWorkspaceData((current) => ({
      ...current,
      profiles: isUpdate
        ? current.profiles.map((profile) => (profile.id === profileRecord.id ? profileRecord : profile))
        : [profileRecord, ...current.profiles],
      wallets: [
        ...mirroredWalletEntries,
        ...current.wallets.filter((wallet) => !mirroredWalletIds.has(wallet.id)),
      ],
    }));

    setSelectedProfileId(profileRecord.id);
    setStatus(
      isUpdate
        ? `${profileRecord.name} updated inside the encrypted workspace and mirrored to Wallet Vault.`
        : `${profileRecord.name} saved to Profile Organizer and mirrored to Wallet Vault.`,
    );
  };

  const handleDelete = (profileId) => {
    const profile = data.profiles.find((entry) => entry.id === profileId);
    const remainingProfiles = data.profiles.filter((entry) => entry.id !== profileId);

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.filter((entry) => entry.id !== profileId),
      wallets: current.wallets.filter(
        (wallet) =>
          ![
            `profile-wallet:mysudo:${profileId}`,
            `profile-wallet:pgp-public:${profileId}`,
            `profile-wallet:pgp-private:${profileId}`,
          ].includes(wallet.id),
      ),
    }));

    setSelectedProfileId(remainingProfiles[0]?.id ?? null);
    setStatus(profile ? `${profile.name} removed from the organizer.` : 'Profile removed.');
  };

  const selectedZones = selectedProfile ? activeZonesForProfile(selectedProfile) : [];
  const selectedVoipProfiles = useMemo(
    () =>
      [...(selectedProfile?.voipProfiles ?? [])].sort(
        (left, right) =>
          new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime() ||
          (right.useCount ?? 0) - (left.useCount ?? 0),
      ),
    [selectedProfile?.voipProfiles],
  );
  const selectedPhoneBook = useMemo(() => {
    const entries = [...(selectedProfile?.phoneBook ?? [])];
    if (phoneBookSort === 'used') {
      return entries.sort(
        (left, right) =>
          (right.useCount ?? 0) - (left.useCount ?? 0) ||
          new Date(right.lastCalledAt || right.updatedAt || 0).getTime() -
            new Date(left.lastCalledAt || left.updatedAt || 0).getTime(),
      );
    }

    return entries.sort(
      (left, right) =>
        new Date(right.lastCalledAt || right.updatedAt || 0).getTime() -
        new Date(left.lastCalledAt || left.updatedAt || 0).getTime(),
    );
  }, [phoneBookSort, selectedProfile?.phoneBook]);

  const selectedCounts = selectedProfile
      ? [
        { label: 'Emails', value: selectedProfile.emails.length },
        { label: 'Social logins', value: selectedProfile.socialLogins.length },
        { label: 'VPN zones', value: selectedProfile.vpnZones.length },
        { label: 'PGP keys', value: selectedProfile.pgpKeys.length },
        { label: 'Secure exports', value: [selectedProfile.mySudoExport, selectedProfile.pgpPublicBundle, selectedProfile.pgpPrivateBundle].filter((entry) => entry?.trim()).length },
        { label: 'VoIP lines', value: selectedVoipProfiles.length },
        { label: 'Contacts', value: selectedPhoneBook.length },
      ]
    : [];

  const copyToClipboard = async (value, successLabel) => {
    if (!value?.trim()) {
      setStatus('Nothing to copy yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(value.trim());
      setStatus(successLabel);
    } catch (error) {
      setStatus('Clipboard write failed in this environment.');
    }
  };

  const handleAddVoipProfile = () => {
    if (!selectedProfile) {
      setStatus('Save the identity profile first, then add VoIP lines.');
      return;
    }

    if (!voipDraft.label.trim() && !voipDraft.number.trim()) {
      setStatus('Give the VoIP profile a label or number first.');
      return;
    }

    const voipRecord = {
      id: createId('voip'),
      label: voipDraft.label.trim(),
      provider: voipDraft.provider,
      number: voipDraft.number.trim(),
      notes: voipDraft.notes.trim(),
      useCount: 0,
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === selectedProfile.id
          ? {
              ...profile,
              voipProfiles: [voipRecord, ...(profile.voipProfiles ?? [])],
              updatedAt: now(),
            }
          : profile,
      ),
    }));

    setVoipDraft(EMPTY_VOIP_DRAFT);
    setStatus(`${voipRecord.provider} line saved to ${selectedProfile.name}.`);
  };

  const incrementVoipUse = (voipId) => {
    if (!selectedProfile) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === selectedProfile.id
          ? {
              ...profile,
              voipProfiles: (profile.voipProfiles ?? []).map((entry) =>
                entry.id === voipId
                  ? { ...entry, useCount: (entry.useCount ?? 0) + 1, updatedAt: now() }
                  : entry,
              ),
              updatedAt: now(),
            }
          : profile,
      ),
    }));

    setStatus('VoIP use counter incremented.');
  };

  const deleteVoipProfile = (voipId) => {
    if (!selectedProfile) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === selectedProfile.id
          ? {
              ...profile,
              voipProfiles: (profile.voipProfiles ?? []).filter((entry) => entry.id !== voipId),
              phoneBook: (profile.phoneBook ?? []).map((entry) =>
                entry.viaProfileId === voipId
                  ? { ...entry, viaProfileId: '', viaLabel: entry.viaNumber || entry.viaLabel }
                  : entry,
              ),
              updatedAt: now(),
            }
          : profile,
      ),
    }));

    setStatus('VoIP line removed from this profile.');
  };

  const handleAddPhoneLog = () => {
    if (!selectedProfile) {
      setStatus('Save the identity profile first, then add phone-book entries.');
      return;
    }

    if (!callDraft.contactName.trim() && !callDraft.contactNumber.trim()) {
      setStatus('Add a contact name or number first.');
      return;
    }

    const viaProfile = selectedVoipProfiles.find((entry) => entry.id === callDraft.viaProfileId);
    const viaNumber = viaProfile?.number || callDraft.viaNumber.trim();
    const viaLabel = viaProfile
      ? `${viaProfile.provider}${viaProfile.label ? ` · ${viaProfile.label}` : ''}`
      : callDraft.viaNumber.trim();

    const phoneRecord = {
      id: createId('call'),
      contactName: callDraft.contactName.trim(),
      contactNumber: callDraft.contactNumber.trim(),
      viaProfileId: viaProfile?.id || '',
      viaLabel,
      viaNumber,
      disposition: callDraft.disposition,
      callbackAt: callDraft.disposition === 'callback' ? callDraft.callbackAt.trim() : '',
      notes: callDraft.notes.trim(),
      useCount: 1,
      lastCalledAt: now(),
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === selectedProfile.id
          ? {
              ...profile,
              phoneBook: [phoneRecord, ...(profile.phoneBook ?? [])],
              voipProfiles: (profile.voipProfiles ?? []).map((entry) =>
                entry.id === viaProfile?.id
                  ? { ...entry, useCount: (entry.useCount ?? 0) + 1, updatedAt: now() }
                  : entry,
              ),
              updatedAt: now(),
            }
          : profile,
      ),
    }));

    setCallDraft(EMPTY_CALL_DRAFT);
    setStatus('Phone-book entry saved and usage recorded.');
  };

  const incrementPhoneBookUse = (entryId) => {
    if (!selectedProfile) {
      return;
    }

    let linkedVoipId = '';
    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => {
        if (profile.id !== selectedProfile.id) {
          return profile;
        }

        const nextPhoneBook = (profile.phoneBook ?? []).map((entry) => {
          if (entry.id === entryId) {
            linkedVoipId = entry.viaProfileId || '';
            return {
              ...entry,
              useCount: (entry.useCount ?? 0) + 1,
              lastCalledAt: now(),
              updatedAt: now(),
            };
          }
          return entry;
        });

        return {
          ...profile,
          phoneBook: nextPhoneBook,
          voipProfiles: (profile.voipProfiles ?? []).map((entry) =>
            entry.id === linkedVoipId
              ? { ...entry, useCount: (entry.useCount ?? 0) + 1, updatedAt: now() }
              : entry,
          ),
          updatedAt: now(),
        };
      }),
    }));

    setStatus('Call use counter incremented.');
  };

  const deletePhoneBookEntry = (entryId) => {
    if (!selectedProfile) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === selectedProfile.id
          ? {
              ...profile,
              phoneBook: (profile.phoneBook ?? []).filter((entry) => entry.id !== entryId),
              updatedAt: now(),
            }
          : profile,
      ),
    }));

    setStatus('Phone-book entry removed.');
  };

  return (
    <div className="grid h-full min-h-0 bg-slate-950 text-slate-100 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-teal-500/15 bg-slate-900/85 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Contact2 size={18} className="text-teal-300" />
          Profile Organizer
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep identities, mailboxes, VoIP numbers, call references, VPN footprints, and PGP keysets grouped by persona.
        </p>

        <form onSubmit={handleSave} className="mt-5 space-y-3">
          <input
            value={form.name}
            onChange={(event) => handleFieldChange('name', event.target.value)}
            placeholder="Name or profile codename"
            className={INPUT_CLASS}
          />

          <textarea
            value={form.address}
            onChange={(event) => handleFieldChange('address', event.target.value)}
            placeholder="Address"
            className={`${TEXTAREA_CLASS} h-20`}
          />

          <textarea
            value={form.emails}
            onChange={(event) => handleFieldChange('emails', event.target.value)}
            placeholder="Emails, one per line"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <textarea
            value={form.socialLogins}
            onChange={(event) => handleFieldChange('socialLogins', event.target.value)}
            placeholder="Social media logins, one per line"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <textarea
            value={form.vpnZones}
            onChange={(event) => handleFieldChange('vpnZones', event.target.value)}
            placeholder="VPN zones, one per line"
            className={`${TEXTAREA_CLASS} h-20`}
          />

          <textarea
            value={form.pgpKeys}
            onChange={(event) => handleFieldChange('pgpKeys', event.target.value)}
            placeholder="PGP keys / fingerprints / Kleopatra notes, one per line"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <textarea
            value={form.mySudoExport}
            onChange={(event) => handleFieldChange('mySudoExport', event.target.value)}
            placeholder="MySudo export / secure account text"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <textarea
            value={form.pgpPublicBundle}
            onChange={(event) => handleFieldChange('pgpPublicBundle', event.target.value)}
            placeholder="PGP public key bundle"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <textarea
            value={form.pgpPrivateBundle}
            onChange={(event) => handleFieldChange('pgpPrivateBundle', event.target.value)}
            placeholder="PGP private key bundle"
            className={`${TEXTAREA_CLASS} h-24`}
          />

          <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
              <Shield size={15} />
              Network zones
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {NETWORK_ZONE_OPTIONS.map((zone) => (
                <label
                  key={zone.key}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={form.networkZones[zone.key]}
                    onChange={() => handleZoneToggle(zone.key)}
                    className="accent-teal-400"
                  />
                  {zone.label}
                </label>
              ))}
            </div>
          </div>

          <textarea
            value={form.notes}
            onChange={(event) => handleFieldChange('notes', event.target.value)}
            placeholder="Notes"
            className={`${TEXTAREA_CLASS} h-32`}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
            >
              {form.id ? <Save size={16} /> : <Plus size={16} />}
              {form.id ? 'Save changes' : 'Create profile'}
            </button>

            <button
              type="button"
              onClick={handleNewProfile}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              <Plus size={16} />
              New blank
            </button>
          </div>
        </form>
      </aside>

      <section className="flex min-h-0 flex-col border-r border-white/10 bg-slate-950/70">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
            <Search size={15} />
            Identity index
          </div>
          <div className="mt-3">
              <input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
              placeholder="Filter names, emails, VoIP numbers, contacts, PGP keys, VPN zones..."
                className={INPUT_CLASS}
              />
          </div>
          <p className="mt-3 text-sm text-slate-400">{status}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {filteredProfiles.length ? (
            <div className="space-y-3">
              {filteredProfiles.map((profile) => {
                const activeZones = activeZonesForProfile(profile);

                return (
                  <button
                    key={profile.id}
                    id={`profile-${profile.id}`}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedProfileId === profile.id
                        ? 'border-teal-400/35 bg-teal-500/10 shadow-lg shadow-black/20'
                        : 'border-white/10 bg-slate-900/70 hover:border-white/20 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-base font-semibold text-white">{profile.name}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                          {profile.emails.length} emails · {profile.voipProfiles.length} voip · {profile.phoneBook.length} contacts
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500">{formatTimestamp(profile.updatedAt)}</div>
                    </div>

                    {profile.address ? (
                      <div className="mt-3 text-sm leading-6 text-slate-300">{profile.address}</div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeZones.length ? (
                        activeZones.map((zone) => (
                          <span
                            key={`${profile.id}-${zone}`}
                            className="rounded-full border border-teal-400/20 bg-teal-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-100"
                          >
                            {zone}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-500">
                          No network zones tagged
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-sm leading-6 text-slate-400">
              No profiles match the current filter. Clear the search or create a new identity record.
            </div>
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-y-auto p-5">
        {selectedProfile ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(20,184,166,0.18),rgba(15,23,42,0.94))] p-5 shadow-xl shadow-black/20">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-200">
                    <Contact2 size={12} />
                    Identity dossier
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{selectedProfile.name}</h1>
                  <div className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-200">
                    {selectedProfile.address || 'No address recorded for this profile yet.'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(selectedProfile.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                  Delete profile
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {selectedCounts.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{item.label}</div>
                    <div className="mt-2 text-2xl font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {selectedZones.length ? (
                  selectedZones.map((zone) => (
                    <span
                      key={`zone-${zone}`}
                      className="rounded-full border border-teal-400/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-100"
                    >
                      {zone}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                    No network zones tagged
                  </span>
                )}
              </div>
            </section>

            <div className="grid gap-5 2xl:grid-cols-2">
              <SectionList title="Emails" items={selectedProfile.emails} emptyLabel="No email accounts listed yet." />
              <SectionList
                title="Social media logins"
                items={selectedProfile.socialLogins}
                emptyLabel="No social media logins recorded yet."
              />
              <SectionList title="VPN zones" items={selectedProfile.vpnZones} emptyLabel="No VPN zones tagged yet." />
              <SectionList
                title="PGP keys / Kleopatra"
                items={selectedProfile.pgpKeys}
                emptyLabel="No PGP keys recorded yet."
              />
            </div>

            <div className="grid gap-5 2xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="text-sm font-semibold text-teal-300">MySudo export</div>
                <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {selectedProfile.mySudoExport || 'No MySudo export saved for this profile yet.'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="text-sm font-semibold text-teal-300">PGP public bundle</div>
                <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {selectedProfile.pgpPublicBundle || 'No PGP public bundle saved for this profile yet.'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="text-sm font-semibold text-teal-300">PGP private bundle</div>
                <div className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {selectedProfile.pgpPrivateBundle || 'No PGP private bundle saved for this profile yet.'}
                </div>
              </div>
            </div>

            <div className="grid gap-5">
              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
                  <Phone size={16} />
                  VoIP profiles
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Track MySudo, burner, and other dial-out lines attached to this identity. Use the counter to record every live use.
                </p>

                <div className="mt-4 grid gap-3">
                  <input
                    value={voipDraft.label}
                    onChange={(event) => setVoipDraft((current) => ({ ...current, label: event.target.value }))}
                    placeholder="Line label"
                    className={INPUT_CLASS}
                  />
                  <select
                    value={voipDraft.provider}
                    onChange={(event) => setVoipDraft((current) => ({ ...current, provider: event.target.value }))}
                    className={INPUT_CLASS}
                  >
                    {VOIP_PROVIDERS.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                  <input
                    value={voipDraft.number}
                    onChange={(event) => setVoipDraft((current) => ({ ...current, number: event.target.value }))}
                    placeholder="+1 ..."
                    className={INPUT_CLASS}
                  />
                  <textarea
                    value={voipDraft.notes}
                    onChange={(event) => setVoipDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Routing notes"
                    className={`${TEXTAREA_CLASS} h-20`}
                  />
                  <button
                    type="button"
                    onClick={handleAddVoipProfile}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
                  >
                    <Plus size={16} />
                    Add VoIP line
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedVoipProfiles.length ? (
                    selectedVoipProfiles.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {entry.label || entry.number || 'Unnamed line'}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                              {entry.provider} · {entry.useCount} uses
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteVoipProfile(entry.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 break-all rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-slate-200">
                          {entry.number || 'No number recorded yet.'}
                        </div>
                        {entry.notes ? (
                          <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{entry.notes}</div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => incrementVoipUse(entry.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Plus size={14} />
                            Used +1
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(entry.number, `${entry.label || entry.provider} copied to clipboard.`)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Copy size={14} />
                            Copy number
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-4 text-sm text-slate-500">
                      No VoIP lines recorded for this identity yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
                    <PhoneCall size={16} />
                    Phone book
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPhoneBookSort('recent')}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                        phoneBookSort === 'recent'
                          ? 'border-teal-400/25 bg-teal-500/10 text-teal-100'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Last used
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneBookSort('used')}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                        phoneBookSort === 'used'
                          ? 'border-teal-400/25 bg-teal-500/10 text-teal-100'
                          : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      Most used
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Record contacts reached by this identity and note which number or VoIP profile handled the call.
                  Keep the hottest contacts at the top with quick copy and `Called +1` actions.
                </p>

                <div className="mt-4 grid gap-3">
                  <input
                    value={callDraft.contactName}
                    onChange={(event) => setCallDraft((current) => ({ ...current, contactName: event.target.value }))}
                    placeholder="Contact name"
                    className={INPUT_CLASS}
                  />
                  <input
                    value={callDraft.contactNumber}
                    onChange={(event) => setCallDraft((current) => ({ ...current, contactNumber: event.target.value }))}
                    placeholder="Contact number"
                    className={INPUT_CLASS}
                  />
                  <select
                    value={callDraft.viaProfileId}
                    onChange={(event) => setCallDraft((current) => ({ ...current, viaProfileId: event.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Choose VoIP profile</option>
                    {selectedVoipProfiles.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.provider} · {entry.label || entry.number || 'Unnamed line'}
                      </option>
                    ))}
                  </select>
                  <input
                    value={callDraft.viaNumber}
                    onChange={(event) => setCallDraft((current) => ({ ...current, viaNumber: event.target.value }))}
                    placeholder="Or note a manual outgoing number"
                    className={INPUT_CLASS}
                  />
                  <select
                    value={callDraft.disposition}
                    onChange={(event) =>
                      setCallDraft((current) => ({
                        ...current,
                        disposition: event.target.value,
                        callbackAt: event.target.value === 'callback' ? current.callbackAt : '',
                      }))
                    }
                    className={INPUT_CLASS}
                  >
                    {CALL_DISPOSITIONS.map((disposition) => (
                      <option key={disposition.value} value={disposition.value}>
                        {disposition.label}
                      </option>
                    ))}
                  </select>
                  {callDraft.disposition === 'callback' ? (
                    <input
                      value={callDraft.callbackAt}
                      onChange={(event) => setCallDraft((current) => ({ ...current, callbackAt: event.target.value }))}
                      placeholder="Call back later / time window"
                      className={INPUT_CLASS}
                    />
                  ) : null}
                  <textarea
                    value={callDraft.notes}
                    onChange={(event) => setCallDraft((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Post-call notes, instructions, outcome"
                    className={`${TEXTAREA_CLASS} h-28`}
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoneLog}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300"
                  >
                    <Plus size={16} />
                    Add contact log
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedPhoneBook.length ? (
                    selectedPhoneBook.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {entry.contactName || entry.contactNumber || 'Unnamed contact'}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                              {entry.useCount} calls{entry.lastCalledAt ? ` · ${formatTimestamp(entry.lastCalledAt)}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => deletePhoneBookEntry(entry.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                              entry.disposition === 'do-not-call'
                                ? 'border-red-500/25 bg-red-500/10 text-red-100'
                                : entry.disposition === 'callback'
                                  ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                                  : 'border-teal-400/20 bg-teal-500/10 text-teal-100'
                            }`}
                          >
                            {entry.disposition === 'do-not-call'
                              ? 'Do Not Call'
                              : entry.disposition === 'callback'
                                ? 'Call Back'
                                : 'Active'}
                          </span>
                          {entry.callbackAt ? (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              {entry.callbackAt}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 text-sm text-slate-200">
                          {entry.contactNumber || 'No destination number recorded.'}
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.18em] text-teal-200">
                          via {entry.viaLabel || entry.viaNumber || 'manual route'}
                        </div>
                        {entry.notes ? (
                          <div className="mt-3 whitespace-pre-wrap rounded-xl border border-white/5 bg-white/5 p-3 text-sm leading-6 text-slate-300">
                            {entry.notes}
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => incrementPhoneBookUse(entry.id)}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Plus size={14} />
                            Called +1
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                entry.contactNumber,
                                `${entry.contactName || 'Destination number'} copied to clipboard.`,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Copy size={14} />
                            Copy destination
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                entry.viaNumber || entry.viaLabel,
                                `${entry.viaLabel || 'Outbound line'} copied to clipboard.`,
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            <Copy size={14} />
                            Copy outbound
                          </button>
                          {entry.disposition !== 'do-not-call' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedProfile) {
                                  return;
                                }
                                updateWorkspaceData((current) => ({
                                  ...current,
                                  profiles: current.profiles.map((profile) =>
                                    profile.id === selectedProfile.id
                                      ? {
                                          ...profile,
                                          phoneBook: (profile.phoneBook ?? []).map((phoneEntry) =>
                                            phoneEntry.id === entry.id
                                              ? {
                                                  ...phoneEntry,
                                                  disposition: 'do-not-call',
                                                  callbackAt: '',
                                                  updatedAt: now(),
                                                }
                                              : phoneEntry,
                                          ),
                                          updatedAt: now(),
                                        }
                                      : profile,
                                  ),
                                }));
                                setStatus('Contact marked Do Not Call.');
                              }}
                              className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                            >
                              Do Not Call
                            </button>
                          ) : null}
                          {entry.disposition !== 'callback' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!selectedProfile) {
                                  return;
                                }
                                updateWorkspaceData((current) => ({
                                  ...current,
                                  profiles: current.profiles.map((profile) =>
                                    profile.id === selectedProfile.id
                                      ? {
                                          ...profile,
                                          phoneBook: (profile.phoneBook ?? []).map((phoneEntry) =>
                                            phoneEntry.id === entry.id
                                              ? {
                                                  ...phoneEntry,
                                                  disposition: 'callback',
                                                  callbackAt: phoneEntry.callbackAt || 'Call back later',
                                                  updatedAt: now(),
                                                }
                                              : phoneEntry,
                                          ),
                                          updatedAt: now(),
                                        }
                                      : profile,
                                  ),
                                }));
                                setStatus('Contact marked for callback.');
                              }}
                              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/20"
                            >
                              Call Back
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 bg-black/10 px-3 py-4 text-sm text-slate-500">
                      No phone-book entries recorded for this identity yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
                  <Mail size={16} />
                  Notes
                </div>
                <div className="mt-3 whitespace-pre-wrap rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-7 text-slate-200">
                  {selectedProfile.notes || 'No notes saved for this profile yet.'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/65 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-teal-300">
                  <KeyRound size={16} />
                  Organizer tips
                </div>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
                  <li>Use one profile per identity cluster, not necessarily one record per mailbox.</li>
                  <li>Store emails, social logins, and PGP fingerprints one per line so search stays clean.</li>
                  <li>Tag active network zones to quickly separate clearnet, TOR, Freenet, and I2P usage.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm leading-7 text-slate-400">
            Create a profile on the left to start organizing mailboxes, social logins, VPN zones, and PGP keysets.
          </div>
        )}
      </section>
    </div>
  );
};

export default ProfileOrganizerApp;
