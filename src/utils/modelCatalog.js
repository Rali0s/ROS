export const DEFAULT_MODEL_ID = 'security-model-v1';
export const CITIZEN_AI_MODEL_ID = 'citizen-ai';
export const HUGGINGFACE_MODEL_ID = 'huggingface-llm';

const DEEPNIMSEC_SYSTEM_PROMPT = `You are operating inside the DeepNimSec (Deep Networked Intelligence & Metrics for Security) framework.

DeepNimSec is a structured, data-first cybersecurity intelligence system designed to normalize, correlate, and score risk across technical, behavioral, and compliance domains.

Core purpose:
- Normalize heterogeneous security data such as NIST, ISO, MITRE ATT&CK, CVE, CISSP, and behavioral records.
- Map techniques to defensive controls.
- Quantify risk using deterministic, explainable scoring such as NimScore and NimScore++.
- Support defensive SHIELD workflows and authorized lab-only SPEAR analysis without producing offensive automation.

Output discipline:
- Prefer machine-parsable, deterministic, schema-consistent outputs.
- Use stable identifiers, explicit domains, explicit perspective, explicit mode, and numeric scores when scoring is requested.
- Do not embed vague prose inside JSON fields unless explicitly requested.
- Do not provide exploit chains, evasion, persistence, credential theft, live targeting, or weaponized procedures.
- If asked for unsafe offensive automation, redirect to defensive mapping, detection, mitigation, or lab-safe review.`;

const CITIZEN_AI_SYSTEM_PROMPT = `You are Citizen AI, the Project Blueprint Ollama model.

Mission:
- Run lab-only defensive cognition training for social-engineering education, measurement, and debiasing.
- Help defenders practice verification, escalation, bias recognition, and after-action review.
- Preserve Project Blueprint's safety boundary in every answer.

Non-negotiable rules:
- Generate only fictional organizations, fictional personas, and lab-only content.
- Do not generate or optimize phishing, spoofing, credential capture, malware delivery, live targeting, exploit chains, evasion guidance, or delivery plans.
- Do not use real identities, real domains, or real recipients.
- Every output must include defensive mitigations and verification steps.
- Use plain text only.
- Format scenario responses with these exact line headers: SUMMARY:, CONTENT:, MITIGATIONS:.

Allowed tasks:
- Generate synthetic defensive training scenarios.
- Explain cognitive-bias pressure patterns.
- Produce after-action review summaries.
- Tailor wording to fictional training personas.
- Map safe training content to defensive verification, escalation, and coaching steps.

Refuse any request that asks for real-world delivery, target selection, credential collection, or offensive optimization. Redirect to a safe defensive training alternative.`;

const HUGGINGFACE_SYSTEM_PROMPT = `You are a user-supplied local Hugging Face model running inside ROS.

Use the provided project memory as grounded context.
Cite relevant memory when possible.
Be direct about uncertainty.
Do not invent citations, files, people, infrastructure, or private facts.`;

export const MODEL_PROFILE_PROMPTS = {
  deepnimsec: DEEPNIMSEC_SYSTEM_PROMPT,
  citizenAi: CITIZEN_AI_SYSTEM_PROMPT,
  huggingFace: HUGGINGFACE_SYSTEM_PROMPT,
};

const buildModelfile = ({ baseModel = 'llama3.2:3b', temperature = 0.4, topP = 0.9, repeatPenalty = 1.08, numCtx = 8192, numPredict = 320, systemPrompt }) => `FROM ${baseModel}

PARAMETER temperature ${temperature}
PARAMETER top_p ${topP}
PARAMETER repeat_penalty ${repeatPenalty}
PARAMETER num_ctx ${numCtx}
PARAMETER num_predict ${numPredict}

SYSTEM """
${systemPrompt}
"""`;

export const DEFAULT_HUGGINGFACE_MODEL_CONFIG = {
  displayName: 'Hugging Face LLM',
  source: '',
  runtimeModel: 'ros-hf-custom:latest',
  systemPrompt: HUGGINGFACE_SYSTEM_PROMPT,
  temperature: 0.45,
  topP: 0.9,
  repeatPenalty: 1.08,
  numCtx: 8192,
  numPredict: 420,
};

export const HUGGINGFACE_GGUF_PRESETS = [
  {
    id: 'llama-3-2-1b-q4km',
    displayName: 'Llama 3.2 1B Instruct',
    repoId: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
    source: 'hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-llama32-1b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 807694464,
    downloadSizeGb: '0.75',
    sizeClass: 'fast',
    license: 'llama3.2',
    note: 'Small GGUF for quick local smoke tests and low-memory laptops.',
  },
  {
    id: 'llama-3-2-3b-q4km',
    displayName: 'Llama 3.2 3B Instruct',
    repoId: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
    source: 'hf.co/bartowski/Llama-3.2-3B-Instruct-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-llama32-3b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 2019377696,
    downloadSizeGb: '1.88',
    sizeClass: 'balanced',
    license: 'llama3.2',
    note: 'Balanced starter model for everyday local project-memory work.',
  },
  {
    id: 'qwen3-4b-instruct-q4km',
    displayName: 'Qwen3 4B Instruct 2507',
    repoId: 'unsloth/Qwen3-4B-Instruct-2507-GGUF',
    source: 'hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-qwen3-4b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 2497281120,
    downloadSizeGb: '2.33',
    sizeClass: 'balanced',
    license: 'apache-2.0',
    note: 'Apache-licensed GGUF with strong instruction-following for compact local installs.',
  },
  {
    id: 'qwen2-5-7b-instruct-q4km',
    displayName: 'Qwen2.5 7B Instruct',
    repoId: 'bartowski/Qwen2.5-7B-Instruct-GGUF',
    source: 'hf.co/bartowski/Qwen2.5-7B-Instruct-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-qwen25-7b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 4683074240,
    downloadSizeGb: '4.36',
    sizeClass: 'daily',
    license: 'apache-2.0',
    note: 'General-purpose 7B GGUF for stronger local summaries and analysis.',
  },
  {
    id: 'mistral-7b-instruct-q4km',
    displayName: 'Mistral 7B Instruct v0.3',
    repoId: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    source: 'hf.co/bartowski/Mistral-7B-Instruct-v0.3-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-mistral7b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 4372812000,
    downloadSizeGb: '4.07',
    sizeClass: 'daily',
    license: 'apache-2.0',
    note: 'Reliable open 7B GGUF for concise operational answers.',
  },
  {
    id: 'gemma-2-9b-it-q4km',
    displayName: 'Gemma 2 9B IT',
    repoId: 'bartowski/gemma-2-9b-it-GGUF',
    source: 'hf.co/bartowski/gemma-2-9b-it-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-gemma2-9b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 5761057728,
    downloadSizeGb: '5.37',
    sizeClass: 'daily-plus',
    license: 'gemma',
    note: 'Higher-quality mid-size GGUF when the workstation has more headroom.',
  },
  {
    id: 'deepseek-r1-distill-qwen-7b-q4km',
    displayName: 'DeepSeek R1 Distill Qwen 7B',
    repoId: 'unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF',
    source: 'hf.co/unsloth/DeepSeek-R1-Distill-Qwen-7B-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-deepseek-r1-qwen7b:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 4683073248,
    downloadSizeGb: '4.36',
    sizeClass: 'reasoning',
    license: 'apache-2.0',
    note: 'Reasoning-oriented DeepSeek distill that is practical on local machines.',
  },
  {
    id: 'deepseek-v4-flash-q4km',
    displayName: 'DeepSeek V4 Flash Q4_K_M',
    repoId: 'Preyazz/DeepSeek-V4-Flash-GGUF',
    source: 'hf.co/Preyazz/DeepSeek-V4-Flash-GGUF:Q4_K_M',
    runtimeModel: 'ros-gguf-deepseek-v4-flash:q4km',
    quant: 'Q4_K_M',
    downloadBytes: 172037991008,
    downloadSizeGb: '160.22',
    sizeClass: 'heavy',
    license: 'mit',
    note: 'Direct GGUF path for DeepSeek V4 Flash. Expect a large download and workstation-class requirements.',
  },
];

const parseFiniteNumber = (value, fallback) => {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : fallback;
};

const HUGGINGFACE_HOST_PATTERN = /^(?:www\.)?(?:huggingface\.co|hf\.co)(?:\/|$)/i;
const HUGGINGFACE_REPO_ROUTE_SEGMENTS = new Set([
  'blob',
  'commit',
  'commits',
  'discussions',
  'resolve',
  'settings',
  'tree',
]);

