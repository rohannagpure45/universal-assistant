/**
 * AnonymousUserCleanup - Utility for cleaning up anonymous user accounts
 * 
 * This service provides safe cleanup of anonymous user accounts and their
 * associated data after migration to proper authentication.
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  writeBatch,
  Timestamp,
  limit,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getStorage, ref, deleteObject, listAll } from 'firebase/storage';
import { getAuth, deleteUser } from 'firebase/auth';

export interface CleanupOptions {
  dryRun?: boolean;
  olderThanDays?: number;
  batchSize?: number;
  preserveActiveUsers?: boolean;
  deleteStorage?: boolean;
  deleteAuth?: boolean;
}

export interface CleanupResult {
  totalFound: number;
  deleted: number;
  errors: string[];
  preserved: number;
  storageDeleted: number;
  dryRun: boolean;
}

export interface AnonymousUserData {
  uid: string;
  createdAt: Date;
  lastActive: Date;
  hasData: boolean;
  meetingCount: number;
  storageUsage: number;
}

class AnonymousUserCleanupService {
  private static instance: AnonymousUserCleanupService;
  private storage = getStorage();
  
  private constructor() {}
  
  static getInstance(): AnonymousUserCleanupService {
    if (!this.instance) {
      this.instance = new AnonymousUserCleanupService();
    }
    return this.instance;
  }
  
  /**
   * Find all anonymous users in the system
   */
  async findAnonymousUsers(options: CleanupOptions = {}): Promise<AnonymousUserData[]> {
    const users: AnonymousUserData[] = [];
    const cutoffDays = options.olderThanDays || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cutoffDays);
    
    try {
      // Query users collection for anonymous users
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('isAnonymous', '==', true),
        orderBy('lastActive', 'asc'),
        limit(options.batchSize || 100)
      );
      
      const snapshot = await getDocs(q);
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const userData: AnonymousUserData = {
          uid: docSnap.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate() || new Date(),
          hasData: false,
          meetingCount: 0,
          storageUsage: 0
        };
        
        // Check if user has been inactive
        if (userData.lastActive < cutoffDate) {
          // Check for associated data
          userData.hasData = await this.checkUserHasData(userData.uid);
          userData.meetingCount = await this.countUserMeetings(userData.uid);
          userData.storageUsage = await this.calculateStorageUsage(userData.uid);
          
          users.push(userData);
        }
      }
      
      return users;
    } catch (error) {
      console.error('Error finding anonymous users:', error);
      return users;
    }
  }
  
  /**
   * Check if user has any associated data
   */
  private async checkUserHasData(userId: string): Promise<boolean> {
    try {
      // Check meetings
      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('hostId', '==', userId),
        limit(1)
      );
      const meetingsSnap = await getDocs(meetingsQuery);
      if (!meetingsSnap.empty) return true;
      
      // Check voice library
      const voiceQuery = query(
        collection(db, 'voice_library'),
        where('userId', '==', userId),
        limit(1)
      );
      const voiceSnap = await getDocs(voiceQuery);
      if (!voiceSnap.empty) return true;
      
      // Check custom rules
      const rulesQuery = query(
        collection(db, 'customRules'),
        where('userId', '==', userId),
        limit(1)
      );
      const rulesSnap = await getDocs(rulesQuery);
      if (!rulesSnap.empty) return true;
      
      return false;
    } catch (error) {
      console.error(`Error checking data for user ${userId}:`, error);
      return false;
    }
  }
  
  /**
   * Count user's meetings
   */
  private async countUserMeetings(userId: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'meetings'),
        where('hostId', '==', userId)
      );
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error(`Error counting meetings for user ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Calculate approximate storage usage
   */
  private async calculateStorageUsage(userId: string): Promise<number> {
    try {
      let totalSize = 0;
      const storage = this.storage;
      
      // Check user-specific paths
      const paths = [
        `voice-samples/${userId}`,
        `meeting-recordings/${userId}`,
        `meeting-clips/${userId}`,
        `user-uploads/${userId}`,
        `exports/${userId}`
      ];
      
      for (const path of paths) {
        try {
          const folderRef = ref(storage, path);
          const files = await listAll(folderRef);
          // Estimate 1MB per file (actual size would require metadata)
          totalSize += files.items.length * 1024 * 1024;
        } catch (error) {
          // Path doesn't exist, continue
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error(`Error calculating storage for user ${userId}:`, error);
      return 0;
    }
  }
  
  /**
   * Clean up anonymous users
   */
  async cleanupAnonymousUsers(options: CleanupOptions = {}): Promise<CleanupResult> {
    const result: CleanupResult = {
      totalFound: 0,
      deleted: 0,
      errors: [],
      preserved: 0,
      storageDeleted: 0,
      dryRun: options.dryRun || false
    };
    
    try {
      // Find anonymous users to clean up
      const users = await this.findAnonymousUsers(options);
      result.totalFound = users.length;
      
      console.log(`Found ${users.length} anonymous users for cleanup`);
      
      if (options.dryRun) {
        console.log('DRY RUN - No actual deletions will occur');
        users.forEach(user => {
          console.log(`Would delete: ${user.uid} (Last active: ${user.lastActive.toISOString()})`);
        });
        return result;
      }
      
      // Process deletions in batches
      const batch = writeBatch(db);
      let batchCount = 0;
      const maxBatchSize = 500; // Firestore batch limit
      
      for (const user of users) {
        try {
          // Preserve users with significant data if requested
          if (options.preserveActiveUsers && user.hasData) {
            console.log(`Preserving user ${user.uid} (has data)`);
            result.preserved++;
            continue;
          }
          
          // Delete user document
          batch.delete(doc(db, 'users', user.uid));
          batchCount++;
          
          // Delete related documents
          await this.deleteUserData(user.uid, batch);
          
          // Delete storage if requested
          if (options.deleteStorage) {
            const storageDeleted = await this.deleteUserStorage(user.uid);
            result.storageDeleted += storageDeleted;
          }
          
          result.deleted++;
          
          // Commit batch if it's full
          if (batchCount >= maxBatchSize) {
            await batch.commit();
            batchCount = 0;
          }
          
          console.log(`Deleted user ${user.uid}`);
        } catch (error: any) {
          result.errors.push(`Error deleting user ${user.uid}: ${error.message}`);
          console.error(`Error deleting user ${user.uid}:`, error);
        }
      }
      
      // Commit remaining batch operations
      if (batchCount > 0) {
        await batch.commit();
      }
      
      console.log(`Cleanup complete: ${result.deleted} users deleted, ${result.preserved} preserved`);
      
      return result;
    } catch (error: any) {
      result.errors.push(`Cleanup failed: ${error.message}`);
      console.error('Cleanup failed:', error);
      return result;
    }
  }
  
  /**
   * Delete user's Firestore data
   */
  private async deleteUserData(userId: string, batch: any): Promise<void> {
    try {
      // Delete user preferences
      batch.delete(doc(db, 'userPreferences', userId));
      
      // Delete user's meetings
      const meetingsQuery = query(
        collection(db, 'meetings'),
        where('hostId', '==', userId)
      );
      const meetingsSnap = await getDocs(meetingsQuery);
      meetingsSnap.forEach(doc => batch.delete(doc.ref));
      
      // Delete user's voice profiles
      const voiceQuery = query(
        collection(db, 'voice_library'),
        where('userId', '==', userId)
      );
      const voiceSnap = await getDocs(voiceQuery);
      voiceSnap.forEach(doc => batch.delete(doc.ref));
      
      // Delete user's custom rules
      const rulesQuery = query(
        collection(db, 'customRules'),
        where('userId', '==', userId)
      );
      const rulesSnap = await getDocs(rulesQuery);
      rulesSnap.forEach(doc => batch.delete(doc.ref));
      
    } catch (error) {
      console.error(`Error deleting data for user ${userId}:`, error);
    }
  }
  
  /**
   * Delete user's storage files
   */
  private async deleteUserStorage(userId: string): Promise<number> {
    let deletedCount = 0;
    
    try {
      const paths = [
        `voice-samples/${userId}`,
        `meeting-recordings/${userId}`,
        `meeting-clips/${userId}`,
        `user-uploads/${userId}`,
        `exports/${userId}`,
        `profile-images/${userId}`
      ];
      
      for (const path of paths) {
        try {
          const folderRef = ref(this.storage, path);
          const files = await listAll(folderRef);
          
          // Delete all files in the folder
          for (const fileRef of files.items) {
            await deleteObject(fileRef);
            deletedCount++;
          }
          
          // Recursively delete subfolders
          for (const prefixRef of files.prefixes) {
            const subFiles = await listAll(prefixRef);
            for (const fileRef of subFiles.items) {
              await deleteObject(fileRef);
              deletedCount++;
            }
          }
        } catch (error) {
          // Path doesn't exist, continue
        }
      }
      
      return deletedCount;
    } catch (error) {
      console.error(`Error deleting storage for user ${userId}:`, error);
      return deletedCount;
    }
  }
  
  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalAnonymousUsers: number;
    inactiveUsers: number;
    usersWithData: number;
    estimatedStorageGB: number;
    oldestInactiveDate: Date | null;
  }> {
    try {
      const users = await this.findAnonymousUsers({ olderThanDays: 0 });
      const inactiveUsers = await this.findAnonymousUsers({ olderThanDays: 30 });
      const usersWithData = users.filter(u => u.hasData).length;
      const totalStorageBytes = users.reduce((sum, u) => sum + u.storageUsage, 0);
      const oldestUser = users.sort((a, b) => a.lastActive.getTime() - b.lastActive.getTime())[0];
      
      return {
        totalAnonymousUsers: users.length,
        inactiveUsers: inactiveUsers.length,
        usersWithData,
        estimatedStorageGB: totalStorageBytes / (1024 * 1024 * 1024),
        oldestInactiveDate: oldestUser?.lastActive || null
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return {
        totalAnonymousUsers: 0,
        inactiveUsers: 0,
        usersWithData: 0,
        estimatedStorageGB: 0,
        oldestInactiveDate: null
      };
    }
  }
}

export const anonymousUserCleanup = AnonymousUserCleanupService.getInstance();