const createBpsId = (prefix) =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

const now = () => new Date().toISOString();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const average = (values) => {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (!filtered.length) {
    return 0;
  }

  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
};

const latestBySubject = (items, subjectId) =>
  [...items]
    .filter((item) => item.subjectId === subjectId)
    .sort((left, right) => new Date(right.recordedAt || right.updatedAt) - new Date(left.recordedAt || left.updatedAt))[0] || null;

export const BPS_LAYER_OPTIONS = [
  { id: 'bio', label: 'BIO' },
  { id: 'psycho', label: 'PSYCHO' },
  { id: 'social', label: 'SOCIAL' },
];

export const BPS_BIAS_TAGS = [
  'Loss Aversion',
  'Overconfidence',
  'Framing Effect',
  'Availability Bias',
  'Sunk Cost',
  'Catastrophizing',
  'Black-and-White Thinking',
  'Emotional Reasoning',
  'Hypervigilance',
  'Dissociation-Like Note',
  'Compulsive Loop',
];

export const BPS_MOOD_TAGS = [
  'steady',
  'irritable',
  'flat',
  'elevated',
  'guarded',
  'anxious',
  'fatigued',
  'focused',
];

export const BPS_RESEARCH_TEMPLATES = [
  'Observation Entry',
  'Event Log',
  'Trigger-Response Log',
  'Behavioral Chain',
  'Environment-State-Outcome',
  'Case Note',
  'Longitudinal Comparison',
];