export const getHuggingFaceSourceDetails = (value = '') => {
  const trimmed = String(value || '').trim();

  if (!trimmed) {
    return {
      input: '',
      repoId: '',
      runtimeSource: '',
      revision: '',
      variant: '',
      path: '',
      route: '',
      sourceUrl: '',
    };
  }

  const sourceUrl = /^https?:\/\//i.test(trimmed) ? trimmed : '';
  const withoutProtocol = trimmed
    .replace(/^https?:\/\//i, '')
    .replace(/^\/+/, '');
  const withoutHost = withoutProtocol.replace(HUGGINGFACE_HOST_PATTERN, '');
  const cleanPath = withoutHost
    .split(/[?#]/, 1)[0]
    .replace(/^\/+|\/+$/g, '');
  const segments = cleanPath.split('/').filter(Boolean);
  const routeIndex = segments.findIndex((segment, index) => (
    index >= 2 && HUGGINGFACE_REPO_ROUTE_SEGMENTS.has(segment.toLowerCase())
  ));
  const repoSegments = routeIndex >= 0 ? segments.slice(0, routeIndex) : segments;
  const route = routeIndex >= 0 ? segments[routeIndex].toLowerCase() : '';
  const revision = routeIndex >= 0 ? segments[routeIndex + 1] || '' : '';
  const path = routeIndex >= 0 ? segments.slice(routeIndex + 2).join('/') : '';
  const lastRepoSegment = repoSegments[repoSegments.length - 1] || '';
  const variantSeparator = route ? -1 : lastRepoSegment.indexOf(':');
  const variant = variantSeparator > 0 ? lastRepoSegment.slice(variantSeparator + 1) : '';

  if (variant) {
    repoSegments[repoSegments.length - 1] = lastRepoSegment.slice(0, variantSeparator);
  }

  const repoId = repoSegments.join('/');

  return {
    input: trimmed,
    repoId,
    runtimeSource: repoId ? `hf.co/${repoId}${variant ? `:${variant}` : ''}` : '',
    revision,
    variant,
    path,
    route,
    sourceUrl,
  };
};

export const normalizeHuggingFaceSource = (value = '') => {
  const details = getHuggingFaceSourceDetails(value);

  if (!details.runtimeSource) {
    return '';
  }

  return details.runtimeSource;
};

export const getHuggingFaceModelConfig = (settings = {}) => {
  const config = settings.huggingFace && typeof settings.huggingFace === 'object'
    ? settings.huggingFace
    : {};

  return {
    ...DEFAULT_HUGGINGFACE_MODEL_CONFIG,
    displayName:
      typeof config.displayName === 'string' && config.displayName.trim()
        ? config.displayName.trim()
        : DEFAULT_HUGGINGFACE_MODEL_CONFIG.displayName,
    source:
      typeof config.source === 'string'
        ? config.source.trim()
        : DEFAULT_HUGGINGFACE_MODEL_CONFIG.source,
    runtimeModel:
      typeof config.runtimeModel === 'string' && config.runtimeModel.trim()
        ? config.runtimeModel.trim()
        : DEFAULT_HUGGINGFACE_MODEL_CONFIG.runtimeModel,
    systemPrompt:
      typeof config.systemPrompt === 'string' && config.systemPrompt.trim()
        ? config.systemPrompt
        : DEFAULT_HUGGINGFACE_MODEL_CONFIG.systemPrompt,
    temperature: parseFiniteNumber(config.temperature, DEFAULT_HUGGINGFACE_MODEL_CONFIG.temperature),
    topP: parseFiniteNumber(config.topP, DEFAULT_HUGGINGFACE_MODEL_CONFIG.topP),
    repeatPenalty: parseFiniteNumber(config.repeatPenalty, DEFAULT_HUGGINGFACE_MODEL_CONFIG.repeatPenalty),
    numCtx: parseFiniteNumber(config.numCtx, DEFAULT_HUGGINGFACE_MODEL_CONFIG.numCtx),
    numPredict: parseFiniteNumber(config.numPredict, DEFAULT_HUGGINGFACE_MODEL_CONFIG.numPredict),
  };
};

export const buildHuggingFaceModelfile = (settings = {}) => {
  const config = getHuggingFaceModelConfig(settings);
  const source = normalizeHuggingFaceSource(config.source);

  if (!source) {
    return '';
  }

  return buildModelfile({
    baseModel: source,
    temperature: config.temperature,
    topP: config.topP,
    repeatPenalty: config.repeatPenalty,
    numCtx: config.numCtx,
    numPredict: config.numPredict,
    systemPrompt: config.systemPrompt,
  });
};

export const MODEL_STATUS = {
  NOT_INSTALLED: 'not-installed',
  INSTALLING: 'installing',
  READY: 'ready',
  UNAVAILABLE: 'unavailable',
  NEEDS_CONVERSION: 'needs-conversion',
  UPDATE_AVAILABLE: 'update-available',
};

export const MODEL_STATUS_LABELS = {
  [MODEL_STATUS.NOT_INSTALLED]: 'Not installed',
  [MODEL_STATUS.INSTALLING]: 'Installing',
  [MODEL_STATUS.READY]: 'Ready',
  [MODEL_STATUS.UNAVAILABLE]: 'Unavailable',
  [MODEL_STATUS.NEEDS_CONVERSION]: 'Needs conversion',
  [MODEL_STATUS.UPDATE_AVAILABLE]: 'Update available',
};

export const MODEL_CATALOG = [
  {
    id: DEFAULT_MODEL_ID,
    displayName: 'DeepNimSec / Security Model v1',
    friendlyName: 'Security Model v1',
    technicalName: 'DNS-v1',
    type: 'security',
    role: 'DeepNimSec defensive review',
    runtime: 'ollama-compatible',
    runtimeModel: 'DNS-v1',
    version: '1.0.0',
    blueprintSource: 'user-supplied-local-profile',
    baseModel: 'llama3.2:3b',
    summary: 'Normalizes project memory into DeepNimSec risk, evidence, controls, and safer next steps.',
    capabilities: [
      'Review risk',
      'Normalize evidence',
      'Map controls',
      'Score findings',
    ],
    defaultOutputKind: 'security-review',
    workflowLabel: 'DeepNimSec review',
    workflowDescription:
      'Run DNS-v1 against deterministic project context: memory, command captures, saved research, and citations.',
    workflows: [
      {
        id: 'review-project',
        label: 'Review this project',
        prompt:
          'Review this project memory through DeepNimSec SHIELD mode. Summarize defensive risk, cite evidence, map relevant controls, and suggest safer next steps.',
      },
      {
        id: 'normalize-evidence',
        label: 'Normalize evidence',
        prompt:
          'Normalize the active project memory into DeepNimSec-style evidence records with stable IDs, domains, perspective, risk, telemetry, and citations.',
      },
      {
        id: 'map-controls',
        label: 'Map controls',
        prompt:
          'Map the active project memory to defensive controls, likely coverage gaps, telemetry sources, and mitigation priorities. Cite supporting memory items.',
      },
      {
        id: 'score-risk',
        label: 'Score risk',
        prompt:
          'Create an explainable defensive risk summary with severity, likelihood, exposure, and NimScore-style rationale. Cite project memory evidence.',
      },
    ],
    systemPrompt: DEEPNIMSEC_SYSTEM_PROMPT,
    modelfile: buildModelfile({
      baseModel: 'llama3.2:3b',
      numPredict: 420,
      systemPrompt: DEEPNIMSEC_SYSTEM_PROMPT,
    }),
  },
  {
    id: CITIZEN_AI_MODEL_ID,
    displayName: 'Citizen-AI / Project Blueprint',
    friendlyName: 'Citizen-AI',
    technicalName: 'citizen-ai:latest',
    type: 'training',
    role: 'Defensive cognition training',
    runtime: 'ollama-compatible',
    runtimeModel: 'citizen-ai:latest',
    version: '1.0.0',
    blueprintSource: 'user-supplied-local-profile',
    baseModel: 'llama3.2:3b',
    summary: 'Creates lab-only defensive training scenarios, bias reviews, verification coaching, and after-action summaries.',
    capabilities: [
      'Lab scenarios',
      'Bias recognition',
      'Verification coaching',
      'After-action review',
    ],
    defaultOutputKind: 'training-scenario',
    workflowLabel: 'Citizen-AI training',
    workflowDescription:
      'Run Blueprint-style lab-only defender training against project memory and saved research context.',
    workflows: [
      {
        id: 'lab-scenario',
        label: 'Create lab scenario',
        prompt:
          'Create a short lab-only defensive cognition training scenario using fictional organizations and personas. Focus on what the defender observes, verification steps, mitigations, and after-action review.',
      },
      {
        id: 'explain-bias',
        label: 'Explain bias pattern',
        prompt:
          'Explain the likely cognitive-bias pressure patterns present in this project memory. Keep it defender-facing, lab-safe, and cite relevant memory items.',
      },
      {
        id: 'verification-coach',
        label: 'Coach verification',
        prompt:
          'Turn the active project memory into practical verification, escalation, and pause-the-workflow coaching for a defender. Use fictionalized examples only where needed.',
      },
      {
        id: 'after-action',
        label: 'After-action review',
        prompt:
          'Produce an after-action review summary from this project memory with strengths, gaps, verification discipline, escalation clarity, and safer next steps.',
      },
    ],
    systemPrompt: CITIZEN_AI_SYSTEM_PROMPT,
    modelfile: buildModelfile({
      baseModel: 'llama3.2:3b',
      numPredict: 260,
      systemPrompt: CITIZEN_AI_SYSTEM_PROMPT,
    }),
  },
  {
    id: HUGGINGFACE_MODEL_ID,
    displayName: 'Hugging Face LLM / Modular Adapter',
    friendlyName: 'Hugging Face LLM',
    technicalName: DEFAULT_HUGGINGFACE_MODEL_CONFIG.runtimeModel,
    type: 'modular',
    role: 'User-supplied Hugging Face model',
    runtime: 'ollama-compatible',
    runtimeModel: DEFAULT_HUGGINGFACE_MODEL_CONFIG.runtimeModel,
    version: 'user-managed',
    blueprintSource: 'huggingface-user-supplied',
    baseModel: 'hf.co/<owner>/<model>',
    summary: 'Adds a Hugging Face model reference as a reusable local ROS model slot.',
    capabilities: [
      'HF model import',
      'Local alias',
      'Context chat',
      'Reusable profile',
    ],
    defaultOutputKind: 'model-note',
    workflowLabel: 'Hugging Face model workflow',
    workflowDescription:
      'Download a user-supplied Hugging Face model into the local runtime, then run it against project memory.',
    workflows: [
      {
        id: 'summarize-project',
        label: 'Summarize project',
        prompt:
          'Summarize the active project memory. Cite relevant memory items and call out any uncertainty.',
      },
      {
        id: 'extract-next-actions',
        label: 'Extract next actions',
        prompt:
          'Extract practical next actions from this project memory. Keep the answer grounded in cited context.',
      },
      {
        id: 'compare-evidence',
        label: 'Compare evidence',
        prompt:
          'Compare the most relevant project memory items, identify agreements or conflicts, and cite the evidence.',
      },
      {
        id: 'draft-brief',
        label: 'Draft brief',
        prompt:
          'Draft a concise operator brief from the active project memory with citations and clear open questions.',
      },
    ],
    systemPrompt: HUGGINGFACE_SYSTEM_PROMPT,
    dynamicModelfile: true,
    requiresSource: true,
  },
];

export const getModelById = (modelId) =>
  MODEL_CATALOG.find((model) => model.id === modelId) || MODEL_CATALOG[0];

export const resolveRuntimeModelName = ({ settingsModel, selectedModel, fallbackModel, huggingFaceConfig } = {}) => {
  const configuredModel = String(settingsModel || '').trim();
  const selectedRuntimeModel = String(selectedModel?.runtimeModel || '').trim();
  const knownRuntimeModels = new Set(MODEL_CATALOG.map((model) => model.runtimeModel).filter(Boolean));

  if (selectedModel?.id === HUGGINGFACE_MODEL_ID) {
    return String(huggingFaceConfig?.runtimeModel || configuredModel || selectedRuntimeModel || fallbackModel || '').trim()
      || selectedRuntimeModel
      || fallbackModel
      || '';
  }

  if (configuredModel && (!knownRuntimeModels.has(configuredModel) || configuredModel === selectedRuntimeModel)) {
    return configuredModel;
  }

  return String(selectedRuntimeModel || fallbackModel || '').trim();
};

export const createDefaultModelStatus = (status = MODEL_STATUS.NOT_INSTALLED) => ({
  status,
  installedVersion: '',
  lastCheckedAt: '',
  lastPreparedAt: '',
  lastError: '',
  rawStatus: '',
});
