// LimeOS System Constants and App Registry

export const SYSTEM_THEME = {
  name: 'LimeOS',
  colors: {
    primary: '#00ff88',
    secondary: '#00cc66',
    accent: '#009944',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#333333',
    success: '#00ff88',
    warning: '#ffaa00',
    error: '#ff4444',
  },
  fonts: {
    primary: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
};

export const APPS = {
  protonMail: {
    id: 'proton-mail',
    title: 'Proton Mail',
    icon: '📧',
    component: 'ProtonMailApp',
    description: 'Encrypted mail status dashboard',
    category: 'security',
  },
  protonVpn: {
    id: 'proton-vpn',
    title: 'Proton VPN',
    icon: '🛡️',
    component: 'ProtonVPNApp',
    description: 'VPN status and routing overview',
    category: 'security',
  },
  secureNotepad: {
    id: 'secure-notepad',
    title: 'Secure Notepad',
    icon: '🗒️',
    component: 'SecureNotepadApp',
    description: 'Mission briefing and notes',
    category: 'productivity',
  },
  rosChecks: {
    id: 'ros-checks',
    title: 'ROS Checks',
    icon: '✅',
    component: 'ROSChecksApp',
    description: 'Operational checklist',
    category: 'operations',
  },
  darknetOps: {
    id: 'darknet-ops',
    title: 'DarkNet Ops',
    icon: '🌑',
    component: 'DarkNetOpsApp',
    description: 'Monitoring use case and tooling',
    category: 'operations',
  },
};

export const WINDOW_STATES = {
  MINIMIZED: 'minimized',
  MAXIMIZED: 'maximized',
  NORMAL: 'normal',
};

export const SECURITY_LEVELS = {
  BASIC: 'basic',
  ENHANCED: 'enhanced',
  MAXIMUM: 'maximum',
};