export const createSeededBpsState = (helpers = {}) => {
  const makeId = helpers.createId || createBpsId;
  const timestamp = helpers.now || now;
  const currentTime = timestamp();
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const bpsSubjects = [
    {
      id: 'subject-self',
      label: 'Self',
      kind: 'self',
      status: 'active',
      profileId: '',
      aliases: ['Operator'],
      knownAssociates: ['Ops Lead', 'Stakeholder A'],
      triggers: ['sleep compression', 'deadline compression', 'authority pressure'],
      strengths: ['discipline under routine', 'careful documentation', 'pattern recognition'],
      weaknesses: ['constricted optionality under pressure', 'fatigue sensitivity'],
      tags: ['operator', 'baseline'],
      notes:
        'Primary operator baseline. Use this record for self-observation, decision drift review, and longitudinal comparison.',
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.92,
    },
    {
      id: 'subject-atlas',
      label: 'Atlas-7',
      kind: 'person',
      status: 'observed',
      profileId: '',
      aliases: ['Atlas'],
      knownAssociates: ['Team Lead', 'Peer Group B'],
      triggers: ['ambiguous feedback', 'uncertain outcomes'],
      strengths: ['steady follow-through', 'social readability'],
      weaknesses: ['looping under ambiguity', 'delay when certainty is low'],
      tags: ['team', 'comparison'],
      notes:
        'Secondary subject for multi-person study demonstrations. Intended for research-mode and comparison workflows only.',
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.76,
    },
  ];

  const bpsBaselines = [
    {
      id: makeId('bps-baseline'),
      subjectId: 'subject-self',
      bio: { sleepHours: 7.4, fatigue: 28, workIntensity: 61, physicalStress: 34 },
      psycho: { cognitiveRisk: 31, rumination: 22, impulsivity: 18, confidence: 68 },
      social: { pressure: 38, conflict: 16, isolation: 22, support: 64 },
      notes: 'Primary operator baseline derived from stable work weeks.',
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.81,
    },
    {
      id: makeId('bps-baseline'),
      subjectId: 'subject-atlas',
      bio: { sleepHours: 6.9, fatigue: 34, workIntensity: 58, physicalStress: 36 },
      psycho: { cognitiveRisk: 36, rumination: 28, impulsivity: 21, confidence: 61 },
      social: { pressure: 44, conflict: 24, isolation: 28, support: 57 },
      notes: 'Reference comparison baseline for team observations.',
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.72,
    },
  ];

  const bpsEntries = [
    {
      id: makeId('bps-entry'),
      subjectId: 'subject-self',
      layer: 'bio',
      title: 'Compressed sleep and elevated caffeine',
      context: 'Pre-briefing sprint',
      tags: ['sleep', 'caffeine', 'fatigue'],
      payload: {
        sleepHours: 5.8,
        sleepQuality: 42,
        fatigue: 71,
        exerciseMinutes: 18,
        physicalStress: 63,
        workIntensity: 82,
        caffeineMg: 320,
        supplementNotes: 'Creatine, magnesium',
        nutritionNotes: 'Skipped breakfast, late protein intake',
        environmentNotes: 'Low-light desk, extended screen exposure',
      },
      notes: 'Noticeable narrowing of tolerance after the second caffeine block.',
      recordedAt: fiveHoursAgo,
      createdAt: fiveHoursAgo,
      updatedAt: fiveHoursAgo,
      source: 'seed',
      confidence: 0.87,
    },
    {
      id: makeId('bps-entry'),
      subjectId: 'subject-self',
      layer: 'psycho',
      title: 'Urgency-framed decision pressure',
      context: 'Deadline reprioritization',
      tags: ['decision-log', 'bias-review', 'stress-interpretation'],
      payload: {
        moodTags: ['guarded', 'focused'],
        thoughtPatterns: ['deadline compression', 'binary framing'],
        cognitiveDistortions: ['Catastrophizing', 'Black-and-White Thinking'],
        cognitiveBiases: ['Loss Aversion', 'Framing Effect'],
        confidenceLevel: 54,
        impulsivity: 46,
        avoidance: 22,
        rumination: 61,
        stressInterpretation: 'Threat-focused',
        decisionLog:
          'Deferred one high-variance path and defaulted toward preservation of existing progress.',
      },
      notes: 'Bias cluster appears strongest under time scarcity and incomplete context.',
      recordedAt: twoHoursAgo,
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      source: 'seed',
      confidence: 0.9,
    },
    {
      id: makeId('bps-entry'),
      subjectId: 'subject-self',
      layer: 'social',
      title: 'Authority exposure with post-interaction tightening',
      context: 'Senior stakeholder sync',
      tags: ['authority', 'pressure', 'post-interaction'],
      payload: {
        contacts: ['Stakeholder A', 'Ops Lead'],
        group: 'Leadership',
        authorityExposure: 74,
        pressure: 69,
        conflict: 21,
        isolation: 34,
        support: 46,
        conformityRisk: 62,
        interactionShift: 'Narrowed optionality after feedback from authority figures.',
      },
      notes: 'Behavior shifted toward defensiveness after the interaction, with reduced exploratory thinking.',
      recordedAt: currentTime,
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.86,
    },
    {
      id: makeId('bps-entry'),
      subjectId: 'subject-atlas',
      layer: 'psycho',
      title: 'Observed repetitive loop under ambiguous outcomes',
      context: 'Cross-subject comparison',
      tags: ['comparison', 'rumination'],
      payload: {
        moodTags: ['anxious'],
        thoughtPatterns: ['rehearsal', 'counterfactual replay'],
        cognitiveDistortions: ['Emotional Reasoning'],
        cognitiveBiases: ['Availability Bias', 'Compulsive Loop'],
        confidenceLevel: 49,
        impulsivity: 27,
        avoidance: 41,
        rumination: 73,
        stressInterpretation: 'Uncertain / unstable',
        decisionLog: 'Decision delayed pending more certainty.',
      },
      notes: 'Useful as a comparison case for longitudinal review.',
      recordedAt: yesterday,
      createdAt: yesterday,
      updatedAt: yesterday,
      source: 'seed',
      confidence: 0.75,
    },
  ];

  const bpsResearchNotes = [
    {
      id: makeId('bps-research'),
      subjectId: 'subject-self',
      template: 'Trigger-Response Log',
      title: 'Time pressure and conservative response bias',
      dateTime: twoHoursAgo,
      fields: {
        context: 'Backlog compression before external review',
        precipitatingFactor: 'Ambiguous deadline signal',
        observedBehavior: 'Decision path narrowed toward preservation mode',
        cognitiveInterpretation: 'Loss framing elevated perceived downside',
        emotionalMarkers: 'Guarded, compressed, less exploratory',
        physiologicalMarkers: 'Short sleep, elevated caffeine, jaw tension',
        socialContext: 'Authority presence and visible review pressure',
        outcome: 'Safer immediate choice, lower optionality',
        followUp: 'Repeat observation after full sleep and lower authority exposure',
      },
      notes: 'Structured note for testing cross-layer drift surfaces in the dashboard.',
      createdAt: twoHoursAgo,
      updatedAt: twoHoursAgo,
      source: 'seed',
      confidence: 0.89,
    },
  ];

  const bpsRelationships = [
    {
      id: makeId('bps-link'),
      subjectId: 'subject-self',
      targetId: 'subject-atlas',
      relationType: 'comparison',
      influence: 'informational',
      intensity: 34,
      notes: 'Used for side-by-side comparison rather than direct pressure.',
      createdAt: currentTime,
      updatedAt: currentTime,
      source: 'seed',
      confidence: 0.68,
    },
  ];

  return {
    bpsSubjects,
    bpsEntries,
    bpsResearchNotes,
    bpsScores: [],
    bpsAlerts: [],
    bpsRelationships,
    bpsBaselines,
  };
};

