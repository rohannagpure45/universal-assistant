/**
 * Local Development Service
 * Provides mock Firebase functionality for local development without authentication
 */

export class LocalDevService {
  private static instance: LocalDevService;
  private mockUser = {
    uid: 'local-dev-user',
    email: 'dev@localhost',
    displayName: 'Local Developer',
    isAnonymous: false,
    photoURL: null,
    createdAt: new Date(),
    lastActive: new Date(),
    isAdmin: false,
    preferences: {
      defaultModel: 'gpt-4o' as const,
      ttsVoice: 'alloy' as const,
      ttsSpeed: 1.0,
      autoTranscribe: true,
      saveTranscripts: true,
      theme: 'system' as const,
      language: 'en',
      notifications: {
        emailNotifications: false,
        pushNotifications: false,
        meetingReminders: false,
        transcriptReady: false,
      },
      privacy: {
        shareAnalytics: false,
        allowDataCollection: false,
        exportData: true,
      },
      accessibility: {
        screenReader: false,
        highContrast: false,
        largeText: false,
        keyboardNavigation: true,
      },
      ai: {
        defaultModel: 'gpt-4o' as const,
        temperature: 0.7,
        maxTokens: 2000,
        enableFallback: true,
      },
      tts: {
        voice: 'alloy',
        speed: 1.0,
        pitch: 1.0,
        volume: 0.8,
      },
      ui: {
        theme: 'system' as const,
        language: 'en',
        fontSize: 14,
        compactMode: false,
      },
    }
  };

  private mockData: Map<string, any> = new Map();

  private constructor() {
    console.log('LocalDevService: Initialized for local development');
  }

  static getInstance(): LocalDevService {
    if (!LocalDevService.instance) {
      LocalDevService.instance = new LocalDevService();
    }
    return LocalDevService.instance;
  }

  // Check if we should use local dev mode
  static shouldUseLocalDev(): boolean {
    // Use local dev if:
    // 1. We're in development mode
    // 2. Firebase is not configured
    // 3. Or there's a flag to force local dev
    return (
      process.env.NODE_ENV === 'development' &&
      (process.env.NEXT_PUBLIC_USE_LOCAL_DEV === 'true' ||
       !process.env.NEXT_PUBLIC_FIREBASE_API_KEY)
    );
  }

  // Mock authentication
  getMockUser() {
    return this.mockUser;
  }

  // Mock Firestore operations
  async getDocument(path: string): Promise<any> {
    return this.mockData.get(path) || null;
  }

  async setDocument(path: string, data: any): Promise<void> {
    this.mockData.set(path, {
      ...data,
      _lastUpdated: new Date().toISOString()
    });
  }

  async updateDocument(path: string, data: any): Promise<void> {
    const existing = this.mockData.get(path) || {};
    this.mockData.set(path, {
      ...existing,
      ...data,
      _lastUpdated: new Date().toISOString()
    });
  }

  async deleteDocument(path: string): Promise<void> {
    this.mockData.delete(path);
  }

  // Mock Storage operations
  async uploadFile(path: string, file: Blob): Promise<string> {
    // Return a mock URL
    return `blob:http://localhost:3000/${path}`;
  }

  async getDownloadURL(path: string): Promise<string> {
    return `blob:http://localhost:3000/${path}`;
  }

  // Mock real-time listeners
  onSnapshot(path: string, callback: (data: any) => void): () => void {
    // Call with initial data
    const data = this.mockData.get(path);
    if (data) {
      setTimeout(() => callback(data), 0);
    }
    
    // Return unsubscribe function
    return () => {
      console.log(`LocalDevService: Unsubscribed from ${path}`);
    };
  }

  // Clear all mock data
  clearMockData(): void {
    this.mockData.clear();
    console.log('LocalDevService: Cleared all mock data');
  }
}

export const localDevService = LocalDevService.getInstance();