/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Contact2,
  Network,
  Plus,
  Save,
  Search,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const TABS = [
  { id: 'profile', label: 'Profiles', icon: Contact2 },
  { id: 'biological', label: 'Biological', icon: Activity },
  { id: 'social', label: 'Social', icon: Network },
  { id: 'personal', label: 'Personal / Psych', icon: Brain },
];

const PROFILE_KINDS = [
  { value: 'self', label: 'Self' },
  { value: 'person', label: 'Person' },
  { value: 'group', label: 'Group' },
];

const INPUT_CLASS =
  'w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-400/28 focus:bg-black/35';

const TEXTAREA_CLASS = `${INPUT_CLASS} min-h-[110px] resize-none`;

const splitList = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const joinList = (value) => (Array.isArray(value) ? value.join(', ') : '');

const formatStamp = (value) =>
  new Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const emptyProfileDraft = {
  label: '',
  kind: 'person',
  aliases: '',
  knownAssociates: '',
  triggers: '',
  strengths: '',
  weaknesses: '',
  notes: '',
};

const emptyNotebookDraft = {
  title: '',
  context: '',
  tags: '',
  notes: '',
};

const profileToDraft = (subject) => ({
  label: subject?.label ?? '',
  kind: subject?.kind ?? 'person',
  aliases: joinList(subject?.aliases),
  knownAssociates: joinList(subject?.knownAssociates),
  triggers: joinList(subject?.triggers),
  strengths: joinList(subject?.strengths),
  weaknesses: joinList(subject?.weaknesses),
  notes: subject?.notes ?? '',
});

const ListCard = ({ title, items, emptyLabel }) => (
  <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
    <div className="text-sm font-semibold text-white">{title}</div>
    {items.length ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={`${title}-${item}`} className="rounded-full border border-amber-500/18 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
            {item}
          </span>
        ))}
      </div>
    ) : (
      <div className="mt-3 text-sm text-slate-500">{emptyLabel}</div>
    )}
  </div>
);

