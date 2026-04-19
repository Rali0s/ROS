/* eslint-disable react/prop-types */
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Binary,
  BookOpen,
  FileSearch2,
  FlaskConical,
  Network,
  Plus,
  Scale,
  Search,
  Sigma,
  Upload,
} from 'lucide-react';
import { getAppInteriorTheme } from '../utils/constants';
import {
  createId,
  now,
  setWorkspaceNavigation,
  useWorkspaceData,
} from '../utils/workspaceStore';

const stopWindowDrag = (event) => {
  event.stopPropagation();
};

const cloneValue = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const formatDateTime = (value) => {
  if (!value) {
    return 'Not yet';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
};

const scoreToPercent = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0%';
  }

  return `${Math.round(value * 100)}%`;
};

const numberOrBlank = (value) => (typeof value === 'number' && Number.isFinite(value) ? String(value) : '');

const splitList = (value) =>
  String(value || '')
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);

const listToText = (value) => (Array.isArray(value) ? value.join(', ') : '');

const parseNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number.parseFloat(String(value || '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parseEffectSize = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  const match = String(value || '').match(/-?\d+(\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : null;
};

const compareNumeric = (actual, operator, expected) => {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
    return false;
  }

  switch (operator) {
    case '>':
      return actual > expected;
    case '>=':
      return actual >= expected;
    case '<':
      return actual < expected;
    case '<=':
      return actual <= expected;
    case '=':
    case '==':
      return actual === expected;
    default:
      return false;
  }
};

const parseResearchQuery = (query) => {
  const raw = String(query || '').trim();

  if (!raw) {
    return {
      terms: [],
      comparators: [],
    };
  }

  const comparators = [];
  const numericPattern = /\b(n|sample size|susceptibility|internal validity|external validity|construct validity|statistical validity)\s*(>=|<=|>|<|=)\s*(\d+(\.\d+)?)/gi;
  let match;

  while ((match = numericPattern.exec(raw))) {
    comparators.push({
      field: match[1].toLowerCase(),
      operator: match[2],
      value: Number.parseFloat(match[3]),
    });
  }

  const stripped = raw
    .replace(/\bshow all studies with\b/gi, '')
    .replace(numericPattern, ' ')
    .replace(/[+]/g, ' ');

  const terms = stripped
    .split(/\b(?:and|with)\b/i)
    .flatMap((part) => part.split(','))
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  return {
    terms,
    comparators,
  };
};

