import { PRODUCT_NAME } from './cryptoVault.js';

const INSTALL_ID_KEY = 'osa-midnight-oil.install-id';

export const APP_RELEASE = {
  product: PRODUCT_NAME,
  version: '1.2.0-beta.1',
  channel: 'waitlist-beta',
  cohort: 'invited-beta',
  releaseDate: '2026-04-19',
  releaseNotes: [
    'Native vault migration and local-first security baseline.',
    'Backup, recovery, and support surfaces for production beta readiness.',
    'Trust-center enhancements across Overview, Control Room, and Midnight Console.',
    'Nostr Lounge beta polish, relay diagnostics, and Wallet Vault identity mirroring.',
  ],
};

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const createInstallId = () =>
  `ros-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;

export const getOrCreateInstallId = () => {
  if (!canUseStorage()) {
    return 'ros-ephemeral';
  }

  const existing = window.localStorage.getItem(INSTALL_ID_KEY);
  if (existing) {
    return existing;
  }

  const next = createInstallId();
  window.localStorage.setItem(INSTALL_ID_KEY, next);
  return next;
};

const formatStateLabel = (value, fallback) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
};

export const getAccountStatus = (settings = {}) => ({
  mode: 'optional',
  state: 'local-only',
  label: 'Local-first beta',
  inviteCode: typeof settings.betaInviteCode === 'string' ? settings.betaInviteCode.trim() : '',
  waitlistSource:
    typeof settings.betaWaitlistSource === 'string' && settings.betaWaitlistSource.trim()
      ? settings.betaWaitlistSource.trim()
      : 'waitlist',
  installId: getOrCreateInstallId(),
});

export const getEntitlementStatus = () => ({
  state: 'beta-free',
  label: 'Free beta access',
  futureTier: 'solo',
});

export const getReleaseStatus = (session = {}) => ({
  ...APP_RELEASE,
  backend: session.backend || 'web-beta',
  lifecycle: session.lifecycle || 'setup',
  runtime: session.backend === 'tauri-native' ? 'native-desktop' : 'web-beta',
});

export const getBetaSignals = (settings = {}) => ({
  onboardingCompletedAt: settings.betaOnboardingCompletedAt || '',
  firstVaultCreatedAt: settings.betaFirstVaultCreatedAt || '',
  lastOpenedAt: settings.betaLastOpenedAt || '',
  lastSnapshotExportAt: settings.betaLastSnapshotExportAt || '',
  lastSnapshotImportAt: settings.betaLastSnapshotImportAt || '',
  lastBackupValidationAt: settings.betaLastBackupValidationAt || '',
  lastSupportBundleAt: settings.betaLastSupportBundleAt || '',
  feedbackUpdatedAt: settings.betaFeedbackUpdatedAt || '',
  metrics: {
    launchCount: Number.isFinite(settings.betaMetrics?.launchCount) ? settings.betaMetrics.launchCount : 0,
    snapshotExportCount:
      Number.isFinite(settings.betaMetrics?.snapshotExportCount) ? settings.betaMetrics.snapshotExportCount : 0,
    snapshotImportCount:
      Number.isFinite(settings.betaMetrics?.snapshotImportCount) ? settings.betaMetrics.snapshotImportCount : 0,
    supportBundleCount:
      Number.isFinite(settings.betaMetrics?.supportBundleCount) ? settings.betaMetrics.supportBundleCount : 0,
    feedbackDraftCount:
      Number.isFinite(settings.betaMetrics?.feedbackDraftCount) ? settings.betaMetrics.feedbackDraftCount : 0,
  },
});

export const getWorkspaceHealth = ({ data, session, fileVaultEntries = [] }) => {
  const settings = data?.settings ?? {};
  const warnings = [];
  const checks = [];

  const backupState = settings.betaLastSnapshotExportAt ? 'healthy' : 'attention';
  const fileVaultState = fileVaultEntries.some((entry) => entry.orphaned) ? 'attention' : 'healthy';
  const onboardingState = settings.betaOnboardingCompletedAt ? 'healthy' : 'attention';
  const vaultState = session?.lifecycle === 'unlocked' ? 'healthy' : 'attention';

  checks.push({
    id: 'vault',
    label: 'Vault lifecycle',
    state: vaultState,
    detail: `${formatStateLabel(session?.lifecycle, 'Unknown')} via ${formatStateLabel(session?.backend, 'Unknown backend')}`,
  });
  checks.push({
    id: 'backup',
    label: 'Recovery bundle',
    state: backupState,
    detail: settings.betaLastSnapshotExportAt
      ? `Last export ${new Date(settings.betaLastSnapshotExportAt).toLocaleString()}`
      : 'No encrypted export recorded yet.',
  });
  checks.push({
    id: 'validation',
    label: 'Backup drill',
    state: settings.betaLastBackupValidationAt ? 'healthy' : 'attention',
    detail: settings.betaLastBackupValidationAt
      ? `Validated ${new Date(settings.betaLastBackupValidationAt).toLocaleString()}`
      : 'Restore validation still needs a test run.',
  });
  checks.push({
    id: 'file-vault',
    label: 'File vault',
    state: fileVaultState,
    detail: fileVaultEntries.length
      ? `${fileVaultEntries.filter((entry) => entry.orphaned).length} orphaned of ${fileVaultEntries.length} encrypted blobs`
      : 'No encrypted file blobs stored.',
  });
  checks.push({
    id: 'onboarding',
    label: 'Operator readiness',
    state: onboardingState,
    detail: settings.betaOnboardingCompletedAt
      ? `Onboarding completed ${new Date(settings.betaOnboardingCompletedAt).toLocaleDateString()}`
      : 'First-run onboarding still pending.',
  });

  if (!settings.betaOnboardingCompletedAt) {
    warnings.push('Complete onboarding to capture the local-first and recovery workflow.');
  }
  if (!settings.betaLastSnapshotExportAt) {
    warnings.push('Export an encrypted recovery bundle before trusting ROS with daily work.');
  }
  if (fileVaultEntries.some((entry) => entry.orphaned)) {
    warnings.push('Purge orphaned encrypted file-vault blobs to keep storage health clean.');
  }
  if (session?.backend !== 'tauri-native') {
    warnings.push('The web beta remains the compatibility path; native desktop is the long-term trust boundary.');
  }

  const healthyChecks = checks.filter((check) => check.state === 'healthy').length;
  return {
    status: warnings.length ? 'attention' : 'healthy',
    summary: warnings.length
      ? `${healthyChecks}/${checks.length} trust checks healthy`
      : 'All core trust checks are healthy.',
    checks,
    warnings,
  };
};

export const buildSupportBundle = ({ data, session, fileVaultEntries = [], feedbackDraft = '' }) => {
  const accountStatus = getAccountStatus(data?.settings);
  const entitlementStatus = getEntitlementStatus();
  const releaseStatus = getReleaseStatus(session);
  const health = getWorkspaceHealth({ data, session, fileVaultEntries });
  const betaSignals = getBetaSignals(data?.settings);

  return {
    generatedAt: new Date().toISOString(),
    installId: accountStatus.installId,
    product: releaseStatus.product,
    release: releaseStatus,
    accountStatus,
    entitlementStatus,
    betaSignals,
    workspaceHealth: health,
    diagnostics: {
      notes: data?.notes?.length ?? 0,
      library: data?.library?.length ?? 0,
      calendar: data?.calendarEvents?.length ?? 0,
      bookmarks: data?.bookmarks?.length ?? 0,
      inventory: data?.inventory?.length ?? 0,
      profiles: data?.profiles?.length ?? 0,
      wallets: data?.wallets?.length ?? 0,
      clocks: data?.clocks?.length ?? 0,
      flows: data?.flowBoards?.length ?? 0,
      conversations: data?.comms?.conversations?.length ?? 0,
      fileVaultEntries: fileVaultEntries.length,
      orphanedFileVaultEntries: fileVaultEntries.filter((entry) => entry.orphaned).length,
      privacyFlags: {
        sessionDefenseEnabled: Boolean(data?.settings?.sessionDefenseEnabled),
        privacyModeEnabled: Boolean(data?.settings?.privacyModeEnabled),
        localOnly: Boolean(data?.settings?.localOnly),
      },
    },
    operatorContext: {
      codename: data?.settings?.codename || PRODUCT_NAME,
      operator: data?.settings?.operator || 'Unknown operator',
      theme: data?.settings?.theme || 'cypher',
      feedbackDraft: typeof feedbackDraft === 'string' ? feedbackDraft.trim() : '',
    },
  };
};
