/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  FilePlus2,
  LayoutList,
  Pin,
  PinOff,
  StickyNote,
  Trash2,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';

const NOTE_TEMPLATES = {
  blank: {
    label: 'Blank',
    title: 'Untitled note',
    category: 'briefing',
    tags: ['draft'],
    body: '# Untitled note\n\n- Capture the objective\n- Add key references\n- Record blockers and next steps',
  },
  briefing: {
    label: 'Briefing',
    title: 'Mission briefing',
    category: 'briefing',
    tags: ['briefing', 'planning'],
    body: '# Mission briefing\n\n- Objective:\n- Scope:\n- Constraints:\n- Immediate next step:',
  },
  checklist: {
    label: 'Checklist',
    title: 'Operational checklist',
    category: 'checklist',
    tags: ['checklist'],
    body: '# Operational checklist\n\n- Confirm authorization\n- Confirm owners and contacts\n- Capture evidence location\n- Log outcome',
  },
  runbook: {
    label: 'Runbook',
    title: 'Runbook',
    category: 'runbook',
    tags: ['runbook', 'procedure'],
    body: '# Runbook\n\n## Preconditions\n- \n\n## Steps\n- \n\n## Validation\n- ',
  },
  inventory: {
    label: 'Inventory',
    title: 'Inventory note',
    category: 'inventory',
    tags: ['inventory', 'reference'],
    body: '# Inventory note\n\n- Asset:\n- Platform:\n- Owner:\n- Caveats:',
  },
  biomedical: {
    label: 'BioMedical',
    title: 'BioMedical note',
    category: 'biomedical',
    tags: ['biomedical', 'reference'],
    body:
      '# Compound name\n\n## Clinical name / aliases\n\n- Dosage trial:\n- Mechanism:\n- Warnings:\n- Interactions:\n\n----\n\n### Notes\n> Capture source quality, contraindications, and what still needs verification.',
  },
};

const formatUpdatedDate = (value) =>
  new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(value));

const formatUpdatedTimeUtc = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  }).format(new Date(value));

const renderInlineMarkdown = (text) => {
  const source = String(text || '');
  const segments = source.split(/(\*\*[^*]+\*\*)/g);

  return segments
    .filter(Boolean)
    .map((segment, index) => {
      if (segment.startsWith('**') && segment.endsWith('**') && segment.length > 4) {
        return (
          <strong key={`bold-${index}`} className="font-semibold text-white">
            {segment.slice(2, -2)}
          </strong>
        );
      }

      return <span key={`text-${index}`}>{segment}</span>;
    });
};

const renderMarkdown = (text, theme) => {
  const lines = text.split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let quote = [];
  let codeFence = [];
  let inCodeFence = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({
        type: 'paragraph',
        content: paragraph.join(' '),
      });
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push({
        type: 'list',
        items: [...list],
      });
      list = [];
    }
  };

  const flushQuote = () => {
    if (quote.length) {
      blocks.push({
        type: 'quote',
        content: quote.join(' '),
      });
      quote = [];
    }
  };

  const flushCodeFence = () => {
    if (codeFence.length) {
      blocks.push({
        type: 'code',
        content: codeFence.join('\n'),
      });
      codeFence = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      flushList();
      flushQuote();

      if (inCodeFence) {
        flushCodeFence();
      }

      inCodeFence = !inCodeFence;
      return;
    }

    if (inCodeFence) {
      codeFence.push(line);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      return;
    }

    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: 'heading',
        level: 1,
        content: line.slice(2),
      });
      return;
    }

    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: 'heading',
        level: 2,
        content: line.slice(3),
      });
      return;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: 'heading',
        level: 3,
        content: line.slice(4),
      });
      return;
    }

    if (/^-{4,}\s*$/.test(line.trim())) {
      flushParagraph();
      flushList();
      flushQuote();
      blocks.push({
        type: 'divider',
      });
      return;
    }

    if (line.trim().startsWith('>')) {
      flushParagraph();
      flushList();
      quote.push(line.trim().replace(/^>\s?/, ''));
      return;
    }

    const sublistMatch = line.match(/^\s*-\s+-\s+(.*)$/);
    if (sublistMatch) {
      flushParagraph();
      flushQuote();
      list.push({
        content: sublistMatch[1],
        level: 1,
      });
      return;
    }

    const listMatch = line.match(/^(\s*)[-*]\s+(.*)$/);
    if (listMatch) {
      flushParagraph();
      flushQuote();
      list.push({
        content: listMatch[2],
        level: Math.min(3, Math.floor(listMatch[1].length / 2)),
      });
      return;
    }

    paragraph.push(line.trim());
  });

  flushParagraph();
  flushList();
  flushQuote();
  flushCodeFence();

  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      const className =
        block.level === 1
          ? 'text-2xl font-semibold text-white'
          : block.level === 2
            ? `text-xl font-semibold ${theme.headingAccent}`
            : `text-lg font-semibold ${theme.headingAccent}`;
      return (
        <h2 key={`${block.type}-${index}`} className={className}>
          {renderInlineMarkdown(block.content)}
        </h2>
      );
    }

    if (block.type === 'list') {
      return (
        <ul key={`${block.type}-${index}`} className="space-y-2 text-sm leading-6 text-slate-200">
          {block.items.map((item, itemIndex) => (
            <li
              key={`${block.type}-${index}-${itemIndex}`}
              className="flex gap-3"
              style={{ marginLeft: `${item.level * 18}px` }}
            >
              <span
                className={`mt-2 h-1.5 w-1.5 flex-none rounded-full ${theme.bulletAccent} ${
                  item.level > 0 ? 'opacity-70' : ''
                }`}
              />
              <span>{renderInlineMarkdown(item.content)}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (block.type === 'quote') {
      return (
        <blockquote
          key={`${block.type}-${index}`}
          className={`rounded-r-2xl border-l-4 ${theme.heroBorder} bg-black/20 px-4 py-3 text-sm leading-7 text-slate-300`}
        >
          {renderInlineMarkdown(block.content)}
        </blockquote>
      );
    }

    if (block.type === 'divider') {
      return <hr key={`${block.type}-${index}`} className={`border-0 border-t ${theme.panelBorder}`} />;
    }

    if (block.type === 'code') {
      return (
        <pre
          key={`${block.type}-${index}`}
          className={`overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs ${theme.codeAccent}`}
        >
          {block.content}
        </pre>
      );
    }

    return (
      <p key={`${block.type}-${index}`} className="text-sm leading-7 text-slate-300">
        {renderInlineMarkdown(block.content)}
      </p>
    );
  });
};

const NotePreviewHeader = ({ note, theme }) => (
  <div className={`mb-5 flex flex-wrap items-start justify-between gap-3 border-b ${theme.panelBorder} pb-4`}>
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-white">{note.title}</h1>
        <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {note.category}
        </span>
      </div>
      {note.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {note.tags.map((tag) => (
            <span key={`${note.id}-preview-${tag}`} className={`rounded-full border px-2 py-0.5 text-[10px] ${theme.tag}`}>
              #{tag}
            </span>
          ))}
        </div>
      ) : null}
    </div>

    <div className="text-right">
      <div className="text-[11px] font-medium tracking-[0.12em] text-slate-400">{formatUpdatedDate(note.updatedAt)}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{formatUpdatedTimeUtc(note.updatedAt)} UTC</div>
    </div>
  </div>
);

const sortNotes = (notes) =>
  [...notes].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });

