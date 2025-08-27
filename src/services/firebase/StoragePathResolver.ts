/**
 * StoragePathResolver - Smart path resolution for hybrid storage migration
 * 
 * This service handles the dual-path system during migration from legacy
 * paths to user-isolated paths. It automatically determines which path
 * structure to use based on feature flags and data availability.
 */

import { getAuth } from 'firebase/auth';
import { getStorage, ref, getDownloadURL, listAll } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';

export interface PathResolutionResult {
  path: string;
  isLegacy: boolean;
  requiresMigration: boolean;
}

export interface MigrationStatus {
  userId: string;
  migrationEnabled: boolean;
  migrationProgress: number;
  migratedCollections: string[];
}

class StoragePathResolver {
  private static instance: StoragePathResolver;
  private storage = getStorage();
  private migrationStatusCache = new Map<string, MigrationStatus>();
  
  private constructor() {}
  
  static getInstance(): StoragePathResolver {
    if (!this.instance) {
      this.instance = new StoragePathResolver();
    }
    return this.instance;
  }
  
  /**
   * Get migration status for a user
   */
  async getUserMigrationStatus(userId: string): Promise<MigrationStatus> {
    // Check cache first
    if (this.migrationStatusCache.has(userId)) {
      return this.migrationStatusCache.get(userId)!;
    }
    
    try {
      // Check user document for migration flag
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      
      const status: MigrationStatus = {
        userId,
        migrationEnabled: userData?.migrationEnabled || false,
        migrationProgress: userData?.migrationProgress || 0,
        migratedCollections: userData?.migratedCollections || []
      };
      
      // Cache for 5 minutes
      this.migrationStatusCache.set(userId, status);
      setTimeout(() => this.migrationStatusCache.delete(userId), 5 * 60 * 1000);
      
      return status;
    } catch (error) {
      console.error('Error getting migration status:', error);
      return {
        userId,
        migrationEnabled: false,
        migrationProgress: 0,
        migratedCollections: []
      };
    }
  }
  
  /**
   * Resolve the correct path for voice samples
   */
  async resolveVoiceSamplePath(
    deepgramVoiceId: string,
    fileName: string,
    userId?: string
  ): Promise<PathResolutionResult> {
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      // No user ID, use legacy path
      return {
        path: `voice-samples/${deepgramVoiceId}/${fileName}`,
        isLegacy: true,
        requiresMigration: false
      };
    }
    
    const migrationStatus = await this.getUserMigrationStatus(currentUserId);
    
    if (migrationStatus.migrationEnabled && 
        migrationStatus.migratedCollections.includes('voice-samples')) {
      // User has migrated, use new path
      return {
        path: `voice-samples/${currentUserId}/${deepgramVoiceId}/${fileName}`,
        isLegacy: false,
        requiresMigration: false
      };
    }
    
    // Check if file exists in new location
    const newPath = `voice-samples/${currentUserId}/${deepgramVoiceId}/${fileName}`;
    const newRef = ref(this.storage, newPath);
    
