import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { 
  useAppStore, 
  type AudioDevice, 
  type AudioSettings, 
  type UISettings,
  type AppError,
  type Notification 
} from '../appStore';

// ============ AUDIO DEVICE MANAGEMENT HOOKS ============

/**
 * Hook for managing audio devices with automatic refresh
 */
export const useAudioDevicesHook = (autoRefresh: boolean = true) => {
  const {
    availableDevices,
    isLoadingDevices,
    deviceError,
    audioSettings,
    loadAudioDevices,
    refreshAudioDevices,
    setAudioInputDevice,
    setAudioOutputDevice,
    testAudioDevice,
  } = useAppStore(
    (state) => ({
      availableDevices: state.availableDevices,
      isLoadingDevices: state.isLoadingDevices,
      deviceError: state.deviceError,
      audioSettings: state.audioSettings,
      loadAudioDevices: state.loadAudioDevices,
      refreshAudioDevices: state.refreshAudioDevices,
      setAudioInputDevice: state.setAudioInputDevice,
      setAudioOutputDevice: state.setAudioOutputDevice,
      testAudioDevice: state.testAudioDevice,
    }),
    shallow
  );

  // Categorize devices by type
  const devicesByType = useMemo(() => {
    const inputDevices = availableDevices.filter(device => device.kind === 'audioinput');
    const outputDevices = availableDevices.filter(device => device.kind === 'audiooutput');

    return {
      input: inputDevices,
      output: outputDevices,
      all: availableDevices,
    };
  }, [availableDevices]);

  // Get currently selected devices
  const selectedDevices = useMemo(() => {
    const selectedInput = devicesByType.input.find(
      device => device.deviceId === audioSettings.inputDeviceId
    );
    const selectedOutput = devicesByType.output.find(
      device => device.deviceId === audioSettings.outputDeviceId
    );

    return {
      input: selectedInput || null,
      output: selectedOutput || null,
    };
  }, [devicesByType, audioSettings]);

  // Auto-refresh devices when navigator.mediaDevices changes
  useEffect(() => {
    if (!autoRefresh || !navigator.mediaDevices) return;

    const handleDeviceChange = () => {
      refreshAudioDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [autoRefresh, refreshAudioDevices]);

  // Test device with user feedback
  const testDeviceWithFeedback = useCallback(async (deviceId: string, type: 'input' | 'output') => {
    const success = await testAudioDevice(deviceId, type);
    return success;
  }, [testAudioDevice]);

  return {
    devices: devicesByType,
    selectedDevices,
    isLoading: isLoadingDevices,
    error: deviceError,
    actions: {
      loadDevices: loadAudioDevices,
      refreshDevices: refreshAudioDevices,
      setInputDevice: setAudioInputDevice,
      setOutputDevice: setAudioOutputDevice,
      testDevice: testDeviceWithFeedback,
    },
  };
};

/**
 * Hook for audio settings with validation and presets
 */
export const useAudioSettingsHook = () => {
  const {
    audioSettings,
    updateAudioSettings,
    resetSettingsToDefault,
  } = useAppStore(
    (state) => ({
      audioSettings: state.audioSettings,
      updateAudioSettings: state.updateAudioSettings,
      resetSettingsToDefault: state.resetSettingsToDefault,
    }),
    shallow
  );

  // Audio presets for common use cases
  const presets = useMemo(() => ({
    podcast: {
      sampleRate: 44100,
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      micGain: 0.7,
    },
    music: {
      sampleRate: 48000,
      channelCount: 2,
      noiseSuppression: false,
      echoCancellation: false,
      autoGainControl: false,
      micGain: 0.5,
    },
    meeting: {
      sampleRate: 16000,
      channelCount: 1,
      noiseSuppression: true,
      echoCancellation: true,
      autoGainControl: true,
      micGain: 0.6,
    },
    gaming: {
      sampleRate: 44100,
      channelCount: 2,
      noiseSuppression: true,
      echoCancellation: false,
      autoGainControl: true,
      micGain: 0.8,
    },
  }), []);

  // Apply a preset
  const applyPreset = useCallback((presetName: keyof typeof presets) => {
    const preset = presets[presetName];
    if (preset) {
      updateAudioSettings(preset);
    }
  }, [presets, updateAudioSettings]);

  // Validate audio settings
  const validateSettings = useCallback((settings: Partial<AudioSettings>) => {
    const errors: string[] = [];

    if (settings.volume !== undefined && (settings.volume < 0 || settings.volume > 1)) {
      errors.push('Volume must be between 0 and 1');
    }

    if (settings.micGain !== undefined && (settings.micGain < 0 || settings.micGain > 1)) {
      errors.push('Microphone gain must be between 0 and 1');
    }

    if (settings.sampleRate !== undefined && ![8000, 16000, 22050, 44100, 48000].includes(settings.sampleRate)) {
      errors.push('Sample rate must be one of: 8000, 16000, 22050, 44100, 48000');
    }

    if (settings.channelCount !== undefined && ![1, 2].includes(settings.channelCount)) {
      errors.push('Channel count must be 1 or 2');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  // Update settings with validation
  const updateSettingsWithValidation = useCallback((settings: Partial<AudioSettings>) => {
    const validation = validateSettings(settings);
    
    if (validation.isValid) {
      updateAudioSettings(settings);
      return { success: true, errors: [] };
    } else {
      return { success: false, errors: validation.errors };
    }
  }, [validateSettings, updateAudioSettings]);

  return {
    settings: audioSettings,
    presets,
    actions: {
      updateSettings: updateSettingsWithValidation,
      applyPreset,
      resetToDefaults: () => resetSettingsToDefault('audio'),
      validateSettings,
    },
  };
};

// ============ UI SETTINGS AND THEME HOOKS ============

/**
 * Hook for managing theme with system preference detection
 */
export const useTheme = () => {
  const { theme, updateUISettings } = useAppStore(
    (state) => ({
      theme: state.uiSettings.theme,
      updateUISettings: state.updateUISettings,
    }),
    shallow
  );

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Detect system theme preference
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Get effective theme (resolve 'system' to actual theme)
  const effectiveTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  const setTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    updateUISettings({ theme: newTheme });
  }, [updateUISettings]);

  return {
    theme,
    effectiveTheme,
    systemTheme,
    setTheme,
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
    isSystem: theme === 'system',
  };
};

/**
 * Hook for UI settings with accessibility considerations
 */
export const useUISettingsHook = () => {
  const {
    uiSettings,
    accessibilitySettings,
    updateUISettings,
    updateAccessibilitySettings,
    resetSettingsToDefault,
  } = useAppStore(
    (state) => ({
      uiSettings: state.uiSettings,
      accessibilitySettings: state.accessibilitySettings,
      updateUISettings: state.updateUISettings,
      updateAccessibilitySettings: state.updateAccessibilitySettings,
      resetSettingsToDefault: state.resetSettingsToDefault,
    }),
    shallow
  );

  // Calculate effective settings considering accessibility preferences
  const effectiveSettings = useMemo(() => {
    const settings = { ...uiSettings };

    // Override animations if reduced motion is preferred
    if (accessibilitySettings.reducedMotion) {
      settings.animationsEnabled = false;
    }

    return settings;
  }, [uiSettings, accessibilitySettings]);

  // Font size utilities
  const fontSizeValues = useMemo(() => ({
    small: '14px',
    medium: '16px',
    large: '18px',
  }), []);

  const getFontSizeValue = useCallback((size?: 'small' | 'medium' | 'large') => {
    return fontSizeValues[size || uiSettings.fontSize];
  }, [fontSizeValues, uiSettings.fontSize]);

  return {
    settings: effectiveSettings,
    accessibilitySettings,
    fontSizeValues,
    actions: {
      updateUI: updateUISettings,
      updateAccessibility: updateAccessibilitySettings,
      resetUI: () => resetSettingsToDefault('ui'),
      resetAccessibility: () => resetSettingsToDefault('accessibility'),
      getFontSizeValue,
    },
  };
};

// ============ NOTIFICATION MANAGEMENT HOOKS ============

/**
 * Hook for managing notifications with categorization and filtering
 */
export const useNotifications = () => {
  const {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsRead,
  } = useAppStore(
    (state) => ({
      notifications: state.notifications,
      addNotification: state.addNotification,
      removeNotification: state.removeNotification,
      clearNotifications: state.clearNotifications,
      markNotificationAsRead: state.markNotificationAsRead,
    }),
    shallow
  );

  // Categorize notifications
  const categorizedNotifications = useMemo(() => {
    const byType = {
      error: notifications.filter(n => n.type === 'error'),
      warning: notifications.filter(n => n.type === 'warning'),
      info: notifications.filter(n => n.type === 'info'),
      success: notifications.filter(n => n.type === 'success'),
    };

    const byPersistence = {
      persistent: notifications.filter(n => n.persistent),
      temporary: notifications.filter(n => !n.persistent),
    };

    return {
      byType,
      byPersistence,
      unreadCount: notifications.length,
      hasErrors: byType.error.length > 0,
      hasWarnings: byType.warning.length > 0,
    };
  }, [notifications]);

  // Add notification with smart defaults
  const addSmartNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'> & {
      autoRemove?: boolean;
      autoRemoveDelay?: number;
    }
  ) => {
    const id = addNotification({
      ...notification,
      persistent: notification.persistent ?? false,
    });

    // Auto-remove if specified
    if (notification.autoRemove !== false && !notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.autoRemoveDelay ?? 5000);
    }

    return id;
  }, [addNotification, removeNotification]);

  // Quick notification methods
  const showSuccess = useCallback((message: string, title = 'Success') => {
    return addSmartNotification({
      type: 'success',
      title,
      message,
      persistent: false,
    });
  }, [addSmartNotification]);

  const showError = useCallback((message: string, title = 'Error', persistent = false) => {
    return addSmartNotification({
      type: 'error',
      title,
      message,
      persistent,
    });
  }, [addSmartNotification]);

  const showWarning = useCallback((message: string, title = 'Warning') => {
    return addSmartNotification({
      type: 'warning',
      title,
      message,
      persistent: false,
    });
  }, [addSmartNotification]);

  const showInfo = useCallback((message: string, title = 'Information') => {
    return addSmartNotification({
      type: 'info',
      title,
      message,
      persistent: false,
    });
  }, [addSmartNotification]);

  return {
    notifications,
    ...categorizedNotifications,
    actions: {
      add: addSmartNotification,
      remove: removeNotification,
      clear: clearNotifications,
      markAsRead: markNotificationAsRead,
      showSuccess,
      showError,
      showWarning,
      showInfo,
    },
  };
};