const BpsEngineApp = () => {
  const { data, updateWorkspaceData } = useWorkspaceData();
  const theme = getAppInteriorTheme(data.settings.theme);
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedSubjectId, setSelectedSubjectId] = useState(data.bpsSubjects[0]?.id ?? '');
  const [filterQuery, setFilterQuery] = useState('');
  const [status, setStatus] = useState(
    'Simple per-person notebooks for biological, social, and personal / psych tracking.',
  );
  const [profileDraft, setProfileDraft] = useState(emptyProfileDraft);
  const [bioDraft, setBioDraft] = useState({
    ...emptyNotebookDraft,
    sleepHours: '',
    fatigue: '',
    exerciseMinutes: '',
    caffeineMg: '',
  });
  const [socialDraft, setSocialDraft] = useState({
    ...emptyNotebookDraft,
    contacts: '',
    pressure: '',
    support: '',
    conflict: '',
    interactionShift: '',
  });
  const [personalDraft, setPersonalDraft] = useState({
    ...emptyNotebookDraft,
    moodTags: '',
    thoughtPatterns: '',
    cognitiveBiases: '',
    triggers: '',
    decisionLog: '',
  });

  const subjects = useMemo(() => data.bpsSubjects ?? [], [data.bpsSubjects]);
  const filteredSubjects = useMemo(() => {
    const query = filterQuery.trim().toLowerCase();
    if (!query) {
      return subjects;
    }

    return subjects.filter((subject) =>
      [
        subject.label,
        subject.kind,
        ...(subject.aliases ?? []),
        ...(subject.knownAssociates ?? []),
        ...(subject.triggers ?? []),
        ...(subject.strengths ?? []),
        ...(subject.weaknesses ?? []),
        subject.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [filterQuery, subjects]);

  const selectedSubject =
    subjects.find((subject) => subject.id === selectedSubjectId) ??
    subjects[0] ??
    null;

  useEffect(() => {
    if (selectedSubject) {
      setProfileDraft(profileToDraft(selectedSubject));
    } else {
      setProfileDraft(emptyProfileDraft);
    }
  }, [selectedSubjectId, selectedSubject]);

  const biologicalNotes = useMemo(
    () =>
      (data.bpsEntries ?? [])
        .filter((entry) => entry.subjectId === selectedSubject?.id && entry.layer === 'bio')
        .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt)),
    [data.bpsEntries, selectedSubject],
  );

  const socialNotes = useMemo(
    () =>
      (data.bpsEntries ?? [])
        .filter((entry) => entry.subjectId === selectedSubject?.id && entry.layer === 'social')
        .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt)),
    [data.bpsEntries, selectedSubject],
  );

  const personalNotes = useMemo(
    () =>
      (data.bpsEntries ?? [])
        .filter((entry) => entry.subjectId === selectedSubject?.id && entry.layer === 'psycho')
        .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt)),
    [data.bpsEntries, selectedSubject],
  );

  const createProfile = () => {
    if (!profileDraft.label.trim()) {
      setStatus('Add a person label before creating a new profile.');
      return;
    }

    const subjectId = createId('bps-subject');
    updateWorkspaceData((current) => ({
      ...current,
      bpsSubjects: [
        {
          id: subjectId,
          label: profileDraft.label.trim(),
          kind: profileDraft.kind,
          status: 'active',
          profileId: '',
          aliases: splitList(profileDraft.aliases),
          knownAssociates: splitList(profileDraft.knownAssociates),
          triggers: splitList(profileDraft.triggers),
          strengths: splitList(profileDraft.strengths),
          weaknesses: splitList(profileDraft.weaknesses),
          tags: [],
          notes: profileDraft.notes.trim(),
          createdAt: now(),
          updatedAt: now(),
          source: 'manual',
          confidence: 0.74,
        },
        ...current.bpsSubjects,
      ],
    }));
    setSelectedSubjectId(subjectId);
    setStatus('Profile created.');
  };

  const saveProfile = () => {
    if (!selectedSubject) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      bpsSubjects: current.bpsSubjects.map((subject) =>
        subject.id === selectedSubject.id
          ? {
              ...subject,
              label: profileDraft.label.trim() || subject.label,
              kind: profileDraft.kind,
              aliases: splitList(profileDraft.aliases),
              knownAssociates: splitList(profileDraft.knownAssociates),
              triggers: splitList(profileDraft.triggers),
              strengths: splitList(profileDraft.strengths),
              weaknesses: splitList(profileDraft.weaknesses),
              notes: profileDraft.notes.trim(),
              updatedAt: now(),
            }
          : subject,
      ),
    }));
    setStatus(`Profile updated for ${profileDraft.label.trim() || selectedSubject.label}.`);
  };

  const addNotebookEntry = (layer, draft, resetDraft) => {
    if (!selectedSubject) {
      return;
    }

    const payload =
      layer === 'bio'
        ? {
            sleepHours: Number(draft.sleepHours) || 0,
            fatigue: Number(draft.fatigue) || 0,
            exerciseMinutes: Number(draft.exerciseMinutes) || 0,
            caffeineMg: Number(draft.caffeineMg) || 0,
          }
        : layer === 'social'
          ? {
              contacts: splitList(draft.contacts),
              pressure: Number(draft.pressure) || 0,
              support: Number(draft.support) || 0,
              conflict: Number(draft.conflict) || 0,
              interactionShift: draft.interactionShift.trim(),
            }
          : {
              moodTags: splitList(draft.moodTags),
              thoughtPatterns: splitList(draft.thoughtPatterns),
              cognitiveBiases: splitList(draft.cognitiveBiases),
              triggers: splitList(draft.triggers),
              decisionLog: draft.decisionLog.trim(),
            };

    updateWorkspaceData((current) => ({
      ...current,
      bpsEntries: [
        {
          id: createId('bps-entry'),
          subjectId: selectedSubject.id,
          layer,
          title: draft.title.trim() || `${selectedSubject.label} ${layer} note`,
          context: draft.context.trim(),
          tags: splitList(draft.tags),
          payload,
          notes: draft.notes.trim(),
          recordedAt: now(),
          createdAt: now(),
          updatedAt: now(),
          source: 'manual',
          confidence: 0.76,
        },
        ...current.bpsEntries,
      ],
    }));

    resetDraft();
    setStatus(`${layer.toUpperCase()} notebook entry saved for ${selectedSubject.label}.`);
  };

  if (!selectedSubject) {
    return <div className={`h-full ${theme.pageBg} p-6 text-slate-200`}>BPS Engine requires at least one profile.</div>;
  }

  return (
    <div className={`h-full overflow-y-auto ${theme.pageBg} text-slate-100`}>
      <div className="space-y-4 p-4">
        <section className="rounded-[28px] border border-amber-500/16 bg-[linear-gradient(135deg,rgba(18,13,10,0.96),rgba(13,14,16,0.94)_48%,rgba(6,8,10,0.98)_100%)] p-5 shadow-2xl shadow-black/40">
          <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/18 bg-amber-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-100">
                <Contact2 size={12} />
                BPS Engine :: Simple Mode
              </div>
              <h1 className="mt-3 text-[2rem] font-semibold tracking-tight text-white">Per-person profiles and notebooks</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Keep this simple: one profile per person, then three notebook lanes for biological tracking, social life tracking, and personal / psych tracking. Use the profile itself to map associates, triggers, strengths, and weaknesses.
              </p>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
              <div className="flex items-center gap-2 text-[13px] font-semibold text-amber-200">
                <Search size={15} />
                Person profiles
              </div>
              <input
                value={filterQuery}
                onChange={(event) => setFilterQuery(event.target.value)}
                className={`${INPUT_CLASS} mt-3`}
                placeholder="Search profiles, associates, triggers..."
              />
              <div className="mt-3 space-y-2">
                {filteredSubjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(subject.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      subject.id === selectedSubjectId
                        ? 'border-amber-500/26 bg-amber-500/10 text-amber-50'
                        : 'border-white/8 bg-black/12 text-slate-300 hover:border-white/16 hover:bg-white/5'
                    }`}
                  >
                    <div className="text-sm font-semibold text-white">{subject.label}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{subject.kind}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
              <div className="text-[13px] font-semibold text-amber-200">New profile</div>
              <div className="mt-3 space-y-3">
                <input
                  value={profileDraft.label}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, label: event.target.value }))}
                  className={INPUT_CLASS}
                  placeholder="Person label"
                />
                <select
                  value={profileDraft.kind}
                  onChange={(event) => setProfileDraft((current) => ({ ...current, kind: event.target.value }))}
                  className={INPUT_CLASS}
                >
                  {PROFILE_KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={createProfile}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                >
                  <Plus size={15} />
                  Create profile
                </button>
              </div>
            </div>
          </aside>

          <main className="space-y-4">
            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Selected person</div>
                  <div className="mt-2 text-2xl font-semibold text-white">{selectedSubject.label}</div>
                  <div className="mt-1 text-sm text-slate-400">
                    {selectedSubject.kind} · {selectedSubject.notes || 'No profile summary yet.'}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Profiles</div>
                    <div className="mt-2 text-lg font-semibold text-white">{subjects.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Biological</div>
                    <div className="mt-2 text-lg font-semibold text-white">{biologicalNotes.length}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Social / Personal</div>
                    <div className="mt-2 text-lg font-semibold text-white">{socialNotes.length + personalNotes.length}</div>
                  </div>
                </div>
              </div>
            </section>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3`}>
              <div className="flex flex-wrap gap-2">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      activeTab === id
                        ? 'border-amber-500/24 bg-amber-500/10 text-amber-100'
                        : 'border-white/8 bg-black/12 text-slate-300 hover:border-white/16 hover:bg-white/5'
                    }`}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'profile' ? (
              <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-amber-200">Profile detail</div>
                      <div className="mt-2 text-sm text-slate-400">Keep one simple record per person. Add associates, triggers, strengths, and weaknesses here.</div>
                    </div>
                    <button
                      type="button"
                      onClick={saveProfile}
                      className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400"
                    >
                      <Save size={15} />
                      Save
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={profileDraft.label} onChange={(event) => setProfileDraft((current) => ({ ...current, label: event.target.value }))} className={INPUT_CLASS} placeholder="Name / label" />
                    <select value={profileDraft.kind} onChange={(event) => setProfileDraft((current) => ({ ...current, kind: event.target.value }))} className={INPUT_CLASS}>
                      {PROFILE_KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>{kind.label}</option>
                      ))}
                    </select>
                    <input value={profileDraft.aliases} onChange={(event) => setProfileDraft((current) => ({ ...current, aliases: event.target.value }))} className={INPUT_CLASS} placeholder="Aliases" />
                    <input value={profileDraft.knownAssociates} onChange={(event) => setProfileDraft((current) => ({ ...current, knownAssociates: event.target.value }))} className={INPUT_CLASS} placeholder="Known associates" />
                    <input value={profileDraft.triggers} onChange={(event) => setProfileDraft((current) => ({ ...current, triggers: event.target.value }))} className={INPUT_CLASS} placeholder="Triggers" />
                    <input value={profileDraft.strengths} onChange={(event) => setProfileDraft((current) => ({ ...current, strengths: event.target.value }))} className={INPUT_CLASS} placeholder="Strengths" />
                    <input value={profileDraft.weaknesses} onChange={(event) => setProfileDraft((current) => ({ ...current, weaknesses: event.target.value }))} className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-400/28 focus:bg-black/35" placeholder="Weaknesses" />
                  </div>
                  <textarea value={profileDraft.notes} onChange={(event) => setProfileDraft((current) => ({ ...current, notes: event.target.value }))} className={`${TEXTAREA_CLASS} mt-3`} placeholder="General profile notes" />
                </div>

                <div className="space-y-4">
                  <ListCard title="Known Associates" items={selectedSubject.knownAssociates ?? []} emptyLabel="No associates logged yet." />
                  <ListCard title="Triggers" items={selectedSubject.triggers ?? []} emptyLabel="No triggers logged yet." />
                  <ListCard title="Strengths" items={selectedSubject.strengths ?? []} emptyLabel="No strengths logged yet." />
                  <ListCard title="Weaknesses" items={selectedSubject.weaknesses ?? []} emptyLabel="No weaknesses logged yet." />
                </div>
              </section>
            ) : null}

            {activeTab === 'biological' ? (
              <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-amber-200">Biological tracker</div>
                  <div className="mt-2 text-sm text-slate-400">Simple body-state notebook for sleep, fatigue, movement, stimulants, and anything physical worth logging.</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={bioDraft.title} onChange={(event) => setBioDraft((current) => ({ ...current, title: event.target.value }))} className={INPUT_CLASS} placeholder="Entry title" />
                    <input value={bioDraft.context} onChange={(event) => setBioDraft((current) => ({ ...current, context: event.target.value }))} className={INPUT_CLASS} placeholder="Context" />
                    <input value={bioDraft.sleepHours} onChange={(event) => setBioDraft((current) => ({ ...current, sleepHours: event.target.value }))} className={INPUT_CLASS} placeholder="Sleep hours" />
                    <input value={bioDraft.fatigue} onChange={(event) => setBioDraft((current) => ({ ...current, fatigue: event.target.value }))} className={INPUT_CLASS} placeholder="Fatigue 0-100" />
                    <input value={bioDraft.exerciseMinutes} onChange={(event) => setBioDraft((current) => ({ ...current, exerciseMinutes: event.target.value }))} className={INPUT_CLASS} placeholder="Exercise minutes" />
                    <input value={bioDraft.caffeineMg} onChange={(event) => setBioDraft((current) => ({ ...current, caffeineMg: event.target.value }))} className={INPUT_CLASS} placeholder="Caffeine mg" />
                    <input value={bioDraft.tags} onChange={(event) => setBioDraft((current) => ({ ...current, tags: event.target.value }))} className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-400/28 focus:bg-black/35" placeholder="Tags" />
                  </div>
                  <textarea value={bioDraft.notes} onChange={(event) => setBioDraft((current) => ({ ...current, notes: event.target.value }))} className={`${TEXTAREA_CLASS} mt-3`} placeholder="Biological notebook note" />
                  <button type="button" onClick={() => addNotebookEntry('bio', bioDraft, () => setBioDraft({ ...emptyNotebookDraft, sleepHours: '', fatigue: '', exerciseMinutes: '', caffeineMg: '' }))} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400">
                    <Plus size={15} />
                    Add biological note
                  </button>
                </div>

                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-white">Biological notebook</div>
                  <div className="mt-4 space-y-3">
                    {biologicalNotes.length ? biologicalNotes.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{entry.title}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.context || 'General'}</div>
                          </div>
                          <div className="text-xs text-slate-500">{formatStamp(entry.recordedAt)}</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{entry.notes || 'No note text provided.'}</div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-slate-500">
                        No biological notes for this person yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'social' ? (
              <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-amber-200">Social life tracker</div>
                  <div className="mt-2 text-sm text-slate-400">Track relationships, pressure, support, conflict, and interaction changes per person.</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={socialDraft.title} onChange={(event) => setSocialDraft((current) => ({ ...current, title: event.target.value }))} className={INPUT_CLASS} placeholder="Entry title" />
                    <input value={socialDraft.context} onChange={(event) => setSocialDraft((current) => ({ ...current, context: event.target.value }))} className={INPUT_CLASS} placeholder="Context" />
                    <input value={socialDraft.contacts} onChange={(event) => setSocialDraft((current) => ({ ...current, contacts: event.target.value }))} className={INPUT_CLASS} placeholder="People involved" />
                    <input value={socialDraft.pressure} onChange={(event) => setSocialDraft((current) => ({ ...current, pressure: event.target.value }))} className={INPUT_CLASS} placeholder="Pressure 0-100" />
                    <input value={socialDraft.support} onChange={(event) => setSocialDraft((current) => ({ ...current, support: event.target.value }))} className={INPUT_CLASS} placeholder="Support 0-100" />
                    <input value={socialDraft.conflict} onChange={(event) => setSocialDraft((current) => ({ ...current, conflict: event.target.value }))} className={INPUT_CLASS} placeholder="Conflict 0-100" />
                    <input value={socialDraft.interactionShift} onChange={(event) => setSocialDraft((current) => ({ ...current, interactionShift: event.target.value }))} className={INPUT_CLASS} placeholder="Interaction shift" />
                    <input value={socialDraft.tags} onChange={(event) => setSocialDraft((current) => ({ ...current, tags: event.target.value }))} className={INPUT_CLASS} placeholder="Tags" />
                  </div>
                  <textarea value={socialDraft.notes} onChange={(event) => setSocialDraft((current) => ({ ...current, notes: event.target.value }))} className={`${TEXTAREA_CLASS} mt-3`} placeholder="Social tracker note" />
                  <button type="button" onClick={() => addNotebookEntry('social', socialDraft, () => setSocialDraft({ ...emptyNotebookDraft, contacts: '', pressure: '', support: '', conflict: '', interactionShift: '' }))} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400">
                    <Plus size={15} />
                    Add social note
                  </button>
                </div>

                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-white">Social notebook</div>
                  <div className="mt-4 space-y-3">
                    {socialNotes.length ? socialNotes.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{entry.title}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.context || 'General'}</div>
                          </div>
                          <div className="text-xs text-slate-500">{formatStamp(entry.recordedAt)}</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{entry.notes || 'No note text provided.'}</div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-slate-500">
                        No social notes for this person yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {activeTab === 'personal' ? (
              <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-amber-200">Personal / psych tracker</div>
                  <div className="mt-2 text-sm text-slate-400">Keep this simple too: moods, thought patterns, biases, triggers, and decision notes.</div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <input value={personalDraft.title} onChange={(event) => setPersonalDraft((current) => ({ ...current, title: event.target.value }))} className={INPUT_CLASS} placeholder="Entry title" />
                    <input value={personalDraft.context} onChange={(event) => setPersonalDraft((current) => ({ ...current, context: event.target.value }))} className={INPUT_CLASS} placeholder="Context" />
                    <input value={personalDraft.moodTags} onChange={(event) => setPersonalDraft((current) => ({ ...current, moodTags: event.target.value }))} className={INPUT_CLASS} placeholder="Mood tags" />
                    <input value={personalDraft.thoughtPatterns} onChange={(event) => setPersonalDraft((current) => ({ ...current, thoughtPatterns: event.target.value }))} className={INPUT_CLASS} placeholder="Thought patterns" />
                    <input value={personalDraft.cognitiveBiases} onChange={(event) => setPersonalDraft((current) => ({ ...current, cognitiveBiases: event.target.value }))} className={INPUT_CLASS} placeholder="Biases" />
                    <input value={personalDraft.triggers} onChange={(event) => setPersonalDraft((current) => ({ ...current, triggers: event.target.value }))} className={INPUT_CLASS} placeholder="Triggers" />
                    <input value={personalDraft.tags} onChange={(event) => setPersonalDraft((current) => ({ ...current, tags: event.target.value }))} className="md:col-span-2 w-full rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-amber-400/28 focus:bg-black/35" placeholder="Tags" />
                  </div>
                  <textarea value={personalDraft.decisionLog} onChange={(event) => setPersonalDraft((current) => ({ ...current, decisionLog: event.target.value }))} className={`${TEXTAREA_CLASS} mt-3`} placeholder="Decision note / interpretation" />
                  <textarea value={personalDraft.notes} onChange={(event) => setPersonalDraft((current) => ({ ...current, notes: event.target.value }))} className={`${TEXTAREA_CLASS} mt-3`} placeholder="Personal / psych notebook note" />
                  <button type="button" onClick={() => addNotebookEntry('psycho', personalDraft, () => setPersonalDraft({ ...emptyNotebookDraft, moodTags: '', thoughtPatterns: '', cognitiveBiases: '', triggers: '', decisionLog: '' }))} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-400">
                    <Plus size={15} />
                    Add personal note
                  </button>
                </div>

                <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
                  <div className="text-[13px] font-semibold text-white">Personal / psych notebook</div>
                  <div className="mt-4 space-y-3">
                    {personalNotes.length ? personalNotes.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{entry.title}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{entry.context || 'General'}</div>
                          </div>
                          <div className="text-xs text-slate-500">{formatStamp(entry.recordedAt)}</div>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-slate-300">{entry.notes || 'No note text provided.'}</div>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 px-4 py-6 text-sm text-slate-500">
                        No personal / psych notes for this person yet.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{status}</div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default BpsEngineApp;
