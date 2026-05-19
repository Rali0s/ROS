const DB_NAME = 'ros-black-falcon-cache';
const DB_VERSION = 1;
const FINDING_STORE = 'vulnerability-findings';
const META_STORE = 'connector-meta';
const SUMMARY_ID = 'black-falcon-summary';
const DAY_MS = 24 * 60 * 60 * 1000;

let databasePromise = null;

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const asText = (value, fallback = '') =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toIsoDate = (value) => {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toISOString().slice(0, 10) : '';
};

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

export const sha256Hex = async (value) => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 hashing is unavailable in this runtime.');
  }

  const bytes = new TextEncoder().encode(String(value || ''));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);

  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const severityScore = (severity = '') => {
  switch (String(severity).toLowerCase()) {
    case 'critical':
      return 18;
    case 'high':
      return 13;
    case 'medium':
      return 8;
    case 'low':
      return 3;
    default:
      return 0;
  }
};

const dueDateScore = (dueDate) => {
  const parsed = parseDateValue(dueDate);

  if (!parsed) {
    return { score: 0, label: '' };
  }

  const daysUntil = Math.ceil((parsed.getTime() - Date.now()) / DAY_MS);

  if (daysUntil < 0) {
    return { score: 20, label: `due date overdue by ${Math.abs(daysUntil)} days` };
  }

  if (daysUntil <= 7) {
    return { score: 18, label: `due within ${daysUntil} days` };
  }

  if (daysUntil <= 14) {
    return { score: 14, label: `due within ${daysUntil} days` };
  }

  if (daysUntil <= 30) {
    return { score: 10, label: `due within ${daysUntil} days` };
  }

  return { score: 5, label: 'due date tracked' };
};

const assetCountScore = (value) => {
  const count = toNumber(value, 0);

  if (count >= 1000) {
    return 12;
  }

  if (count >= 500) {
    return 10;
  }

  if (count >= 100) {
    return 8;
  }

  if (count >= 20) {
    return 5;
  }

  if (count > 0) {
    return 2;
  }

  return 0;
};

const criticalityScore = (value = '') => {
  switch (String(value).toLowerCase()) {
    case 'critical':
      return 8;
    case 'high':
      return 6;
    case 'medium':
      return 3;
    default:
      return 0;
  }
};

export const deriveCisaScore = (finding = {}) => {
  if (finding.forceNonRanked) {
    return {
      cisaRanked: false,
      cisaScore: null,
      cisaScoreRationale: ['Non-ranked CISA reference retained for manual triage.'],
    };
  }

  const cisaKev = finding.cisaKev !== false && Boolean(finding.cveId || finding.cveID);
  const ransomwareUse = asText(finding.knownRansomwareCampaignUse, 'Unknown');
  const falcon = finding.falcon || {};
  const cvss = toNumber(finding.cvss || falcon.cvss || falcon.baseScore || finding.cve?.base_score, 0);
  const due = dueDateScore(finding.dueDate);
  const affectedAssets = toNumber(finding.affectedAssetCount || falcon.affectedAssetCount || falcon.assetCount, 0);
  const severity = asText(finding.severity || falcon.severity, '');
  const internetExposure = Boolean(finding.internetExposure ?? falcon.internetExposure);
  const assetCriticality = asText(finding.assetCriticality || falcon.assetCriticality, '');
  const hasScoreInputs = cisaKev || due.score || cvss || affectedAssets || severity || internetExposure || assetCriticality;

  if (!hasScoreInputs) {
    return {
      cisaRanked: false,
      cisaScore: null,
      cisaScoreRationale: ['No score inputs available.'],
    };
  }

  const rationale = [];
  let score = 0;

  if (cisaKev) {
    score += 32;
    rationale.push('CISA KEV style reference present');
  }

  if (due.score) {
    score += due.score;
    rationale.push(due.label);
  }

  if (ransomwareUse.toLowerCase() === 'known') {
    score += 16;
    rationale.push('known ransomware campaign use');
  } else if (ransomwareUse.toLowerCase() === 'unknown') {
    score += 4;
    rationale.push('ransomware use unknown');
  }

  if (cvss) {
    const cvssScore = Math.min(18, Math.round(cvss * 1.8));
    score += cvssScore;
    rationale.push(`CVSS/Falcon base score ${cvss.toFixed(1)}`);
  } else if (severity) {
    score += severityScore(severity);
    rationale.push(`Falcon severity ${severity}`);
  }

  const assetScore = assetCountScore(affectedAssets);
  if (assetScore) {
    score += assetScore;
    rationale.push(`${affectedAssets} affected assets`);
  }

  if (internetExposure) {
    score += 10;
    rationale.push('internet exposed asset set');
  }

  const criticality = criticalityScore(assetCriticality);
  if (criticality) {
    score += criticality;
    rationale.push(`${assetCriticality} asset criticality`);
  }

  return {
    cisaRanked: true,
    cisaScore: Math.max(0, Math.min(100, Math.round(score))),
    cisaScoreRationale: rationale,
  };
};

export const normalizeFalconFinding = async (raw = {}, options = {}) => {
  const cveId = asText(raw.cveId || raw.cveID || raw.cve?.id, `CVE-DEMO-${String(options.index || 0).padStart(4, '0')}`);
  const cwes = ensureArray(raw.cwes || raw.cwe || raw.cve?.cwes).map((entry) => String(entry).trim()).filter(Boolean);
  const affectedAssetCount = toNumber(raw.affectedAssetCount || raw.falcon?.affectedAssetCount || raw.hostCount, 0);
  const updatedAt = raw.updatedAt || raw.falcon?.updatedAt || new Date().toISOString();
  const scoreInput = {
    ...raw,
    cveId,
    cisaKev: raw.cisaKev !== false,
    affectedAssetCount,
    forceNonRanked: Boolean(raw.forceNonRanked),
  };
  const score = deriveCisaScore(scoreInput);
  const identityPayload = {
    cveId,
    vendorProject: raw.vendorProject,
    product: raw.product,
    vulnerabilityName: raw.vulnerabilityName || raw.title,
    dueDate: raw.dueDate,
    source: raw.source || 'black-falcon',
  };
  const hash = asText(raw.hash, '') || await sha256Hex(stableStringify(identityPayload));

  return {
    id: asText(raw.id, `bf-${hash.slice(0, 16)}`),
    hexId: asText(raw.hexId, `0x${hash.slice(0, 12).toUpperCase()}`),
    hash,
    source: asText(raw.source, 'Synthetic CISA / Falcon Spotlight'),
    sourceMode: raw.sourceMode || (raw.synthetic ? 'synthetic-demo' : 'mock-first'),
    connector: 'Black Falcon',
    cveId,
    vendorProject: asText(raw.vendorProject, 'Unknown vendor'),
    product: asText(raw.product, 'Unknown product'),
    vulnerabilityName: asText(raw.vulnerabilityName || raw.title, `${cveId} vulnerability`),
    shortDescription: asText(raw.shortDescription || raw.description, 'Synthetic Black Falcon vulnerability card for local planning.'),
    requiredAction: asText(raw.requiredAction, 'Apply vendor mitigation, validate exposure, and record remediation evidence.'),
    dateAdded: toIsoDate(raw.dateAdded) || new Date().toISOString().slice(0, 10),
    dueDate: toIsoDate(raw.dueDate),
    knownRansomwareCampaignUse: asText(raw.knownRansomwareCampaignUse, 'Unknown'),
    notes: asText(raw.notes, ''),
    cwes,
    cisaKev: raw.cisaKev !== false,
    cisaRanked: score.cisaRanked,
    cisaScore: score.cisaScore,
    cisaScoreRationale: score.cisaScoreRationale,
    severity: asText(raw.severity || raw.falcon?.severity, ''),
    cvss: toNumber(raw.cvss || raw.falcon?.cvss || raw.falcon?.baseScore, 0),
    affectedAssetCount,
    internetExposure: Boolean(raw.internetExposure ?? raw.falcon?.internetExposure),
    assetCriticality: asText(raw.assetCriticality || raw.falcon?.assetCriticality, ''),
    cloudSource: asText(raw.cloudSource, 'Mock CrowdStrike Falcon Spotlight'),
    status: asText(raw.status, 'open'),
    remediationState: asText(raw.remediationState, 'template-ready'),
    remediationPlan: asText(raw.remediationPlan, ''),
    raw: raw.raw || {},
    synthetic: Boolean(raw.synthetic),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt,
  };
};

