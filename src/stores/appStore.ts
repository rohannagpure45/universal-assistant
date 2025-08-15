import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AudioConfig, AIModel } from '@/types';

// Audio device types
export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  groupId: string;
}

// Phase 3 Audio Enhancement Settings
export interface VoiceActivitySettings {
  enabled: boolean;
  sensitivity: number; // 0-1, higher means more sensitive
  minSpeechDuration: number; // minimum ms of speech to trigger
  maxSilenceDuration: number; // ms of silence before declaring speech end
  energyThreshold: number; // energy level threshold for speech detection
  frequencyThreshold: number; // frequency-based speech detection
  adaptiveThreshold: boolean; // dynamically adjust thresholds
}

export interface SilenceDetectionSettings {
  enabled: boolean;
  silenceThreshold: number; // audio level threshold for silence
  silenceDuration: number; // ms of silence before triggering callback
  debounceMs: number; // debounce silence detection
}

export interface RealtimeProcessingSettings {
  enabled: boolean;
  latencyTarget: number; // target latency in ms
  bufferOptimization: boolean;
  concurrentProcessing: boolean;
  performanceMonitoring: boolean;
}

export interface VocalInterruptSettings {
  enabled: boolean;
  commands: string[]; // voice commands like "stop", "pause", "skip"
  sensitivity: number; // command detection sensitivity
  confirmationRequired: boolean; // require confirmation for commands
  customCommands: Record<string, string>; // custom command mappings
}

// App settings types
export interface AudioSettings {
  inputDeviceId: string | null;
  outputDeviceId: string | null;
  volume: number;
  micGain: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
  bufferSize: number;
  // Phase 3 Enhanced Features
  voiceActivityDetection: VoiceActivitySettings;
  silenceDetection: SilenceDetectionSettings;
  realtimeProcessing: RealtimeProcessingSettings;
  vocalInterrupts: VocalInterruptSettings;
  enablePhase3Features: boolean;
}

export interface UISettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  compact: boolean;
  showWaveform: boolean;
  showTranscriptTimestamps: boolean;
  autoScroll: boolean;
  fontSize: 'small' | 'medium' | 'large';
  animationsEnabled: boolean;
  soundEffectsEnabled: boolean;
}

export interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
  focusVisible: boolean;
  announceTranscript: boolean;
}

export interface AISettings {
  defaultModel: AIModel;
  fallbackModel: AIModel;
  maxTokens: number;
  temperature: number;
  enableAutoResponse: boolean;
  responseDelay: number;
  confidenceThreshold: number;
}

export interface TTSSettings {
  voiceId: string;
  speed: number;
  pitch: number;
  volume: number;
  enabled: boolean;
  autoPlay: boolean;
  ssmlEnabled: boolean;
}

export interface NotificationSettings {
  browserNotifications: boolean;
  soundNotifications: boolean;
  transcriptNotifications: boolean;
  errorNotifications: boolean;
  meetingReminders: boolean;
  participantJoined: boolean;
  transcriptionComplete: boolean;
  systemUpdates: boolean;
  securityAlerts: boolean;
}

// App error types
export interface AppError {
  code: string;
  message: string;
  operation: string;
  timestamp: Date;
  cause?: Error;
}

// App store state interface
export interface AppState {
  // Device management
  availableDevices: AudioDevice[];
  isLoadingDevices: boolean;
  deviceError: AppError | null;
  
  // Settings
  audioSettings: AudioSettings;
  uiSettings: UISettings;
  accessibilitySettings: AccessibilitySettings;
  aiSettings: AISettings;
  ttsSettings: TTSSettings;
  notificationSettings: NotificationSettings;
  
  // App state
  isOnline: boolean;
  appVersion: string;
  lastSyncTime: Date | null;
  