const normalizeStringList = (value) =>
  Array.isArray(value) ? value.map((entry) => String(entry).trim()).filter(Boolean) : [];

export const normalizeBpsSubject = (subject = {}) => ({
  id: typeof subject.id === 'string' && subject.id.trim() ? subject.id : createBpsId('bps-subject'),
  label: typeof subject.label === 'string' && subject.label.trim() ? subject.label : 'Untitled subject',
  kind: ['self', 'person', 'group'].includes(subject.kind) ? subject.kind : 'person',
  status: ['active', 'observed', 'archived'].includes(subject.status) ? subject.status : 'active',
  profileId: typeof subject.profileId === 'string' ? subject.profileId : '',
  aliases: normalizeStringList(subject.aliases),
  knownAssociates: normalizeStringList(subject.knownAssociates),
  triggers: normalizeStringList(subject.triggers),
  strengths: normalizeStringList(subject.strengths),
  weaknesses: normalizeStringList(subject.weaknesses),
  tags: normalizeStringList(subject.tags),
  notes: typeof subject.notes === 'string' ? subject.notes : '',
  createdAt: typeof subject.createdAt === 'string' ? subject.createdAt : now(),
  updatedAt: typeof subject.updatedAt === 'string' ? subject.updatedAt : now(),
  source: typeof subject.source === 'string' && subject.source.trim() ? subject.source : 'manual',
  confidence: Number.isFinite(subject.confidence) ? clamp(subject.confidence, 0, 1) : 0.75,
});

export const normalizeBpsEntry = (entry = {}) => ({
  id: typeof entry.id === 'string' && entry.id.trim() ? entry.id : createBpsId('bps-entry'),
  subjectId: typeof entry.subjectId === 'string' ? entry.subjectId : '',
  layer: ['bio', 'psycho', 'social'].includes(entry.layer) ? entry.layer : 'bio',
  title: typeof entry.title === 'string' && entry.title.trim() ? entry.title : 'Untitled observation',
  context: typeof entry.context === 'string' ? entry.context : '',
  tags: normalizeStringList(entry.tags),
  payload: entry.payload && typeof entry.payload === 'object' ? entry.payload : {},
  notes: typeof entry.notes === 'string' ? entry.notes : '',
  recordedAt: typeof entry.recordedAt === 'string' ? entry.recordedAt : now(),
  createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now(),
  updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : now(),
  source: typeof entry.source === 'string' && entry.source.trim() ? entry.source : 'manual',
  confidence: Number.isFinite(entry.confidence) ? clamp(entry.confidence, 0, 1) : 0.74,
});

export const normalizeBpsResearchNote = (note = {}) => ({
  id: typeof note.id === 'string' && note.id.trim() ? note.id : createBpsId('bps-research'),
  subjectId: typeof note.subjectId === 'string' ? note.subjectId : '',
  template: BPS_RESEARCH_TEMPLATES.includes(note.template) ? note.template : 'Observation Entry',
  title: typeof note.title === 'string' && note.title.trim() ? note.title : 'Untitled research note',
  dateTime: typeof note.dateTime === 'string' ? note.dateTime : now(),
  fields: note.fields && typeof note.fields === 'object' ? note.fields : {},
  notes: typeof note.notes === 'string' ? note.notes : '',
  createdAt: typeof note.createdAt === 'string' ? note.createdAt : now(),
  updatedAt: typeof note.updatedAt === 'string' ? note.updatedAt : now(),
  source: typeof note.source === 'string' && note.source.trim() ? note.source : 'manual',
  confidence: Number.isFinite(note.confidence) ? clamp(note.confidence, 0, 1) : 0.78,
});

