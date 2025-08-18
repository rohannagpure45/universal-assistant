/**
 * Jest Test Setup
 * Global configuration and setup for all tests
 */

import '@testing-library/jest-dom';
import { jest, beforeEach, afterEach } from '@jest/globals';
import { setupFirebaseTestEnvironment } from './firebase-test-utils';

// Node.js polyfills for browser APIs
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock Firebase modules
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signInWithPopup: jest.fn(),
    signOut: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
    reauthenticateWithCredential: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    addScope: jest.fn(),
    setCustomParameters: jest.fn(),
  })),
  EmailAuthProvider: {
    credential: jest.fn(),
  },
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({
    app: { name: 'mock-app' },
  })),
  collection: jest.fn(),
  doc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  addDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
  Timestamp: {
    fromDate: jest.fn(),
    now: jest.fn(),
  },
  increment: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'mock-app' })),
  getApps: jest.fn(() => []),
  getApp: jest.fn(() => ({ name: 'mock-app' })),
}));

jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(() => ({
    app: { name: 'mock-app' },
  })),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
  deleteObject: jest.fn(),
  listAll: jest.fn(),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => ({ app: { name: 'mock-app' } })),
  logEvent: jest.fn(),
  isSupported: (jest.fn() as any).mockResolvedValue(false),
}));

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(() => ({
    name: 'mock-admin-app',
    firestore: jest.fn(() => ({
      collection: jest.fn(),
      doc: jest.fn(),
    })),
  })),
  cert: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
    doc: jest.fn(),
    FieldValue: {
      serverTimestamp: jest.fn(),
      increment: jest.fn(),
    },
  })),
  auth: jest.fn(() => ({
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
  })),
}));

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    has: jest.fn(),
  }),
  usePathname: () => '/mock-pathname',
}));

// Mock Web APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock MediaRecorder
const MediaRecorderMock = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  ondataavailable: null,
  onstop: null,
  onerror: null,
  state: 'inactive',
}));

(MediaRecorderMock as any).isTypeSupported = jest.fn(() => true);
global.MediaRecorder = MediaRecorderMock as any;

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: (jest.fn() as any).mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
          kind: 'audio',
          enabled: true,
        },
      ],
    }),
    enumerateDevices: (jest.fn() as any).mockResolvedValue([
      { deviceId: 'default', kind: 'audioinput', label: 'Default Microphone' },
    ]),
  },
});

// Mock AudioContext
global.AudioContext = (jest.fn() as any).mockImplementation(() => ({
  createAnalyser: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: jest.fn(),
  })),
  createMediaStreamSource: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  })),
  close: jest.fn(),
  suspend: jest.fn(),
  resume: jest.fn(),
  state: 'running',
}));

// Mock window.Audio
global.Audio = (jest.fn() as any).mockImplementation(() => ({
  play: (jest.fn() as any).mockResolvedValue(undefined),
  pause: jest.fn(),
  load: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  ended: false,
  paused: true,
}));

// Mock Blob and URL
global.Blob = (jest.fn() as any).mockImplementation((parts: any, options: any) => ({
  size: 1024,
  type: options?.type || 'application/octet-stream',
  arrayBuffer: (jest.fn() as any).mockResolvedValue(new ArrayBuffer(1024)),
  text: (jest.fn() as any).mockResolvedValue('mock text'),
  stream: jest.fn(),
  slice: jest.fn(),
}));

global.URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
} as any;

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: jest.fn((arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }),
    randomUUID: jest.fn(() => '12345678-1234-1234-1234-123456789abc'),
    subtle: {
      digest: (jest.fn() as any).mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Mock environment variables
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: false,
  enumerable: true,
  configurable: true,
});
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'mock-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'mock-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'mock-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'mock-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
process.env.FIREBASE_PRIVATE_KEY = 'mock-private-key';
process.env.FIREBASE_CLIENT_EMAIL = 'mock@mock-project.iam.gserviceaccount.com';

// Global test setup
beforeEach(() => {
  // Setup Firebase test environment
  setupFirebaseTestEnvironment();
  
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset console methods (restore after tests if needed)
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console methods
  jest.restoreAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock timer functions
jest.useFakeTimers();

export {};