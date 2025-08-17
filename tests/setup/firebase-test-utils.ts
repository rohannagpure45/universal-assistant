/**
 * Firebase Testing Utilities
 * Provides mocks and utilities for testing Firebase authentication and Firestore
 */

import { User as FirebaseUser } from 'firebase/auth';
import { DocumentSnapshot, QuerySnapshot } from 'firebase/firestore';
import { User, UserPreferences, Meeting, TranscriptEntry, SpeakerProfile, CustomRule } from '@/types';

// Mock Firebase Auth
export const createMockFirebaseUser = (overrides: Partial<FirebaseUser> = {}): FirebaseUser => ({
  uid: 'test-user-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/avatar.jpg',
  emailVerified: true,
  isAnonymous: false,
  metadata: {
    creationTime: new Date().toISOString(),
    lastSignInTime: new Date().toISOString(),
  },
  providerData: [],
  refreshToken: 'mock-refresh-token',
  tenantId: null,
  delete: jest.fn().mockResolvedValue(undefined),
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
  getIdTokenResult: jest.fn().mockResolvedValue({
    token: 'mock-id-token',
    authTime: new Date().toISOString(),
    issuedAtTime: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 3600000).toISOString(),
    signInProvider: 'password',
    claims: {},
  }),
  reload: jest.fn().mockResolvedValue(undefined),
  toJSON: jest.fn().mockReturnValue({}),
  ...overrides,
});

// Mock Application User
export const createMockUser = (overrides: Partial<User> = {}): User => {
  const defaultPreferences: UserPreferences = {
    defaultModel: 'gpt-4o',
    ttsVoice: 'alloy',
    ttsSpeed: 1.0,
    autoTranscribe: true,
    saveTranscripts: true,
    theme: 'system',
  };

  return {
    uid: 'test-user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/avatar.jpg',
    preferences: defaultPreferences,
    createdAt: new Date('2024-01-01'),
    lastActive: new Date(),
    ...overrides,
  };
};

// Mock Meeting
export const createMockMeeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  meetingId: 'test-meeting-123',
  hostId: 'test-user-123',
  title: 'Test Meeting',
  type: 'brainstorming',
  participants: [
    {
      userId: 'test-user-123',
      userName: 'Test User',
      voiceProfileId: 'voice-profile-123',
      joinTime: new Date(),
      speakingTime: 300,
    },
  ],
  transcript: [],
  notes: ['Test note 1', 'Test note 2'],
  keywords: ['test', 'meeting', 'brainstorming'],
  appliedRules: ['rule-1', 'rule-2'],
  startTime: new Date(),
  endTime: undefined,
  ...overrides,
});

// Mock Transcript Entry
export const createMockTranscriptEntry = (overrides: Partial<TranscriptEntry> = {}): TranscriptEntry => ({
  id: 'transcript-123',
  speaker: 'Test User',
  speakerId: 'test-user-123',
  text: 'This is a test transcript entry.',
  timestamp: new Date(),
  confidence: 0.95,
  isFragment: false,
  isComplete: true,
  ...overrides,
});

// Mock Speaker Profile
export const createMockSpeakerProfile = (overrides: Partial<SpeakerProfile> = {}): SpeakerProfile => ({
  speakerId: 'speaker-123',
  voiceId: 'voice-123',
  userName: 'Test Speaker',
  voiceEmbedding: [0.1, 0.2, 0.3, 0.4, 0.5],
  lastSeen: new Date(),
  confidence: 0.95,
  sessionCount: 5,
  ...overrides,
});

// Mock Custom Rule
export const createMockCustomRule = (overrides: Partial<CustomRule> = {}): CustomRule => ({
  ruleId: 'rule-123',
  userId: 'test-user-123',
  name: 'Test Rule',
  description: 'A test custom rule',
  meetingTypes: ['brainstorming'],
  conditions: [
    {
      type: 'keyword',
      value: 'important',
      operator: 'contains',
    },
  ],
  actions: [
    {
      type: 'highlight',
      parameters: { color: 'yellow' },
    },
  ],
  priority: 5,
  enabled: true,
  createdAt: new Date(),
  lastUsed: new Date(),
  ...overrides,
});