export const normalizeBpsScore = (score = {}) => ({
  id: typeof score.id === 'string' && score.id.trim() ? score.id : createBpsId('bps-score'),
  subjectId: typeof score.subjectId === 'string' ? score.subjectId : '',
  window: typeof score.window === 'string' ? score.window : 'rolling-7d',
  bioStressScore: Number.isFinite(score.bioStressScore) ? clamp(score.bioStressScore, 0, 100) : 0,
  psychoBiasLoad: Number.isFinite(score.psychoBiasLoad) ? clamp(score.psychoBiasLoad, 0, 100) : 0,
  socialPressureLoad: Number.isFinite(score.socialPressureLoad) ? clamp(score.socialPressureLoad, 0, 100) : 0,
  combinedDriftScore: Number.isFinite(score.combinedDriftScore) ? clamp(score.combinedDriftScore, 0, 100) : 0,
  baselineDelta: Number.isFinite(score.baselineDelta) ? Math.round(score.baselineDelta) : 0,
  updatedAt: typeof score.updatedAt === 'string' ? score.updatedAt : now(),
  source: typeof score.source === 'string' && score.source.trim() ? score.source : 'derived',
  confidence: Number.isFinite(score.confidence) ? clamp(score.confidence, 0, 1) : 0.82,
});

export const normalizeBpsAlert = (alert = {}) => ({
  id: typeof alert.id === 'string' && alert.id.trim() ? alert.id : createBpsId('bps-alert'),
  subjectId: typeof alert.subjectId === 'string' ? alert.subjectId : '',
  severity: ['low', 'elevated', 'high'].includes(alert.severity) ? alert.severity : 'low',
  title: typeof alert.title === 'string' && alert.title.trim() ? alert.title : 'Operator flag',
  detail: typeof alert.detail === 'string' ? alert.detail : '',
  relatedLayer: ['bio', 'psycho', 'social', 'combined'].includes(alert.relatedLayer) ? alert.relatedLayer : 'combined',
  createdAt: typeof alert.createdAt === 'string' ? alert.createdAt : now(),
  updatedAt: typeof alert.updatedAt === 'string' ? alert.updatedAt : now(),
  source: typeof alert.source === 'string' && alert.source.trim() ? alert.source : 'derived',
  confidence: Number.isFinite(alert.confidence) ? clamp(alert.confidence, 0, 1) : 0.8,
});

export const normalizeBpsRelationship = (link = {}) => ({
  id: typeof link.id === 'string' && link.id.trim() ? link.id : createBpsId('bps-link'),
  subjectId: typeof link.subjectId === 'string' ? link.subjectId : '',
  targetId: typeof link.targetId === 'string' ? link.targetId : '',
  relationType: typeof link.relationType === 'string' && link.relationType.trim() ? link.relationType : 'informational',
  influence: typeof link.influence === 'string' && link.influence.trim() ? link.influence : 'informational',
  intensity: Number.isFinite(link.intensity) ? clamp(link.intensity, 0, 100) : 0,
  notes: typeof link.notes === 'string' ? link.notes : '',
  createdAt: typeof link.createdAt === 'string' ? link.createdAt : now(),
  updatedAt: typeof link.updatedAt === 'string' ? link.updatedAt : now(),
  source: typeof link.source === 'string' && link.source.trim() ? link.source : 'manual',
  confidence: Number.isFinite(link.confidence) ? clamp(link.confidence, 0, 1) : 0.72,
});