  // Performance monitoring
  performanceMetrics: {
    audioLatency: number;
    networkLatency: number;
    memoryUsage: number;
    cpuUsage: number;
    // Phase 3 Enhanced Metrics
    voiceActivityAccuracy: number;
    speechDetectionLatency: number;
    silenceDetectionLatency: number;
    realtimeProcessingLatency: number;
    audioQueueLength: number;
    voiceActivityLevel: number;
    fragmentCompleteness: number;
  };
  
  // UI state
  sidebarOpen: boolean;
  activePanel: 'transcript' | 'participants' | 'settings' | 'notes' | null;
  modalOpen: string | null;
  notifications: Notification[];
  
  // Error handling
  globalErrors: AppError[];
  errorReporting: boolean;
  
  // Feature flags
  featureFlags: Record<string, boolean>;
}

// Notification type
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  persistent: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// App store actions interface
export interface AppActions {
  // Device management
  loadAudioDevices: () => Promise<boolean>;
  refreshAudioDevices: () => Promise<boolean>;
  setAudioInputDevice: (deviceId: string | null) => Promise<boolean>;
  setAudioOutputDevice: (deviceId: string | null) => Promise<boolean>;
  testAudioDevice: (deviceId: string, type: 'input' | 'output') => Promise<boolean>;
  
  // Settings management
  updateAudioSettings: (settings: Partial<AudioSettings>) => void;
  updateUISettings: (settings: Partial<UISettings>) => void;
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
  updateAISettings: (settings: Partial<AISettings>) => void;
  updateTTSSettings: (settings: Partial<TTSSettings>) => void;
  updateNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  resetSettingsToDefault: (category?: 'audio' | 'ui' | 'accessibility' | 'ai' | 'tts' | 'notifications') => void;
  
  // App state management
  setOnlineStatus: (isOnline: boolean) => void;
  updatePerformanceMetrics: (metrics: Partial<AppState['performanceMetrics']>) => void;
  updateLastSyncTime: () => void;
  
  // UI state management
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: AppState['activePanel']) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  // Notification management
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markNotificationAsRead: (id: string) => void;
  
  // Error handling
  addGlobalError: (error: AppError) => void;
  removeGlobalError: (code: string) => void;
  clearGlobalErrors: () => void;
  setErrorReporting: (enabled: boolean) => void;
  
  // Feature flags
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  getFeatureFlag: (flag: string) => boolean;
  
  // Utility actions
  exportSettings: () => string;
  importSettings: (settingsJson: string) => Promise<boolean>;
  checkForUpdates: () => Promise<boolean>;
  reportIssue: (issue: { title: string; description: string; category: string }) => Promise<boolean>;
}

type AppStore = AppState & AppActions;

// Default Phase 3 settings
const defaultVoiceActivitySettings: VoiceActivitySettings = {
  enabled: true,
  sensitivity: 0.6,
  minSpeechDuration: 300,
  maxSilenceDuration: 800,
  energyThreshold: 0.01,
  frequencyThreshold: 85,
  adaptiveThreshold: true,
};

const defaultSilenceDetectionSettings: SilenceDetectionSettings = {
  enabled: true,
  silenceThreshold: 30,
  silenceDuration: 1500,
  debounceMs: 100,
};

const defaultRealtimeProcessingSettings: RealtimeProcessingSettings = {
  enabled: true,
  latencyTarget: 500,
  bufferOptimization: true,
  concurrentProcessing: false,
  performanceMonitoring: true,
};

const defaultVocalInterruptSettings: VocalInterruptSettings = {
  enabled: true,
  commands: ['stop', 'pause', 'resume', 'skip', 'repeat'],
  sensitivity: 0.8,
  confirmationRequired: false,
  customCommands: {},
};

// Default settings
const defaultAudioSettings: AudioSettings = {
  inputDeviceId: null,
  outputDeviceId: null,
  volume: 0.8,
  micGain: 0.5,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  sampleRate: 44100,
  channelCount: 1,
  bufferSize: 4096,
  // Phase 3 Enhanced Features
  voiceActivityDetection: defaultVoiceActivitySettings,
  silenceDetection: defaultSilenceDetectionSettings,
  realtimeProcessing: defaultRealtimeProcessingSettings,
  vocalInterrupts: defaultVocalInterruptSettings,
  enablePhase3Features: true,
};

