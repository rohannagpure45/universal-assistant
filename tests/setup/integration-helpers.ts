/**
 * Integration Test Helpers
 * 
 * Utilities for setting up mock stores and providers for integration tests
 */

import React from 'react';
import { vi } from 'vitest';

// Mock store structure that mirrors the real store interfaces
export interface MockMeetingStore {
  state: {
    currentMeeting: any | null;
    isInMeeting: boolean;
    isLoadingMeeting: boolean;
    meetingStats: any | null;
  };
  recording: {
    isRecording: boolean;
    recordingTime: { formatted: string; raw: number };
    actions: {
      startRecording: ReturnType<typeof vi.fn>;
      pauseRecording: ReturnType<typeof vi.fn>;
      stopRecording: ReturnType<typeof vi.fn>;
    };
  };
  transcript: {
    transcript: any[];
    transcriptAnalytics: {
      speakers: number;
      averageConfidence: number;
    };
  };
  participants: {
    participants: any[];
    activeSpeaker: string | null;
    participantAnalytics: {
      totalParticipants: number;
      participantStats: any[];
    };
  };
  startMeeting: ReturnType<typeof vi.fn>;
  endMeeting: ReturnType<typeof vi.fn>;
  pauseMeeting: ReturnType<typeof vi.fn>;
  resumeMeeting: ReturnType<typeof vi.fn>;
}

export interface MockAppStore {
  notifications: any[];
  addNotification: ReturnType<typeof vi.fn>;
  removeNotification: ReturnType<typeof vi.fn>;
  theme: 'light' | 'dark';
  setTheme: ReturnType<typeof vi.fn>;
}

export interface MockAuthStore {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
}

export interface MockStore {
  meeting: MockMeetingStore;
  app: MockAppStore;
  auth: MockAuthStore;
}

/**
 * Creates a mock store with default values and mock functions
 */
export function createMockStore(): MockStore {
  return {
    meeting: {
      state: {
        currentMeeting: null,
        isInMeeting: false,
        isLoadingMeeting: false,
        meetingStats: null,
      },
      recording: {
        isRecording: false,
        recordingTime: { formatted: '00:00', raw: 0 },
        actions: {
          startRecording: vi.fn().mockResolvedValue(undefined),
          pauseRecording: vi.fn().mockResolvedValue(undefined),
          stopRecording: vi.fn().mockResolvedValue(undefined),
        },
      },
      transcript: {
        transcript: [],
        transcriptAnalytics: {
          speakers: 0,
          averageConfidence: 0.95,
        },
      },
      participants: {
        participants: [],
        activeSpeaker: null,
        participantAnalytics: {
          totalParticipants: 0,
          participantStats: [],
        },
      },
      startMeeting: vi.fn().mockResolvedValue('mock-meeting-id'),
      endMeeting: vi.fn().mockResolvedValue(true),
      pauseMeeting: vi.fn().mockResolvedValue(true),
      resumeMeeting: vi.fn().mockResolvedValue(true),
    },
    app: {
      notifications: [],
      addNotification: vi.fn(),
      removeNotification: vi.fn(),
      theme: 'light',
      setTheme: vi.fn(),
    },
    auth: {
      user: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn().mockResolvedValue(true),
      logout: vi.fn().mockResolvedValue(undefined),
    },
  };
}

/**
 * Mock store provider component for wrapping tests
 */
export const MockStoreProvider: React.FC<{ store: MockStore; children: React.ReactNode }> = ({ 
  store, 
  children 
}) => {
  // Mock all the store hooks to return our mock store data
  React.useEffect(() => {
    // Override store hooks for this test
    vi.doMock('@/stores/hooks/useMeetingHooks', () => ({
      useMeetingActions: () => ({
        startMeeting: store.meeting.startMeeting,
        endMeeting: store.meeting.endMeeting,
        pauseMeeting: store.meeting.pauseMeeting,
        resumeMeeting: store.meeting.resumeMeeting,
      }),
      useMeetingState: () => store.meeting.state,
      useRecording: () => store.meeting.recording,
      useTranscript: () => store.meeting.transcript,
      useParticipants: () => store.meeting.participants,
    }));

    vi.doMock('@/hooks/useAuth', () => ({
      useAuth: () => store.auth,
    }));

    vi.doMock('@/stores/appStore', () => ({
      useAppStore: {
        getState: () => ({
          addNotification: store.app.addNotification,
          removeNotification: store.app.removeNotification,
          theme: store.app.theme,
          setTheme: store.app.setTheme,
        }),
      },
    }));

    vi.doMock('@/stores/meetingStore', () => ({
      useMeetingStore: {
        getState: () => store.meeting,
      },
    }));
  }, [store]);

  return <>{children}</>;
};

