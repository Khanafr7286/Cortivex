import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Workflow,
  Play,
  Brain,
  Network,
  GitBranch,
  Clock,
  BarChart3,
  Settings,
  X,
  Server,
  Wifi,
  Palette,
  FolderOpen,
  Save,
  Check,
} from 'lucide-react';
import { useCortivexStore } from '@/stores/cortivexStore';
import type { ViewType } from '@/lib/types';
import clsx from 'clsx';

const viewItems: { id: ViewType; icon: typeof Workflow; label: string }[] = [
  { id: 'editor', icon: Workflow, label: 'Pipeline Editor' },
  { id: 'execution', icon: Play, label: 'Live Execution' },
  { id: 'mesh', icon: Network, label: 'Mesh Visualization' },
  { id: 'knowledge', icon: GitBranch, label: 'Knowledge Graph' },
  { id: 'timeline', icon: Clock, label: 'Timeline' },
  { id: 'learning', icon: BarChart3, label: 'Analytics' },
];

export function Sidebar() {
  const { activeView, setActiveView, isConnected } = useCortivexStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center w-14 h-full bg-deep-space z-50 select-none">
        {/* Logo */}
        <div className="h-[52px] flex items-center justify-center">
          <motion.div
            className="cursor-pointer flex items-center gap-1"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <CortivexLogo />
          </motion.div>
        </div>

        {/* View Icons */}
        <div className="flex-1 flex flex-col items-center gap-1 pt-2">
          {viewItems.map((item) => {
            const isActive = activeView === item.id;
            const Icon = item.icon;

            return (
              <div key={item.id} className="tooltip-trigger relative">
                <button
                  onClick={() => setActiveView(item.id)}
                  className={clsx(
                    'relative w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200',
                    isActive
                      ? 'text-cortivex-cyan'
                      : 'text-text-muted hover:text-text-primary',
                  )}
                >
                  {/* Active left bar indicator */}
                  {isActive && (
                    <motion.div
                      className="absolute -left-[7px] top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-cortivex-cyan"
                      layoutId="activeIndicator"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={18} className="relative z-10" />
                </button>

                {/* Tooltip */}
                <div className="tooltip left-14 top-1/2 -translate-y-1/2">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-3 pb-4">
          {/* Settings */}
          <div className="tooltip-trigger relative">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
            >
              <Settings size={18} />
            </button>
            <div className="tooltip left-14 top-1/2 -translate-y-1/2">
              Settings
            </div>
          </div>

          {/* Connection health dots */}
          <div className="flex items-center gap-1.5">
            <div className={clsx(
              'w-[5px] h-[5px] rounded-full',
              isConnected ? 'bg-success-green' : 'bg-text-muted',
            )} />
            <div className={clsx(
              'w-[5px] h-[5px] rounded-full',
              isConnected ? 'bg-success-green' : 'bg-text-muted',
            )} />
            <div className={clsx(
              'w-[5px] h-[5px] rounded-full',
              isConnected ? 'bg-success-green' : 'bg-error-coral animate-pulse-alive',
            )} />
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

/* --- Settings Panel (now with persistence) --- */

const SETTINGS_KEY = 'cortivex-settings';

interface SettingsData {
  serverUrl: string;
  wsUrl: string;
  theme: string;
  pipelineDir: string;
  autoSave: boolean;
}

const defaultSettings: SettingsData = {
  serverUrl: 'localhost:3939',
  wsUrl: 'ws://localhost:3939/ws',
  theme: 'dark',
  pipelineDir: './pipelines',
  autoSave: true,
};

function loadSettings(): SettingsData {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultSettings;
}

function saveSettings(settings: SettingsData) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<SettingsData>(loadSettings);
  const [saved, setSaved] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateField = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-[90]"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -320, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed left-14 top-0 bottom-0 w-80 bg-surface border-r border-canvas-border z-[100] overflow-y-auto"
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-label uppercase text-text-muted flex items-center gap-2">
              <Settings size={14} className="text-cortivex-cyan" />
              Settings
            </h2>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-5">
            {/* Server URL */}
            <div>
              <label className="text-label uppercase text-text-muted flex items-center gap-1.5 mb-1.5">
                <Server size={12} />
                Server URL
              </label>
              <input
                type="text"
                value={settings.serverUrl}
                onChange={(e) => updateField('serverUrl', e.target.value)}
                className="w-full bg-surface-light border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-cortivex-cyan/40 transition-colors"
              />
            </div>

            {/* WebSocket URL */}
            <div>
              <label className="text-label uppercase text-text-muted flex items-center gap-1.5 mb-1.5">
                <Wifi size={12} />
                WebSocket URL
              </label>
              <input
                type="text"
                value={settings.wsUrl}
                onChange={(e) => updateField('wsUrl', e.target.value)}
                className="w-full bg-surface-light border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-cortivex-cyan/40 transition-colors"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="text-label uppercase text-text-muted flex items-center gap-1.5 mb-1.5">
                <Palette size={12} />
                Theme
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateField('theme', 'dark')}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-xs font-mono border transition-colors',
                    settings.theme === 'dark'
                      ? 'bg-cortivex-cyan/10 border-cortivex-cyan/30 text-cortivex-cyan'
                      : 'bg-surface-light border-canvas-border text-text-muted hover:text-text-primary',
                  )}
                >
                  Dark
                </button>
                <button
                  disabled
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono border bg-surface-light border-canvas-border text-text-dim cursor-not-allowed"
                >
                  Light (soon)
                </button>
              </div>
            </div>

            {/* Pipeline Directory */}
            <div>
              <label className="text-label uppercase text-text-muted flex items-center gap-1.5 mb-1.5">
                <FolderOpen size={12} />
                Pipeline Directory
              </label>
              <input
                type="text"
                value={settings.pipelineDir}
                onChange={(e) => updateField('pipelineDir', e.target.value)}
                className="w-full bg-surface-light border border-canvas-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary focus:outline-none focus:border-cortivex-cyan/40 transition-colors"
              />
            </div>

            {/* Auto-save Toggle */}
            <div>
              <label className="text-label uppercase text-text-muted flex items-center gap-1.5 mb-1.5">
                <Save size={12} />
                Auto-save
              </label>
              <button
                onClick={() => updateField('autoSave', !settings.autoSave)}
                className="flex items-center gap-3"
              >
                <div
                  className={clsx(
                    'w-9 h-5 rounded-full transition-colors relative',
                    settings.autoSave ? 'bg-cortivex-cyan/30' : 'bg-surface-light',
                  )}
                >
                  <div
                    className={clsx(
                      'absolute top-0.5 w-4 h-4 rounded-full transition-all',
                      settings.autoSave
                        ? 'left-[18px] bg-cortivex-cyan'
                        : 'left-0.5 bg-text-muted',
                    )}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted">
                  {settings.autoSave ? 'Enabled' : 'Disabled'}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-canvas-border" />

            {/* Save + Close buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className={clsx(
                  'flex-1 px-4 py-2 rounded-lg text-xs font-mono border transition-all flex items-center justify-center gap-1.5',
                  saved
                    ? 'bg-success-green/10 border-success-green/30 text-success-green'
                    : 'bg-cortivex-cyan/10 border-cortivex-cyan/30 text-cortivex-cyan hover:bg-cortivex-cyan/20',
                )}
              >
                {saved ? <><Check size={12} /> Saved</> : 'Save'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-surface-light border border-canvas-border text-xs font-mono text-text-muted hover:text-text-primary hover:border-cortivex-cyan/20 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}

function CortivexLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Neural mesh brain icon */}
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="#4F8EF7" />
          <stop offset="100%" stopColor="#7B6EF6" />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#logoGlow)">
        {/* Outer ring */}
        <circle
          cx="16"
          cy="16"
          r="13"
          stroke="url(#logoGrad)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.6"
        />
        {/* Inner neural nodes */}
        <circle cx="16" cy="9" r="2" fill="#4F8EF7" />
        <circle cx="10" cy="19" r="2" fill="#7B6EF6" />
        <circle cx="22" cy="19" r="2" fill="#3DD68C" />
        <circle cx="16" cy="16" r="2.5" fill="url(#logoGrad)" />
        {/* Neural connections */}
        <line x1="16" y1="11" x2="16" y2="13.5" stroke="#4F8EF7" strokeWidth="1" opacity="0.7" />
        <line x1="12" y1="18" x2="13.8" y2="16.8" stroke="#7B6EF6" strokeWidth="1" opacity="0.7" />
        <line x1="20" y1="18" x2="18.2" y2="16.8" stroke="#3DD68C" strokeWidth="1" opacity="0.7" />
        {/* Outer neural arcs */}
        <path d="M 16 9 Q 22 9 22 19" stroke="url(#logoGrad)" strokeWidth="0.8" fill="none" opacity="0.3" />
        <path d="M 16 9 Q 10 9 10 19" stroke="url(#logoGrad)" strokeWidth="0.8" fill="none" opacity="0.3" />
        <path d="M 10 19 Q 16 24 22 19" stroke="url(#logoGrad)" strokeWidth="0.8" fill="none" opacity="0.3" />
      </g>
    </svg>
  );
}
