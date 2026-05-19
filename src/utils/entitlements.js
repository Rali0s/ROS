export const LICENSE_FEATURES = {
  CORE_COCKPIT: 'core_cockpit',
  ENCRYPTED_WORKSPACE: 'encrypted_workspace',
  MANUAL_MEMORY_CAPTURE: 'manual_memory_capture',
  BASIC_SEARCH: 'basic_search',
  COMMAND_MEMORY_CONSOLE: 'command_memory_console',
  CORE_MODULES: 'core_modules',
  UNLIMITED_PROJECTS: 'unlimited_projects',
  FULL_MODULE_ACCESS: 'full_module_access',
  MODEL_WORKSPACE: 'model_workspace',
  SECURITY_MODEL_V1: 'security_model_v1',
  ADVANCED_BACKUP_EXPORT: 'advanced_backup_export',
  FSOCIETY_LAN: 'fsociety_lan',
  ORGANIZATION_PANEL: 'organization_panel',
  LINKED_ROS_NODES: 'linked_ros_nodes',
  CONTROLLER_NODE_TEAMING: 'controller_node_teaming',
  FLEET_POLICY: 'fleet_policy',
  ENTERPRISE_BRANDING: 'enterprise_branding',
  DEVELOPER_MODE: 'developer_mode',
};

const INDIVIDUAL_FEATURES = [
  LICENSE_FEATURES.CORE_COCKPIT,
  LICENSE_FEATURES.ENCRYPTED_WORKSPACE,
  LICENSE_FEATURES.MANUAL_MEMORY_CAPTURE,
  LICENSE_FEATURES.BASIC_SEARCH,
  LICENSE_FEATURES.COMMAND_MEMORY_CONSOLE,
  LICENSE_FEATURES.CORE_MODULES,
];

const DEVELOPER_BYPASS_FEATURES = [...Object.values(LICENSE_FEATURES), 'all_features'];

export const FEATURE_LABELS = {
  [LICENSE_FEATURES.CORE_COCKPIT]: 'Core cockpit',
  [LICENSE_FEATURES.ENCRYPTED_WORKSPACE]: 'Encrypted workspace',
  [LICENSE_FEATURES.MANUAL_MEMORY_CAPTURE]: 'Manual memory capture',
  [LICENSE_FEATURES.BASIC_SEARCH]: 'Basic search',
  [LICENSE_FEATURES.COMMAND_MEMORY_CONSOLE]: 'Command Memory Console',
  [LICENSE_FEATURES.CORE_MODULES]: 'Core modules',
  [LICENSE_FEATURES.UNLIMITED_PROJECTS]: 'Unlimited projects',
  [LICENSE_FEATURES.FULL_MODULE_ACCESS]: 'Full module access',
  [LICENSE_FEATURES.MODEL_WORKSPACE]: 'Model Workspace',
  [LICENSE_FEATURES.SECURITY_MODEL_V1]: 'Security Model v1',
  [LICENSE_FEATURES.ADVANCED_BACKUP_EXPORT]: 'Advanced backup/export',
  [LICENSE_FEATURES.FSOCIETY_LAN]: 'F*Society LAN',
  [LICENSE_FEATURES.ORGANIZATION_PANEL]: 'Organization panel',
  [LICENSE_FEATURES.LINKED_ROS_NODES]: 'Linked ROS nodes',
  [LICENSE_FEATURES.CONTROLLER_NODE_TEAMING]: 'Controller/node teaming',
  [LICENSE_FEATURES.FLEET_POLICY]: 'Fleet policy',
  [LICENSE_FEATURES.ENTERPRISE_BRANDING]: 'Enterprise branding',
  [LICENSE_FEATURES.DEVELOPER_MODE]: 'Developer mode',
};

export const createIndividualLicenseState = (warning = 'No license installed. Individual ROS is active.') => ({
  status: 'individual',
  tier: 'individual',
  label: 'Individual ROS',
  expiresAt: '',
  issuedAt: '',
  licenseId: '',
  customerEmail: '',
  features: INDIVIDUAL_FEATURES,
  warning,
  lastValidatedAt: '',
});

export const createDeveloperBypassLicenseState = () => ({
  status: 'dev-bypass',
  tier: 'developer',
  label: 'Developer',
  expiresAt: '',
  issuedAt: '',
  licenseId: 'vite-dev-dev-bypass',
  customerEmail: '',
  features: DEVELOPER_BYPASS_FEATURES,
  warning: 'Development mode: signed-license enforcement is bypassed. Remove or verify disabled before public release.',
  lastValidatedAt: '',
});

export const normalizeLicenseState = (state) => {
  if (!state || typeof state !== 'object') {
    if (import.meta.env.DEV) {
      return createDeveloperBypassLicenseState();
    }

    return createIndividualLicenseState('Native license validation is unavailable in this runtime.');
  }

  return {
    ...createIndividualLicenseState(''),
    ...state,
    features: Array.isArray(state.features) ? state.features : INDIVIDUAL_FEATURES,
  };
};

export const hasLicenseFeature = (licenseState, featureId) => {
  const normalized = normalizeLicenseState(licenseState);
  return normalized.features.includes(featureId) || normalized.features.includes('all_features');
};

export const getTierBadgeClass = (licenseState) => {
  const tier = normalizeLicenseState(licenseState).tier;

  if (tier === 'developer') {
    return 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100';
  }
  if (tier === 'enterprise') {
    return 'border-amber-300/24 bg-amber-500/10 text-amber-100';
  }
  if (tier === 'pro' || tier === 'operator-pro' || tier === 'founder' || tier === 'founder-edition') {
    return 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100';
  }

  return 'border-white/12 bg-white/[0.055] text-slate-100';
};