export const normalizeBpsBaseline = (baseline = {}) => ({
  id: typeof baseline.id === 'string' && baseline.id.trim() ? baseline.id : createBpsId('bps-baseline'),
  subjectId: typeof baseline.subjectId === 'string' ? baseline.subjectId : '',
  bio: baseline.bio && typeof baseline.bio === 'object' ? baseline.bio : {},
  psycho: baseline.psycho && typeof baseline.psycho === 'object' ? baseline.psycho : {},
  social: baseline.social && typeof baseline.social === 'object' ? baseline.social : {},
  notes: typeof baseline.notes === 'string' ? baseline.notes : '',
  createdAt: typeof baseline.createdAt === 'string' ? baseline.createdAt : now(),
  updatedAt: typeof baseline.updatedAt === 'string' ? baseline.updatedAt : now(),
  source: typeof baseline.source === 'string' && baseline.source.trim() ? baseline.source : 'manual',
  confidence: Number.isFinite(baseline.confidence) ? clamp(baseline.confidence, 0, 1) : 0.78,
});

const scoreBio = (entries, baseline) => {
  const sleepPenalty = average(entries.map((entry) => 100 - (entry.payload.sleepQuality ?? 0)));
  const fatigue = average(entries.map((entry) => entry.payload.fatigue));
  const physicalStress = average(entries.map((entry) => entry.payload.physicalStress));
  const workIntensity = average(entries.map((entry) => entry.payload.workIntensity));
  const caffeine = average(entries.map((entry) => (entry.payload.caffeineMg ?? 0) / 4));
  const baselineTarget = Number.isFinite(baseline?.bio?.fatigue) ? baseline.bio.fatigue : 30;
  const baselineDelta = Math.round(fatigue - baselineTarget);

  return {
    score: Math.round(clamp((sleepPenalty * 0.22) + (fatigue * 0.28) + (physicalStress * 0.22) + (workIntensity * 0.18) + (caffeine * 0.1), 0, 100)),
    baselineDelta,
  };
};

const scorePsycho = (entries, baseline) => {
  const biasDensity = average(
    entries.map((entry) => ((entry.payload.cognitiveBiases?.length ?? 0) * 12) + ((entry.payload.cognitiveDistortions?.length ?? 0) * 10)),
  );
  const rumination = average(entries.map((entry) => entry.payload.rumination));
  const impulsivity = average(entries.map((entry) => entry.payload.impulsivity));
  const avoidance = average(entries.map((entry) => entry.payload.avoidance));
  const baselineTarget = Number.isFinite(baseline?.psycho?.cognitiveRisk) ? baseline.psycho.cognitiveRisk : 30;
  const score = Math.round(clamp((biasDensity * 0.34) + (rumination * 0.31) + (impulsivity * 0.18) + (avoidance * 0.17), 0, 100));

  return {
    score,
    baselineDelta: Math.round(score - baselineTarget),
  };
};

const scoreSocial = (entries, baseline) => {
  const pressure = average(entries.map((entry) => entry.payload.pressure));
  const authority = average(entries.map((entry) => entry.payload.authorityExposure));
  const conflict = average(entries.map((entry) => entry.payload.conflict));
  const isolation = average(entries.map((entry) => entry.payload.isolation));
  const conformityRisk = average(entries.map((entry) => entry.payload.conformityRisk));
  const score = Math.round(clamp((pressure * 0.28) + (authority * 0.22) + (conflict * 0.18) + (isolation * 0.16) + (conformityRisk * 0.16), 0, 100));
  const baselineTarget = Number.isFinite(baseline?.social?.pressure) ? baseline.social.pressure : 35;

  return {
    score,
    baselineDelta: Math.round(score - baselineTarget),
  };
};

