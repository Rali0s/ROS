import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, Trash2 } from 'lucide-react';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EVENT_CATEGORIES = ['planning', 'meeting', 'deadline', 'travel', 'ritual', 'personal'];

const formatMonthLabel = (value) =>
  new Intl.DateTimeFormat([], {
    month: 'long',
    year: 'numeric',
  }).format(value);

const formatEventDateTime = (event) => {
  const timePart = event.time ? ` · ${event.time}` : '';
  return `${event.date}${timePart}`;
};

const toMonthKey = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;

const getMonthDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
};

const CalendarApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(now().slice(0, 10));
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [status, setStatus] = useState('Calendar is stored inside the encrypted workspace.');
  const [form, setForm] = useState({
    title: '',
    date: now().slice(0, 10),
    time: '',
    category: 'planning',
    notes: '',
  });

  useEffect(() => {
    if (session.navigation?.appKey !== 'calendar') {
      return;
    }

    if (session.navigation.itemId) {
      const event = data.calendarEvents.find((entry) => entry.id === session.navigation.itemId);
      if (event) {
        setSelectedEventId(event.id);
        setSelectedDate(event.date);
        setVisibleMonth(new Date(`${event.date}T00:00:00`));
      }
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, data.calendarEvents, session.navigation]);

  useEffect(() => {
    if (!data.calendarEvents.find((event) => event.id === selectedEventId)) {
      setSelectedEventId(null);
    }
  }, [data.calendarEvents, selectedEventId]);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      date: selectedDate,
    }));
  }, [selectedDate]);

  const monthDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthKey = toMonthKey(visibleMonth);

  const eventsByDate = useMemo(() => {
    const grouped = new Map();

    data.calendarEvents.forEach((event) => {
      const list = grouped.get(event.date) ?? [];
      list.push(event);
      grouped.set(event.date, list.sort((left, right) => `${left.time}${left.title}`.localeCompare(`${right.time}${right.title}`)));
    });

    return grouped;
  }, [data.calendarEvents]);

  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];
  const upcomingEvents = [...data.calendarEvents]
    .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`))
    .slice(0, 8);

  const selectedEvent =
    data.calendarEvents.find((event) => event.id === selectedEventId) ?? selectedDayEvents[0] ?? null;

  const changeMonth = (offset) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  };

  const saveEvent = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.date) {
      setStatus('An event title and date are required.');
      return;
    }

    const record = {
      id: createId('event'),
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      category: form.category,
      notes: form.notes.trim(),
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      calendarEvents: [...current.calendarEvents, record],
    }));

    setSelectedDate(record.date);
    setSelectedEventId(record.id);
    setVisibleMonth(new Date(`${record.date}T00:00:00`));
    setForm({
      title: '',
      date: record.date,
      time: '',
      category: 'planning',
      notes: '',
    });
    setStatus(`${record.title} added to the calendar.`);
  };

  const deleteEvent = (eventId) => {
    const target = data.calendarEvents.find((entry) => entry.id === eventId);

    updateWorkspaceData((current) => ({
      ...current,
      calendarEvents: current.calendarEvents.filter((entry) => entry.id !== eventId),
    }));

    setSelectedEventId(null);
    setStatus(target ? `${target.title} removed from the calendar.` : 'Event removed.');
  };

  return (
    <div className="grid h-full min-h-0 bg-slate-950 text-slate-100 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="min-h-0 overflow-y-auto border-r border-white/10 p-5">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(79,70,229,0.18),rgba(15,23,42,0.9))] p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <CalendarDays size={18} className="text-indigo-200" />
                Calendar
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Track deadlines, travel, planning blocks, and personal scheduling inside the encrypted workspace.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="min-w-[12rem] text-center text-base font-semibold text-white">
                {formatMonthLabel(visibleMonth)}
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70">
          <div className="grid grid-cols-7 border-b border-white/10 bg-black/20">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const isoDate = day.toISOString().slice(0, 10);
              const dayEvents = eventsByDate.get(isoDate) ?? [];
              const isCurrentMonth = toMonthKey(day) === monthKey;
              const isSelected = selectedDate === isoDate;
              const isToday = now().slice(0, 10) === isoDate;

              return (
                <button
                  key={isoDate}
                  type="button"
                  onClick={() => setSelectedDate(isoDate)}
                  className={`min-h-[8.25rem] border-b border-r border-white/5 px-3 py-3 text-left transition ${
                    isSelected ? 'bg-indigo-500/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday
                          ? 'bg-indigo-500 text-white'
                          : isCurrentMonth
                            ? 'text-white'
                            : 'text-slate-600'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayEvents.length ? (
                      <span className="rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div key={event.id} className="rounded-lg border border-white/8 bg-black/20 px-2 py-1.5 text-xs leading-5 text-slate-200">
                        <div className="truncate font-medium text-white">{event.title}</div>
                        <div className="truncate text-slate-400">{event.time || event.category}</div>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <aside className="min-h-0 overflow-y-auto bg-slate-950/65 p-5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5">
          <div className="text-sm font-semibold text-indigo-200">Add event</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{status}</p>

          <form onSubmit={saveEvent} className="mt-5 space-y-3">
            <input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Event title"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-indigo-400/40"
            />

            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-indigo-400/40"
              />
              <input
                type="time"
                value={form.time}
                onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-indigo-400/40"
              />
            </div>

            <select
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-indigo-400/40"
            >
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Notes, agenda, location, prep..."
              className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-indigo-400/40"
            />

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-indigo-300"
            >
              <Plus size={16} />
              Add event
            </button>
          </form>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/75 p-5">
          <div className="text-sm font-semibold text-indigo-200">Selected day</div>
          <div className="mt-2 text-2xl font-semibold text-white">{selectedDate}</div>

          <div className="mt-4 space-y-3">
            {selectedDayEvents.length ? (
              selectedDayEvents.map((event) => (
                <article
                  key={event.id}
                  className={`rounded-2xl border p-4 ${
                    selectedEvent?.id === event.id
                      ? 'border-indigo-400/25 bg-indigo-500/10'
                      : 'border-white/10 bg-black/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className="text-left"
                    >
                      <div className="text-base font-semibold text-white">{event.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {event.category}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteEvent(event.id)}
                      className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                    <Clock3 size={14} className="text-indigo-200" />
                    {formatEventDateTime(event)}
                  </div>
                  {event.notes ? (
                    <div className="mt-3 text-sm leading-6 text-slate-400">{event.notes}</div>
                  ) : null}
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-4 text-sm leading-6 text-slate-500">
                No events saved for this day.
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/75 p-5">
          <div className="text-sm font-semibold text-indigo-200">Upcoming</div>
          <div className="mt-4 space-y-3">
            {upcomingEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => {
                  setSelectedEventId(event.id);
                  setSelectedDate(event.date);
                  setVisibleMonth(new Date(`${event.date}T00:00:00`));
                }}
                className="block w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-left transition hover:bg-white/5"
              >
                <div className="text-sm font-semibold text-white">{event.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">{event.category}</div>
                <div className="mt-2 text-sm text-slate-300">{formatEventDateTime(event)}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CalendarApp;