const defaultUISettings: UISettings = {
  theme: 'system',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  compact: false,
  showWaveform: true,
  showTranscriptTimestamps: true,
  autoScroll: true,
  fontSize: 'medium',
  animationsEnabled: true,
  soundEffectsEnabled: true,
};

const defaultAccessibilitySettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  keyboardNavigation: true,
  focusVisible: true,
  announceTranscript: false,
};

const defaultAISettings: AISettings = {
  defaultModel: 'gpt-4o',
  fallbackModel: 'gpt-4o-mini',
  maxTokens: 2000,
  temperature: 0.7,
  enableAutoResponse: true,
  responseDelay: 1000,
  confidenceThreshold: 0.8,
};

const defaultTTSSettings: TTSSettings = {
  voiceId: '21m00Tcm4TlvDq8ikWAM', // Default ElevenLabs voice
  speed: 1.0,
  pitch: 1.0,
  volume: 0.8,
  enabled: true,
  autoPlay: false,
  ssmlEnabled: false,
};

const defaultNotificationSettings: NotificationSettings = {
  browserNotifications: true,
  soundNotifications: true,
  transcriptNotifications: false,
  errorNotifications: true,
  meetingReminders: true,
  participantJoined: true,
  transcriptionComplete: true,
  systemUpdates: true,
  securityAlerts: true,
};

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          // Initial state
          availableDevices: [],
          isLoadingDevices: false,
          deviceError: null,
          
          audioSettings: defaultAudioSettings,
          uiSettings: defaultUISettings,
          accessibilitySettings: defaultAccessibilitySettings,
          aiSettings: defaultAISettings,
          ttsSettings: defaultTTSSettings,
          notificationSettings: defaultNotificationSettings,
          
          isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
          appVersion: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
          lastSyncTime: null,
          
          performanceMetrics: {
            audioLatency: 0,
            networkLatency: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            // Phase 3 Enhanced Metrics
            voiceActivityAccuracy: 0,
            speechDetectionLatency: 0,
            silenceDetectionLatency: 0,
            realtimeProcessingLatency: 0,
            audioQueueLength: 0,
            voiceActivityLevel: 0,
            fragmentCompleteness: 0,
          },
          
          sidebarOpen: true,
          activePanel: null,
          modalOpen: null,
          notifications: [],
          
          globalErrors: [],
          errorReporting: true,
          
          featureFlags: {
            'advanced-audio': true,
            'real-time-collaboration': true,
            'ai-summaries': true,
            'voice-profiles': true,
            'custom-rules': true,
            // Phase 3 Feature Flags
            'phase3-features': true,
            'voice-activity-detection': true,
            'silence-detection': true,
            'realtime-processing': true,
            'vocal-interrupts': true,
            'enhanced-tts': true,
            'streaming-audio': true,
            'message-queuing': true,
            'fragment-detection': true,
          },

          // Device management actions
          loadAudioDevices: async () => {
            set((state) => {
              state.isLoadingDevices = true;
              state.deviceError = null;
            });

            try {
              if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                throw new Error('Media devices API not supported');
              }

              const devices = await navigator.mediaDevices.enumerateDevices();
              const audioDevices: AudioDevice[] = devices
                .filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput')
                .map(device => ({
                  deviceId: device.deviceId,
                  label: device.label || `${device.kind} (${device.deviceId.slice(0, 8)})`,
                  kind: device.kind as 'audioinput' | 'audiooutput',
                  groupId: device.groupId,
                }));

              set((state) => {
                state.availableDevices = audioDevices;
                state.isLoadingDevices = false;
              });

              return true;
            } catch (error) {
              const deviceError: AppError = {
                code: 'DEVICE_LOAD_FAILED',
                message: 'Failed to load audio devices',
                operation: 'loadAudioDevices',
                timestamp: new Date(),
                cause: error as Error,
              };

              set((state) => {
                state.deviceError = deviceError;
                state.isLoadingDevices = false;
              });

              return false;
            }
          },

          refreshAudioDevices: async () => {
            return get().loadAudioDevices();
          },

          setAudioInputDevice: async (deviceId) => {
            try {
              if (deviceId) {
                // Test the device before setting it
                await navigator.mediaDevices.getUserMedia({
                  audio: { deviceId: { exact: deviceId } }
                });
              }

              set((state) => {
                state.audioSettings.inputDeviceId = deviceId;
              });

              return true;
            } catch (error) {
              get().addGlobalError({
                code: 'INPUT_DEVICE_SET_FAILED',
                message: 'Failed to set audio input device',
                operation: 'setAudioInputDevice',
                timestamp: new Date(),
                cause: error as Error,
              });

              return false;
            }
          },

          setAudioOutputDevice: async (deviceId) => {
            try {
              set((state) => {
                state.audioSettings.outputDeviceId = deviceId;
              });

              return true;
            } catch (error) {
              get().addGlobalError({
                code: 'OUTPUT_DEVICE_SET_FAILED',
                message: 'Failed to set audio output device',
                operation: 'setAudioOutputDevice',
                timestamp: new Date(),
                cause: error as Error,
              });

              return false;
            }
          },

          testAudioDevice: async (deviceId, type) => {
            try {
              if (type === 'input') {
                const stream = await navigator.mediaDevices.getUserMedia({
                  audio: { deviceId: { exact: deviceId } }
                });
                
                // Test for a short duration
                setTimeout(() => {
                  stream.getTracks().forEach(track => track.stop());
                }, 1000);
              }

              return true;
            } catch (error) {
              return false;
            }
          },

          // Settings management actions
          updateAudioSettings: (settings) => {
            set((state) => {
              state.audioSettings = { ...state.audioSettings, ...settings };
            });
          },

          updateUISettings: (settings) => {
            set((state) => {
              state.uiSettings = { ...state.uiSettings, ...settings };
            });
          },

          updateAccessibilitySettings: (settings) => {
            set((state) => {
              state.accessibilitySettings = { ...state.accessibilitySettings, ...settings };
            });
          },

          updateAISettings: (settings) => {
            set((state) => {
              state.aiSettings = { ...state.aiSettings, ...settings };
            });
          },

          updateTTSSettings: (settings) => {
            set((state) => {
              state.ttsSettings = { ...state.ttsSettings, ...settings };
            });
          },

          updateNotificationSettings: (settings) => {
            set((state) => {
              state.notificationSettings = { ...state.notificationSettings, ...settings };
            });
          },

          resetSettingsToDefault: (category) => {
            set((state) => {
              if (!category || category === 'audio') {
                state.audioSettings = defaultAudioSettings;
              }
              if (!category || category === 'ui') {
                state.uiSettings = defaultUISettings;
              }
              if (!category || category === 'accessibility') {
                state.accessibilitySettings = defaultAccessibilitySettings;
              }
              if (!category || category === 'ai') {
                state.aiSettings = defaultAISettings;
              }
              if (!category || category === 'tts') {
                state.ttsSettings = defaultTTSSettings;
              }
              if (!category || category === 'notifications') {
                state.notificationSettings = defaultNotificationSettings;
              }
            });
          },

          // App state management
          setOnlineStatus: (isOnline) => {
            set((state) => {
              state.isOnline = isOnline;
            });
          },

          updatePerformanceMetrics: (metrics) => {
            set((state) => {
              state.performanceMetrics = { ...state.performanceMetrics, ...metrics };
            });
          },

          updateLastSyncTime: () => {
            set((state) => {
              state.lastSyncTime = new Date();
            });
          },

          // UI state management
          toggleSidebar: () => {
            set((state) => {
              state.sidebarOpen = !state.sidebarOpen;
            });
          },

          setSidebarOpen: (open) => {
            set((state) => {
              state.sidebarOpen = open;
            });
          },

          setActivePanel: (panel) => {
            set((state) => {
              state.activePanel = panel;
            });
          },

          openModal: (modalId) => {
            set((state) => {
              state.modalOpen = modalId;
            });
          },

          closeModal: () => {
            set((state) => {
              state.modalOpen = null;
            });
          },

          // Notification management
          addNotification: (notification) => {
            const id = `notification-${Date.now()}-${Math.random()}`;
            
            set((state) => {
              state.notifications.push({
                ...notification,
                id,
                timestamp: new Date(),
              });
            });

            // Auto-remove non-persistent notifications after 5 seconds
            if (!notification.persistent) {
              setTimeout(() => {
                get().removeNotification(id);
              }, 5000);
            }

            return id;
          },

          removeNotification: (id) => {
            set((state) => {
              state.notifications = state.notifications.filter(n => n.id !== id);
            });
          },

          clearNotifications: () => {
            set((state) => {
              state.notifications = [];
            });
          },

          markNotificationAsRead: (id) => {
            // Implementation for future notification reading system
            set((state) => {
              const notification = state.notifications.find(n => n.id === id);
              if (notification && !notification.persistent) {
                state.notifications = state.notifications.filter(n => n.id !== id);
              }
            });
          },

          // Error handling
          addGlobalError: (error) => {
            set((state) => {
              state.globalErrors.push(error);
              // Keep only the last 10 errors
              if (state.globalErrors.length > 10) {
                state.globalErrors.shift();
              }
            });

            // Auto-show error notification
            get().addNotification({
              type: 'error',
              title: 'Application Error',
              message: error.message,
              persistent: false,
            });
          },

          removeGlobalError: (code) => {
            set((state) => {
              state.globalErrors = state.globalErrors.filter(error => error.code !== code);
            });
          },

          clearGlobalErrors: () => {
            set((state) => {
              state.globalErrors = [];
            });
          },

          setErrorReporting: (enabled) => {
            set((state) => {
              state.errorReporting = enabled;
            });
          },

          // Feature flags
          setFeatureFlag: (flag, enabled) => {
            set((state) => {
              state.featureFlags[flag] = enabled;
            });
          },

          getFeatureFlag: (flag) => {
            return get().featureFlags[flag] ?? false;
          },

          // Utility actions
          exportSettings: () => {
            const state = get();
            const settings = {
              audioSettings: state.audioSettings,
              uiSettings: state.uiSettings,
              accessibilitySettings: state.accessibilitySettings,
              aiSettings: state.aiSettings,
              ttsSettings: state.ttsSettings,
              notificationSettings: state.notificationSettings,
              featureFlags: state.featureFlags,
              exportedAt: new Date().toISOString(),
            };

            return JSON.stringify(settings, null, 2);
          },

          importSettings: async (settingsJson) => {
            try {
              const settings = JSON.parse(settingsJson);

              set((state) => {
                if (settings.audioSettings) {
                  state.audioSettings = { ...defaultAudioSettings, ...settings.audioSettings };
                }
                if (settings.uiSettings) {
                  state.uiSettings = { ...defaultUISettings, ...settings.uiSettings };
                }
                if (settings.accessibilitySettings) {
                  state.accessibilitySettings = { ...defaultAccessibilitySettings, ...settings.accessibilitySettings };
                }
                if (settings.aiSettings) {
                  state.aiSettings = { ...defaultAISettings, ...settings.aiSettings };
                }
                if (settings.ttsSettings) {
                  state.ttsSettings = { ...defaultTTSSettings, ...settings.ttsSettings };
                }
                if (settings.notificationSettings) {
                  state.notificationSettings = { ...defaultNotificationSettings, ...settings.notificationSettings };
                }
                if (settings.featureFlags) {
                  state.featureFlags = { ...state.featureFlags, ...settings.featureFlags };
                }
              });

              get().addNotification({
                type: 'success',
                title: 'Settings Imported',
                message: 'Your settings have been successfully imported.',
                persistent: false,
              });

              return true;
            } catch (error) {
              get().addGlobalError({
                code: 'SETTINGS_IMPORT_FAILED',
                message: 'Failed to import settings',
                operation: 'importSettings',
                timestamp: new Date(),
                cause: error as Error,
              });

              return false;
            }
          },

          checkForUpdates: async () => {
            try {
              // This would typically make an API call to check for updates
              // For now, just simulate the check
              return false;
            } catch (error) {
              return false;
            }
          },

          reportIssue: async (issue) => {
            try {
              // This would typically send the issue to a bug tracking system
              console.log('Issue reported:', issue);
              
              get().addNotification({
                type: 'success',
                title: 'Issue Reported',
                message: 'Thank you for reporting the issue. We will look into it.',
                persistent: false,
              });

              return true;
            } catch (error) {
              return false;
            }
          },
        }))
      ),
      {
        name: 'app-store',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          audioSettings: state.audioSettings,
          uiSettings: state.uiSettings,
          accessibilitySettings: state.accessibilitySettings,
          aiSettings: state.aiSettings,
          ttsSettings: state.ttsSettings,
          notificationSettings: state.notificationSettings,
          featureFlags: state.featureFlags,
          sidebarOpen: state.sidebarOpen,
          errorReporting: state.errorReporting,
        }),
      }
    ),
    { name: 'app-store' }
  )
);

