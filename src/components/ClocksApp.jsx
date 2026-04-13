import { useEffect, useState } from 'react';
import { Clock3, Globe2, Plus, Trash2 } from 'lucide-react';
import { createId, useWorkspaceData } from '../utils/workspaceStore';

const TIMEZONE_OPTIONS = [
  { label: 'New York', timezone: 'America/New_York' },
  { label: 'Los Angeles', timezone: 'America/Los_Angeles' },
  { label: 'UTC', timezone: 'UTC' },
  { label: 'London', timezone: 'Europe/London' },
  { label: 'Berlin', timezone: 'Europe/Berlin' },
  { label: 'Dubai', timezone: 'Asia/Dubai' },
  { label: 'Singapore', timezone: 'Asia/Singapore' },
  { label: 'Tokyo', timezone: 'Asia/Tokyo' },
  { label: 'Sydney', timezone: 'Australia/Sydney' },
];

const getClockParts = (date, timezone) => ({
  time: new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: timezone,
  }).format(date),
  date: new Intl.DateTimeFormat([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date),
});

const ClocksApp = () => {
  const { data, updateWorkspaceData } = useWorkspaceData();
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONE_OPTIONS[0].timezone);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const addClock = () => {
    const option = TIMEZONE_OPTIONS.find((entry) => entry.timezone === selectedTimezone);
    if (!option || data.clocks.some((clock) => clock.timezone === option.timezone)) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      clocks: [
        ...current.clocks,
        {
          id: createId('clock'),
          label: option.label,
          timezone: option.timezone,
        },
      ],
    }));
  };

  const removeClock = (clockId) => {
    updateWorkspaceData((current) => ({
      ...current,
      clocks: current.clocks.filter((clock) => clock.id !== clockId),
    }));
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-5 text-slate-100">
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <Clock3 size={18} className="text-amber-300" />
              World clocks
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Keep your own zone, UTC, and the rest of the team in view.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedTimezone}
              onChange={(event) => setSelectedTimezone(event.target.value)}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option.timezone} value={option.timezone}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={addClock}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              <Plus size={16} />
              Add clock
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.clocks.map((clock) => {
          const parts = getClockParts(now, clock.timezone);

          return (
            <article
              key={clock.id}
              className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-5 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    <Globe2 size={12} />
                    {clock.timezone}
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold text-white">{clock.label}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => removeClock(clock.id)}
                  className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-8 text-4xl font-semibold tracking-tight text-white">{parts.time}</div>
              <div className="mt-2 text-sm text-slate-400">{parts.date}</div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default ClocksApp;