// ============ PERFORMANCE MONITORING HOOKS ============

/**
 * Hook for monitoring app performance with real-time metrics
 */
export const usePerformanceMonitor = (enabledReporting = true) => {
  const {
    performanceMetrics,
    updatePerformanceMetrics,
    isOnline,
  } = useAppStore(
    (state) => ({
      performanceMetrics: state.performanceMetrics,
      updatePerformanceMetrics: state.updatePerformanceMetrics,
      isOnline: state.isOnline,
    }),
    shallow
  );

  const metricsRef = useRef(performanceMetrics);
  metricsRef.current = performanceMetrics;

  // Monitor network latency
  const measureNetworkLatency = useCallback(async () => {
    if (!isOnline) return null;

    const start = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      const latency = performance.now() - start;
      updatePerformanceMetrics({ networkLatency: latency });
      return latency;
    } catch {
      return null;
    }
  }, [isOnline, updatePerformanceMetrics]);

  // Monitor memory usage (if available)
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      updatePerformanceMetrics({ memoryUsage: usage });
      return usage;
    }
    return null;
  }, [updatePerformanceMetrics]);

  // Performance monitoring interval
  useEffect(() => {
    if (!enabledReporting) return;

    const interval = setInterval(() => {
      measureNetworkLatency();
      measureMemoryUsage();
    }, 30000); // Monitor every 30 seconds

    return () => clearInterval(interval);
  }, [enabledReporting, measureNetworkLatency, measureMemoryUsage]);

  // Performance status assessment
  const performanceStatus = useMemo(() => {
    const { audioLatency, networkLatency, memoryUsage } = performanceMetrics;

    const status = {
      audio: audioLatency < 50 ? 'good' : audioLatency < 100 ? 'fair' : 'poor',
      network: networkLatency < 100 ? 'good' : networkLatency < 300 ? 'fair' : 'poor',
      memory: memoryUsage < 70 ? 'good' : memoryUsage < 90 ? 'fair' : 'poor',
    };

    const overallScore = Object.values(status).reduce((score, s) => {
      return score + (s === 'good' ? 3 : s === 'fair' ? 2 : 1);
    }, 0);

    return {
      ...status,
      overall: overallScore >= 8 ? 'good' : overallScore >= 6 ? 'fair' : 'poor',
      score: overallScore,
    };
  }, [performanceMetrics]);

  return {
    metrics: performanceMetrics,
    status: performanceStatus,
    actions: {
      measureLatency: measureNetworkLatency,
      measureMemory: measureMemoryUsage,
      updateMetrics: updatePerformanceMetrics,
    },
  };
};

