import React, { useState } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

// Lightweight local fallback for settings until a real hook/store is wired
interface LocalSettings {
  model: string;
  maxTokens: number;
  ttsSpeed: number;
  autoTranscribe: boolean;
  saveTranscripts: boolean;
  voiceId: string;
}

function useLocalSettings(initial?: Partial<LocalSettings>): [LocalSettings, (updates: Partial<LocalSettings>) => void] {
  const [settings, setSettings] = useState<LocalSettings>({
    model: 'gpt-4o',
    maxTokens: 1000,
    ttsSpeed: 1.0,
    autoTranscribe: true,
    saveTranscripts: true,
    voiceId: '21m00Tcm4TlvDq8ikWAM',
    ...initial,
  });

  const update = (updates: Partial<LocalSettings>) => setSettings(prev => ({ ...prev, ...updates }));
  return [settings, update];
}

// Simple gear icon placeholder
const GearIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M19.4 15a7.97 7.97 0 0 0 .1-2 7.97 7.97 0 0 0-.1-2l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.5a.5.5 0 0 0-.6-.2l-2.5 1a8.2 8.2 0 0 0-3.4-2l-.4-2.6a.5.5 0 0 0-.5-.4h-4a.5.5 0 0 0-.5.4l-.4 2.6a8.2 8.2 0 0 0-3.4 2l-2.5-1a.5.5 0 0 0-.6.2l-2 3.5a.5.5 0 0 0 .1.7L2.6 11a7.97 7.97 0 0 0-.1 2c0 .7 0 1.3.1 2l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.5a.5.5 0 0 0 .6.2l2.5-1a8.2 8.2 0 0 0 3.4 2l.4 2.6a.5.5 0 0 0 .5.4h4a.5.5 0 0 0 .5-.4l.4-2.6a8.2 8.2 0 0 0 3.4-2l2.5 1a.5.5 0 0 0 .6-.2l2-3.5a.5.5 0 0 0-.1-.7L19.4 15Z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const CollapsibleSettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onToggle }) => {
  const [settings, setSettings] = useLocalSettings();

  return (
    <div className={`settings-panel ${isOpen ? 'open' : 'collapsed'}`}>
      <button className="settings-toggle" onClick={onToggle} aria-label="Toggle settings">
        <GearIcon className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="settings-content">
          <div className="setting-group">
            <label>AI Model</label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ model: e.target.value })}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-5-mini">GPT-5 Mini</option>
              <option value="gpt-5-nano">GPT-5 Nano</option>
              <option value="gpt-4.1-nano">GPT-4.1 Nano</option>
              <option value="claude-3-7-sonnet">Claude 3.7 Sonnet</option>
              <option value="claude-3-7-opus">Claude 3.7 Opus</option>
            </select>
          </div>

          <div className="setting-group">
            <label>Max Response Length</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="50"
                max="4000"
                value={settings.maxTokens}
                onChange={(e) => setSettings({ maxTokens: parseInt(e.target.value || '0', 10) })}
              />
              <span>tokens</span>
            </div>
          </div>

          <div className="setting-group">
            <label>Speech Speed: {settings.ttsSpeed}x</label>
            <input
              type="range"
              min="0.75"
              max="2"
              step="0.05"
              value={settings.ttsSpeed}
              onChange={(e) => setSettings({ ttsSpeed: parseFloat(e.target.value) })}
            />
            <div className="flex justify-between text-xs">
              <span>0.75x</span>
              <span>1x</span>
              <span>1.5x</span>
              <span>2x</span>
            </div>
          </div>

          <details className="advanced-settings">
            <summary>Advanced</summary>
            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.autoTranscribe}
                  onChange={(e) => setSettings({ autoTranscribe: e.target.checked })}
                />
                Auto-transcribe on start
              </label>
            </div>

            <div className="setting-group">
              <label>
                <input
                  type="checkbox"
                  checked={settings.saveTranscripts}
                  onChange={(e) => setSettings({ saveTranscripts: e.target.checked })}
                />
                Save transcripts
              </label>
            </div>

            <div className="setting-group">
              <label>Voice Profile</label>
              <select
                value={settings.voiceId}
                onChange={(e) => setSettings({ voiceId: e.target.value })}
              >
                <option value="21m00Tcm4TlvDq8ikWAM">Rachel</option>
                <option value="pNInz6obpgDQGcFmaJgB">Adam</option>
                <option value="Yko7PKHZNXotIFUBG7I9">Sam</option>
              </select>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default CollapsibleSettingsPanel;