// Derived selectors for convenience
export const useApp = () => {
  const store = useAppStore();
  return {
    // Device state
    availableDevices: store.availableDevices,
    isLoadingDevices: store.isLoadingDevices,
    
    // Settings
    audioSettings: store.audioSettings,
    uiSettings: store.uiSettings,
    ttsSettings: store.ttsSettings,
    
    // App state
    isOnline: store.isOnline,
    notifications: store.notifications,
    
    // UI state
    sidebarOpen: store.sidebarOpen,
    activePanel: store.activePanel,
    modalOpen: store.modalOpen,
    
    // Actions
    loadAudioDevices: store.loadAudioDevices,
    updateAudioSettings: store.updateAudioSettings,
    updateUISettings: store.updateUISettings,
    toggleSidebar: store.toggleSidebar,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
  };
};

// Selector hooks for specific state
export const useAudioSettings = () => useAppStore((state) => state.audioSettings);
export const useUISettings = () => useAppStore((state) => state.uiSettings);
export const useAccessibilitySettings = () => useAppStore((state) => state.accessibilitySettings);
export const useAISettings = () => useAppStore((state) => state.aiSettings);
export const useTTSSettings = () => useAppStore((state) => state.ttsSettings);
export const useNotificationSettings = () => useAppStore((state) => state.notificationSettings);
export const useFeatureFlags = () => useAppStore((state) => state.featureFlags);
export const useAppNotifications = () => useAppStore((state) => state.notifications);
export const useAppTheme = () => useAppStore((state) => state.uiSettings.theme);
export const usePerformanceMetrics = () => useAppStore((state) => state.performanceMetrics);
export const useGlobalErrors = () => useAppStore((state) => state.globalErrors);

// Performance-optimized selectors
export const useAudioDevices = () => useAppStore((state) => ({
  devices: state.availableDevices,
  isLoading: state.isLoadingDevices,
  error: state.deviceError,
}));

export const useUIState = () => useAppStore((state) => ({
  sidebarOpen: state.sidebarOpen,
  activePanel: state.activePanel,
  modalOpen: state.modalOpen,
}));

// Initialize online status listener
if (typeof window !== 'undefined') {
  const store = useAppStore.getState();
  
  window.addEventListener('online', () => store.setOnlineStatus(true));
  window.addEventListener('offline', () => store.setOnlineStatus(false));
  
  // Load audio devices on initialization
  store.loadAudioDevices();
}