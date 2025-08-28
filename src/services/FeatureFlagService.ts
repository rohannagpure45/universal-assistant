/**
 * FeatureFlagService - Control feature rollout during migration
 * 
 * This service manages feature flags for the gradual migration from
 * legacy storage paths to user-isolated paths.
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getAuth } from 'firebase/auth';

export interface FeatureFlags {
  // Global flags
  enableUserIsolation: boolean;
  enableAnonymousAuth: boolean;
  enableLegacyPathFallback: boolean;
  
  // Migration flags
  migrationPhase: 'disabled' | 'hybrid' | 'migrating' | 'completed';
  autoMigrateOnLogin: boolean;
  showMigrationPrompt: boolean;
  
  // Collection-specific flags
  migrateVoiceSamples: boolean;
  migrateMeetingRecordings: boolean;
  migrateMeetingClips: boolean;
  migrateIdentificationSamples: boolean;
  
  // Performance flags
  enableCaching: boolean;
  enableOptimisticUpdates: boolean;
  
  // Debug flags
  debugMode: boolean;
  logMigrationActions: boolean;
}

export interface UserFeatureOverrides {
  userId: string;
  overrides: Partial<FeatureFlags>;
  enrolledInBeta: boolean;
  migrationOptOut: boolean;
}

class FeatureFlagService {
  private static instance: FeatureFlagService;
  private defaultFlags: FeatureFlags = {
    // Start with hybrid mode
    enableUserIsolation: false,
    enableAnonymousAuth: true,
    enableLegacyPathFallback: true,
    
    // Migration initially disabled
    migrationPhase: 'hybrid',
    autoMigrateOnLogin: false,
    showMigrationPrompt: false,
    
    // Collections not yet migrated
    migrateVoiceSamples: false,
    migrateMeetingRecordings: false,
    migrateMeetingClips: false,
    migrateIdentificationSamples: false,
    
    // Performance enabled
    enableCaching: true,
    enableOptimisticUpdates: true,
    
    // Debug disabled in production
    debugMode: process.env.NODE_ENV === 'development',
    logMigrationActions: process.env.NODE_ENV === 'development'
  };
  
  private currentFlags: FeatureFlags = { ...this.defaultFlags };
  private listeners = new Set<(flags: FeatureFlags) => void>();
  private unsubscribe: (() => void) | null = null;
  
  private constructor() {
    this.loadFlags();
  }
  
  static getInstance(): FeatureFlagService {
    if (!this.instance) {
      this.instance = new FeatureFlagService();
    }
    return this.instance;
  }
  
  /**
   * Load feature flags from Firestore using REST-only approach
   */
  private async loadFlags(): Promise<void> {
    try {
      // Load system-wide feature flags using REST API (no WebSocket)
      const flagsDoc = await getDoc(doc(db, 'systemConfig', 'featureFlags'));
      
      if (flagsDoc.exists()) {
        const data = flagsDoc.data() as Partial<FeatureFlags>;
        this.currentFlags = { ...this.defaultFlags, ...data };
        this.notifyListeners();
        
        if (this.currentFlags.debugMode) {
          console.log('Feature flags loaded:', this.currentFlags);
        }
      } else {
        // Document doesn't exist, use defaults
        console.log('Feature flags document not found, using defaults');
      }
      
      // Set up periodic refresh instead of real-time listening
      // This eliminates WebSocket connections that cause CORS issues
      this.setupPeriodicRefresh();
      
      // Also load user-specific overrides if authenticated
      const auth = getAuth();
      if (auth.currentUser) {
        await this.loadUserOverrides(auth.currentUser.uid);
      }
    } catch (error) {
      console.error('Error loading feature flags:', error);
      // Fall back to defaults on error
      this.currentFlags = { ...this.defaultFlags };
    }
  }

  /**
   * Set up periodic refresh for feature flags (instead of real-time listening)
   */
  private setupPeriodicRefresh(): void {
    // Refresh feature flags every 5 minutes
    const refreshInterval = 5 * 60 * 1000; // 5 minutes
    
    const intervalId = setInterval(async () => {
      try {
        const flagsDoc = await getDoc(doc(db, 'systemConfig', 'featureFlags'));
        
        if (flagsDoc.exists()) {
          const data = flagsDoc.data() as Partial<FeatureFlags>;
          const newFlags = { ...this.defaultFlags, ...data };
          
          // Only notify if flags actually changed
          if (JSON.stringify(newFlags) !== JSON.stringify(this.currentFlags)) {
            this.currentFlags = newFlags;
            this.notifyListeners();
            
            if (this.currentFlags.debugMode) {
              console.log('Feature flags refreshed:', this.currentFlags);
            }
          }
        }
      } catch (error) {
        console.error('Error refreshing feature flags:', error);
      }
    }, refreshInterval);
    
    // Store the interval ID for cleanup
    this.unsubscribe = () => clearInterval(intervalId);
  }
  
  /**
   * Load user-specific feature flag overrides
   */
  private async loadUserOverrides(userId: string): Promise<void> {
    try {
      const userOverridesDoc = await getDoc(
        doc(db, 'userFeatureOverrides', userId)
      );
      
      if (userOverridesDoc.exists()) {
        const overrides = userOverridesDoc.data() as UserFeatureOverrides;
        
        if (!overrides.migrationOptOut && overrides.overrides) {
          this.currentFlags = { ...this.currentFlags, ...overrides.overrides };
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.error('Error loading user overrides:', error);
    }
  }
  
  /**
   * Get current feature flags
   */
  getFlags(): FeatureFlags {
    return { ...this.currentFlags };
  }
  
  /**
   * Get a specific feature flag
   */
  getFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
    return this.currentFlags[key];
  }
  
  /**
   * Check if a feature is enabled
   */
  isEnabled(feature: keyof FeatureFlags): boolean {
    const value = this.currentFlags[feature];
    return typeof value === 'boolean' ? value : false;
  }
  
  /**
   * Check migration phase
   */
  getMigrationPhase(): FeatureFlags['migrationPhase'] {
    return this.currentFlags.migrationPhase;
  }
  
  /**
   * Check if user isolation is enabled
   */
  isUserIsolationEnabled(): boolean {
    return this.currentFlags.enableUserIsolation;
  }
  
  /**
   * Check if legacy fallback is enabled
   */
  isLegacyFallbackEnabled(): boolean {
    return this.currentFlags.enableLegacyPathFallback;
  }
  
  /**
   * Check if a specific collection should be migrated
   */
  shouldMigrateCollection(collection: 'voiceSamples' | 'meetingRecordings' | 'meetingClips' | 'identificationSamples'): boolean {
    const flagMap = {
      voiceSamples: 'migrateVoiceSamples',
      meetingRecordings: 'migrateMeetingRecordings',
      meetingClips: 'migrateMeetingClips',
      identificationSamples: 'migrateIdentificationSamples'
    };
    
    const flagKey = flagMap[collection] as keyof FeatureFlags;
    return this.currentFlags[flagKey] as boolean;
  }
  
  /**
   * Subscribe to feature flag changes
   */
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }
  
  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentFlags));
  }
  
  /**
   * Update feature flags (admin only)
   */
  async updateFlags(updates: Partial<FeatureFlags>): Promise<void> {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('Must be authenticated to update feature flags');
    }
    
    // Check if user is admin (would need to verify admin status)
    // For now, we'll just update the flags
    try {
      await setDoc(
        doc(db, 'systemConfig', 'featureFlags'),
        updates,
        { merge: true }
      );
      
      if (this.currentFlags.debugMode) {
        console.log('Feature flags updated:', updates);
      }
    } catch (error) {
      console.error('Error updating feature flags:', error);
      throw error;
    }
  }
  
  /**
   * Enroll user in beta features
   */
  async enrollUserInBeta(userId: string): Promise<void> {
    try {
      await setDoc(
        doc(db, 'userFeatureOverrides', userId),
        {
          userId,
          enrolledInBeta: true,
          migrationOptOut: false,
          overrides: {
            showMigrationPrompt: true,
            autoMigrateOnLogin: true
          }
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error enrolling user in beta:', error);
      throw error;
    }
  }
  
  /**
   * Opt user out of migration
   */
  async optOutOfMigration(userId: string): Promise<void> {
    try {
      await setDoc(
        doc(db, 'userFeatureOverrides', userId),
        {
          userId,
          migrationOptOut: true,
          overrides: {
            showMigrationPrompt: false,
            autoMigrateOnLogin: false
          }
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error opting out of migration:', error);
      throw error;
    }
  }
  
  /**
   * Get migration readiness status
   */
  getMigrationReadiness(): {
    isReady: boolean;
    phase: FeatureFlags['migrationPhase'];
    enabledCollections: string[];
    blockers: string[];
  } {
    const enabledCollections = [];
    const blockers = [];
    
    if (this.currentFlags.migrateVoiceSamples) {
      enabledCollections.push('voice-samples');
    }
    if (this.currentFlags.migrateMeetingRecordings) {
      enabledCollections.push('meeting-recordings');
    }
    if (this.currentFlags.migrateMeetingClips) {
      enabledCollections.push('meeting-clips');
    }
    if (this.currentFlags.migrateIdentificationSamples) {
      enabledCollections.push('identification-samples');
    }
    
    // Check for blockers
    if (this.currentFlags.migrationPhase === 'disabled') {
      blockers.push('Migration is disabled');
    }
    if (!this.currentFlags.enableLegacyPathFallback && this.currentFlags.migrationPhase !== 'completed') {
      blockers.push('Legacy fallback disabled before migration complete');
    }
    
    return {
      isReady: blockers.length === 0 && enabledCollections.length > 0,
      phase: this.currentFlags.migrationPhase,
      enabledCollections,
      blockers
    };
  }
  
  /**
   * Clean up subscriptions
   */
  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners.clear();
  }
}

export const featureFlagService = FeatureFlagService.getInstance();