const NotesApp = () => {
  const { data, session, updateWorkspaceData, clearWorkspaceNavigation } = useWorkspaceData();
  const [selectedNoteId, setSelectedNoteId] = useState(data.notes[0]?.id ?? null);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('edit');
  const [activeTag, setActiveTag] = useState('all');
  const theme = getAppInteriorTheme(data.settings.theme);

  useEffect(() => {
    if (!data.notes.find((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(sortNotes(data.notes)[0]?.id ?? null);
    }
  }, [data.notes, selectedNoteId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'notes') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedNoteId(session.navigation.itemId);
      setMode('edit');
      setActiveTag('all');
      setQuery('');
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const availableTags = useMemo(
    () =>
      [...new Set(data.notes.flatMap((note) => note.tags))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [data.notes],
  );

  const filteredNotes = sortNotes(data.notes).filter((note) => {
    const matchesQuery = `${note.title} ${note.category} ${note.tags.join(' ')} ${note.body}`
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesTag = activeTag === 'all' ? true : note.tags.includes(activeTag);
    return matchesQuery && matchesTag;
  });

  const selectedNote =
    data.notes.find((note) => note.id === selectedNoteId) ?? filteredNotes[0] ?? sortNotes(data.notes)[0] ?? null;

  const updateNote = (patch) => {
    if (!selectedNote) {
      return;
    }

    updateWorkspaceData((current) => ({
      ...current,
      notes: current.notes.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              ...patch,
              updatedAt: now(),
            }
          : note,
      ),
    }));
  };

  const createNote = (templateKey = 'blank') => {
    const template = NOTE_TEMPLATES[templateKey] ?? NOTE_TEMPLATES.blank;
    const note = {
      id: createId('note'),
      title: template.title,
      category: template.category,
      tags: [...template.tags],
      pinned: false,
      body: template.body,
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      notes: [note, ...current.notes],
    }));
    setSelectedNoteId(note.id);
    setMode('edit');
    setActiveTag('all');
    setQuery('');
  };

  const deleteNote = () => {
    if (!selectedNote) {
      return;
    }

    updateWorkspaceData((current) => {
      const remainingNotes = current.notes.filter((note) => note.id !== selectedNote.id);
      return {
        ...current,
        notes: remainingNotes.length
          ? remainingNotes
          : [
              {
                id: createId('note'),
                title: NOTE_TEMPLATES.briefing.title,
                category: NOTE_TEMPLATES.briefing.category,
                tags: [...NOTE_TEMPLATES.briefing.tags],
                pinned: false,
                body: NOTE_TEMPLATES.briefing.body,
                updatedAt: now(),
              },
            ],
      };
    });
  };

  return (
    <div className={`flex h-full ${theme.pageBg} text-slate-100`}>
      <aside className={`flex w-80 flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg}`}>
        <div className={`border-b ${theme.sidebarBorder} p-4`}>
          <div className="flex items-center gap-2 text-lg font-semibold text-white">
            <StickyNote size={18} className={theme.accentText} />
            Vault Notes
          </div>
          <p className="mt-1 text-sm text-slate-400">Markdown capture, quick templates, and pinned briefs.</p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
            className={`mt-4 w-full rounded-xl border px-3 py-2 text-sm outline-none transition ${theme.input}`}
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(NOTE_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                type="button"
                onClick={() => createNote(key)}
                className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  key === 'briefing'
                    ? `border ${theme.primaryButtonSoft}`
                    : `border border-white/10 ${theme.secondaryButton}`
                }`}
              >
                {template.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag('all')}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                activeTag === 'all' ? theme.activeChip : theme.inactiveChip
              }`}
            >
              All
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag(tag)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                  activeTag === tag ? theme.activeChip : theme.inactiveChip
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {filteredNotes.length ? (
            filteredNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selectedNote?.id === note.id ? theme.selectedCard : theme.card
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-white">{note.title}</div>
                        <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                          {note.category}
                        </span>
                        {note.pinned ? <Pin size={12} className={theme.accentText} /> : null}
                      </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">{formatUpdatedDate(note.updatedAt)}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-[0.16em] text-slate-600">
                      {formatUpdatedTimeUtc(note.updatedAt)} UTC
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {note.tags.map((tag) => (
                    <span
                      key={`${note.id}-${tag}`}
                      className={`rounded-full border px-2 py-1 text-[11px] ${theme.tag}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            ))
          ) : (
            <div className={`rounded-2xl border border-dashed ${theme.sidebarBorder} bg-black/10 p-4 text-sm text-slate-500`}>
              No notes match this filter.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {selectedNote ? (
          <>
            <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${theme.sidebarBorder} px-5 py-4`}>
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Selected note</div>
                <div className="flex items-center gap-2">
                  <div className="truncate text-lg font-semibold text-white">{selectedNote.title}</div>
                  <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {selectedNote.category}
                  </span>
                  {selectedNote.pinned ? (
                    <span className={`rounded-full border px-2 py-1 text-[11px] ${theme.tag}`}>
                      pinned
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    mode === 'edit' ? theme.activeChip : theme.secondaryButton
                  }`}
                >
                  <LayoutList size={16} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setMode('preview')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    mode === 'preview' ? theme.activeChip : theme.secondaryButton
                  }`}
                >
                  <Eye size={16} />
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => updateNote({ pinned: !selectedNote.pinned })}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${theme.secondaryButton}`}
                >
                  {selectedNote.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                  {selectedNote.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  onClick={() => createNote('blank')}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${theme.secondaryButton}`}
                >
                  <FilePlus2 size={16} />
                  New
                </button>
                <button
                  type="button"
                  onClick={deleteNote}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            {mode === 'edit' ? (
              <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className={`flex min-h-0 flex-col border-r ${theme.sidebarBorder}`}>
                  <div className={`grid gap-4 border-b ${theme.sidebarBorder} p-5 md:grid-cols-2`}>
                    <label className="space-y-2 text-sm text-slate-300">
                      <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">Title</span>
                      <input
                        value={selectedNote.title}
                        onChange={(event) => updateNote({ title: event.target.value })}
                        className={`w-full rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                      />
                    </label>

                    <label className="space-y-2 text-sm text-slate-300">
                      <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">Category</span>
                      <input
                        value={selectedNote.category}
                        onChange={(event) => updateNote({ category: event.target.value })}
                        className={`w-full rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                      />
                    </label>

                    <label className="space-y-2 text-sm text-slate-300 md:col-span-2">
                      <span className="block text-xs uppercase tracking-[0.22em] text-slate-500">Tags</span>
                      <input
                        value={selectedNote.tags.join(', ')}
                        onChange={(event) =>
                          updateNote({
                            tags: event.target.value
                              .split(',')
                              .map((tag) => tag.trim())
                              .filter(Boolean),
                          })
                        }
                        className={`w-full rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                      />
                    </label>
                  </div>

                  <div className="min-h-0 flex-1 p-5">
                    <textarea
                      value={selectedNote.body}
                      onChange={(event) => updateNote({ body: event.target.value })}
                      className={`h-full min-h-[320px] w-full resize-none rounded-2xl border bg-black/35 p-4 font-mono text-sm leading-6 outline-none transition ${theme.input}`}
                    />
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto p-5">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Live preview</div>
                  <div className={`mt-4 space-y-4 rounded-2xl border ${theme.panelBorder} ${theme.previewBg} p-5`}>
                    <NotePreviewHeader note={selectedNote} theme={theme} />
                    {renderMarkdown(selectedNote.body, theme)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className={`mx-auto max-w-3xl space-y-4 rounded-3xl border ${theme.panelBorder} ${theme.panelBg} p-8`}>
                  <NotePreviewHeader note={selectedNote} theme={theme} />
                  {renderMarkdown(selectedNote.body, theme)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            No notes available.
          </div>
        )}
      </section>
    </div>
  );
};

export default NotesApp;