const matchesResearchQuery = (study, parsedQuery) => {
  const haystack = [
    study.meta.title,
    study.meta.subtitle,
    study.meta.field,
    study.meta.subfield,
    study.abstractThesis.coreHypothesis,
    study.results.findings.join(' '),
    study.insight.domainRelevance.join(' '),
    study.cognitiveOverlay.biasTags.join(' '),
    study.meta.keywords.join(' '),
    study.meta.authors.map((author) => author.name).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  const termsMatch = parsedQuery.terms.every((term) => haystack.includes(term));

  const comparatorMatch = parsedQuery.comparators.every((comparator) => {
    if (comparator.field === 'n' || comparator.field === 'sample size') {
      return compareNumeric(study.sample.size ?? NaN, comparator.operator, comparator.value);
    }

    if (comparator.field === 'susceptibility') {
      return compareNumeric(study.cognitiveOverlay.susceptibilityScore ?? NaN, comparator.operator, comparator.value);
    }

    const scoreKey = comparator.field.replace(' validity', '').replace(' ', '');
    const scoreMap = {
      internal: study.quality.internalValidity,
      external: study.quality.externalValidity,
      construct: study.quality.constructValidity,
      statistical: study.quality.statisticalValidity,
    };

    return compareNumeric(scoreMap[scoreKey] ?? NaN, comparator.operator, comparator.value);
  });

  return termsMatch && comparatorMatch;
};

const createStudyDraft = () => ({
  id: createId('study'),
  meta: {
    title: 'Untitled study',
    subtitle: '',
    authors: [],
    affiliations: [],
    correspondingAuthor: '',
    year: new Date().getFullYear(),
    journal: '',
    conference: '',
    doi: '',
    url: '',
    volume: '',
    issue: '',
    pages: '',
    field: 'Cognitive Psychology',
    subfield: 'Decision-Making',
    keywords: [],
    researchType: 'Experimental',
    studyDesignType: 'Between Subjects',
  },
  abstractThesis: {
    abstractRaw: '',
    abstractRewritten: '',
    coreHypothesis: '',
    researchQuestions: [],
    theoreticalFramework: '',
    nullHypothesis: '',
    alternativeHypothesis: '',
  },
  variables: {
    independent: [],
    dependent: [],
    controls: [],
    confounds: [],
    moderators: [],
    mediators: [],
  },
  design: {
    designType: 'Between Subjects',
    randomizationMethod: '',
    blinding: 'None',
    controlGroupType: 'None',
    procedure: '',
    stimuli: [],
    instruments: [],
    durationPerTrial: '',
    durationTotal: '',
  },
  sample: {
    size: null,
    populationType: '',
    ageRange: '',
    genderBreakdown: '',
    ethnicity: '',
    socioeconomicStatus: '',
    inclusionCriteria: [],
    exclusionCriteria: [],
    samplingMethod: '',
    geography: '',
  },
  measurement: {
    measurementType: 'Quantitative',
    scales: [],
    operationalDefinitions: [],
    collectionMethod: '',
    statisticalTests: [],
    significanceThreshold: '',
    effectSizes: [],
    confidenceIntervals: [],
    powerAnalysis: '',
  },
  results: {
    findings: [],
    statisticalOutcomes: [],
    graphTableSummary: '',
    hypothesisOutcome: 'Unknown',
    unexpectedFindings: [],
  },
  discussion: {
    interpretation: '',
    theoreticalImplications: '',
    practicalImplications: '',
    limitations: [],
    futureResearch: [],
  },
  citations: {
    references: [],
    keyCitations: [],
    citationCount: null,
    relatedStudyIds: [],
  },
  quality: {
    internalValidity: 0.5,
    externalValidity: 0.5,
    constructValidity: 0.5,
    statisticalValidity: 0.5,
    controlStrength: '',
    confoundRisk: '',
    biasRisk: '',
    generalizability: '',
    populationMismatch: '',
    measurementAccuracy: '',
    properTestUsage: '',
    powerSufficiency: '',
  },
  cognitiveOverlay: {
    biasTags: [],
    susceptibilityScore: null,
    biasCategory: '',
    psychologicalTrigger: '',
    riskMultiplier: '',
    cmuBetaIds: [],
    persuasionCoefficient: '',
    nimScore: '',
  },
  replication: {
    status: 'Unknown',
    sampleSizeAdequacy: '',
    pHackingRisk: '',
    publicationBiasRisk: '',
    openDataAvailable: false,
    preregistered: false,
  },
  insight: {
    coreInsight: '',
    soWhat: '',
    domainRelevance: [],
    exploitability: '',
    defensibility: '',
  },
  links: {
    confirmsStudyIds: [],
    contradictsStudyIds: [],
    extendsTheoryIds: [],
    usesMethodIds: [],
    sameDatasetStudyIds: [],
  },
  linkedLibraryIds: [],
  createdAt: now(),
  updatedAt: now(),
});

const setByPath = (target, path, value) => {
  const segments = path.split('.');
  let current = target;

  segments.slice(0, -1).forEach((segment) => {
    if (!current[segment] || typeof current[segment] !== 'object') {
      current[segment] = {};
    }

    current = current[segment];
  });

  current[segments[segments.length - 1]] = value;
  return target;
};

const DetailField = ({ label, value, onChange, placeholder = '', type = 'text' }) => (
  <label className="grid gap-1.5 text-xs text-slate-400">
    <span className="uppercase tracking-[0.18em]">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none transition focus:border-amber-400/35 focus:bg-black/35"
      onPointerDown={stopWindowDrag}
    />
  </label>
);

const TextAreaField = ({ label, value, onChange, placeholder = '', rows = 4 }) => (
  <label className="grid gap-1.5 text-xs text-slate-400">
    <span className="uppercase tracking-[0.18em]">{label}</span>
    <textarea
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-6 text-white outline-none transition focus:border-amber-400/35 focus:bg-black/35"
      onPointerDown={stopWindowDrag}
    />
  </label>
);

const SliderField = ({ label, value, onChange }) => (
  <label className="grid gap-2 text-xs text-slate-400">
    <div className="flex items-center justify-between gap-3">
      <span className="uppercase tracking-[0.18em]">{label}</span>
      <span className="text-[11px] font-semibold text-white">{scoreToPercent(value ?? 0)}</span>
    </div>
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={typeof value === 'number' ? value : 0}
      onChange={(event) => onChange(Number.parseFloat(event.target.value))}
      className="accent-amber-400"
      onPointerDown={stopWindowDrag}
    />
  </label>
);

const SectionCard = ({ title, icon: Icon, children, subtitle = '' }) => (
  <section className="rounded-[24px] border border-white/10 bg-black/20 p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Icon size={16} className="text-amber-200" />
          {title}
        </div>
        {subtitle ? <div className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
    {children}
  </section>
);

const ResearchVaultApp = () => {
  const {
    data,
    session,
    updateWorkspaceData,
    clearWorkspaceNavigation: clearNav,
  } = useWorkspaceData();
  const theme = getAppInteriorTheme(data.settings.theme);
  const studies = useMemo(() => data.researchVault ?? [], [data.researchVault]);
  const libraryEntries = useMemo(() => data.library ?? [], [data.library]);
  const [selectedStudyId, setSelectedStudyId] = useState(studies[0]?.id ?? null);
  const [query, setQuery] = useState('show all studies with loss aversion + N > 100');
  const [status, setStatus] = useState('Research Vault is ready for structured study capture, comparison, and rollups.');
  const [compareStudyId, setCompareStudyId] = useState(studies[1]?.id ?? studies[0]?.id ?? null);
  const [ingestLibraryId, setIngestLibraryId] = useState(libraryEntries[0]?.id ?? '');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!studies.length) {
      setSelectedStudyId(null);
      setCompareStudyId(null);
      return;
    }

    if (!studies.some((study) => study.id === selectedStudyId)) {
      setSelectedStudyId(studies[0].id);
    }

    if (!studies.some((study) => study.id === compareStudyId)) {
      setCompareStudyId(studies.find((study) => study.id !== selectedStudyId)?.id ?? studies[0].id);
    }
  }, [compareStudyId, selectedStudyId, studies]);

  useEffect(() => {
    if (!libraryEntries.some((entry) => entry.id === ingestLibraryId)) {
      setIngestLibraryId(libraryEntries[0]?.id ?? '');
    }
  }, [ingestLibraryId, libraryEntries]);

  useEffect(() => {
    if (session.navigation?.appKey !== 'research-vault') {
      return;
    }

    if (session.navigation.itemId) {
      setSelectedStudyId(session.navigation.itemId);
    }

    clearNav();
  }, [clearNav, session.navigation]);

  const selectedStudy = useMemo(
    () => studies.find((study) => study.id === selectedStudyId) ?? null,
    [selectedStudyId, studies],
  );

  const compareStudy = useMemo(
    () => studies.find((study) => study.id === compareStudyId) ?? null,
    [compareStudyId, studies],
  );

  const filteredStudies = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    if (!normalizedQuery) {
      return studies;
    }

    return studies.filter((study) => {
      const haystack = [
        study.meta.title,
        study.meta.field,
        study.meta.subfield,
        study.meta.keywords.join(' '),
        study.cognitiveOverlay.biasTags.join(' '),
        study.meta.authors.map((author) => author.name).join(' '),
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [searchTerm, studies]);

  const queryResults = useMemo(() => {
    const parsed = parseResearchQuery(query);
    return studies.filter((study) => matchesResearchQuery(study, parsed));
  }, [query, studies]);

  const rollups = useMemo(() => {
    const sampleSizes = studies.map((study) => study.sample.size).filter((value) => typeof value === 'number');
    const effectSizes = studies
      .flatMap((study) => study.measurement.effectSizes)
      .map(parseEffectSize)
      .filter((value) => typeof value === 'number');
    const biasCounts = studies.flatMap((study) => study.cognitiveOverlay.biasTags).reduce((accumulator, tag) => {
      accumulator[tag] = (accumulator[tag] || 0) + 1;
      return accumulator;
    }, {});
    const replicationCounts = studies.reduce((accumulator, study) => {
      const key = study.replication.status || 'Unknown';
      accumulator[key] = (accumulator[key] || 0) + 1;
      return accumulator;
    }, {});
    const qualityScores = studies.flatMap((study) => [
      study.quality.internalValidity,
      study.quality.externalValidity,
      study.quality.constructValidity,
      study.quality.statisticalValidity,
    ]).filter((value) => typeof value === 'number');

    return {
      total: studies.length,
      averageSampleSize: sampleSizes.length
        ? Math.round(sampleSizes.reduce((sum, value) => sum + value, 0) / sampleSizes.length)
        : 0,
      averageEffectSize: effectSizes.length
        ? (effectSizes.reduce((sum, value) => sum + value, 0) / effectSizes.length).toFixed(2)
        : 'n/a',
      averageValidity: qualityScores.length
        ? scoreToPercent(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
        : '0%',
      topBiases: Object.entries(biasCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 4),
      replicationCounts: Object.entries(replicationCounts).sort((left, right) => right[1] - left[1]),
    };
  }, [studies]);

  const citationGraph = useMemo(() => {
    if (!selectedStudy) {
      return [];
    }

    const relatedIds = [
      ...selectedStudy.citations.relatedStudyIds,
      ...selectedStudy.links.confirmsStudyIds,
      ...selectedStudy.links.contradictsStudyIds,
      ...selectedStudy.links.extendsTheoryIds,
      ...selectedStudy.links.usesMethodIds,
      ...selectedStudy.links.sameDatasetStudyIds,
    ];

    return Array.from(new Set(relatedIds))
      .map((id) => studies.find((study) => study.id === id))
      .filter(Boolean)
      .slice(0, 6);
  }, [selectedStudy, studies]);

  const diffRows = useMemo(() => {
    if (!selectedStudy || !compareStudy) {
      return [];
    }

    return [
      ['Field', selectedStudy.meta.field, compareStudy.meta.field],
      ['Design', selectedStudy.design.designType, compareStudy.design.designType],
      ['Sample N', selectedStudy.sample.size ?? '—', compareStudy.sample.size ?? '—'],
      ['Population', selectedStudy.sample.populationType || '—', compareStudy.sample.populationType || '—'],
      ['Geography', selectedStudy.sample.geography || '—', compareStudy.sample.geography || '—'],
      ['IVs', selectedStudy.variables.independent.join(', ') || '—', compareStudy.variables.independent.join(', ') || '—'],
      ['DVs', selectedStudy.variables.dependent.join(', ') || '—', compareStudy.variables.dependent.join(', ') || '—'],
      ['Tests', selectedStudy.measurement.statisticalTests.join(', ') || '—', compareStudy.measurement.statisticalTests.join(', ') || '—'],
      ['Bias tags', selectedStudy.cognitiveOverlay.biasTags.join(', ') || '—', compareStudy.cognitiveOverlay.biasTags.join(', ') || '—'],
      ['Replication', selectedStudy.replication.status || '—', compareStudy.replication.status || '—'],
    ];
  }, [compareStudy, selectedStudy]);

  const updateStudy = (studyId, updater) => {
    updateWorkspaceData((current) => ({
      ...current,
      researchVault: current.researchVault.map((study) => {
        if (study.id !== studyId) {
          return study;
        }

        const nextStudy = updater(cloneValue(study));
        return {
          ...nextStudy,
          updatedAt: now(),
        };
      }),
    }));
  };

  const updateField = (path, value, options = {}) => {
    if (!selectedStudy) {
      return;
    }

    updateStudy(selectedStudy.id, (draft) => {
      const nextValue = options.asList ? splitList(value) : options.asNumber ? parseNumber(value) : value;
      return setByPath(draft, path, nextValue);
    });
  };

  const createStudy = () => {
    const study = createStudyDraft();

    updateWorkspaceData((current) => ({
      ...current,
      researchVault: [study, ...(current.researchVault ?? [])],
    }));

    setSelectedStudyId(study.id);
    setCompareStudyId(studies[0]?.id ?? study.id);
    setStatus('New study record created.');
  };

  const ingestLibraryEntry = () => {
    if (!selectedStudy || !ingestLibraryId) {
      setStatus('Pick a study and a library item first.');
      return;
    }

    const entry = libraryEntries.find((item) => item.id === ingestLibraryId);

    if (!entry) {
      setStatus('That library item is no longer available.');
      return;
    }

    updateStudy(selectedStudy.id, (draft) => {
      draft.meta.title = draft.meta.title === 'Untitled study' ? entry.title : draft.meta.title;
      draft.meta.url = draft.meta.url || entry.identifiers.find((identifier) => /^https?:/i.test(identifier)) || '';
      draft.meta.authors = draft.meta.authors.length
        ? draft.meta.authors
        : entry.authors.map((author) => ({ name: author, affiliation: '' }));
      draft.meta.keywords = Array.from(new Set([...(draft.meta.keywords || []), ...(entry.tags || [])]));
      draft.discussion.interpretation = draft.discussion.interpretation || entry.description || '';
      draft.linkedLibraryIds = Array.from(new Set([...(draft.linkedLibraryIds || []), entry.id]));
      return draft;
    });

    setStatus(`Linked ${entry.title} into the active study and ingested available library metadata.`);
  };

  const jumpToStudy = (studyId) => {
    setSelectedStudyId(studyId);
    setWorkspaceNavigation({ appKey: 'research-vault', itemId: studyId });
  };

  const linkedLibrary = selectedStudy
    ? libraryEntries.filter((entry) => selectedStudy.linkedLibraryIds.includes(entry.id))
    : [];

  return (
    <div className={`h-full overflow-hidden ${theme.pageBg} text-slate-100`} onPointerDown={stopWindowDrag}>
      <div className="grid h-full min-h-0 gap-3.5 p-3.5 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className={`flex min-h-0 flex-col rounded-[28px] border ${theme.sidebarBorder} ${theme.sidebarBg} p-3.5`}>
          <div className="mb-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${theme.heroPill}`}>
              <FlaskConical size={12} />
              Research intelligence
            </div>
            <h1 className="mt-3 text-[1.45rem] font-semibold tracking-tight text-white">Research Vault</h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Structured capture for studies, validity scoring, bias overlays, and cross-study reasoning.
            </p>
          </div>

          <div className="grid gap-2.5">
            <button
              type="button"
              onClick={createStudy}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition ${theme.primaryButton}`}
            >
              <Plus size={16} />
              New study
            </button>
            <label className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Filter studies, biases, authors..."
                className={`w-full rounded-2xl border py-2.5 pl-10 pr-3 text-sm outline-none ${theme.input}`}
                onPointerDown={stopWindowDrag}
              />
            </label>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className={`rounded-2xl border ${theme.panelBorder} ${theme.panelBg} px-3 py-2.5`}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Studies</div>
              <div className="mt-1.5 text-lg font-semibold text-white">{rollups.total}</div>
            </div>
            <div className={`rounded-2xl border ${theme.panelBorder} ${theme.panelBg} px-3 py-2.5`}>
              <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Avg N</div>
              <div className="mt-1.5 text-lg font-semibold text-white">{rollups.averageSampleSize || '—'}</div>
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredStudies.map((study) => {
              const isActive = study.id === selectedStudyId;

              return (
                <button
                  key={study.id}
                  type="button"
                  onClick={() => jumpToStudy(study.id)}
                  className={`w-full rounded-[22px] border px-3 py-3 text-left transition ${
                    isActive ? `${theme.selectedCard}` : `${theme.card}`
                  }`}
                >
                  <div className="text-sm font-semibold text-white">{study.meta.title || 'Untitled study'}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {[study.meta.year, study.meta.field, study.sample.size ? `N=${study.sample.size}` : 'N=?']
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {study.cognitiveOverlay.biasTags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] ${theme.tag}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto pr-1">
          {!selectedStudy ? (
            <div className={`flex h-full items-center justify-center rounded-[28px] border ${theme.panelBorder} ${theme.panelBg}`}>
              <div className="max-w-md px-6 text-center">
                <h2 className="text-xl font-semibold text-white">No studies yet</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Create the first research record to start capturing design, sample, results, and behavioral overlays.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <section className={`rounded-[28px] border ${theme.heroBorder} ${theme.heroBg} p-4 shadow-2xl shadow-black/20`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] ${theme.heroPill}`}>
                      <Binary size={12} />
                      Structured research record
                    </div>
                    <h2 className="mt-3 text-[1.8rem] font-semibold tracking-tight text-white">{selectedStudy.meta.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {selectedStudy.abstractThesis.coreHypothesis || 'Capture the paper thesis, variables, and quality signal here.'}
                    </p>
                  </div>
                  <div className={`rounded-2xl border ${theme.panelMutedBorder} ${theme.panelMutedBg} px-4 py-3`}>
                    <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Updated</div>
                    <div className="mt-1.5 text-sm font-semibold text-white">{formatDateTime(selectedStudy.updatedAt)}</div>
                    <div className="mt-1 text-xs text-slate-500">{selectedStudy.replication.status || 'Unknown'} replication status</div>
                  </div>
                </div>
              </section>

              <SectionCard
                title="Paper metadata"
                icon={BookOpen}
                subtitle="Front matter, classification, and identifiers. This is the anchor layer for search and graphing."
              >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <DetailField label="Title" value={selectedStudy.meta.title} onChange={(value) => updateField('meta.title', value)} />
                  <DetailField label="Subtitle" value={selectedStudy.meta.subtitle} onChange={(value) => updateField('meta.subtitle', value)} />
                  <DetailField label="Year" type="number" value={numberOrBlank(selectedStudy.meta.year)} onChange={(value) => updateField('meta.year', parseNumber(value) ?? '')} />
                  <DetailField label="Journal" value={selectedStudy.meta.journal} onChange={(value) => updateField('meta.journal', value)} />
                  <DetailField label="DOI" value={selectedStudy.meta.doi} onChange={(value) => updateField('meta.doi', value)} />
                  <DetailField label="URL" value={selectedStudy.meta.url} onChange={(value) => updateField('meta.url', value)} />
                  <DetailField label="Field" value={selectedStudy.meta.field} onChange={(value) => updateField('meta.field', value)} />
                  <DetailField label="Subfield" value={selectedStudy.meta.subfield} onChange={(value) => updateField('meta.subfield', value)} />
                  <DetailField label="Research type" value={selectedStudy.meta.researchType} onChange={(value) => updateField('meta.researchType', value)} />
                  <TextAreaField
                    label="Authors"
                    value={selectedStudy.meta.authors.map((author) => author.name).join(', ')}
                    onChange={(value) =>
                      updateStudy(selectedStudy.id, (draft) => {
                        draft.meta.authors = splitList(value).map((name) => ({ name, affiliation: '' }));
                        return draft;
                      })
                    }
                    placeholder="Kahneman, Tversky"
                    rows={2}
                  />
                  <TextAreaField
                    label="Keywords"
                    value={listToText(selectedStudy.meta.keywords)}
                    onChange={(value) => updateField('meta.keywords', value, { asList: true })}
                    placeholder="loss aversion, framing effect, risk"
                    rows={2}
                  />
                  <DetailField
                    label="Study design type"
                    value={selectedStudy.meta.studyDesignType}
                    onChange={(value) => updateField('meta.studyDesignType', value)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Abstract and thesis extraction"
                icon={FileSearch2}
                subtitle="This is where the paper stops being a citation and becomes an intelligible claim."
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  <TextAreaField
                    label="Abstract (raw)"
                    value={selectedStudy.abstractThesis.abstractRaw}
                    onChange={(value) => updateField('abstractThesis.abstractRaw', value)}
                    rows={5}
                  />
                  <TextAreaField
                    label="Abstract (rewritten)"
                    value={selectedStudy.abstractThesis.abstractRewritten}
                    onChange={(value) => updateField('abstractThesis.abstractRewritten', value)}
                    rows={5}
                  />
                  <TextAreaField
                    label="Core hypothesis"
                    value={selectedStudy.abstractThesis.coreHypothesis}
                    onChange={(value) => updateField('abstractThesis.coreHypothesis', value)}
                    rows={3}
                  />
                  <TextAreaField
                    label="Research questions"
                    value={listToText(selectedStudy.abstractThesis.researchQuestions)}
                    onChange={(value) => updateField('abstractThesis.researchQuestions', value, { asList: true })}
                    rows={3}
                  />
                  <TextAreaField
                    label="Theoretical framework"
                    value={selectedStudy.abstractThesis.theoreticalFramework}
                    onChange={(value) => updateField('abstractThesis.theoreticalFramework', value)}
                    rows={3}
                  />
                  <div className="grid gap-3">
                    <TextAreaField
                      label="Null hypothesis"
                      value={selectedStudy.abstractThesis.nullHypothesis}
                      onChange={(value) => updateField('abstractThesis.nullHypothesis', value)}
                      rows={2}
                    />
                    <TextAreaField
                      label="Alternative hypothesis"
                      value={selectedStudy.abstractThesis.alternativeHypothesis}
                      onChange={(value) => updateField('abstractThesis.alternativeHypothesis', value)}
                      rows={2}
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Experimental design and sample"
                icon={Scale}
                subtitle="Variables, procedure, and population determine whether a result is useful or just interesting."
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  <TextAreaField label="Independent variables" value={listToText(selectedStudy.variables.independent)} onChange={(value) => updateField('variables.independent', value, { asList: true })} rows={2} />
                  <TextAreaField label="Dependent variables" value={listToText(selectedStudy.variables.dependent)} onChange={(value) => updateField('variables.dependent', value, { asList: true })} rows={2} />
                  <TextAreaField label="Control variables" value={listToText(selectedStudy.variables.controls)} onChange={(value) => updateField('variables.controls', value, { asList: true })} rows={2} />
                  <TextAreaField label="Confounds" value={listToText(selectedStudy.variables.confounds)} onChange={(value) => updateField('variables.confounds', value, { asList: true })} rows={2} />
                  <TextAreaField label="Moderators" value={listToText(selectedStudy.variables.moderators)} onChange={(value) => updateField('variables.moderators', value, { asList: true })} rows={2} />
                  <TextAreaField label="Mediators" value={listToText(selectedStudy.variables.mediators)} onChange={(value) => updateField('variables.mediators', value, { asList: true })} rows={2} />
                  <DetailField label="Design type" value={selectedStudy.design.designType} onChange={(value) => updateField('design.designType', value)} />
                  <DetailField label="Randomization" value={selectedStudy.design.randomizationMethod} onChange={(value) => updateField('design.randomizationMethod', value)} />
                  <DetailField label="Blinding" value={selectedStudy.design.blinding} onChange={(value) => updateField('design.blinding', value)} />
                  <DetailField label="Control group" value={selectedStudy.design.controlGroupType} onChange={(value) => updateField('design.controlGroupType', value)} />
                  <TextAreaField label="Procedure" value={selectedStudy.design.procedure} onChange={(value) => updateField('design.procedure', value)} rows={4} />
                  <TextAreaField label="Stimuli and instruments" value={`${listToText(selectedStudy.design.stimuli)}\n${listToText(selectedStudy.design.instruments)}`} onChange={(value) => {
                    const [stimuliLine = '', instrumentsLine = ''] = String(value).split('\n');
                    updateStudy(selectedStudy.id, (draft) => {
                      draft.design.stimuli = splitList(stimuliLine);
                      draft.design.instruments = splitList(instrumentsLine);
                      return draft;
                    });
                  }} rows={4} />
                  <DetailField label="Sample size (N)" type="number" value={numberOrBlank(selectedStudy.sample.size)} onChange={(value) => updateField('sample.size', value, { asNumber: true })} />
                  <DetailField label="Population type" value={selectedStudy.sample.populationType} onChange={(value) => updateField('sample.populationType', value)} />
                  <DetailField label="Sampling method" value={selectedStudy.sample.samplingMethod} onChange={(value) => updateField('sample.samplingMethod', value)} />
                  <DetailField label="Geography" value={selectedStudy.sample.geography} onChange={(value) => updateField('sample.geography', value)} />
                  <DetailField label="Age range" value={selectedStudy.sample.ageRange} onChange={(value) => updateField('sample.ageRange', value)} />
                  <DetailField label="Gender breakdown" value={selectedStudy.sample.genderBreakdown} onChange={(value) => updateField('sample.genderBreakdown', value)} />
                </div>
              </SectionCard>

              <SectionCard
                title="Measurement, results, and discussion"
                icon={Sigma}
                subtitle="Operational definitions, statistical evidence, interpretation, and limits."
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  <TextAreaField label="Scales" value={listToText(selectedStudy.measurement.scales)} onChange={(value) => updateField('measurement.scales', value, { asList: true })} rows={2} />
                  <TextAreaField label="Operational definitions" value={listToText(selectedStudy.measurement.operationalDefinitions)} onChange={(value) => updateField('measurement.operationalDefinitions', value, { asList: true })} rows={3} />
                  <TextAreaField label="Statistical tests" value={listToText(selectedStudy.measurement.statisticalTests)} onChange={(value) => updateField('measurement.statisticalTests', value, { asList: true })} rows={2} />
                  <TextAreaField label="Effect sizes" value={listToText(selectedStudy.measurement.effectSizes)} onChange={(value) => updateField('measurement.effectSizes', value, { asList: true })} rows={2} />
                  <TextAreaField label="Key findings" value={listToText(selectedStudy.results.findings)} onChange={(value) => updateField('results.findings', value, { asList: true })} rows={3} />
                  <TextAreaField label="Statistical outcomes" value={listToText(selectedStudy.results.statisticalOutcomes)} onChange={(value) => updateField('results.statisticalOutcomes', value, { asList: true })} rows={3} />
                  <TextAreaField label="Unexpected findings" value={listToText(selectedStudy.results.unexpectedFindings)} onChange={(value) => updateField('results.unexpectedFindings', value, { asList: true })} rows={2} />
                  <DetailField label="Hypothesis outcome" value={selectedStudy.results.hypothesisOutcome} onChange={(value) => updateField('results.hypothesisOutcome', value)} />
                  <TextAreaField label="Interpretation" value={selectedStudy.discussion.interpretation} onChange={(value) => updateField('discussion.interpretation', value)} rows={4} />
                  <TextAreaField label="Limitations" value={listToText(selectedStudy.discussion.limitations)} onChange={(value) => updateField('discussion.limitations', value, { asList: true })} rows={3} />
                </div>
              </SectionCard>

              <SectionCard
                title="Validity, replication, and cognitive overlay"
                icon={Network}
                subtitle="This is the layer that turns papers into ranked signals instead of passive references."
              >
                <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
                  <div className="grid gap-3">
                    <SliderField label="Internal validity" value={selectedStudy.quality.internalValidity} onChange={(value) => updateField('quality.internalValidity', value)} />
                    <SliderField label="External validity" value={selectedStudy.quality.externalValidity} onChange={(value) => updateField('quality.externalValidity', value)} />
                    <SliderField label="Construct validity" value={selectedStudy.quality.constructValidity} onChange={(value) => updateField('quality.constructValidity', value)} />
                    <SliderField label="Statistical validity" value={selectedStudy.quality.statisticalValidity} onChange={(value) => updateField('quality.statisticalValidity', value)} />
                  </div>
                  <div className="grid gap-3">
                    <TextAreaField label="Bias tags" value={listToText(selectedStudy.cognitiveOverlay.biasTags)} onChange={(value) => updateField('cognitiveOverlay.biasTags', value, { asList: true })} rows={2} />
                    <DetailField label="Susceptibility score (0-1)" value={numberOrBlank(selectedStudy.cognitiveOverlay.susceptibilityScore)} onChange={(value) => updateField('cognitiveOverlay.susceptibilityScore', value, { asNumber: true })} />
                    <DetailField label="Bias category" value={selectedStudy.cognitiveOverlay.biasCategory} onChange={(value) => updateField('cognitiveOverlay.biasCategory', value)} />
                    <DetailField label="Psychological trigger" value={selectedStudy.cognitiveOverlay.psychologicalTrigger} onChange={(value) => updateField('cognitiveOverlay.psychologicalTrigger', value)} />
                    <DetailField label="Replication status" value={selectedStudy.replication.status} onChange={(value) => updateField('replication.status', value)} />
                    <TextAreaField label="Domain relevance" value={listToText(selectedStudy.insight.domainRelevance)} onChange={(value) => updateField('insight.domainRelevance', value, { asList: true })} rows={2} />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}
        </main>

        <aside className="min-h-0 overflow-y-auto pr-1">
          <div className="space-y-3.5">
            <SectionCard
              title="PDF ingestion"
              icon={Upload}
              subtitle="Link an existing encrypted Library item into this study and ingest what metadata ROS already knows."
            >
              <label className="grid gap-1.5 text-xs text-slate-400">
                <span className="uppercase tracking-[0.18em]">Library item</span>
                <select
                  value={ingestLibraryId}
                  onChange={(event) => setIngestLibraryId(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none"
                  onPointerDown={stopWindowDrag}
                >
                  {libraryEntries.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={ingestLibraryEntry}
                className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition ${theme.primaryButtonSoft}`}
              >
                <Upload size={15} />
                Ingest linked PDF metadata
              </button>
              {linkedLibrary.length ? (
                <div className="mt-3 space-y-2">
                  {linkedLibrary.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setWorkspaceNavigation({ appKey: 'library', itemId: entry.id })}
                      className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${theme.linkCard}`}
                    >
                      <div className="text-sm font-semibold text-white">{entry.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{entry.format?.toUpperCase()} · {entry.authors.join(', ') || 'Unknown author'}</div>
                    </button>
                  ))}
                </div>
              ) : null}
            </SectionCard>

            <SectionCard
              title="Research query"
              icon={Search}
              subtitle="Query by bias, design, or scale. Example: show all studies with loss aversion + N > 500"
            >
              <TextAreaField label="Query" value={query} onChange={setQuery} rows={3} />
              <div className="mt-3 space-y-2">
                {queryResults.slice(0, 6).map((study) => (
                  <button
                    key={study.id}
                    type="button"
                    onClick={() => jumpToStudy(study.id)}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-left transition ${theme.card}`}
                  >
                    <div className="text-sm font-semibold text-white">{study.meta.title}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {[study.meta.field, study.sample.size ? `N=${study.sample.size}` : '', study.cognitiveOverlay.biasTags[0] || '']
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </button>
                ))}
                {!queryResults.length ? <div className="text-xs text-slate-500">No studies match the current query.</div> : null}
              </div>
            </SectionCard>

            <SectionCard
              title="Compare two studies"
              icon={ArrowLeftRight}
              subtitle="Population and design diff view for quick side-by-side reasoning."
            >
              <div className="grid gap-2.5">
                <label className="grid gap-1.5 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.18em]">Primary</span>
                  <select
                    value={selectedStudyId ?? ''}
                    onChange={(event) => setSelectedStudyId(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none"
                    onPointerDown={stopWindowDrag}
                  >
                    {studies.map((study) => (
                      <option key={study.id} value={study.id}>
                        {study.meta.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1.5 text-xs text-slate-400">
                  <span className="uppercase tracking-[0.18em]">Compare against</span>
                  <select
                    value={compareStudyId ?? ''}
                    onChange={(event) => setCompareStudyId(event.target.value)}
                    className="rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm text-white outline-none"
                    onPointerDown={stopWindowDrag}
                  >
                    {studies.map((study) => (
                      <option key={study.id} value={study.id}>
                        {study.meta.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 space-y-2">
                {diffRows.map(([label, left, right]) => (
                  <div key={label} className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</div>
                    <div className="mt-1 grid gap-2 text-sm text-slate-200">
                      <div>{left}</div>
                      <div className="text-slate-500">{right}</div>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="Citation graph"
              icon={Network}
              subtitle="A first-pass internal graph view from explicit related-study links and theory connections."
            >
              <div className="overflow-hidden rounded-[22px] border border-white/8 bg-black/20 p-2">
                <svg viewBox="0 0 320 240" className="h-[240px] w-full">
                  <circle cx="160" cy="120" r="42" fill="rgba(251,191,36,0.18)" stroke="rgba(251,191,36,0.55)" />
                  <text x="160" y="116" textAnchor="middle" className="fill-white text-[10px] font-semibold">
                    {selectedStudy?.meta.title?.slice(0, 18) || 'Study'}
                  </text>
                  <text x="160" y="132" textAnchor="middle" className="fill-slate-400 text-[9px]">
                    center node
                  </text>
                  {citationGraph.map((study, index) => {
                    const angle = (Math.PI * 2 * index) / Math.max(citationGraph.length, 1);
                    const x = 160 + Math.cos(angle) * 92;
                    const y = 120 + Math.sin(angle) * 78;
                    return (
                      <g key={study.id}>
                        <line x1="160" y1="120" x2={x} y2={y} stroke="rgba(148,163,184,0.35)" />
                        <circle cx={x} cy={y} r="26" fill="rgba(15,23,42,0.85)" stroke="rgba(148,163,184,0.35)" />
                        <text x={x} y={y - 2} textAnchor="middle" className="fill-white text-[8px] font-semibold">
                          {study.meta.title.slice(0, 14)}
                        </text>
                        <text x={x} y={y + 10} textAnchor="middle" className="fill-slate-500 text-[7px]">
                          {study.meta.year || 'n.d.'}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
              {!citationGraph.length ? <div className="mt-2 text-xs text-slate-500">Add related study links to populate the graph.</div> : null}
            </SectionCard>

            <SectionCard
              title="Replication and meta-analysis rollups"
              icon={Sigma}
              subtitle="Global beta-level signals: scale, quality, replication mix, and rough effect trends."
            >
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Avg validity</div>
                  <div className="mt-1.5 text-lg font-semibold text-white">{rollups.averageValidity}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Avg effect size</div>
                  <div className="mt-1.5 text-lg font-semibold text-white">{rollups.averageEffectSize}</div>
                </div>
              </div>
              <div className="mt-3 rounded-2xl border border-white/8 bg-black/20 px-3 py-3">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Top bias tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {rollups.topBiases.map(([tag, count]) => (
                    <span key={tag} className={`rounded-full border px-2.5 py-1 text-[11px] ${theme.tag}`}>
                      {tag} · {count}
                    </span>
                  ))}
                  {!rollups.topBiases.length ? <span className="text-xs text-slate-500">No bias tags scored yet.</span> : null}
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {rollups.replicationCounts.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5 text-sm">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-semibold text-white">{count}</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className={`rounded-[24px] border ${theme.panelBorder} ${theme.panelBg} px-4 py-3`}>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Status</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">{status}</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ResearchVaultApp;
