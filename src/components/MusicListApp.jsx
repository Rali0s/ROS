import { useEffect, useMemo, useState } from 'react';
import { Music4, Plus, Search, Trash2 } from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const DEFAULT_FORM = {
  title: '',
  artist: '',
  album: '',
  year: '',
  tags: '',
  notes: '',
};

const stopWindowDrag = (event) => {
  event.stopPropagation();
};

const splitTags = (value) =>
  String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

const MusicListApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const theme = getAppInteriorTheme(data.settings.theme);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [query, setQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(data.musicList[0]?.id ?? null);

  useEffect(() => {
    if (!data.musicList.find((item) => item.id === selectedItemId)) {
      setSelectedItemId(data.musicList[0]?.id ?? null);
    }
  }, [data.musicList, selectedItemId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'music-list') {
      return;
    }

    if (session.navigation.itemId) {
      setQuery('');
      setSelectedItemId(session.navigation.itemId);
      window.requestAnimationFrame(() => {
        document.getElementById(`music-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      });
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const entries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.musicList.filter((item) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        item.title,
        item.artist,
        item.album,
        item.year,
        item.tags.join(' '),
        item.notes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [data.musicList, query]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    const nextItem = {
      id: createId('track'),
      title: form.title.trim(),
      artist: form.artist.trim(),
      album: form.album.trim(),
      year: form.year.trim(),
      tags: splitTags(form.tags),
      notes: form.notes.trim(),
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      musicList: [nextItem, ...current.musicList],
    }));

    setForm(DEFAULT_FORM);
    setSelectedItemId(nextItem.id);
  };

  const removeEntry = (itemId) => {
    updateWorkspaceData((current) => ({
      ...current,
      musicList: current.musicList.filter((item) => item.id !== itemId),
    }));
  };

  const selectedItem = data.musicList.find((item) => item.id === selectedItemId) ?? null;

  return (
    <div className={`flex h-full min-h-0 ${theme.pageBg} text-slate-100`}>
      <aside className={`flex w-[18rem] min-h-0 flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} p-3.5`}>
        <div className="flex items-center gap-2 text-[1.05rem] font-semibold text-white">
          <Music4 size={18} className={theme.accentText} />
          Music List
        </div>
        <p className="mt-2 text-[13px] leading-6 text-slate-400">
          Just a list. Track songs, artists, albums, tags, and a few notes.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Song title"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <input
            value={form.artist}
            onChange={(event) => setForm((current) => ({ ...current, artist: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Artist"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <input
            value={form.album}
            onChange={(event) => setForm((current) => ({ ...current, album: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Album"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <input
            value={form.year}
            onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Year"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <input
            value={form.tags}
            onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Tags, comma separated"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Notes"
            className={`h-24 w-full resize-none rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <button
            type="submit"
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.primaryButton}`}
          >
            <Plus size={16} />
            Add track
          </button>
        </form>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className={`border-b ${theme.sidebarBorder} px-3.5 py-3`}>
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${theme.input}`}>
            <Search size={15} className="text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onMouseDown={stopWindowDrag}
              onPointerDown={stopWindowDrag}
              placeholder="Search music..."
              className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3.5 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((item) => (
            <article
              key={item.id}
              id={`music-${item.id}`}
              className={`flex flex-col rounded-[22px] border p-4 shadow-lg shadow-black/20 ${
                selectedItemId === item.id ? theme.selectedCard : theme.card
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    onMouseDown={stopWindowDrag}
                    onPointerDown={stopWindowDrag}
                    className="text-left text-[15px] font-semibold text-white"
                  >
                    {item.title}
                  </button>
                  <div className="mt-1 text-sm text-slate-400">
                    {item.artist || 'Unknown artist'}
                    {item.album ? ` · ${item.album}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(item.id)}
                  onMouseDown={stopWindowDrag}
                  onPointerDown={stopWindowDrag}
                  className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {item.year ? (
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] ${theme.tag}`}>
                    {item.year}
                  </span>
                ) : null}
                {item.tags.map((tag) => (
                  <span key={`${item.id}-${tag}`} className={`rounded-full border px-2.5 py-1 text-[11px] ${theme.tag}`}>
                    {tag}
                  </span>
                ))}
              </div>

              <p className="mt-3 flex-1 text-[13px] leading-6 text-slate-300">
                {item.notes || 'No notes.'}
              </p>
            </article>
          ))}
        </div>

        {selectedItem ? (
          <div className={`border-t ${theme.sidebarBorder} px-4 py-3 text-sm text-slate-300`}>
            Selected: <span className="font-semibold text-white">{selectedItem.title}</span>
            {selectedItem.artist ? ` by ${selectedItem.artist}` : ''}
            {selectedItem.album ? ` · ${selectedItem.album}` : ''}
          </div>
        ) : null}
      </section>
    </div>
  );
};

export default MusicListApp;
