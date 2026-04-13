import { useEffect, useState } from 'react';
import {
  CalendarDays,
  BookMarked,
  Boxes,
  Clock3,
  Contact2,
  FileText,
  Orbit,
  ShieldCheck,
  StickyNote,
  WalletCards,
} from 'lucide-react';
import { useWorkspaceData } from '../utils/workspaceStore';

const formatTimestamp = (value) =>
  new Intl.DateTimeFormat([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const OverviewApp = () => {
  const { data } = useWorkspaceData();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const stats = [
    {
      label: 'Vault notes',
      value: data.notes.length,
      icon: StickyNote,
      accent: 'from-amber-500/30 to-orange-500/10',
    },
    {
      label: 'Calendar events',
      value: data.calendarEvents.length,
      icon: CalendarDays,
      accent: 'from-indigo-500/30 to-violet-500/10',
    },
    {
      label: 'Bookmarks',
      value: data.bookmarks.length,
      icon: BookMarked,
      accent: 'from-cyan-500/30 to-blue-500/10',
    },
    {
      label: 'Inventory items',
      value: data.inventory.length,
      icon: Boxes,
      accent: 'from-lime-500/30 to-emerald-500/10',
    },
    {
      label: 'Profiles',
      value: data.profiles.length,
      icon: Contact2,
      accent: 'from-teal-500/30 to-cyan-500/10',
    },
    {
      label: 'Flow boards',
      value: data.flowBoards.length,
      icon: Orbit,
      accent: 'from-violet-500/30 to-indigo-500/10',
    },
    {
      label: 'Wallet entries',
      value: data.wallets.length,
      icon: WalletCards,
      accent: 'from-cyan-500/30 to-sky-500/10',
    },
    {
      label: 'Clocks',
      value: data.clocks.length,
      icon: Clock3,
      accent: 'from-fuchsia-500/30 to-violet-500/10',
    },
  ];

  const recentNotes = [...data.notes]
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt))
    .slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 text-slate-100">
      <div className="p-5 space-y-5">
        <section className="rounded-2xl border border-amber-500/20 bg-[linear-gradient(135deg,rgba(249,115,22,0.16),rgba(15,23,42,0.92))] p-5 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200">
                <ShieldCheck size={12} />
                Local-first operations workspace
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {data.settings.codename}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                A quiet place for live notes, identity organization, approved references, inventories, clocks,
                and reset controls. Built for disciplined documentation and authorized technical work.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-right">
              <div className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Local time</div>
              <div className="mt-2 text-3xl font-semibold text-white">
                {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
              <div className="mt-1 text-sm text-slate-300">{now.toLocaleDateString()}</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`rounded-2xl border border-white/10 bg-gradient-to-br ${stat.accent} p-4 shadow-lg shadow-black/20`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">{stat.label}</span>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="mt-5 text-3xl font-semibold text-white">{stat.value}</div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-300">
              <FileText size={16} />
              Recent notes
            </div>
            <div className="mt-4 space-y-3">
              {recentNotes.map((note) => (
                <article
                  key={note.id}
                  className="rounded-xl border border-white/5 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-white">{note.title}</h2>
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
                        className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-sm font-semibold text-amber-300">House rules</div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>Keep scope, approvals, and owners visible before work starts.</li>
                <li>Capture assumptions and decisions while they happen, not afterward.</li>
                <li>Use Control Room for encrypted bundles, manual lock, and a true nuke/reset flow.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
              <div className="text-sm font-semibold text-amber-300">Clock board</div>
              <div className="mt-4 space-y-3">
                {data.clocks.slice(0, 4).map((clock) => (
                  <div
                    key={clock.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-3"
                  >
                    <div>
                      <div className="font-medium text-white">{clock.label}</div>
                      <div className="text-xs text-slate-500">{clock.timezone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-100">
                        {new Intl.DateTimeFormat([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: clock.timezone,
                        }).format(now)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          timeZone: clock.timezone,
                        }).format(now)}
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
