import { useEffect, useState } from 'react';
import {
  Activity,
  BadgeInfo,
  CalendarDays,
  BookMarked,
  BookOpen,
  Boxes,
  Clock3,
  Contact2,
  FileText,
  KeyRound,
  Orbit,
  Radio,
  Router,
  ShieldCheck,
  StickyNote,
  WalletCards,
} from 'lucide-react';
import { getAccountStatus, getReleaseStatus, getWorkspaceHealth } from '../utils/betaRuntime';
import { getAppInteriorTheme } from '../utils/constants';
import { createId, now as timestampNow, useWorkspaceData } from '../utils/workspaceStore';

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const OverviewApp = () => {
  const { data, session, updateWorkspaceData } = useWorkspaceData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const theme = getAppInteriorTheme(data.settings.theme);
  const statAccents =
    data.settings.theme === 'cypher'
      ? [
          'from-cyan-500/16 to-teal-500/8',
          'from-cyan-500/18 to-sky-500/10',
          'from-teal-500/16 to-cyan-500/8',
          'from-cyan-500/16 to-emerald-500/8',
        ]
      : [
          'from-amber-500/30 to-orange-500/10',
          'from-cyan-500/30 to-teal-500/10',
          'from-indigo-500/30 to-violet-500/10',
          'from-cyan-500/30 to-blue-500/10',
          'from-lime-500/30 to-emerald-500/10',
          'from-teal-500/30 to-cyan-500/10',
          'from-violet-500/30 to-indigo-500/10',
          'from-cyan-500/30 to-sky-500/10',
          'from-fuchsia-500/30 to-violet-500/10',
        ];

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = [
    {
      label: 'Vault notes',
      value: data.notes.length,
      icon: StickyNote,
    },
    {
      label: 'Library items',
      value: data.library.length,
      icon: BookOpen,
    },
    {
      label: 'Calendar events',
      value: data.calendarEvents.length,
      icon: CalendarDays,
    },
    {
      label: 'Bookmarks',
      value: data.bookmarks.length,
      icon: BookMarked,
    },
    {
      label: 'Inventory items',
      value: data.inventory.length,
      icon: Boxes,
    },
    {
      label: 'Profiles',
      value: data.profiles.length,
      icon: Contact2,
    },
    {
      label: 'Comms threads',
      value: data.comms.conversations.length,
      icon: KeyRound,
    },
    {
      label: 'Nostr notes',
      value: data.nostr?.events?.length ?? 0,
      icon: Radio,
    },
    {
      label: 'LAN peers',
      value: data.lan?.peers?.length ?? 0,
      icon: Router,
    },
    {
      label: 'Flow boards',
      value: data.flowBoards.length,
      icon: Orbit,
    },
    {
      label: 'Wallet entries',
      value: data.wallets.length,
      icon: WalletCards,
    },
    {
      label: 'Clocks',
      value: data.clocks.length,
      icon: Clock3,
    },
  ];

  const recentNotes = [...data.notes]
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, 4);
  const releaseStatus = getReleaseStatus(session);
  const accountStatus = getAccountStatus(data.settings);
  const workspaceHealth = getWorkspaceHealth({ data, session });

  const createQuickNote = () => {
    const noteId = createId('note');
    updateWorkspaceData((current) => ({
      ...current,
      notes: [
        {
          id: noteId,
          title: 'Quick capture',
          category: 'briefing',
          tags: ['capture'],
          pinned: false,
          body: '# Quick capture\n\n- Objective:\n- Context:\n- Next step:',
          updatedAt: timestampNow(),
        },
        ...current.notes,
      ],
    }));
  };

  const createQuickEvent = () => {
    updateWorkspaceData((current) => ({
      ...current,
      calendarEvents: [
        {
          id: createId('event'),
          title: 'Follow-up checkpoint',
          date: timestampNow().slice(0, 10),
          time: '',
          category: 'planning',
          notes: 'Capture the next decision or checkpoint.',
          updatedAt: timestampNow(),
        },
        ...current.calendarEvents,
      ],
    }));
  };

  const createQuickBookmark = () => {
    updateWorkspaceData((current) => ({
      ...current,
      bookmarks: [
        {
          id: createId('bookmark'),
          title: 'New reference',
          url: 'https://',
          category: 'reference',
          notes: 'Capture the source and why it matters.',
          updatedAt: timestampNow(),
        },
        ...current.bookmarks,
      ],
    }));
  };

  return (
    <div className={`h-full overflow-y-auto ${theme.pageBg} text-slate-100`}>
      <div className="space-y-3.5 p-3.5">
        <section className={`rounded-[24px] border ${theme.heroBorder} ${theme.heroBg} p-3.5 shadow-2xl shadow-black/30`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className={`mb-2 inline-flex items-center gap-2 rounded-full border bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${theme.heroPill}`}>
                <ShieldCheck size={12} />
                Local-first operations workspace
              </div>
              <h1 className="text-[1.9rem] font-semibold tracking-tight text-white xl:text-[2.15rem]">
                {data.settings.codename}
              </h1>
              <p className={`mt-2.5 max-w-xl text-[13px] leading-6 ${theme.accentSoftText}`}>
                A quiet place for live notes, identity organization, approved references, inventories, clocks,
                and reset controls. Built for disciplined documentation and authorized technical work.
              </p>
            </div>

            <div className={`rounded-2xl border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-4 py-3 text-right`}>
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Local time</div>
              <div className="mt-1.5 text-[2rem] font-semibold text-white">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="mt-1 text-[13px] text-slate-300">{currentTime.toLocaleDateString()}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-3.5 xl:grid-cols-[0.88fr_0.82fr_0.9fr]">
          <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
              <ShieldCheck size={16} />
              Trust status
            </div>
            <div className="mt-3 text-sm font-semibold text-white">{workspaceHealth.summary}</div>
            <div className="mt-3 space-y-2">
              {workspaceHealth.checks.slice(0, 3).map((check) => (
                <div
                  key={check.id}
                  className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-2.5`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm text-white">{check.label}</div>
                    <span className={`text-[11px] uppercase tracking-[0.2em] ${check.state === 'healthy' ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {check.state}
                    </span>
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">{check.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
              <BadgeInfo size={16} />
              Beta identity
            </div>
            <div className="mt-3 space-y-3">
              <div className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3`}>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Release channel</div>
                <div className="mt-1.5 text-lg font-semibold text-white">{releaseStatus.channel}</div>
                <div className="mt-1 text-xs text-slate-500">{releaseStatus.version} · {releaseStatus.runtime}</div>
              </div>
              <div className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3`}>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Waitlist source</div>
                <div className="mt-1.5 text-sm font-semibold text-white">{accountStatus.waitlistSource || 'waitlist'}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {accountStatus.inviteCode ? `Invite ${accountStatus.inviteCode}` : 'No invite code saved yet'}
                </div>
              </div>
            </div>
          </div>

          <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
              <Activity size={16} />
              Quick capture
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Use fast capture for daily beta workflows instead of leaving ideas in the air.
            </p>
            <div className="mt-4 grid gap-2.5">
              <button
                type="button"
                onClick={createQuickNote}
                className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3 text-left transition hover:bg-white/5`}
              >
                <div className="text-sm font-semibold text-white">New quick note</div>
                <div className="mt-1 text-xs text-slate-500">Drop a briefing shell into Vault Notes.</div>
              </button>
              <button
                type="button"
                onClick={createQuickEvent}
                className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3 text-left transition hover:bg-white/5`}
              >
                <div className="text-sm font-semibold text-white">New checkpoint</div>
                <div className="mt-1 text-xs text-slate-500">Capture a planning event without leaving home.</div>
              </button>
              <button
                type="button"
                onClick={createQuickBookmark}
                className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3 text-left transition hover:bg-white/5`}
              >
                <div className="text-sm font-semibold text-white">New reference</div>
                <div className="mt-1 text-xs text-slate-500">Save a doc or tool link for later triage.</div>
              </button>
            </div>
          </div>
        </section>

        <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
          <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
            <Router size={16} />
            SECURITY::Open Ports
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3`}>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">LAN mode</div>
              <div className="mt-1.5 text-lg font-semibold text-white">{data.lan?.enabled ? 'Enabled' : 'Closed'}</div>
              <div className="mt-1 text-xs text-slate-500">
                {data.lan?.enabled
                  ? `${data.lan.security?.openPortCount || 0} open · ${(data.lan.security?.openPorts || []).join(' · ')}`
                  : 'F*Society ports are closed'}
              </div>
            </div>
            <div className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-3`}>
              <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Local roster</div>
              <div className="mt-1.5 text-lg font-semibold text-white">{data.lan?.peers?.length || 0} active terminals</div>
              <div className="mt-1 text-xs text-slate-500">
                {data.lan?.identity?.hostname || 'hostname pending'} · {data.lan?.identity?.localIp || 'ip pending'}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-[22px] border ${theme.panelBorder} bg-gradient-to-br ${statAccents[index % statAccents.length]} p-3 shadow-lg shadow-black/20`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-slate-300">{stat.label}</span>
                  <Icon size={16} className="text-white" />
                </div>
                <div className="mt-2.5 text-[1.75rem] font-semibold text-white">{stat.value}</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3.5 xl:grid-cols-[1.28fr_0.88fr]">
          <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
            <div className={`flex items-center gap-2 text-[13px] font-semibold ${theme.accentText}`}>
              <FileText size={16} />
              Recent notes
            </div>
            <div className="mt-3 space-y-2.5">
              {recentNotes.map((note) => (
                <article
                  key={note.id}
                  className={`rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} p-3`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-[15px] font-semibold text-white">{note.title}</h2>
                      <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {note.category}
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">{formatTimestamp(note.updatedAt)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full border px-2 py-1 text-[11px] ${theme.tag}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`text-[13px] font-semibold ${theme.accentText}`}>House rules</div>
              <ul className="mt-3 space-y-2.5 text-[13px] leading-6 text-slate-300">
                <li>Keep scope, approvals, and owners visible before work starts.</li>
                <li>Capture assumptions and decisions while they happen, not afterward.</li>
                <li>Use Control Room for encrypted bundles, manual lock, and a true nuke/reset flow.</li>
              </ul>
            </div>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
              <div className={`text-[13px] font-semibold ${theme.accentText}`}>Clock board</div>
              <div className="mt-3 space-y-2.5">
                {data.clocks.slice(0, 4).map((clock) => (
                  <div
                    key={clock.id}
                    className={`flex items-center justify-between rounded-[18px] border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-2.5`}
                  >
                    <div>
                      <div className="text-[14px] font-medium text-white">{clock.label}</div>
                      <div className="text-xs text-slate-500">{clock.timezone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-100">
                        {new Intl.DateTimeFormat([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: clock.timezone,
                        }).format(currentTime)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: clock.timezone,
                        }).format(currentTime)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OverviewApp;