// ============ FEATURE FLAG HOOKS ============

/**
 * Hook for managing feature flags with caching
 */
export const useFeatureFlagsHook = () => {
  const {
    featureFlags,
    setFeatureFlag,
    getFeatureFlag,
  } = useAppStore(
    (state) => ({
      featureFlags: state.featureFlags,
      setFeatureFlag: state.setFeatureFlag,
      getFeatureFlag: state.getFeatureFlag,
    }),
    shallow
  );

  // Check if a feature is enabled (with memoization)
  const isEnabled = useCallback((flag: string): boolean => {
    return getFeatureFlag(flag);
  }, [getFeatureFlag]);

  // Enable/disable multiple flags at once
  const updateFlags = useCallback((flags: Record<string, boolean>) => {
    Object.entries(flags).forEach(([flag, enabled]) => {
      setFeatureFlag(flag, enabled);
    });
  }, [setFeatureFlag]);

  return {
    flags: featureFlags,
    isEnabled,
    actions: {
      enable: (flag: string) => setFeatureFlag(flag, true),
      disable: (flag: string) => setFeatureFlag(flag, false),
      toggle: (flag: string) => setFeatureFlag(flag, !getFeatureFlag(flag)),
      update: updateFlags,
    },
  };
};

// ============ ERROR HANDLING HOOKS ============

