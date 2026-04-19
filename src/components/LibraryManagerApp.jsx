import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Download,
  FileArchive,
  FilePlus2,
  FileText,
  Library,
  Quote,
  Trash2,
  Upload,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import { importNativeCalibreMetadataDb, isNativeVaultRuntime } from '../utils/nativeVault';
import { createId, now, useWorkspaceData } from '../utils/workspaceStore';
import { importEpubFile, importOpfMetadataFile, importPdfFile } from '../utils/libraryImport';

const stopWindowDrag = (event) => {
  event.stopPropagation();
};

const formatDate = (value) => {
  if (!value) {
    return 'Unknown';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const bytesToDataUrl = (mimeType, bytes) => {
  let binary = '';
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return `data:${mimeType};base64,${btoa(binary)}`;
};

const stripHtml = (value = '') =>
  String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const createLibraryEntry = (file, parsed, blobId) => {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const format = extension === 'opf' ? 'opf-meta' : extension;

  return {
    id: createId('library'),
    title: parsed.title || file.name.replace(/\.[^.]+$/, ''),
    format,
    fileName: file.name,
    source: extension === 'opf' ? 'metadata-import' : 'read-only-import',
    authors: parsed.authors || [],
    tags: parsed.tags || [],
    identifiers: parsed.identifiers || [],
    publisher: parsed.publisher || '',
    series: parsed.series || '',
    seriesIndex: parsed.seriesIndex || '',
    language: parsed.language || '',
    availableFormats: parsed.availableFormats || [],
    sourcePath: parsed.sourcePath || '',
    publishedAt: parsed.publishedAt || '',
    description: parsed.description || '',
    coverDataUrl: parsed.coverDataUrl || '',
    fileVaultId: blobId || '',
    vaultMimeType: parsed.mimeType || '',
    readerKind: format === 'pdf' ? 'pdf' : format === 'epub' ? 'epub-sections' : 'metadata-only',
    fileDataUrl: parsed.dataUrl || '',
    sections: format === 'opf' ? parsed.sections || [] : [],
    annotations: [],
    readingProgress: '',
    importedAt: now(),
    updatedAt: now(),
  };
};

const EMPTY_ANNOTATION_FORM = {
  quote: '',
  note: '',
  location: '',
};

const LibraryManagerApp = () => {
  const {
    data,
    session,
    updateWorkspaceData,
    clearWorkspaceNavigation,
    setWorkspaceNavigation,
    deleteLibraryFileBlob,
    readLibraryFileBlob,
    storeLibraryFileBlob,
  } = useWorkspaceData();
  const [selectedEntryId, setSelectedEntryId] = useState(data.library[0]?.id ?? null);
  const [status, setStatus] = useState('Import PDFs, EPUBs, or Calibre OPF metadata files into the encrypted library.');
  const [loadedAsset, setLoadedAsset] = useState(null);
  const [annotationForm, setAnnotationForm] = useState(EMPTY_ANNOTATION_FORM);
  const [annotationsExpanded, setAnnotationsExpanded] = useState(false);
  const fileInputRef = useRef(null);
  const isNativeDesktop = isNativeVaultRuntime() && session.backend === 'tauri-native';
  const deleteMode = data.settings.fileVaultDeleteMode || 'secure-delete';
  const theme = getAppInteriorTheme(data.settings.theme);

  useEffect(() => {
    if (!data.library.length) {
      setSelectedEntryId(null);
      return;
    }

    if (!data.library.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(data.library[0].id);
    }
  }, [data.library, selectedEntryId]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'library') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedEntryId(session.navigation.itemId);
      window.setTimeout(() => {
        document.getElementById(`library-${session.navigation.itemId}`)?.scrollIntoView({
          block: 'nearest',
        });
      }, 40);
    }

    clearWorkspaceNavigation();
  }, [clearWorkspaceNavigation, session.navigation]);

  const selectedEntry = useMemo(
    () => data.library.find((entry) => entry.id === selectedEntryId) ?? null,
    [data.library, selectedEntryId],
  );

  useEffect(() => {
    setAnnotationForm(EMPTY_ANNOTATION_FORM);
    setAnnotationsExpanded(false);
  }, [selectedEntryId]);

  useEffect(() => {
    let cancelled = false;

    const loadAsset = async () => {
      if (!selectedEntry?.fileVaultId) {
        setLoadedAsset(null);
        return;
      }

      try {
        const payload = await readLibraryFileBlob(selectedEntry.fileVaultId);

        if (!cancelled) {
          setLoadedAsset(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadedAsset(null);
          setStatus(error.message || 'Unable to open the encrypted document.');
        }
      }
    };

    loadAsset();

    return () => {
      cancelled = true;
    };
  }, [readLibraryFileBlob, selectedEntry]);

  const handleImport = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    try {
      const importedEntries = [];

      for (const file of files) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        let parsed;

        if (extension === 'pdf') {
          parsed = await importPdfFile(file);
        } else if (extension === 'epub') {
          parsed = await importEpubFile(file);
        } else if (extension === 'opf') {
          parsed = await importOpfMetadataFile(file);
        } else {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        let blobId = '';

        if (parsed.bytes instanceof Uint8Array && parsed.mimeType) {
          blobId = createId('blob');
          await storeLibraryFileBlob({
            blobId,
            mimeType: parsed.mimeType,
            bytes: parsed.bytes,
          });
        }

        importedEntries.push(createLibraryEntry(file, parsed, blobId));
      }

      updateWorkspaceData((current) => ({
        ...current,
        library: [...importedEntries, ...current.library],
        managedArtifacts: [
          ...importedEntries.map((entry) => ({
            id: createId('artifact'),
            kind: 'library-import',
            label: `${entry.title} (${entry.format.toUpperCase()})`,
            location: entry.fileVaultId ? 'encrypted-file-vault' : 'encrypted-workspace',
            createdAt: entry.importedAt,
          })),
          ...(current.managedArtifacts ?? []),
        ].slice(0, 200),
      }));

      setSelectedEntryId(importedEntries[0]?.id ?? null);
      setStatus(`Imported ${importedEntries.length} read-only library item${importedEntries.length === 1 ? '' : 's'}.`);
    } catch (error) {
      setStatus(error.message || 'Library import failed.');
    } finally {
      event.target.value = '';
    }
  };

  const removeEntry = (entryId) => {
    const existing = data.library.find((entry) => entry.id === entryId);

    if (existing?.fileVaultId) {
      deleteLibraryFileBlob(existing.fileVaultId, deleteMode).catch(() => {});
    }

    updateWorkspaceData((current) => ({
      ...current,
      library: current.library.filter((entry) => entry.id !== entryId),
      managedArtifacts: (current.managedArtifacts ?? []).filter(
        (artifact) => artifact.kind !== 'library-import' || !artifact.label.startsWith(
          `${current.library.find((entry) => entry.id === entryId)?.title || ''} (`,
        ),
      ),
    }));

    setLoadedAsset(null);
    setStatus(
      deleteMode === 'best-effort-overwrite'
        ? 'Library item removed. Best-effort physical overwrite was attempted for the encrypted blob; reliability depends on storage hardware and filesystem behavior.'
        : deleteMode === 'secure-delete'
          ? 'Library item removed. The encrypted blob was crypto-shredded before deletion.'
          : 'Library item removed with standard delete.',
    );
  };

  const handleImportCalibreCatalog = async () => {
    if (!isNativeDesktop) {
      setStatus('Calibre metadata.db import currently requires the native desktop build.');
      return;
    }

    try {
      const records = await importNativeCalibreMetadataDb();

      if (!records) {
        setStatus('Calibre metadata.db import canceled.');
        return;
      }

      if (!records.length) {
        setStatus('The selected metadata.db did not contain any readable book records.');
        return;
      }

      const importedAt = now();
      const importedEntries = records.map((record, index) => ({
        id: createId(`library-calibre-${index + 1}`),
        title: record.title || 'Untitled Calibre entry',
        format: 'calibre-db',
        fileName: 'metadata.db',
        source: 'calibre-db',
        authors: record.authors || [],
        tags: record.tags || [],
        identifiers: record.identifiers || [],
        publisher: record.publisher || '',
        series: record.series || '',
        seriesIndex: record.seriesIndex || '',
        language: record.language || '',
        availableFormats: record.availableFormats || [],
        sourcePath: record.sourcePath || '',
        publishedAt: record.publishedAt || '',
        description: record.description || '',
        coverDataUrl: record.coverDataUrl || '',
        fileVaultId: '',
        vaultMimeType: '',
        readerKind: 'metadata-only',
        fileDataUrl: '',
        sections: [],
        importedAt,
        updatedAt: record.updatedAt || importedAt,
      }));

      updateWorkspaceData((current) => ({
        ...current,
        library: [...importedEntries, ...current.library],
        managedArtifacts: [
          ...importedEntries.map((entry) => ({
            id: createId('artifact'),
            kind: 'calibre-catalog-import',
            label: `${entry.title} (CALIBRE-DB)`,
            location: entry.sourcePath || 'calibre-metadata.db',
            createdAt: importedAt,
          })),
          ...(current.managedArtifacts ?? []),
        ].slice(0, 400),
      }));

      setSelectedEntryId(importedEntries[0]?.id ?? null);
      setStatus(`Imported ${importedEntries.length} Calibre catalog entr${importedEntries.length === 1 ? 'y' : 'ies'} from metadata.db.`);
    } catch (error) {
      setStatus(error.message || 'Unable to import Calibre metadata.db.');
    }
  };

  const updateLibraryEntry = (entryId, patch) => {
    updateWorkspaceData((current) => ({
      ...current,
      library: current.library.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              ...patch,
              updatedAt: now(),
            }
          : entry,
      ),
    }));
  };

  const handleAddAnnotation = () => {
    if (!selectedEntry) {
      return;
    }

    if (!annotationForm.quote.trim() && !annotationForm.note.trim()) {
      setStatus('Capture a quote or add an annotation note first.');
      return;
    }

    const nextAnnotation = {
      id: createId('annotation'),
      quote: annotationForm.quote.trim(),
      note: annotationForm.note.trim(),
      location: annotationForm.location.trim(),
      createdAt: now(),
    };

    updateLibraryEntry(selectedEntry.id, {
      annotations: [nextAnnotation, ...(selectedEntry.annotations ?? [])],
    });
    setAnnotationForm(EMPTY_ANNOTATION_FORM);
    setStatus(`Annotation added to ${selectedEntry.title}.`);
  };

  const handleDeleteAnnotation = (annotationId) => {
    if (!selectedEntry) {
      return;
    }

    updateLibraryEntry(selectedEntry.id, {
      annotations: (selectedEntry.annotations ?? []).filter((annotation) => annotation.id !== annotationId),
    });
    setStatus('Annotation removed.');
  };

  const handleQuoteToNote = (annotation) => {
    if (!selectedEntry) {
      return;
    }

    const note = {
      id: createId('note'),
      title: `${selectedEntry.title} quote`,
      category: 'reference',
      tags: ['library', 'quote', selectedEntry.format].filter(Boolean),
      pinned: false,
      body: `# ${selectedEntry.title}\n\n- Author: ${
        selectedEntry.authors.length ? selectedEntry.authors.join(', ') : 'Unknown'
      }\n- Format: ${selectedEntry.format.toUpperCase()}\n- Location: ${annotation.location || 'Reader capture'}\n- Imported: ${formatDate(
        selectedEntry.importedAt,
      )}\n\n## Quote\n${annotation.quote || 'No quote captured.'}\n\n## Note\n${
        annotation.note || 'No note added.'
      }\n`,
      updatedAt: now(),
    };

    updateWorkspaceData((current) => ({
      ...current,
      notes: [note, ...current.notes],
    }));
    setWorkspaceNavigation({
      appKey: 'notes',
      itemId: note.id,
    });
    setStatus(`Quote sent to Vault Notes: ${note.title}.`);
  };

  const handleCaptureSectionQuote = (section) => {
    const plainText = stripHtml(section.html);
    setAnnotationForm({
      quote: plainText.slice(0, 700),
      note: '',
      location: section.title || 'EPUB section',
    });

    if (selectedEntry) {
      updateLibraryEntry(selectedEntry.id, {
        readingProgress: section.title || 'EPUB section',
      });
    }

    setStatus(`Captured section quote from ${section.title || 'EPUB section'}.`);
  };

  const currentSections =
    selectedEntry?.sections.length
      ? selectedEntry.sections
      : loadedAsset?.bytes && selectedEntry?.format === 'epub'
        ? JSON.parse(new TextDecoder().decode(loadedAsset.bytes)).sections || []
        : [];
  const isPdfEntry = selectedEntry?.format === 'pdf';

  return (
    <div
      className={`flex h-full min-h-0 ${theme.pageBg} text-slate-100`}
      onMouseDown={stopWindowDrag}
      onPointerDown={stopWindowDrag}
    >
      <aside className={`flex w-[16rem] min-h-0 flex-col border-r ${theme.sidebarBorder} ${theme.sidebarBg} p-4`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex rounded-2xl border p-3 ${theme.heroPill}`}>
            <Library size={18} />
          </span>
          <div>
            <div className="text-[1.05rem] font-semibold text-white">Library Manager</div>
            <div className="text-[13px] text-slate-400">Calibre-aware metadata, read-only files</div>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-6 text-slate-400">
          Import PDFs, EPUBs, or `metadata.opf` files. ROS keeps the catalog in the encrypted workspace and opens documents in a read-only viewer.
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onMouseDown={stopWindowDrag}
            onPointerDown={stopWindowDrag}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.primaryButton}`}
          >
            <Upload size={16} />
            Import files
          </button>
          {isNativeDesktop ? (
            <button
              type="button"
              onClick={handleImportCalibreCatalog}
              onMouseDown={stopWindowDrag}
              onPointerDown={stopWindowDrag}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.secondaryButton}`}
            >
              <Library size={16} />
              Import metadata.db
            </button>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.epub,.opf,application/pdf,application/epub+zip,application/xml,text/xml"
            multiple
            className="hidden"
            onChange={handleImport}
          />
        </div>

        <div className={`mt-4 rounded-[22px] border ${theme.panelBorder} ${theme.panelMutedBg} p-4 text-[13px] leading-6 text-slate-300`}>
          Metadata fields: title, authors, tags, publisher, identifiers, series, language, published date, description, and embedded cover when available.
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2.5">
            {data.library.length ? (
              data.library.map((entry) => (
                <button
                  key={entry.id}
                  id={`library-${entry.id}`}
                  type="button"
                  onClick={() => setSelectedEntryId(entry.id)}
                  onMouseDown={stopWindowDrag}
                  onPointerDown={stopWindowDrag}
                  className={`w-full rounded-[22px] border px-4 py-3.5 text-left transition ${
                    selectedEntryId === entry.id
                      ? theme.selectedCard
                      : theme.card
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold text-white">{entry.title}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
                        {entry.format} · {entry.source}
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-cyan-100">
                      {entry.authors.length || entry.tags.length ? 'indexed' : 'imported'}
                    </span>
                  </div>
                  <div className="mt-2.5 text-[13px] text-slate-400">
                    {(entry.authors.join(' · ') || entry.publisher || entry.fileName) || 'Metadata only'}
                  </div>
                </button>
              ))
            ) : (
              <div className={`rounded-[22px] border border-dashed ${theme.panelBorder} bg-black/10 p-5 text-[13px] text-slate-500`}>
                No library items yet. Import a PDF, EPUB, or OPF metadata file to start the catalog.
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col p-3.5">
        {selectedEntry ? (
          <>
            <div className="grid min-h-0 flex-1 gap-3.5 xl:grid-cols-[minmax(0,1.78fr)_minmax(280px,0.42fr)]">
              <article
                className={`order-1 flex min-h-0 flex-col rounded-[26px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className={`text-xs uppercase tracking-[0.26em] ${theme.accentText}`}>Reader</div>
                    <div className="mt-1 text-[1.05rem] font-semibold text-white">
                      {selectedEntry.format === 'opf-meta'
                        ? 'Metadata only'
                        : selectedEntry.format === 'pdf'
                          ? 'PDF viewer'
                          : 'EPUB reader'}
                    </div>
                  </div>
                  <div className={`rounded-2xl border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-400`}>
                    Read only
                  </div>
                </div>

                <div
                  className={`mt-4 min-h-[24rem] flex-1 overflow-hidden rounded-[22px] border ${theme.panelMutedBorder} ${theme.previewBg} ${
                    isPdfEntry ? 'xl:min-h-[28rem]' : ''
                  }`}
                >
                  {selectedEntry.format === 'pdf' && (selectedEntry.fileDataUrl || loadedAsset?.bytes) ? (
                    <iframe
                      src={
                        selectedEntry.fileDataUrl ||
                        bytesToDataUrl(
                          loadedAsset?.mimeType || selectedEntry.vaultMimeType || 'application/pdf',
                          loadedAsset?.bytes || new Uint8Array(),
                        )
                      }
                      title={`${selectedEntry.title} PDF viewer`}
                      className="h-full w-full bg-white"
                    />
                  ) : null}

                  {selectedEntry.format === 'epub' ? (
                    <div className="h-full overflow-y-auto p-5">
                      {currentSections.length ? (
                        <div className="space-y-6">
                          {currentSections.map((section) => (
                            <section key={section.id} className={`rounded-[22px] border ${theme.panelMutedBorder} bg-slate-950/60 p-5`}>
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <h2 className="text-xl font-semibold text-white">{section.title}</h2>
                                <button
                                  type="button"
                                  onClick={() => handleCaptureSectionQuote(section)}
                                  onMouseDown={stopWindowDrag}
                                  onPointerDown={stopWindowDrag}
                                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${theme.primaryButtonSoft}`}
                                >
                                  <Quote size={14} />
                                  Capture quote
                                </button>
                              </div>
                              <div
                                className="prose prose-invert mt-4 max-w-none prose-headings:text-cyan-100 prose-p:text-slate-200 prose-strong:text-white"
                                dangerouslySetInnerHTML={{ __html: section.html }}
                              />
                            </section>
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                          No EPUB sections could be extracted from this import.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {selectedEntry.format === 'opf-meta' ? (
                    <div className="flex h-full items-center justify-center p-8 text-center text-sm leading-6 text-slate-400">
                      This is a metadata-only Calibre-style OPF import. It adds catalog information to ROS without importing the original document body.
                    </div>
                  ) : null}
                </div>
              </article>

              <article className={`order-2 flex min-h-0 flex-col rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} p-3.5`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className={`text-xs uppercase tracking-[0.26em] ${theme.accentText}`}>Metadata</div>
                    <h1 className="mt-2 break-words text-[1.08rem] font-semibold leading-tight text-white xl:text-[1.18rem]">
                      {selectedEntry.title}
                    </h1>
                    <p className="mt-1.5 text-[12px] text-slate-400">
                      {selectedEntry.authors.length ? selectedEntry.authors.join(', ') : 'Unknown author'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeEntry(selectedEntry.id)}
                    onMouseDown={stopWindowDrag}
                    onPointerDown={stopWindowDrag}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                  >
                    <Trash2 size={15} />
                    {deleteMode === 'best-effort-overwrite'
                      ? 'Overwrite'
                      : deleteMode === 'secure-delete'
                        ? 'Secure delete'
                        : 'Standard delete'}
                  </button>
                </div>

                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 text-[12px] leading-5 text-slate-300">
                  <div className={`rounded-[20px] border ${theme.panelBorder} bg-cyan-500/5 p-3.5`}>
                    <div className={`text-[11px] uppercase tracking-[0.24em] ${theme.accentText}`}>Delete mode</div>
                    <div className="mt-2 text-xs leading-6 text-slate-300">
                      {deleteMode === 'best-effort-overwrite'
                        ? 'Best-effort physical overwrite is armed for this library item. On native storage, ROS will crypto-shred the wrapped file key, then attempt multiple overwrite passes before deletion.'
                        : deleteMode === 'secure-delete'
                          ? 'Secure delete (crypto-shred) is armed for this library item. ROS will destroy the wrapped per-blob key before removing the encrypted file.'
                          : 'Standard delete is armed for this library item. ROS will remove the encrypted blob without an extra crypto-shred or overwrite pass.'}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Format</div>
                      <div className="mt-1.5 text-[13px] font-semibold text-white">{selectedEntry.format.toUpperCase()}</div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Imported</div>
                      <div className="mt-1.5 text-[13px] font-semibold text-white">{formatDate(selectedEntry.importedAt)}</div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Publisher</div>
                      <div className="mt-1.5 text-[12px] font-semibold text-white">{selectedEntry.publisher || 'Unknown'}</div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Language</div>
                      <div className="mt-1.5 text-[12px] font-semibold text-white">{selectedEntry.language || 'Unknown'}</div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5 md:col-span-2`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Available formats</div>
                      <div className="mt-1.5 text-[12px] font-semibold text-white">
                        {selectedEntry.availableFormats?.length
                          ? selectedEntry.availableFormats.join(' · ')
                          : 'Metadata only'}
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Description</div>
                    <div className="mt-2">{selectedEntry.description || 'No description available.'}</div>
                  </div>

                  <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5 break-words`}>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Identifiers</div>
                    <div className="mt-2">
                      {selectedEntry.identifiers.length ? selectedEntry.identifiers.join(' · ') : 'No identifiers captured.'}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Series</div>
                      <div className="mt-2">
                        {selectedEntry.series
                          ? `${selectedEntry.series}${selectedEntry.seriesIndex ? ` #${selectedEntry.seriesIndex}` : ''}`
                          : 'Standalone'}
                      </div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tags</div>
                      <div className="mt-2">
                        {selectedEntry.tags.length ? selectedEntry.tags.join(' · ') : 'No tags'}
                      </div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5 md:col-span-2`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Source path</div>
                      <div className="mt-2 break-all">{selectedEntry.sourcePath || 'Imported file record'}</div>
                    </div>
                    <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5 md:col-span-2`}>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Reading progress</div>
                      <div className="mt-2">{selectedEntry.readingProgress || 'No saved reading position yet.'}</div>
                    </div>
                  </div>

                  <div className={`rounded-[20px] border ${theme.panelBorder} ${theme.panelMutedBg} p-3.5`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className={`flex items-center gap-2 text-[11px] uppercase tracking-[0.26em] ${theme.accentText}`}>
                        <Quote size={14} />
                        Annotations
                      </div>
                      <button
                        type="button"
                        onClick={() => setAnnotationsExpanded((current) => !current)}
                        className={`rounded-xl px-3 py-2 text-[11px] font-medium ${theme.secondaryButton}`}
                      >
                        {annotationsExpanded ? 'Hide panel' : 'Open panel'}
                      </button>
                    </div>
                    <p className="mt-2 text-[12px] leading-5 text-slate-400">
                      Capture a quote, add context, and push it into Vault Notes when you want the reading trail to become part of the workspace.
                    </p>

                    {annotationsExpanded ? (
                      <div className="mt-4 space-y-3">
                        <label className="block space-y-2 text-[13px] text-slate-300">
                          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Location</span>
                          <input
                            value={annotationForm.location}
                            onChange={(event) =>
                              setAnnotationForm((current) => ({ ...current, location: event.target.value }))
                            }
                            onMouseDown={stopWindowDrag}
                            onPointerDown={stopWindowDrag}
                            className={`w-full rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                            placeholder="Page, chapter, section, or reader position"
                          />
                        </label>

                        <label className="block space-y-2 text-[13px] text-slate-300">
                          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Quote</span>
                          <textarea
                            value={annotationForm.quote}
                            onChange={(event) =>
                              setAnnotationForm((current) => ({ ...current, quote: event.target.value }))
                            }
                            onMouseDown={stopWindowDrag}
                            onPointerDown={stopWindowDrag}
                            className={`h-24 w-full resize-none rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                            placeholder="Paste or capture a quote from the reader"
                          />
                        </label>

                        <label className="block space-y-2 text-[13px] text-slate-300">
                          <span className="text-xs uppercase tracking-[0.22em] text-slate-500">Annotation note</span>
                          <textarea
                            value={annotationForm.note}
                            onChange={(event) =>
                              setAnnotationForm((current) => ({ ...current, note: event.target.value }))
                            }
                            onMouseDown={stopWindowDrag}
                            onPointerDown={stopWindowDrag}
                            className={`h-20 w-full resize-none rounded-xl border px-3 py-2 outline-none transition ${theme.input}`}
                            placeholder="Why this matters, follow-up idea, or context"
                          />
                        </label>

                        <div className="flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={handleAddAnnotation}
                            onMouseDown={stopWindowDrag}
                            onPointerDown={stopWindowDrag}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.primaryButton}`}
                          >
                            <Quote size={16} />
                            Save annotation
                          </button>
                          {annotationForm.quote.trim() || annotationForm.note.trim() ? (
                            <button
                              type="button"
                              onClick={() => setAnnotationForm(EMPTY_ANNOTATION_FORM)}
                              onMouseDown={stopWindowDrag}
                              onPointerDown={stopWindowDrag}
                              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition ${theme.secondaryButton}`}
                            >
                              Clear draft
                            </button>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          {(selectedEntry.annotations ?? []).length ? (
                            selectedEntry.annotations.map((annotation) => (
                              <article key={annotation.id} className={`rounded-[18px] border ${theme.panelBorder} bg-slate-950/60 p-3.5`}>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.22em] text-slate-500">
                                      {annotation.location || 'Reader capture'}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {formatDate(annotation.createdAt)}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleQuoteToNote(annotation)}
                                      onMouseDown={stopWindowDrag}
                                      onPointerDown={stopWindowDrag}
                                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${theme.primaryButtonSoft}`}
                                    >
                                      <FilePlus2 size={14} />
                                      Quote to note
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAnnotation(annotation.id)}
                                      onMouseDown={stopWindowDrag}
                                      onPointerDown={stopWindowDrag}
                                      className="inline-flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-500/20"
                                    >
                                      <Trash2 size={14} />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                                {annotation.quote ? (
                                  <blockquote className="mt-3 rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-3 text-[13px] leading-6 text-slate-200">
                                    {annotation.quote}
                                  </blockquote>
                                ) : null}
                                {annotation.note ? (
                                  <div className="mt-3 text-[13px] leading-6 text-slate-300">{annotation.note}</div>
                                ) : null}
                              </article>
                            ))
                          ) : (
                            <div className={`rounded-[18px] border border-dashed ${theme.panelBorder} bg-black/10 p-4 text-[13px] text-slate-500`}>
                              No annotations yet. Save a quote here or capture one directly from an EPUB section.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            </div>

            <div className={`mt-4 rounded-[22px] border ${theme.panelBorder} ${theme.panelBg} p-4 text-[13px] text-slate-300`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-xl ${theme.panelMutedBg} px-3 py-2 ${theme.accentText}`}>
                  {selectedEntry.format === 'pdf' ? <FileText size={15} /> : <FileArchive size={15} />}
                  {selectedEntry.fileName || selectedEntry.title}
                </span>
                <span className={`inline-flex items-center gap-2 rounded-xl ${theme.panelMutedBg} px-3 py-2 text-slate-300`}>
                  <Download size={15} />
                  Stored in encrypted file vault
                </span>
                <span className={`inline-flex items-center gap-2 rounded-xl ${theme.panelMutedBg} px-3 py-2 text-slate-300`}>
                  <BookOpen size={15} />
                  Viewer is read only
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex h-full items-center justify-center rounded-[22px] border border-dashed ${theme.panelBorder} bg-black/10 p-8 text-center text-[13px] leading-6 text-slate-500`}>
            Import a PDF, EPUB, or OPF metadata file to build the encrypted library catalog.
          </div>
        )}

        <div className={`mt-4 rounded-[22px] border ${theme.panelBorder} ${theme.panelBg} p-4 text-[13px] text-slate-300`}>
          {status}
        </div>
      </section>
    </div>
  );
};

export default LibraryManagerApp;
