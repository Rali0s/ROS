import { useEffect, useState } from 'react';
import { BookMarked, ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const DEFAULT_FORM = {
  title: '',
  url: '',
  category: 'reference',
  notes: '',
};

const CATEGORIES = ['all', 'reference', 'process', 'docs', 'admin', 'research', 'wallets'];
const stopWindowDrag = (event) => {
  event.stopPropagation();
};

const BookmarksApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState(data.bookmarks[0]?.id ?? null);
  const theme = getAppInteriorTheme(data.settings.theme);

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
    <div className={`flex h-full min-h-0 ${theme.pageBg} text-slate-100`}>
      <aside className={`flex w-[16rem] min-h-0 flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} p-3.5`}>
        <div className="flex items-center gap-2 text-[1.05rem] font-semibold text-white">
          <BookMarked size={18} className={theme.accentText} />
          Bookmarks
        </div>
        <p className="mt-2 text-[13px] leading-6 text-slate-400">
          Save references, docs, and recurring portals in one place.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-2.5">
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="Title"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <input
            value={form.url}
            onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            placeholder="https://"
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
          />
          <select
            value={form.category}
            onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            className={`w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition ${theme.input}`}
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
            Save bookmark
          </button>
        </form>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className={`border-b ${theme.sidebarBorder} px-3.5 py-3`}>
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                onMouseDown={stopWindowDrag}
                onPointerDown={stopWindowDrag}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                  filter === category ? theme.activeChip : theme.inactiveChip
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {bookmarks.map((bookmark) => (
            <article
              key={bookmark.id}
              id={`bookmark-${bookmark.id}`}
              className={`flex flex-col rounded-[22px] border p-4 shadow-lg shadow-black/20 ${
                selectedBookmarkId === bookmark.id ? theme.selectedCard : theme.card
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
                    onMouseDown={stopWindowDrag}
                    onPointerDown={stopWindowDrag}
                    className="mt-2 text-left text-[15px] font-semibold text-white"
                  >
                    {bookmark.title}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeBookmark(bookmark.id)}
                  onMouseDown={stopWindowDrag}
                  onPointerDown={stopWindowDrag}
                  className="rounded-lg bg-red-500/10 p-2 text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <a
                href={bookmark.url}
                target="_blank"
                rel="noreferrer"
                onMouseDown={stopWindowDrag}
                onPointerDown={stopWindowDrag}
                className={`mt-3 inline-flex items-center gap-2 break-all rounded-xl border px-3 py-2 text-[13px] transition ${theme.linkCard}`}
              >
                <Link2 size={15} />
                {bookmark.url}
                <ExternalLink size={14} className="shrink-0" />
              </a>

              <p className="mt-3 flex-1 text-[13px] leading-6 text-slate-300">
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
