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
  browser: {
    id: 'browser',
    title: 'Browser',
    icon: '🌐',
    component: 'BrowserApp',
    description: 'Web browser for LimeOS',
    category: 'productivity',
  },
  quiz: {
    id: 'lime-quiz',
    title: 'Lime Quiz',
    icon: '🧠',
    component: 'LimeQuizApp',
    description: 'Interactive quiz application',
    category: 'education',
  },
  ai: {
    id: 'ai-assistant',
    title: 'AI Assistant',
    icon: '✨',
    component: 'AIAssistantApp',
    description: 'AI-powered assistant',
    category: 'productivity',
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    icon: '💻',
    component: 'TerminalApp',
    description: 'Command line interface',
    category: 'development',
  },
  rust: {
    id: 'rust-guide',
    title: 'Rust Guide',
    icon: '⚙️',
    component: 'RustGuideApp',
    description: 'Rust programming guide',
    category: 'education',
  },
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard',
    icon: '📊',
    component: 'DashboardApp',
    description: 'System dashboard',
    category: 'system',
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: '⚙️',
    component: 'SettingsApp',
    description: 'System settings',
    category: 'system',
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