export const sortFalconFindings = (findings = []) =>
  [...findings].sort((left, right) => {
    if (Boolean(right.cisaRanked) !== Boolean(left.cisaRanked)) {
      return Number(Boolean(right.cisaRanked)) - Number(Boolean(left.cisaRanked));
    }

    const rightScore = Number.isFinite(right.cisaScore) ? right.cisaScore : -1;
    const leftScore = Number.isFinite(left.cisaScore) ? left.cisaScore : -1;

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const leftDue = parseDateValue(left.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;
    const rightDue = parseDateValue(right.dueDate)?.getTime() || Number.MAX_SAFE_INTEGER;

    if (leftDue !== rightDue) {
      return leftDue - rightDue;
    }

    const ransomwareDelta =
      Number(String(right.knownRansomwareCampaignUse).toLowerCase() === 'known') -
      Number(String(left.knownRansomwareCampaignUse).toLowerCase() === 'known');

    if (ransomwareDelta) {
      return ransomwareDelta;
    }

    return new Date(right.updatedAt || 0) - new Date(left.updatedAt || 0);
  });

const demoCards = [
  ['CVE-2026-20182', 'Cisco', 'Catalyst SD-WAN', 'Controller authentication bypass exposure', '2026-05-14', '2026-05-17', 'Unknown', ['CWE-287'], 9.8, 312, true, 'critical'],
  ['CVE-2026-42897', 'Microsoft', 'Exchange Server', 'Outlook web access script injection exposure', '2026-05-15', '2026-05-29', 'Unknown', ['CWE-79'], 8.2, 88, true, 'high'],
  ['CVE-2026-42208', 'BerriAI', 'LiteLLM', 'Proxy SQL injection credential exposure', '2026-05-08', '2026-05-11', 'Unknown', ['CWE-89'], 9.1, 42, true, 'critical'],
  ['CVE-2024-3400', 'Palo Alto Networks', 'PAN-OS', 'Gateway command injection exposure', '2024-04-12', '2024-04-19', 'Known', ['CWE-77'], 10, 1280, true, 'critical'],
  ['CVE-2023-34362', 'Progress', 'MOVEit Transfer', 'Managed transfer SQL injection exposure', '2023-06-02', '2023-06-23', 'Known', ['CWE-89'], 9.8, 240, true, 'critical'],
  ['CVE-2023-22515', 'Atlassian', 'Confluence Data Center and Server', 'Administrative access control exposure', '2023-10-04', '2023-10-10', 'Known', ['CWE-862'], 10, 96, true, 'critical'],
  ['CVE-2024-1709', 'ConnectWise', 'ScreenConnect', 'Authentication bypass exposure', '2024-02-22', '2024-03-01', 'Known', ['CWE-288'], 10, 54, true, 'critical'],
  ['CVE-2024-27198', 'JetBrains', 'TeamCity', 'Authentication bypass exposure', '2024-03-04', '2024-03-18', 'Unknown', ['CWE-288'], 9.8, 21, false, 'critical'],
  ['CVE-2024-23897', 'Jenkins', 'Jenkins CLI', 'Arbitrary file read exposure', '2024-01-24', '2024-02-09', 'Unknown', ['CWE-22'], 8.8, 64, false, 'high'],
  ['CVE-2024-21887', 'Ivanti', 'Connect Secure', 'Command injection gateway exposure', '2024-01-10', '2024-01-31', 'Known', ['CWE-77'], 9.1, 470, true, 'critical'],
  ['CVE-2023-38831', 'RARLAB', 'WinRAR', 'Archive handling code execution exposure', '2023-08-24', '2023-09-14', 'Known', ['CWE-20'], 7.8, 880, false, 'high'],
  ['CVE-2021-44228', 'Apache', 'Log4j', 'JNDI lookup remote code execution exposure', '2021-12-10', '2021-12-24', 'Known', ['CWE-502'], 10, 1420, true, 'critical'],
  ['CVE-2025-90001', 'Synthetic Vendor', 'Edge Broker', 'Non-ranked CISA-style inventory reference', '2025-09-01', '', 'Unknown', ['CWE-200'], 0, 17, false, 'medium', true],
  ['CVE-2025-90002', 'Synthetic Project', 'Identity Bridge', 'Non-ranked CISA-style advisory reference', '2025-09-04', '', 'Unknown', ['CWE-287'], 0, 9, false, 'medium', true],
  ['CVE-2025-90003', 'Synthetic Vendor', 'Patch Relay', 'Non-ranked CISA-style remediation watch item', '2025-09-07', '', 'Unknown', ['CWE-352'], 0, 4, false, 'low', true],
];

export const createDemoFalconFindings = async (limit = 15) => {
  const selected = demoCards.slice(0, limit);

  return Promise.all(
    selected.map((entry, index) => {
      const [
        cveId,
        vendorProject,
        product,
        vulnerabilityName,
        dateAdded,
        dueDate,
        knownRansomwareCampaignUse,
        cwes,
        cvss,
        affectedAssetCount,
        internetExposure,
        assetCriticality,
        forceNonRanked,
      ] = entry;

      return normalizeFalconFinding({
        cveId,
        vendorProject,
        product,
        vulnerabilityName,
        dateAdded,
        dueDate,
        knownRansomwareCampaignUse,
        cwes,
        cvss,
        affectedAssetCount,
        internetExposure,
        assetCriticality,
        severity: cvss >= 9 ? 'critical' : cvss >= 7 ? 'high' : 'medium',
        synthetic: true,
        forceNonRanked,
        shortDescription:
          'Synthetic Black Falcon demo exposure based on public CISA KEV-style vulnerability fields. No tenant asset or host data is represented.',
        requiredAction:
          'Validate asset exposure, apply vendor mitigation, collect evidence, and route the finding into a manual remediation plan.',
        notes: 'Demo card. Public-style vulnerability metadata only; no live Falcon tenant data.',
        sourceMode: 'synthetic-demo',
      }, { index });
    }),
  ).then(sortFalconFindings);
};

const assertNotAborted = (signal) => {
  if (signal?.aborted) {
    throw new DOMException('Black Falcon sync canceled.', 'AbortError');
  }
};

export const createMockFalconAdapter = (records = []) => ({
  pullVulnerabilities: async ({ limit = 5000, after = '', signal } = {}) => {
    assertNotAborted(signal);
    const start = Math.max(0, Number(after || 0));
    const end = Math.min(records.length, start + limit);
    return {
      resources: records.slice(start, end),
      meta: {
        after: end < records.length ? String(end) : '',
        total: records.length,
      },
    };
  },
  getVulnerabilities: async ({ ids = [], signal } = {}) => {
    assertNotAborted(signal);
    const idSet = new Set(ensureArray(ids));
    return {
      resources: records.filter((record) => idSet.has(record.id)),
    };
  },
  getRemediations: async ({ ids = [], signal } = {}) => {
    assertNotAborted(signal);
    return {
      resources: ensureArray(ids).map((id) => ({
        id,
        action: 'Validate exposure, apply vendor guidance, document evidence, and close after verification.',
      })),
    };
  },
});

export const FALCONPY_SPOTLIGHT_CONTRACT = {
  serviceClass: 'SpotlightVulnerabilities',
  requiredScope: 'spotlight-vulnerabilities:read',
  operations: {
    pullVulnerabilities: 'combinedQueryVulnerabilities',
    getVulnerabilities: 'getVulnerabilities',
    getRemediations: 'getRemediationsV2',
  },
  mode: 'mock-first-live-ready',
};

export const buildRemediationPlanTemplate = (finding = {}) => `# Remediation Plan - ${finding.cveId || finding.hexId || 'Black Falcon Finding'}

## Finding
- Vulnerability: ${finding.vulnerabilityName || 'Unknown'}
- Product: ${finding.vendorProject || 'Unknown'} / ${finding.product || 'Unknown'}
- CISA Score: ${Number.isFinite(finding.cisaScore) ? finding.cisaScore : 'Non-ranked'}
- HEX ID: ${finding.hexId || 'pending'}
- Hash: ${finding.hash || 'pending'}
- Affected assets: ${finding.affectedAssetCount || 0}

## Risk Rationale
${ensureArray(finding.cisaScoreRationale).map((item) => `- ${item}`).join('\n') || '- Manual risk rationale required.'}

## Required Action
${finding.requiredAction || 'Apply vendor mitigation or discontinue use if mitigation is unavailable.'}

## Manual Remediation Plan
- Owner:
- Business system:
- Exposure validation:
- Patch or mitigation action:
- Rollback plan:
- Evidence to collect:
- Validation command or control:
- Sign-off:

## DNS Fillout Instructions
Use only the finding facts above. Produce a defensive remediation plan, leave uncertain fields marked for a human owner, and do not invent tenant-specific hosts, IP addresses, credentials, or private notes.
`;

const hasIndexedDb = () => typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const openDatabase = () => {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB is unavailable for the Black Falcon local cache.'));
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(FINDING_STORE)) {
        const store = database.createObjectStore(FINDING_STORE, { keyPath: 'id' });
        store.createIndex('hash', 'hash', { unique: true });
        store.createIndex('cveId', 'cveId', { unique: false });
        store.createIndex('cisaRanked', 'cisaRanked', { unique: false });
      }

      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Unable to open Black Falcon cache.'));
  });

  return databasePromise;
};