export const deriveBpsState = (state) => {
  const subjects = (state.bpsSubjects ?? []).map(normalizeBpsSubject);
  const entries = (state.bpsEntries ?? []).map(normalizeBpsEntry);
  const researchNotes = (state.bpsResearchNotes ?? []).map(normalizeBpsResearchNote);
  const relationships = (state.bpsRelationships ?? []).map(normalizeBpsRelationship);
  const baselines = (state.bpsBaselines ?? []).map(normalizeBpsBaseline);
  const scores = [];
  const alerts = [];

  subjects.forEach((subject) => {
    const baseline = baselines.find((entry) => entry.subjectId === subject.id);
    const subjectEntries = entries.filter((entry) => entry.subjectId === subject.id);
    const bioEntries = subjectEntries.filter((entry) => entry.layer === 'bio');
    const psychoEntries = subjectEntries.filter((entry) => entry.layer === 'psycho');
    const socialEntries = subjectEntries.filter((entry) => entry.layer === 'social');

    const bio = scoreBio(bioEntries, baseline);
    const psycho = scorePsycho(psychoEntries, baseline);
    const social = scoreSocial(socialEntries, baseline);
    const combined = Math.round(clamp((bio.score * 0.34) + (psycho.score * 0.36) + (social.score * 0.3), 0, 100));
    const baselineDelta = Math.round(average([bio.baselineDelta, psycho.baselineDelta, social.baselineDelta]));

    scores.push(
      normalizeBpsScore({
        subjectId: subject.id,
        window: 'rolling-7d',
        bioStressScore: bio.score,
        psychoBiasLoad: psycho.score,
        socialPressureLoad: social.score,
        combinedDriftScore: combined,
        baselineDelta,
        updatedAt: now(),
      }),
    );

    if (bio.score >= 60) {
      alerts.push(
        normalizeBpsAlert({
          subjectId: subject.id,
          severity: bio.score >= 75 ? 'high' : 'elevated',
          title: 'BIO drift window',
          detail: `Fatigue, physical stress, or stimulation markers are elevated for ${subject.label}.`,
          relatedLayer: 'bio',
        }),
      );
    }

    if (psycho.score >= 55) {
      alerts.push(
        normalizeBpsAlert({
          subjectId: subject.id,
          severity: psycho.score >= 72 ? 'high' : 'elevated',
          title: 'Psycho bias load',
          detail: `Bias density and recursive thought markers are above baseline for ${subject.label}.`,
          relatedLayer: 'psycho',
        }),
      );
    }

    if (social.score >= 55) {
      alerts.push(
        normalizeBpsAlert({
          subjectId: subject.id,
          severity: social.score >= 72 ? 'high' : 'elevated',
          title: 'Social pressure load',
          detail: `Authority exposure, pressure, or isolation markers warrant review for ${subject.label}.`,
          relatedLayer: 'social',
        }),
      );
    }

    if (combined >= 62 || baselineDelta >= 15) {
      alerts.push(
        normalizeBpsAlert({
          subjectId: subject.id,
          severity: combined >= 78 ? 'high' : 'elevated',
          title: 'Combined drift score',
          detail: `Recent cross-layer observations indicate a higher decision-risk window for ${subject.label}.`,
          relatedLayer: 'combined',
        }),
      );
    }
  });

  return {
    bpsSubjects: subjects,
    bpsEntries: entries,
    bpsResearchNotes: researchNotes,
    bpsScores: scores,
    bpsAlerts: alerts,
    bpsRelationships: relationships,
    bpsBaselines: baselines,
  };
};

export const getBpsSubjectById = (data, subjectId) => {
  const subjects = data?.bpsSubjects ?? [];
  if (!subjects.length) {
    return null;
  }

  if (subjectId) {
    return subjects.find((subject) => subject.id === subjectId || subject.label.toLowerCase() === subjectId.toLowerCase()) || subjects[0];
  }

  return subjects.find((subject) => subject.kind === 'self') || subjects[0];
};

export const getBpsDashboardModel = (data, subjectId) => {
  const subject = getBpsSubjectById(data, subjectId);
  if (!subject) {
    return null;
  }

  const entries = (data?.bpsEntries ?? [])
    .filter((entry) => entry.subjectId === subject.id)
    .sort((left, right) => new Date(right.recordedAt) - new Date(left.recordedAt));
  const score = latestBySubject(data?.bpsScores ?? [], subject.id);
  const alerts = (data?.bpsAlerts ?? []).filter((alert) => alert.subjectId === subject.id);
  const researchNotes = (data?.bpsResearchNotes ?? [])
    .filter((note) => note.subjectId === subject.id)
    .sort((left, right) => new Date(right.dateTime || right.updatedAt) - new Date(left.dateTime || left.updatedAt));
  const baseline = (data?.bpsBaselines ?? []).find((entry) => entry.subjectId === subject.id) || null;
  const relationships = (data?.bpsRelationships ?? []).filter((entry) => entry.subjectId === subject.id);

  return {
    subject,
    entries,
    score,
    alerts,
    researchNotes,
    baseline,
    relationships,
    recentBio: entries.filter((entry) => entry.layer === 'bio').slice(0, 3),
    recentPsycho: entries.filter((entry) => entry.layer === 'psycho').slice(0, 3),
    recentSocial: entries.filter((entry) => entry.layer === 'social').slice(0, 3),
  };
};