    try {
      await getDownloadURL(newRef);
      // File exists in new location
      return {
        path: newPath,
        isLegacy: false,
        requiresMigration: false
      };
    } catch (error) {
      // File doesn't exist in new location, use legacy
      return {
        path: `voice-samples/${deepgramVoiceId}/${fileName}`,
        isLegacy: true,
        requiresMigration: true
      };
    }
  }
  
  /**
   * Resolve the correct path for meeting recordings
   */
  async resolveMeetingRecordingPath(
    meetingId: string,
    fileName: string,
    userId?: string
  ): Promise<PathResolutionResult> {
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      return {
        path: `meeting-recordings/${meetingId}/${fileName}`,
        isLegacy: true,
        requiresMigration: false
      };
    }
    
    const migrationStatus = await this.getUserMigrationStatus(currentUserId);
    
    if (migrationStatus.migrationEnabled && 
        migrationStatus.migratedCollections.includes('meeting-recordings')) {
      return {
        path: `meeting-recordings/${currentUserId}/${meetingId}/${fileName}`,
        isLegacy: false,
        requiresMigration: false
      };
    }
    
    // Try new path first
    const newPath = `meeting-recordings/${currentUserId}/${meetingId}/${fileName}`;
    const newRef = ref(this.storage, newPath);
    
    try {
      await getDownloadURL(newRef);
      return {
        path: newPath,
        isLegacy: false,
        requiresMigration: false
      };
    } catch (error) {
      return {
        path: `meeting-recordings/${meetingId}/${fileName}`,
        isLegacy: true,
        requiresMigration: true
      };
    }
  }
  
  /**
   * Resolve the correct path for meeting clips
   */
  async resolveMeetingClipPath(
    meetingId: string,
    fileName: string,
    userId?: string
  ): Promise<PathResolutionResult> {
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      return {
        path: `meeting-clips/${meetingId}/${fileName}`,
        isLegacy: true,
        requiresMigration: false
      };
    }
    
    const migrationStatus = await this.getUserMigrationStatus(currentUserId);
    
    if (migrationStatus.migrationEnabled && 
        migrationStatus.migratedCollections.includes('meeting-clips')) {
      return {
        path: `meeting-clips/${currentUserId}/${meetingId}/${fileName}`,
        isLegacy: false,
        requiresMigration: false
      };
    }
    
    const newPath = `meeting-clips/${currentUserId}/${meetingId}/${fileName}`;
    const newRef = ref(this.storage, newPath);
    
    try {
      await getDownloadURL(newRef);
      return {
        path: newPath,
        isLegacy: false,
        requiresMigration: false
      };
    } catch (error) {
      return {
        path: `meeting-clips/${meetingId}/${fileName}`,
        isLegacy: true,
        requiresMigration: true
      };
    }
  }
  
  /**
   * Batch check file existence for optimization
   */
  async batchCheckFileExistence(paths: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    // Process in batches to avoid overwhelming the system
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < paths.length; i += batchSize) {
      batches.push(paths.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      const promises = batch.map(async (path) => {
        try {
          const fileRef = ref(this.storage, path);
          await getDownloadURL(fileRef);
          return { path, exists: true };
        } catch (error) {
          return { path, exists: false };
        }
      });
      
      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ path, exists }) => {
        results.set(path, exists);
      });
    }
    
    return results;
  }
  
  /**
   * Optimized path resolution for multiple files
   */
  async batchResolveVoiceSamplePaths(
    items: Array<{ deepgramVoiceId: string; fileName: string }>,
    userId?: string
  ): Promise<Map<string, PathResolutionResult>> {
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;
    const results = new Map<string, PathResolutionResult>();
    
    if (!currentUserId) {
      // No user ID, use legacy paths for all
      items.forEach(({ deepgramVoiceId, fileName }) => {
        const key = `${deepgramVoiceId}/${fileName}`;
        results.set(key, {
          path: `voice-samples/${deepgramVoiceId}/${fileName}`,
          isLegacy: true,
          requiresMigration: false
        });
      });
      return results;
    }
    
    const migrationStatus = await this.getUserMigrationStatus(currentUserId);
    
    // If user has migrated, use new paths for all
    if (migrationStatus.migrationEnabled && 
        migrationStatus.migratedCollections.includes('voice-samples')) {
      items.forEach(({ deepgramVoiceId, fileName }) => {
        const key = `${deepgramVoiceId}/${fileName}`;
        results.set(key, {
          path: `voice-samples/${currentUserId}/${deepgramVoiceId}/${fileName}`,
          isLegacy: false,
          requiresMigration: false
        });
      });
      return results;
    }
    
    // Check which files exist in new location (batch check)
    const newPaths = items.map(({ deepgramVoiceId, fileName }) => 
      `voice-samples/${currentUserId}/${deepgramVoiceId}/${fileName}`
    );
    
    const existenceMap = await this.batchCheckFileExistence(newPaths);
    
    items.forEach(({ deepgramVoiceId, fileName }, index) => {
      const key = `${deepgramVoiceId}/${fileName}`;
      const newPath = newPaths[index];
      const existsInNew = existenceMap.get(newPath) || false;
      
      if (existsInNew) {
        results.set(key, {
          path: newPath,
          isLegacy: false,
          requiresMigration: false
        });
      } else {
        results.set(key, {
          path: `voice-samples/${deepgramVoiceId}/${fileName}`,
          isLegacy: true,
          requiresMigration: true
        });
      }
    });
    
    return results;
  }
  
  /**
   * List all files that need migration for a user
   */
  async listFilesForMigration(userId: string): Promise<{
    voiceSamples: string[];
    meetingRecordings: string[];
    meetingClips: string[];
    totalFiles: number;
  }> {
    const result = {
      voiceSamples: [] as string[],
      meetingRecordings: [] as string[],
      meetingClips: [] as string[],
      totalFiles: 0
    };
    
    try {
      // Check voice samples
      const voiceSamplesRef = ref(this.storage, 'voice-samples');
      const voiceSamplesList = await listAll(voiceSamplesRef);
      
      // Batch check which files belong to this user
      const allVoiceSamples: string[] = [];
      for (const prefix of voiceSamplesList.prefixes) {
        const files = await listAll(prefix);
        allVoiceSamples.push(...files.items.map(item => item.fullPath));
      }
      
      // Filter to only include files that need migration
      const userVoiceSamples = allVoiceSamples.filter(path => {
        // Check if this file needs migration to user-isolated path
        return !path.includes(`/${userId}/`);
      });
      
      result.voiceSamples = userVoiceSamples;
      
      // Check meeting recordings (filter by user's meetings)
      // This would need to check against the user's meeting IDs from Firestore
      
      // Check meeting clips (filter by user's meetings)
      // This would need to check against the user's meeting IDs from Firestore
      
      result.totalFiles = result.voiceSamples.length + 
                         result.meetingRecordings.length + 
                         result.meetingClips.length;
      
      return result;
    } catch (error) {
      console.error('Error listing files for migration:', error);
      return result;
    }
  }
  
  /**
   * Generate the appropriate upload path based on migration status
   */
  async generateUploadPath(
    collection: 'voice-samples' | 'meeting-recordings' | 'meeting-clips' | 'identification-samples',
    resourceId: string, // deepgramVoiceId or meetingId
    fileName: string,
    userId?: string
  ): Promise<string> {
    const auth = getAuth();
    const currentUserId = userId || auth.currentUser?.uid;
    
    if (!currentUserId) {
      // Anonymous or no user, use legacy path
      return `${collection}/${resourceId}/${fileName}`;
    }
    
    const migrationStatus = await this.getUserMigrationStatus(currentUserId);
    
    if (migrationStatus.migrationEnabled && 
        migrationStatus.migratedCollections.includes(collection)) {
      // User has migrated this collection, use new path
      if (collection === 'identification-samples') {
        const [meetingId, deepgramVoiceId] = resourceId.split('/');
        return `${collection}/${currentUserId}/${meetingId}/${deepgramVoiceId}/${fileName}`;
      }
      return `${collection}/${currentUserId}/${resourceId}/${fileName}`;
    }
    
    // Use legacy path for backward compatibility
    return `${collection}/${resourceId}/${fileName}`;
  }
  
  /**
   * Clear migration status cache for a user
   */
  clearUserCache(userId: string): void {
    this.migrationStatusCache.delete(userId);
  }
  
  /**
   * Clear all cached migration statuses
   */
  clearAllCache(): void {
    this.migrationStatusCache.clear();
  }
}

export const storagePathResolver = StoragePathResolver.getInstance();