export const putBlackFalconFindings = async (findings = []) => {
  const database = await openDatabase();
  const safeFindings = ensureArray(findings);

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([FINDING_STORE, META_STORE], 'readwrite');
    const store = transaction.objectStore(FINDING_STORE);
    const metaStore = transaction.objectStore(META_STORE);

    safeFindings.forEach((finding) => {
      store.put(finding);
    });

    metaStore.put({
      id: SUMMARY_ID,
      lastUpdatedAt: new Date().toISOString(),
      lastMode: safeFindings.some((finding) => finding.synthetic) ? 'synthetic-demo' : 'mock-first',
      cachedCountHint: safeFindings.length,
    });

    transaction.oncomplete = async () => {
      try {
        const total = await countBlackFalconFindings();
        resolve({ saved: safeFindings.length, total });
      } catch (error) {
        reject(error);
      }
    };
    transaction.onerror = () => reject(transaction.error || new Error('Unable to write Black Falcon findings.'));
    transaction.onabort = () => reject(transaction.error || new Error('Black Falcon write transaction aborted.'));
  });
};

export const clearBlackFalconFindings = async () => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([FINDING_STORE, META_STORE], 'readwrite');
    transaction.objectStore(FINDING_STORE).clear();
    transaction.objectStore(META_STORE).put({
      id: SUMMARY_ID,
      lastUpdatedAt: new Date().toISOString(),
      lastMode: 'cleared',
      cachedCountHint: 0,
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('Unable to clear Black Falcon findings.'));
    transaction.onabort = () => reject(transaction.error || new Error('Black Falcon clear transaction aborted.'));
  });
};