const formatScoreLine = (score) => {
  if (!score) {
    return 'No derived score available.';
  }

  return `bio=${score.bioStressScore} psycho=${score.psychoBiasLoad} social=${score.socialPressureLoad} combined=${score.combinedDriftScore} baselineDelta=${score.baselineDelta}`;
};

export const exportBpsSubject = (data, subjectId, format = 'json') => {
  const model = getBpsDashboardModel(data, subjectId);
  if (!model) {
    return '';
  }

  if (format === 'md') {
    return [
      `# BPS Export · ${model.subject.label}`,
      '',
      `- Subject ID: ${model.subject.id}`,
      `- Status: ${model.subject.status}`,
      `- Score: ${formatScoreLine(model.score)}`,
      `- Alerts: ${model.alerts.length}`,
      '',
      '## Recent Entries',
      ...model.entries.slice(0, 8).map((entry) => `- ${entry.layer.toUpperCase()} · ${entry.title} · ${entry.recordedAt}`),
      '',
      '## Research Notes',
      ...model.researchNotes.slice(0, 5).map((note) => `- ${note.template} · ${note.title} · ${note.dateTime}`),
    ].join('\n');
  }

  return JSON.stringify(
    {
      subject: model.subject,
      baseline: model.baseline,
      score: model.score,
      alerts: model.alerts,
      entries: model.entries,
      researchNotes: model.researchNotes,
      relationships: model.relationships,
    },
    null,
    2,
  );
};

export const formatBpsCommandResponse = (data, rawCommand) => {
  const [command = '', subjectToken = '', layerToken = ''] = rawCommand.trim().split(/\s+/);
  const normalizedCommand = command.toLowerCase();
  const formatToken = layerToken.toLowerCase();
  const model = getBpsDashboardModel(data, subjectToken);

  if (!model) {
    return ['BPS Engine data unavailable.'];
  }

  switch (normalizedCommand) {
    case 'bps.status':
      return [
        `${model.subject.label} :: ${formatScoreLine(model.score)}`,
        `alerts=${model.alerts.length}`,
        `entries=${model.entries.length}`,
        `researchNotes=${model.researchNotes.length}`,
      ];
    case 'bps.log': {
      const filtered = ['bio', 'psycho', 'social'].includes(formatToken)
        ? model.entries.filter((entry) => entry.layer === formatToken)
        : model.entries;
      return filtered.slice(0, 6).map((entry) => `- ${entry.layer.toUpperCase()} :: ${entry.title} :: ${entry.recordedAt}`);
    }
    case 'bps.bias':
      return model.entries
        .filter((entry) => entry.layer === 'psycho')
        .slice(0, 5)
        .map((entry) => `- ${entry.title} :: ${(entry.payload.cognitiveBiases ?? []).join(', ') || 'none'} :: distortions=${(entry.payload.cognitiveDistortions ?? []).join(', ') || 'none'}`);
    case 'bps.map':
      return model.relationships.length
        ? model.relationships.map((link) => `- ${model.subject.label} -> ${link.targetId} :: ${link.relationType} :: intensity=${link.intensity}`)
        : ['No social influence links mapped yet.'];
    case 'bps.replay':
      return model.entries
        .filter((entry) => entry.layer === 'psycho')
        .slice(0, 4)
        .map((entry) => `- ${entry.recordedAt} :: ${entry.title} :: ${entry.payload.decisionLog || entry.notes || 'No decision replay text.'}`);
    case 'bps.alerts':
      return model.alerts.length
        ? model.alerts.map((alert) => `- ${alert.severity.toUpperCase()} :: ${alert.title} :: ${alert.detail}`)
        : ['No active BPS alerts.'];
    case 'bps.research':
      return model.researchNotes.length
        ? model.researchNotes.slice(0, 5).map((note) => `- ${note.template} :: ${note.title} :: ${note.dateTime}`)
        : ['No research notes recorded.'];
    case 'bps.export': {
      const output = exportBpsSubject(data, subjectToken, formatToken === 'md' ? 'md' : 'json');
      return output.split('\n').slice(0, 18);
    }
    default:
      return [];
  }
};