/**
 * Hook for global error management with reporting
 */
export const useErrorHandler = () => {
  const {
    globalErrors,
    errorReporting,
    addGlobalError,
    removeGlobalError,
    clearGlobalErrors,
    setErrorReporting,
  } = useAppStore(
    (state) => ({
      globalErrors: state.globalErrors,
      errorReporting: state.errorReporting,
      addGlobalError: state.addGlobalError,
      removeGlobalError: state.removeGlobalError,
      clearGlobalErrors: state.clearGlobalErrors,
      setErrorReporting: state.setErrorReporting,
    }),
    shallow
  );

  // Create error with additional context
  const createError = useCallback((
    code: string,
    message: string,
    operation: string,
    cause?: Error
  ): AppError => ({
    code,
    message,
    operation,
    timestamp: new Date(),
    cause,
  }), []);

  // Handle error with automatic reporting
  const handleError = useCallback((error: AppError | Error, operation?: string) => {
    let appError: AppError;

    if (error instanceof Error) {
      appError = createError(
        'GENERIC_ERROR',
        error.message,
        operation || 'unknown',
        error
      );
    } else {
      appError = error;
    }

    addGlobalError(appError);

    // Report to external service if enabled
    if (errorReporting) {
      console.error('App Error:', appError);
      // Here you would integrate with error reporting service
    }
  }, [createError, addGlobalError, errorReporting]);

  return {
    errors: globalErrors,
    errorReporting,
    hasErrors: globalErrors.length > 0,
    actions: {
      handleError,
      createError,
      removeError: removeGlobalError,
      clearErrors: clearGlobalErrors,
      setReporting: setErrorReporting,
    },
  };
};