export const countBlackFalconFindings = async () => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FINDING_STORE, 'readonly');
    const request = transaction.objectStore(FINDING_STORE).count();
    request.onsuccess = () => resolve(request.result || 0);
    request.onerror = () => reject(request.error || new Error('Unable to count Black Falcon findings.'));
  });
};

export const loadBlackFalconFindings = async ({ limit = 250 } = {}) => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(FINDING_STORE, 'readonly');
    const request = transaction.objectStore(FINDING_STORE).getAll(null, limit);
    request.onsuccess = () => resolve(sortFalconFindings(request.result || []));
    request.onerror = () => reject(request.error || new Error('Unable to read Black Falcon findings.'));
  });
};

export const readBlackFalconSummary = async () => {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(META_STORE, 'readonly');
    const request = transaction.objectStore(META_STORE).get(SUMMARY_ID);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error || new Error('Unable to read Black Falcon summary.'));
  });
};

export const createInMemoryFalconStore = () => {
  const records = new Map();

  return {
    putBatch: async (batch = []) => {
      let added = 0;
      let updated = 0;

      ensureArray(batch).forEach((record) => {
        const key = record.hash || record.id;
        if (!key) {
          return;
        }

        if (records.has(key)) {
          updated += 1;
        } else {
          added += 1;
        }

        records.set(key, record);
      });

      return { added, updated, total: records.size };
    },
    count: async () => records.size,
    list: async () => sortFalconFindings([...records.values()]),
  };
};

export const ingestFalconFindings = async ({
  total = 100000,
  batchSize = 1000,
  fetchBatch,
  store,
  signal,
  onProgress,
} = {}) => {
  if (typeof fetchBatch !== 'function') {
    throw new Error('Black Falcon ingestion requires a fetchBatch function.');
  }

  if (!store || typeof store.putBatch !== 'function') {
    throw new Error('Black Falcon ingestion requires a store with putBatch.');
  }

  let after = '';
  let pulled = 0;
  let batches = 0;
  let added = 0;
  let updated = 0;

  while (pulled < total) {
    assertNotAborted(signal);
    const remaining = total - pulled;
    const limit = Math.min(batchSize, remaining);
    const response = await fetchBatch({ limit, after, offset: pulled, signal });
    const resources = ensureArray(response?.resources);

    if (!resources.length) {
      break;
    }

    const result = await store.putBatch(resources);
    pulled += resources.length;
    batches += 1;
    added += result.added || resources.length;
    updated += result.updated || 0;
    after = response?.meta?.after || '';

    onProgress?.({
      pulled,
      total,
      batches,
      added,
      updated,
      after,
    });

    if (!after && resources.length < limit) {
      break;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  return {
    pulled,
    total,
    batches,
    added,
    updated,
    canceled: false,
  };
};
