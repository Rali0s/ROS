import React, { useState } from 'react';
import { Settings, Palette, Shield, Wifi, Volume2, Monitor, Save, RotateCcw } from 'lucide-react';

const SettingsApp = () => {
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState({
    theme: 'dark',
    accentColor: '#00ff88',
    fontSize: 'medium',
    animations: true,
    notifications: true,
    soundEnabled: true,
    volume: 75,
    securityLevel: 'enhanced',
    autoLock: true,
    lockTimeout: 5,
  });

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings({
      theme: 'dark',
      accentColor: '#00ff88',
      fontSize: 'medium',
      animations: true,
      notifications: true,
      soundEnabled: true,
      volume: 75,
      securityLevel: 'enhanced',
      autoLock: true,
      lockTimeout: 5,
    });
  };

  const saveSettings = () => {
    // In a real app, this would save to localStorage or send to server
    localStorage.setItem('limeos-settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Monitor },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'audio', label: 'Audio', icon: Volume2 },
  ];

  return (
    <div className="flex h-full bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6 text-green-400" />
            Settings
          </h1>
        </div>
        <nav className="p-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-green-600 text-white'
                    : 'hover:bg-gray-700 text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold capitalize">{activeTab} Settings</h2>
          <div className="flex gap-2">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="w-12 h-8 border border-gray-600 rounded"
                  />
                  <span className="text-sm text-gray-400">{settings.accentColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Font Size</label>
                <select
                  value={settings.fontSize}
                  onChange={(e) => updateSetting('fontSize', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Animations</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.animations}
                    onChange={(e) => updateSetting('animations', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Notifications</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notifications}
                    onChange={(e) => updateSetting('notifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Apps</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <span>Default Browser</span>
                    <select className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
                      <option>Browser App</option>
                      <option>System Default</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                    <span>Default Terminal</span>
                    <select className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm">
                      <option>Terminal App</option>
                      <option>System Default</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Security Level</label>
                <select
                  value={settings.securityLevel}
                  onChange={(e) => updateSetting('securityLevel', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                >
                  <option value="basic">Basic</option>
                  <option value="enhanced">Enhanced</option>
                  <option value="maximum">Maximum</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto Lock</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoLock}
                    onChange={(e) => updateSetting('autoLock', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {settings.autoLock && (
                <div>
                  <label className="block text-sm font-medium mb-2">Lock Timeout (minutes)</label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={settings.lockTimeout}
                    onChange={(e) => updateSetting('lockTimeout', parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Sound</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              {settings.soundEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">Volume Level</label>
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-5 h-5 text-gray-400" />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={settings.volume}
                      onChange={(e) => updateSetting('volume', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-400 w-12">{settings.volume}%</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsApp;