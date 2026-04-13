/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Contact2,
  KeyRound,
  Mail,
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

const ProfileOrganizerApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedProfileId, setSelectedProfileId] = useState(data.profiles[0]?.id ?? null);
  const [filterQuery, setFilterQuery] = useState('');
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
      notes: form.notes.trim(),
      networkZones: { ...form.networkZones },
      updatedAt: now(),
    };

    const isUpdate = Boolean(form.id && data.profiles.some((profile) => profile.id === form.id));

    updateWorkspaceData((current) => ({
      ...current,
      profiles: isUpdate
        ? current.profiles.map((profile) => (profile.id === profileRecord.id ? profileRecord : profile))
        : [profileRecord, ...current.profiles],
    }));

    setSelectedProfileId(profileRecord.id);
    setStatus(
      isUpdate
        ? `${profileRecord.name} updated inside the encrypted workspace.`
        : `${profileRecord.name} saved to Profile Organizer.`,
    );
  };

  const handleDelete = (profileId) => {
    const profile = data.profiles.find((entry) => entry.id === profileId);
    const remainingProfiles = data.profiles.filter((entry) => entry.id !== profileId);

    updateWorkspaceData((current) => ({
      ...current,
      profiles: current.profiles.filter((entry) => entry.id !== profileId),
    }));

    setSelectedProfileId(remainingProfiles[0]?.id ?? null);
    setStatus(profile ? `${profile.name} removed from the organizer.` : 'Profile removed.');
  };

  const selectedZones = selectedProfile ? activeZonesForProfile(selectedProfile) : [];

  const selectedCounts = selectedProfile
    ? [
        { label: 'Emails', value: selectedProfile.emails.length },
        { label: 'Social logins', value: selectedProfile.socialLogins.length },
        { label: 'VPN zones', value: selectedProfile.vpnZones.length },
        { label: 'PGP keys', value: selectedProfile.pgpKeys.length },
      ]
    : [];

  return (
    <div className="grid h-full min-h-0 bg-slate-950 text-slate-100 xl:grid-cols-[360px_360px_minmax(0,1fr)]">
      <aside className="min-h-0 overflow-y-auto border-r border-teal-500/15 bg-slate-900/85 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <Contact2 size={18} className="text-teal-300" />
          Profile Organizer
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Keep names, addresses, mailboxes, social logins, VPN footprints, and PGP keysets grouped by identity.
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
              placeholder="Filter names, emails, logins, PGP keys, VPN zones..."
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
                          {profile.emails.length} emails · {profile.pgpKeys.length} keys
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
