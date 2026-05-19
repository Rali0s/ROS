/* eslint-disable react/prop-types */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Database,
  DownloadCloud,
  FileText,
  KeyRound,
  Layers,
  ListFilter,
  Lock,
  Play,
  RefreshCw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  buildRemediationPlanTemplate,
  clearBlackFalconFindings,
  countBlackFalconFindings,
  createDemoFalconFindings,
  FALCONPY_SPOTLIGHT_CONTRACT,
  ingestFalconFindings,
  loadBlackFalconFindings,
  normalizeFalconFinding,
  putBlackFalconFindings,
  readBlackFalconSummary,
  sortFalconFindings,
} from '../utils/blackFalcon';
import {
  captureMemoryItem,
  getActiveProject,
  now,
  updateWorkspaceData,
  useWorkspaceData,
} from '../utils/workspaceStore';
import { DEFAULT_MODEL_ID } from '../utils/modelCatalog';
import { runModel } from '../utils/modelRuntime';

const PAGE_SIZE = 8;
const MOCK_PULL_TOTAL = 100000;
const MOCK_PULL_BATCH = 500;

const PANEL = 'rounded-lg border border-red-500/18 bg-black/35 shadow-2xl shadow-black/30 backdrop-blur-md';
const SUB_PANEL = 'rounded-md border border-white/10 bg-white/[0.045] backdrop-blur-sm';
const BUTTON = 'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition disabled:cursor-not-allowed disabled:opacity-50';
const RED_BUTTON = `${BUTTON} border-red-400/30 bg-red-500/14 text-red-100 hover:bg-red-500/22`;
const SOFT_BUTTON = `${BUTTON} border-white/12 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]`;
const INPUT = 'rounded-md border border-white/10 bg-black/35 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-red-300/40';

const formatNumber = (value) => new Intl.NumberFormat().format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return 'Unscheduled';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const getStatusTone = (finding) => {
  if (!finding.cisaRanked) {
    return 'border-white/12 bg-white/[0.05] text-slate-300';
  }

  if (finding.cisaScore >= 90) {
    return 'border-red-300/35 bg-red-500/16 text-red-100';
  }

  if (finding.cisaScore >= 75) {
    return 'border-orange-300/25 bg-orange-500/12 text-orange-100';
  }

  return 'border-amber-300/20 bg-amber-500/10 text-amber-100';
};

