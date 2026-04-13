import { useEffect, useState } from 'react';
import { BookMarked, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const DEFAULT_FORM = {
  title: '',
  url: '',
  category: 'reference',
  notes: '',
};

const CATEGORIES = ['all', 'reference', 'process', 'docs', 'admin', 'research', 'wallets'];

const BookmarksApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState(data.bookmarks[0]?.id ?? null);

  useEffect(() => {
    if (!data.bookmarks.find((bookmark) => bookmark.id === selectedBookmarkId)) {
      setSelectedBookmarkId(data.bookmarks[0]?.id ?? null);
    }
  }, [data.bookmarks, selectedBookmarkId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'bookmarks') {
      return;
    }

    if (session.navigation.itemId) {
      setFilter('all');
      setSelectedBookmarkId(session.navigation.itemId);
      window.requestAnimationFrame(() => {
        document.getElementById(`bookmark-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'center',
          behavior: 'smooth',
        });
      });
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const bookmarks = data.bookmarks.filter((bookmark) =>
    filter === 'all' ? true : bookmark.category === filter,
  );

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.url.trim()) {
      return;
    }

    const bookmark = {
      id: createId('bookmark'),
      title: form.title.trim(),
      url: form.url.trim(),
      category: form.category,
      notes: form.notes.trim(),
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      bookmarks: [bookmark, ...current.bookmarks],
    }));

    setForm(DEFAULT_FORM);
    setSelectedBookmarkId(bookmark.id);
  };

  const removeBookmark = (bookmarkId) => {
    updateWorkspaceData((current) => ({
      ...current,
      bookmarks: current.bookmarks.filter((bookmark) => bookmark.id !== bookmarkId),
    }));
  };

  return (
    <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
      <aside className="w-80 border-r border-white/10 bg-slate-900/80 p-5">
        <div className="flex items-center gap-2 text-lg font-semibold text-white">
          <BookMarked size={18} className="text-amber-300" />
          Bookmarks
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Save references, docs, and recurring portals in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Title"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          />
          <input
            value={form.url}
            onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          />
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          >
            {CATEGORIES.filter((category) => category !== 'all').map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <textarea
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Notes"
            className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-amber-400/40"
          />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
          >
            <Plus size={16} />
            Save bookmark
          </button>
        </form>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === category
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-2 xl:grid-cols-3">
          {bookmarks.map((bookmark) => (
            <article
              key={bookmark.id}
              id={`bookmark-${bookmark.id}`}
              className={`flex flex-col rounded-2xl border p-5 shadow-lg shadow-black/20 ${
                selectedBookmarkId === bookmark.id
                  ? 'border-amber-400/30 bg-amber-500/10'
                  : 'border-white/10 bg-slate-900/70'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {bookmark.category}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedBookmarkId(bookmark.id)}
                    className="mt-2 text-left text-lg font-semibold text-white"
                  >
                    {bookmark.title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 break-all rounded-xl border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 transition hover:bg-amber-500/20"
              >
                <Link2 size={15} />
                {bookmark.url}
                <ExternalLink size={14} className="shrink-0" />
              </a>

              <p className="mt-4 flex-1 text-sm leading-6 text-slate-300">
                {bookmark.notes || 'No additional notes.'}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BookmarksApp;