/**
 * Creates a mock meeting object for testing
 */
export function createMockMeeting(overrides: Partial<any> = {}) {
  return {
    meetingId: 'test-meeting-id',
    title: 'Test Meeting',
    type: 'standup' as const,
    startTime: Date.now(),
    endTime: null,
    participants: [],
    status: 'active',
    ...overrides,
  };
}

/**
 * Creates mock transcript entries for testing
 */
export function createMockTranscriptEntries(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `entry-${i}`,
    text: `This is transcript entry number ${i + 1}`,
    speaker: `Speaker ${(i % 3) + 1}`,
    timestamp: Date.now() + i * 1000,
    isComplete: true,
    confidence: 0.9 + (i % 10) * 0.01,
  }));
}

/**
 * Creates mock participants for testing
 */
export function createMockParticipants(count: number = 3) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i + 1}`,
    displayName: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: i === 0 ? 'host' : 'participant',
    joinedAt: Date.now() + i * 1000,
    isConnected: true,
  }));
}

/**
 * Creates mock meeting type configurations
 */
export function createMockMeetingTypes() {
  return [
    {
      id: 'standup-type',
      name: 'Daily Standup',
      description: 'Quick daily sync meeting',
      contextRules: 'Keep it brief and focused',
      systemPrompt: 'You are a standup meeting assistant',
      defaultModel: 'gpt-4o-mini',
      estimatedDuration: 15,
    },
    {
      id: 'brainstorm-type',
      name: 'Brainstorming Session',
      description: 'Creative ideation meeting',
      contextRules: 'Encourage creative thinking and idea sharing',
      systemPrompt: 'You are a creative brainstorming facilitator',
      defaultModel: 'gpt-4o',
      estimatedDuration: 60,
    },
    {
      id: 'review-type',
      name: 'Code Review',
      description: 'Technical code review session',
      contextRules: 'Focus on code quality, security, and best practices',
      systemPrompt: 'You are a technical code review assistant',
      defaultModel: 'gpt-4o',
      estimatedDuration: 45,
    },
  ];
}

/**
 * Utility to wait for async state updates in tests
 */
export async function waitForStoreUpdate(store: MockStore, timeout: number = 1000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkUpdate = () => {
      if (Date.now() - startTime > timeout) {
        resolve(undefined);
      } else {
        setTimeout(checkUpdate, 10);
      }
    };
    checkUpdate();
  });
}

/**
 * Mock Firebase Firestore operations
 */
export const mockFirebaseOperations = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({}),
      }),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
    add: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({
      empty: false,
      size: 1,
      docs: [
        {
          id: 'mock-doc-id',
          data: () => ({}),
        },
      ],
    }),
  })),
};

/**
 * Mock Audio API for testing audio-related functionality
 */
export const mockAudioAPI = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  }),
  MediaRecorder: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    ondataavailable: null,
    onstop: null,
    state: 'inactive',
  })),
  AudioContext: vi.fn().mockImplementation(() => ({
    createAnalyser: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      fftSize: 256,
      getByteFrequencyData: vi.fn(),
    }),
    createMediaStreamSource: () => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
    }),
    close: vi.fn(),
    state: 'running',
  })),
};

/**
 * Setup global mocks for testing
 */
export function setupGlobalMocks() {
  // Mock window.navigator.mediaDevices
  global.navigator.mediaDevices = {
    getUserMedia: mockAudioAPI.getUserMedia,
  } as any;

  // Mock MediaRecorder
  global.MediaRecorder = mockAudioAPI.MediaRecorder as any;
  global.MediaRecorder.isTypeSupported = vi.fn().mockReturnValue(true);

  // Mock AudioContext
  global.AudioContext = mockAudioAPI.AudioContext as any;
  global.webkitAudioContext = mockAudioAPI.AudioContext as any;

  // Mock performance API
  global.performance.now = vi.fn(() => Date.now());

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  global.localStorage = localStorageMock as any;

  // Mock sessionStorage
  global.sessionStorage = localStorageMock as any;

  // Mock console methods to reduce test noise
  global.console.log = vi.fn();
  global.console.warn = vi.fn();
  global.console.error = vi.fn();
}

/**
 * Cleanup global mocks after testing
 */
export function cleanupGlobalMocks() {
  vi.restoreAllMocks();
  
  // Reset global objects
  delete (global as any).navigator.mediaDevices;
  delete (global as any).MediaRecorder;
  delete (global as any).AudioContext;
  delete (global as any).webkitAudioContext;
}

/**
 * Utility to simulate network delays in tests
 */
export function simulateNetworkDelay(ms: number = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock notification system for testing
 */
export const mockNotificationSystem = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
  clear: vi.fn(),
};