// Mock Firestore Document Snapshot
export const createMockDocumentSnapshot = <T>(
  id: string,
  data: T | null,
  exists = true
): Partial<DocumentSnapshot> => ({
  id,
  exists: () => exists,
  data: () => data,
  get: (field: string) => data ? (data as any)[field] : undefined,
  ref: {
    id,
    path: `mock-collection/${id}`,
  } as any,
});

// Mock Firestore Query Snapshot
export const createMockQuerySnapshot = <T>(
  docs: Array<{ id: string; data: T }>
): Partial<QuerySnapshot> => ({
  size: docs.length,
  empty: docs.length === 0,
  docs: docs.map(({ id, data }) => createMockDocumentSnapshot(id, data)) as any[],
  forEach: (callback) => {
    docs.forEach(({ id, data }) => {
      const mockDoc = createMockDocumentSnapshot(id, data);
      callback(mockDoc as any);
    });
  },
});

// Firebase Auth Mocks
export const mockFirebaseAuth = {
  currentUser: null as FirebaseUser | null,
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
};

// Firebase Firestore Mocks
export const mockFirestore = {
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
  serverTimestamp: jest.fn(() => ({ __type: 'serverTimestamp' })),
  Timestamp: {
    fromDate: jest.fn((date: Date) => ({ toDate: () => date })),
    now: jest.fn(() => ({ toDate: () => new Date() })),
  },
  increment: jest.fn(),
};

// Test Environment Setup
export const setupFirebaseTestEnvironment = () => {
  // Reset all mocks
  jest.clearAllMocks();

  // Setup default mock implementations
  mockFirestore.collection.mockImplementation((path: string) => ({
    path,
    doc: (id?: string) => ({
      id: id || 'auto-generated-id',
      path: `${path}/${id || 'auto-generated-id'}`,
      collection: mockFirestore.collection,
    }),
  }));

  mockFirestore.doc.mockImplementation((path: string, id?: string) => ({
    id: id || 'auto-generated-id',
    path: path,
    collection: mockFirestore.collection,
  }));

  mockFirestore.query.mockImplementation((...args: any[]) => ({
    type: 'query',
    constraints: args,
  }));

  mockFirestore.writeBatch.mockReturnValue({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  });

  // Setup Auth mocks
  mockFirebaseAuth.onAuthStateChanged.mockImplementation((callback) => {
    // Simulate auth state change
    setTimeout(() => callback(mockFirebaseAuth.currentUser), 0);
    return jest.fn(); // Unsubscribe function
  });

  return { mockFirebaseAuth, mockFirestore };
};

// Error Simulation Utilities
export const simulateFirebaseError = (code: string, message: string) => {
  const error = new Error(message);
  (error as any).code = code;
  return error;
};

export const createAuthError = (code: string) => {
  const authErrors: Record<string, string> = {
    'auth/user-not-found': 'No account found with this email address',
    'auth/wrong-password': 'Incorrect password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'Invalid email address',
    'auth/too-many-requests': 'Too many failed attempts. Please try again later',
    'auth/popup-closed-by-user': 'Sign-in popup was closed',
    'auth/cancelled-popup-request': 'Sign-in was cancelled',
    'auth/requires-recent-login': 'Please sign in again to complete this action',
  };

  return simulateFirebaseError(code, authErrors[code] || 'Authentication error');
};

export const createFirestoreError = (code: string) => {
  const firestoreErrors: Record<string, string> = {
    'permission-denied': 'Missing or insufficient permissions',
    'not-found': 'Document not found',
    'already-exists': 'Document already exists',
    'resource-exhausted': 'Quota exceeded',
    'failed-precondition': 'Operation failed precondition',
    'aborted': 'Operation was aborted',
    'out-of-range': 'Operation was attempted past the valid range',
    'unimplemented': 'Operation is not implemented',
    'internal': 'Internal error',
    'unavailable': 'Service is currently unavailable',
    'data-loss': 'Unrecoverable data loss or corruption',
    'unauthenticated': 'Request does not have valid authentication credentials',
  };

  return simulateFirebaseError(code, firestoreErrors[code] || 'Firestore error');
};

// Test Data Builders
export class TestDataBuilder {
  static user(overrides: Partial<User> = {}) {
    return createMockUser(overrides);
  }

