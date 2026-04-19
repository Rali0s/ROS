import { useEffect, useState } from 'react';
import { Clock3, Globe2, Plus, Trash2 } from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
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

const stopWindowDrag = (event) => {
  event.stopPropagation();
};

const ClocksApp = () => {
  const { data, updateWorkspaceData } = useWorkspaceData();
  const [selectedTimezone, setSelectedTimezone] = useState(TIMEZONE_OPTIONS[0].timezone);
  const [now, setNow] = useState(new Date());
  const theme = getAppInteriorTheme(data.settings.theme);

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
    <div
      className={`h-full overflow-y-auto ${theme.pageBg} p-4 text-slate-100`}
      onMouseDown={stopWindowDrag}
      onPointerDown={stopWindowDrag}
    >
      <section className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[1.05rem] font-semibold text-white">
              <Clock3 size={18} className={theme.accentText} />
              World clocks
            </div>
            <p className="mt-2 text-[13px] leading-6 text-slate-400">
              Keep your own zone, UTC, and the rest of the team in view.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedTimezone}
              onChange={(event) => setSelectedTimezone(event.target.value)}
              onMouseDown={stopWindowDrag}
              onPointerDown={stopWindowDrag}
              className={`rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
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
              onMouseDown={stopWindowDrag}
              onPointerDown={stopWindowDrag}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.primaryButton}`}
            >
              <Plus size={16} />
              Add clock
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data.clocks.map((clock) => {
          const parts = getClockParts(now, clock.timezone);

          return (
            <article
              key={clock.id}
              className={`rounded-[22px] border ${theme.panelBorder} bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] p-4 shadow-lg shadow-black/20`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`inline-flex items-center gap-2 rounded-full border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-400`}>
                    <Globe2 size={12} />
                    {clock.timezone}
                  </div>
                  <h2 className="mt-3 text-[1.3rem] font-semibold text-white">{clock.label}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => removeClock(clock.id)}
                  onMouseDown={stopWindowDrag}
                  onPointerDown={stopWindowDrag}
                  className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-6 text-[2.1rem] font-semibold tracking-tight text-white">{parts.time}</div>
              <div className="mt-1.5 text-[13px] text-slate-400">{parts.date}</div>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default ClocksApp;