const summarizeFinding = (finding) =>
  [
    finding.cveId,
    finding.vendorProject,
    finding.product,
    finding.vulnerabilityName,
    finding.hexId,
    finding.hash,
    finding.cisaScoreRationale?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const writeWorkspaceSummary = (patch = {}) => {
  updateWorkspaceData((current) => ({
    ...current,
    settings: {
      ...current.settings,
      blackFalcon: {
        ...(current.settings.blackFalcon || {}),
        ...patch,
      },
    },
  }));
};

const buildMockRawFinding = (index) => {
  const vendors = [
    ['Microsoft', 'Exchange Server', 'Mailbox gateway exposure'],
    ['Cisco', 'Secure Edge', 'Controller auth exposure'],
    ['Ivanti', 'Connect Secure', 'Gateway command exposure'],
    ['Atlassian', 'Confluence', 'Collaboration access exposure'],
    ['Apache', 'HTTP Server', 'Web service exposure'],
    ['Palo Alto Networks', 'PAN-OS', 'Firewall management exposure'],
  ];
  const [vendorProject, product, title] = vendors[index % vendors.length];
  const cveYear = 2021 + (index % 6);
  const cveId = `CVE-${cveYear}-${String(10000 + index).padStart(5, '0')}`;
  const cvss = [9.8, 8.8, 7.5, 6.8, 9.1, 10][index % 6];
  const dueDate = new Date(Date.now() + ((index % 45) - 12) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    cveId,
    vendorProject,
    product,
    vulnerabilityName: `${title} ${index + 1}`,
    dateAdded: new Date(Date.now() - (index % 240) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dueDate,
    knownRansomwareCampaignUse: index % 9 === 0 ? 'Known' : 'Unknown',
    cwes: [`CWE-${[79, 89, 287, 352, 502, 862][index % 6]}`],
    cvss,
    affectedAssetCount: 1 + (index % 1800),
    internetExposure: index % 4 === 0,
    assetCriticality: ['critical', 'high', 'medium', 'standard'][index % 4],
    severity: cvss >= 9 ? 'critical' : cvss >= 7 ? 'high' : 'medium',
    sourceMode: 'mock-100k',
    synthetic: true,
    shortDescription:
      'Synthetic Falcon Spotlight line item for 100k ingestion testing. No live tenant data is represented.',
    requiredAction:
      'Validate exposure, apply vendor guidance, and record evidence before closure.',
  };
};

const MetricTile = ({ label, value, accent = false }) => (
  <div className={SUB_PANEL}>
    <div className="p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${accent ? 'text-red-100' : 'text-white'}`}>{value}</div>
    </div>
  </div>
);

const FindingCard = ({ finding, active, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(finding.id)}
    className={`w-full rounded-md border p-3 text-left transition ${
      active
        ? 'border-red-300/40 bg-red-500/12 shadow-lg shadow-red-950/20'
        : 'border-white/10 bg-white/[0.045] hover:border-red-300/24 hover:bg-white/[0.07]'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{finding.cveId}</div>
        <div className="mt-1 truncate text-xs text-slate-400">
          {finding.vendorProject} / {finding.product}
        </div>
      </div>
      <span className={`shrink-0 rounded border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${getStatusTone(finding)}`}>
        {finding.cisaRanked ? finding.cisaScore : 'NR'}
      </span>
    </div>
    <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-300">{finding.vulnerabilityName}</p>
    <div className="mt-3 flex flex-wrap gap-1.5">
      <span className="rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-[10px] text-red-100">{finding.hexId}</span>
      <span className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-300">{formatNumber(finding.affectedAssetCount)} assets</span>
      <span className="rounded border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-slate-300">Due {formatDate(finding.dueDate)}</span>
    </div>
  </button>
);

const DetailRow = ({ label, value, mono = false }) => (
  <div className="rounded-md border border-white/8 bg-black/22 p-3">
    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
    <div className={`mt-1 break-words text-sm text-slate-200 ${mono ? 'font-mono text-xs' : ''}`}>{value || 'Not available'}</div>
  </div>
);

const BlackFalconConnectorApp = () => {
  const { data } = useWorkspaceData();
  const activeProject = getActiveProject(data);
  const [findings, setFindings] = useState([]);
  const [totalCached, setTotalCached] = useState(0);
  const [summary, setSummary] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [activeTab, setActiveTab] = useState('ranked');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('Black Falcon cache standing by.');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [template, setTemplate] = useState('');
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmOutput, setLlmOutput] = useState('');
  const [logs, setLogs] = useState(['Connector initialized in mock-first mode.']);
  const syncAbortRef = useRef(null);
  const initializedRef = useRef(false);

  const selectedFinding = useMemo(
    () => findings.find((finding) => finding.id === selectedId) || findings[0] || null,
    [findings, selectedId],
  );

  const rankedCount = findings.filter((finding) => finding.cisaRanked).length;
  const nonRankedCount = findings.filter((finding) => !finding.cisaRanked).length;
  const topScore = findings.find((finding) => finding.cisaRanked)?.cisaScore || 0;

  const filteredFindings = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sortFalconFindings(findings)
      .filter((finding) => (activeTab === 'ranked' ? finding.cisaRanked : !finding.cisaRanked))
      .filter((finding) => !needle || summarizeFinding(finding).includes(needle));
  }, [activeTab, findings, query]);

  const maxPage = Math.max(0, Math.ceil(filteredFindings.length / PAGE_SIZE) - 1);
  const visibleFindings = filteredFindings.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const pushLog = useCallback((message) => {
    setLogs((current) => [message, ...current].slice(0, 8));
  }, []);

  const refreshCache = useCallback(async ({ autoSeed = false } = {}) => {
    try {
      const [cachedFindings, cachedTotal, cachedSummary] = await Promise.all([
        loadBlackFalconFindings({ limit: 500 }),
        countBlackFalconFindings(),
        readBlackFalconSummary(),
      ]);

      if (autoSeed && !cachedTotal) {
        const demoFindings = await createDemoFalconFindings(15);
        await putBlackFalconFindings(demoFindings);
        setFindings(demoFindings);
        setTotalCached(demoFindings.length);
        setSummary({
          id: 'black-falcon-summary',
          lastUpdatedAt: new Date().toISOString(),
          lastMode: 'synthetic-demo',
          cachedCountHint: demoFindings.length,
        });
        setSelectedId(demoFindings[0]?.id || '');
        setStatus('Seeded 15 synthetic CISA-style Black Falcon cards.');
        pushLog('Seeded 15 demo vulnerability cards.');
        writeWorkspaceSummary({
          lastMode: 'synthetic-demo',
          cachedCount: demoFindings.length,
          lastActivityAt: now(),
        });
        return;
      }

      setFindings(cachedFindings);
      setTotalCached(cachedTotal);
      setSummary(cachedSummary);
      setSelectedId((current) => current || cachedFindings[0]?.id || '');
    } catch (error) {
      setStatus(error.message || 'Unable to read Black Falcon cache.');
    }
  }, [pushLog]);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    refreshCache({ autoSeed: true });
  }, [refreshCache]);

  useEffect(() => {
    setPage(0);
  }, [activeTab, query]);

  useEffect(() => {
    if (!selectedId && findings[0]) {
      setSelectedId(findings[0].id);
    }
  }, [findings, selectedId]);

  const handleSeedDemo = async () => {
    if (syncBusy) {
      return;
    }

    setSyncBusy(true);
    try {
      const demoFindings = await createDemoFalconFindings(15);
      await clearBlackFalconFindings();
      await putBlackFalconFindings(demoFindings);
      setFindings(demoFindings);
      setTotalCached(demoFindings.length);
      setSelectedId(demoFindings[0]?.id || '');
      setStatus('Demo cache reset with 15 synthetic CISA-style cards.');
      pushLog('Demo cache reset. No live Falcon tenant data used.');
      writeWorkspaceSummary({
        lastMode: 'synthetic-demo',
        cachedCount: demoFindings.length,
        lastActivityAt: now(),
      });
    } catch (error) {
      setStatus(error.message || 'Unable to seed demo cards.');
    } finally {
      setSyncBusy(false);
    }
  };

  const handleMockPull100k = async () => {
    if (syncBusy) {
      return;
    }

    const controller = new AbortController();
    syncAbortRef.current = controller;
    setSyncBusy(true);
    setSyncProgress({ pulled: 0, total: MOCK_PULL_TOTAL, batches: 0 });
    setStatus('Mock 100k Falcon pull started.');
    pushLog('Started mock 100k pull with redacted synthetic records.');

    try {
      await clearBlackFalconFindings();
      const result = await ingestFalconFindings({
        total: MOCK_PULL_TOTAL,
        batchSize: MOCK_PULL_BATCH,
        signal: controller.signal,
        store: {
          putBatch: async (batch) => putBlackFalconFindings(batch),
        },
        fetchBatch: async ({ offset, limit, signal }) => {
          if (signal?.aborted) {
            throw new DOMException('Black Falcon sync canceled.', 'AbortError');
          }

          const batch = await Promise.all(
            Array.from({ length: limit }, (_, itemIndex) =>
              normalizeFalconFinding(buildMockRawFinding(offset + itemIndex), { index: offset + itemIndex }),
            ),
          );

          return {
            resources: batch,
            meta: {
              after: offset + limit < MOCK_PULL_TOTAL ? String(offset + limit) : '',
              total: MOCK_PULL_TOTAL,
            },
          };
        },
        onProgress: (progress) => {
          setSyncProgress(progress);
          if (progress.batches % 10 === 0 || progress.pulled === MOCK_PULL_TOTAL) {
            pushLog(`Pulled ${formatNumber(progress.pulled)} of ${formatNumber(MOCK_PULL_TOTAL)} records.`);
          }
        },
      });

      await refreshCache();
      setStatus(`Mock pull complete: ${formatNumber(result.pulled)} line items cached locally.`);
      writeWorkspaceSummary({
        lastMode: 'mock-100k',
        cachedCount: result.pulled,
        lastActivityAt: now(),
      });
    } catch (error) {
      const aborted = error?.name === 'AbortError';
      setStatus(aborted ? 'Mock Falcon pull canceled.' : error.message || 'Mock Falcon pull failed.');
      pushLog(aborted ? 'Operator canceled mock pull.' : 'Mock pull failed before completion.');
      await refreshCache();
    } finally {
      if (syncAbortRef.current === controller) {
        syncAbortRef.current = null;
      }
      setSyncBusy(false);
      setSyncProgress(null);
    }
  };

  const handleCancelSync = () => {
    syncAbortRef.current?.abort();
    setStatus('Cancel requested for Black Falcon sync.');
  };

  const handleGenerateTemplate = () => {
    if (!selectedFinding) {
      setStatus('Select a vulnerability before generating a template.');
      return;
    }

    const nextTemplate = buildRemediationPlanTemplate(selectedFinding);
    setTemplate(nextTemplate);
    setLlmOutput('');
    setStatus('Remediation plan template generated.');
    pushLog(`Template generated for ${selectedFinding.cveId}.`);
  };

  const handleSaveTemplate = () => {
    if (!template.trim() || !selectedFinding) {
      return;
    }

    captureMemoryItem({
      projectId: activeProject.id,
      kind: 'action-plan',
      title: `Black Falcon remediation template - ${selectedFinding.cveId}`,
      body: template,
      tags: ['black-falcon', 'remediation-template', selectedFinding.cveId, selectedFinding.hexId],
      links: [
        {
          id: selectedFinding.hash,
          title: selectedFinding.vulnerabilityName,
          kind: 'black-falcon-finding',
        },
      ],
    });
    setStatus('Template saved to project memory.');
    pushLog(`Template saved for ${selectedFinding.cveId}.`);
  };

  const handleRunDnsFillout = async () => {
    if (!selectedFinding) {
      setStatus('Select a vulnerability before running DNS fillout.');
      return;
    }

    const workingTemplate = template || buildRemediationPlanTemplate(selectedFinding);
    setTemplate(workingTemplate);
    setLlmBusy(true);
    setStatus('DNS fillout running against local model.');
    pushLog(`DNS fillout requested for ${selectedFinding.cveId}.`);

    try {
      const prompt = `Fill out this Black Falcon remediation plan for a defender. Keep unknowns marked for a human owner.\n\n${workingTemplate}`;
      const result = await runModel(
        data.settings.ai?.selectedModelId || DEFAULT_MODEL_ID,
        [
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          promptBlock: workingTemplate,
          items: [
            {
              id: selectedFinding.hexId,
              title: selectedFinding.vulnerabilityName,
              kind: 'black-falcon-finding',
              excerpt: selectedFinding.shortDescription,
              tags: ['black-falcon', selectedFinding.cveId],
              sourcePath: 'black-falcon://local-cache',
            },
          ],
        },
        data.settings.ai || {},
      );
      const output = result.content || '';
      setLlmOutput(output);
      captureMemoryItem({
        projectId: activeProject.id,
        kind: 'deepnimsec-record',
        title: `DNS remediation fillout - ${selectedFinding.cveId}`,
        body: output,
        tags: ['black-falcon', 'dns-fillout', 'deepnimsec', selectedFinding.cveId, selectedFinding.hexId],
        links: [
          {
            id: selectedFinding.hash,
            title: selectedFinding.vulnerabilityName,
            kind: 'black-falcon-finding',
          },
        ],
        modelId: data.settings.ai?.selectedModelId || DEFAULT_MODEL_ID,
        modelName: result.model || 'DNS-v1',
        workflowId: 'black-falcon-remediation-fillout',
        generatedAt: now(),
      });
      setStatus('DNS remediation fillout saved to project memory.');
    } catch (error) {
      setStatus(error.message || 'Local model unavailable. Template remains ready for manual fillout.');
      pushLog('DNS fillout could not complete with the current local model service.');
    } finally {
      setLlmBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#090909,#120608_48%,#050505)] p-4 text-slate-100">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4">
        <header className={`${PANEL} overflow-hidden`}>
          <div className="border-b border-red-500/16 bg-[linear-gradient(135deg,rgba(127,29,29,0.28),rgba(0,0,0,0.46)_55%,rgba(20,0,0,0.54))] p-4">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-start 2xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-red-100/80">
                  <ShieldAlert size={15} />
                  Partner Connector
                  <span className="rounded border border-red-300/20 bg-red-500/10 px-2 py-1 text-[10px] text-red-100">Mock-first</span>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">[ Black Falcon ]</h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
                  CrowdStrike Falcon Spotlight-shaped connector for CISA vulnerability triage, local scoring, and DNS remediation planning.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={handleSeedDemo} disabled={syncBusy} className={SOFT_BUTTON}>
                  <Database size={14} />
                  Seed 15 Demo Cards
                </button>
                <button type="button" onClick={handleMockPull100k} disabled={syncBusy} className={RED_BUTTON}>
                  <DownloadCloud size={14} />
                  Mock Pull 100k
                </button>
                {syncBusy ? (
                  <button type="button" onClick={handleCancelSync} className={SOFT_BUTTON}>
                    <X size={14} />
                    Cancel Sync
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-4">
            <MetricTile label="Cached line items" value={formatNumber(totalCached || findings.length)} accent />
            <MetricTile label="Ranked CISA" value={formatNumber(rankedCount)} />
            <MetricTile label="Non-ranked CISA" value={formatNumber(nonRankedCount)} />
            <MetricTile label="Top CISA Score" value={topScore || 'NR'} accent={topScore >= 90} />
          </div>
        </header>

        <section className="grid min-w-0 gap-4 2xl:grid-cols-[0.82fr_1.18fr]">
          <div className={`${PANEL} min-h-[38rem] p-4`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <ListFilter size={16} className="text-red-100" />
                  Vulnerability Cards
                </div>
                <div className="mt-1 text-xs text-slate-500">{status}</div>
              </div>
              <button type="button" onClick={() => refreshCache()} className={SOFT_BUTTON}>
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {syncProgress ? (
              <div className="mt-4 rounded-md border border-red-300/20 bg-red-500/10 p-3">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-red-100">
                  <span>Sync progress</span>
                  <span>{formatNumber(syncProgress.pulled)} / {formatNumber(syncProgress.total)}</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/50">
                  <div
                    className="h-full rounded-full bg-red-400 transition-all"
                    style={{ width: `${Math.min(100, (syncProgress.pulled / Math.max(1, syncProgress.total)) * 100)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex rounded-md border border-white/10 bg-black/30 p-1">
                {[
                  ['ranked', `Ranked ${rankedCount}`],
                  ['non-ranked', `Non-ranked ${nonRankedCount}`],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveTab(id)}
                    className={`rounded px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                      activeTab === id ? 'bg-red-500/20 text-red-50' : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2">
                <Search size={15} className="shrink-0 text-slate-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search CVE, product, HEX, hash"
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
                />
              </label>
            </div>

            <div className="mt-4 grid max-h-[42rem] gap-2 overflow-y-auto pr-1">
              {visibleFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  finding={finding}
                  active={selectedFinding?.id === finding.id}
                  onSelect={setSelectedId}
                />
              ))}
              {!visibleFindings.length ? (
                <div className={`${SUB_PANEL} p-6 text-center text-sm text-slate-500`}>
                  No Black Falcon records match this view.
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page <= 0}
                className={SOFT_BUTTON}
              >
                Previous
              </button>
              <span>Page {page + 1} / {maxPage + 1}</span>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(maxPage, current + 1))}
                disabled={page >= maxPage}
                className={SOFT_BUTTON}
              >
                Next
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            <section className={`${PANEL} p-4`}>
              {selectedFinding ? (
                <>
                  <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start 2xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-100">
                        <ShieldCheck size={14} />
                        Selected vulnerability
                      </div>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{selectedFinding.cveId}</h2>
                      <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{selectedFinding.vulnerabilityName}</p>
                    </div>
                    <span className={`rounded-md border px-3 py-2 text-sm font-semibold ${getStatusTone(selectedFinding)}`}>
                      {selectedFinding.cisaRanked ? `CISA Score ${selectedFinding.cisaScore}` : 'Non-ranked CISA'}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    <DetailRow label="HEX ID" value={selectedFinding.hexId} mono />
                    <DetailRow label="Hash" value={selectedFinding.hash} mono />
                    <DetailRow label="Due date" value={formatDate(selectedFinding.dueDate)} />
                    <DetailRow label="Known ransomware use" value={selectedFinding.knownRansomwareCampaignUse} />
                    <DetailRow label="Affected assets" value={formatNumber(selectedFinding.affectedAssetCount)} />
                    <DetailRow label="CWE" value={selectedFinding.cwes?.join(', ')} />
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_0.92fr]">
                    <div className={`${SUB_PANEL} p-3`}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Required action</div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{selectedFinding.requiredAction}</p>
                    </div>
                    <div className={`${SUB_PANEL} p-3`}>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Score rationale</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {(selectedFinding.cisaScoreRationale || []).map((entry) => (
                          <span key={entry} className="rounded border border-red-300/16 bg-red-500/10 px-2 py-1 text-[11px] text-red-50">
                            {entry}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-sm text-slate-500">No vulnerability selected.</div>
              )}
            </section>

            <section className={`${PANEL} p-4`}>
              <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <BrainCircuit size={16} className="text-red-100" />
                    DNS Remediation Workflow
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Selected model: {data.settings.ai?.selectedModelId || DEFAULT_MODEL_ID}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleGenerateTemplate} disabled={!selectedFinding} className={SOFT_BUTTON}>
                    <FileText size={14} />
                    Generate Template
                  </button>
                  <button type="button" onClick={handleRunDnsFillout} disabled={!selectedFinding || llmBusy} className={RED_BUTTON}>
                    {llmBusy ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                    DNS Fillout
                  </button>
                  <button type="button" onClick={handleSaveTemplate} disabled={!template.trim()} className={SOFT_BUTTON}>
                    <Save size={14} />
                    Save Template
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 2xl:grid-cols-2">
                <textarea
                  value={template}
                  onChange={(event) => setTemplate(event.target.value)}
                  placeholder="Generate a remediation template from the selected vulnerability."
                  className={`${INPUT} min-h-[20rem] resize-none font-mono text-xs leading-5`}
                />
                <textarea
                  value={llmOutput}
                  onChange={(event) => setLlmOutput(event.target.value)}
                  placeholder="DNS remediation fillout will appear here when the local model responds."
                  className={`${INPUT} min-h-[20rem] resize-none text-sm leading-6`}
                />
              </div>
            </section>

            <section className={`${PANEL} p-4`}>
              <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
                <div className={`${SUB_PANEL} p-3`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <KeyRound size={15} className="text-red-100" />
                    Connector Contract
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300">
                    <div className="flex items-center justify-between gap-3">
                      <span>Service class</span>
                      <span className="font-mono text-red-100">{FALCONPY_SPOTLIGHT_CONTRACT.serviceClass}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Scope</span>
                      <span className="font-mono text-red-100">{FALCONPY_SPOTLIGHT_CONTRACT.requiredScope}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Mode</span>
                      <span className="font-mono text-red-100">{FALCONPY_SPOTLIGHT_CONTRACT.mode}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-md border border-amber-300/16 bg-amber-500/10 p-3 text-xs leading-5 text-amber-100/90">
                    <div className="flex items-center gap-2 font-semibold">
                      <Lock size={13} />
                      Live credential input locked
                    </div>
                    <p className="mt-1 text-amber-100/75">No secrets, tenant IDs, IPs, hostnames, or private Falcon records are stored in this build.</p>
                  </div>
                </div>

                <div className={`${SUB_PANEL} p-3`}>
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Layers size={15} className="text-red-100" />
                    Last Activity
                  </div>
                  <div className="mt-3 grid gap-2">
                    {logs.map((entry, index) => (
                      <div key={`${entry}-${index}`} className="rounded border border-white/8 bg-black/25 px-3 py-2 text-xs text-slate-300">
                        {entry}
                      </div>
                    ))}
                    <div className="flex items-start gap-2 rounded border border-white/8 bg-black/25 px-3 py-2 text-xs text-slate-500">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-100/80" />
                      Cache summary: {summary?.lastMode || 'not recorded'} / {summary?.lastUpdatedAt ? formatDate(summary.lastUpdatedAt) : 'not recorded'}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BlackFalconConnectorApp;