  static firebaseUser(overrides: Partial<FirebaseUser> = {}) {
    return createMockFirebaseUser(overrides);
  }

  static meeting(overrides: Partial<Meeting> = {}) {
    return createMockMeeting(overrides);
  }

  static transcript(overrides: Partial<TranscriptEntry> = {}) {
    return createMockTranscriptEntry(overrides);
  }

  static speakerProfile(overrides: Partial<SpeakerProfile> = {}) {
    return createMockSpeakerProfile(overrides);
  }

  static customRule(overrides: Partial<CustomRule> = {}) {
    return createMockCustomRule(overrides);
  }

  static documentSnapshot<T>(id: string, data: T | null, exists = true) {
    return createMockDocumentSnapshot(id, data, exists);
  }

  static querySnapshot<T>(docs: Array<{ id: string; data: T }>) {
    return createMockQuerySnapshot(docs);
  }
}

// Authentication State Manager for Tests
export class TestAuthStateManager {
  private static instance: TestAuthStateManager;
  private authState: FirebaseUser | null = null;
  private listeners: Array<(user: FirebaseUser | null) => void> = [];

  static getInstance() {
    if (!TestAuthStateManager.instance) {
      TestAuthStateManager.instance = new TestAuthStateManager();
    }
    return TestAuthStateManager.instance;
  }

  setAuthState(user: FirebaseUser | null) {
    this.authState = user;
    mockFirebaseAuth.currentUser = user;
    this.listeners.forEach(listener => listener(user));
  }

  addStateListener(listener: (user: FirebaseUser | null) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  signIn(user: FirebaseUser = createMockFirebaseUser()) {
    this.setAuthState(user);
    return Promise.resolve({ user });
  }

  signOut() {
    this.setAuthState(null);
    return Promise.resolve();
  }

  reset() {
    this.authState = null;
    this.listeners = [];
    mockFirebaseAuth.currentUser = null;
  }
}

// Database State Manager for Tests
export class TestDatabaseStateManager {
  private static instance: TestDatabaseStateManager;
  private data: Map<string, Map<string, any>> = new Map();

  static getInstance() {
    if (!TestDatabaseStateManager.instance) {
      TestDatabaseStateManager.instance = new TestDatabaseStateManager();
    }
    return TestDatabaseStateManager.instance;
  }

  setDocument(collection: string, id: string, data: any) {
    if (!this.data.has(collection)) {
      this.data.set(collection, new Map());
    }
    this.data.get(collection)!.set(id, data);
  }

  getDocument(collection: string, id: string) {
    return this.data.get(collection)?.get(id) || null;
  }

  hasDocument(collection: string, id: string) {
    return this.data.get(collection)?.has(id) || false;
  }

  deleteDocument(collection: string, id: string) {
    this.data.get(collection)?.delete(id);
  }

  getCollection(collection: string) {
    return this.data.get(collection) || new Map();
  }

  reset() {
    this.data.clear();
  }

  // Simulate Firestore operations
  setupMockOperations() {
    mockFirestore.getDoc.mockImplementation(async (docRef: any) => {
      const [collection, id] = docRef.path.split('/');
      const data = this.getDocument(collection, id);
      return createMockDocumentSnapshot(id, data, data !== null);
    });

    mockFirestore.setDoc.mockImplementation(async (docRef: any, data: any) => {
      const [collection, id] = docRef.path.split('/');
      this.setDocument(collection, id, data);
    });

    mockFirestore.updateDoc.mockImplementation(async (docRef: any, updates: any) => {
      const [collection, id] = docRef.path.split('/');
      const existing = this.getDocument(collection, id) || {};
      this.setDocument(collection, id, { ...existing, ...updates });
    });

    mockFirestore.deleteDoc.mockImplementation(async (docRef: any) => {
      const [collection, id] = docRef.path.split('/');
      this.deleteDocument(collection, id);
    });

    mockFirestore.addDoc.mockImplementation(async (collectionRef: any, data: any) => {
      const collection = collectionRef.path;
      const id = `auto-generated-${Date.now()}-${Math.random()}`;
      this.setDocument(collection, id, data);
      return { id, path: `${collection}/${id}` };
    });
  }
}

export const testAuthManager = TestAuthStateManager.getInstance();
export const testDatabaseManager = TestDatabaseStateManager.getInstance();