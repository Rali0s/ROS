export const DEFAULT_MODEL_ID = 'security-model-v1';
export const CITIZEN_AI_MODEL_ID = 'citizen-ai';

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

export const MODEL_PROFILE_PROMPTS = {
  deepnimsec: DEEPNIMSEC_SYSTEM_PROMPT,
  citizenAi: CITIZEN_AI_SYSTEM_PROMPT,
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

export const MODEL_STATUS = {
  NOT_INSTALLED: 'not-installed',
  INSTALLING: 'installing',
  READY: 'ready',
  UNAVAILABLE: 'unavailable',
  UPDATE_AVAILABLE: 'update-available',
};

export const MODEL_STATUS_LABELS = {
  [MODEL_STATUS.NOT_INSTALLED]: 'Not installed',
  [MODEL_STATUS.INSTALLING]: 'Installing',
  [MODEL_STATUS.READY]: 'Ready',
  [MODEL_STATUS.UNAVAILABLE]: 'Unavailable',
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
    blueprintSource: '/Users/premise/Documents/Blueprint/res/defensive/DeepNimSec_v1.json',
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
    blueprintSource: '/Users/premise/Documents/Blueprint/ollama/citizen-ai.Modelfile',
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
];

export const getModelById = (modelId) =>
  MODEL_CATALOG.find((model) => model.id === modelId) || MODEL_CATALOG[0];

export const resolveRuntimeModelName = ({ settingsModel, selectedModel, fallbackModel } = {}) => {
  const configuredModel = String(settingsModel || '').trim();
  const selectedRuntimeModel = String(selectedModel?.runtimeModel || '').trim();
  const knownRuntimeModels = new Set(MODEL_CATALOG.map((model) => model.runtimeModel).filter(Boolean));

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
