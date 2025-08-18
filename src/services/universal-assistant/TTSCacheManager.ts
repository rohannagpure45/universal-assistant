import { adminStorage } from '@/lib/firebase/admin';

export interface CacheStats {
  totalFiles: number;
  totalSize: number;
  oldestFile?: {
    name: string;
    created: Date;
    size: number;
  };
  newestFile?: {
    name: string;
    created: Date;
    size: number;
  };
  averageFileSize: number;
  expiredFiles: number;
}

export interface CacheFile {
  name: string;
  created: Date;
  size: number;
  expired: boolean;
  cacheKey: string;
  metadata?: Record<string, any>;
}

export class TTSCacheManager {
  private readonly bucketPath = 'tts-cache';
  private readonly expirationDays = 7;

  // Helper function to ensure adminStorage is initialized
  private ensureAdminStorage(): import('firebase-admin/storage').Storage {
    const storage = adminStorage();
    if (!storage) {
      throw new Error('Firebase Admin Storage not initialized');
    }
    return storage;
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const [files] = await this.ensureAdminStorage().bucket().getFiles({
        prefix: this.bucketPath,
      });

      if (files.length === 0) {
        return {
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0,
          expiredFiles: 0,
        };
      }

      let totalSize = 0;
      let expiredFiles = 0;
      let oldestFile: CacheFile | undefined;
      let newestFile: CacheFile | undefined;

      const now = new Date();
      const expirationMs = this.expirationDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        try {
          const [metadata] = await file.getMetadata();
          const created = new Date(metadata.timeCreated || Date.now());
          const size = parseInt(String(metadata.size || '0'));
          const expired = (now.getTime() - created.getTime()) > expirationMs;

          totalSize += size;
          if (expired) expiredFiles++;

          const fileInfo: CacheFile = {
            name: file.name,
            created,
            size,
            expired,
            cacheKey: this.extractCacheKey(file.name),
            metadata: metadata.metadata,
          };

          if (!oldestFile || created < oldestFile.created) {
            oldestFile = fileInfo;
          }
          if (!newestFile || created > newestFile.created) {
            newestFile = fileInfo;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      return {
        totalFiles: files.length,
        totalSize,
        oldestFile,
        newestFile,
        averageFileSize: Math.round(totalSize / files.length),
        expiredFiles,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed list of all cached files
   */
  async listCachedFiles(options: {
    limit?: number;
    includeExpired?: boolean;
    sortBy?: 'created' | 'size' | 'name';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<CacheFile[]> {
    try {
      const {
        limit = 100,
        includeExpired = true,
        sortBy = 'created',
        sortOrder = 'desc',
      } = options;

      const [files] = await this.ensureAdminStorage().bucket().getFiles({
        prefix: this.bucketPath,
        maxResults: limit * 2, // Get more to account for filtering
      });

      const cacheFiles: CacheFile[] = [];
      const now = new Date();
      const expirationMs = this.expirationDays * 24 * 60 * 60 * 1000;

      for (const file of files) {
        try {
          const [metadata] = await file.getMetadata();
          const created = new Date(metadata.timeCreated || Date.now());
          const size = parseInt(String(metadata.size || '0'));
          const expired = (now.getTime() - created.getTime()) > expirationMs;

          if (!includeExpired && expired) {
            continue;
          }

          cacheFiles.push({
            name: file.name,
            created,
            size,
            expired,
            cacheKey: this.extractCacheKey(file.name),
            metadata: metadata.metadata,
          });
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }

      // Sort files
      cacheFiles.sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'created':
            comparison = a.created.getTime() - b.created.getTime();
            break;
          case 'size':
            comparison = a.size - b.size;
            break;
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      return cacheFiles.slice(0, limit);
    } catch (error) {
      console.error('Error listing cached files:', error);
      throw error;
    }
  }

  /**
   * Clean up expired cache files
   */
  async cleanupExpiredFiles(): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    try {
      const files = await this.listCachedFiles({
        includeExpired: true,
        limit: 1000,
      });

      const expiredFiles = files.filter(f => f.expired);
      const errors: string[] = [];
      let deletedCount = 0;
      let freedSpace = 0;

      // Delete expired files in batches
      const batchSize = 10;
      for (let i = 0; i < expiredFiles.length; i += batchSize) {
        const batch = expiredFiles.slice(i, i + batchSize);
        const deletePromises = batch.map(async (file) => {
          try {
            const firebaseFile = this.ensureAdminStorage().bucket().file(file.name);
            await firebaseFile.delete();
            deletedCount++;
            freedSpace += file.size;
          } catch (error) {
            errors.push(`Failed to delete ${file.name}: ${error}`);
          }
        });

        await Promise.all(deletePromises);
      }

      return { deletedCount, freedSpace, errors };
    } catch (error) {
      console.error('Error cleaning up expired files:', error);
      throw error;
    }
  }

  /**
   * Force delete specific cached files
   */
  async deleteFiles(cacheKeys: string[]): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedCount = 0;

    for (const cacheKey of cacheKeys) {
      try {
        const fileName = `${this.bucketPath}/${cacheKey}.mp3`;
        const file = this.ensureAdminStorage().bucket().file(fileName);
        
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          deletedCount++;
        } else {
          errors.push(`File not found: ${cacheKey}`);
        }
      } catch (error) {
        errors.push(`Failed to delete ${cacheKey}: ${error}`);
      }
    }

    return { deletedCount, errors };
  }

  /**
   * Clear entire cache (use with caution)
   */
  async clearAllCache(): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    try {
      const files = await this.listCachedFiles({
        includeExpired: true,
        limit: 10000,
      });

      const errors: string[] = [];
      let deletedCount = 0;
      let freedSpace = 0;

      // Delete all files in batches
      const batchSize = 20;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const deletePromises = batch.map(async (file) => {
          try {
            const firebaseFile = this.ensureAdminStorage().bucket().file(file.name);
            await firebaseFile.delete();
            deletedCount++;
            freedSpace += file.size;
          } catch (error) {
            errors.push(`Failed to delete ${file.name}: ${error}`);
          }
        });

        await Promise.all(deletePromises);
      }

      return { deletedCount, freedSpace, errors };
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Optimize cache by removing oldest files when size limit is exceeded
   */
  async optimizeCache(maxSizeBytes: number = 50 * 1024 * 1024): Promise<{
    deletedCount: number;
    freedSpace: number;
    remainingSize: number;
  }> {
    try {
      const stats = await getCacheStats();
      
      if (stats.totalSize <= maxSizeBytes) {
        return {
          deletedCount: 0,
          freedSpace: 0,
          remainingSize: stats.totalSize,
        };
      }

      // Get files sorted by creation date (oldest first)
      const files = await this.listCachedFiles({
        includeExpired: true,
        sortBy: 'created',
        sortOrder: 'asc',
        limit: 1000,
      });

      let currentSize = stats.totalSize;
      let deletedCount = 0;
      let freedSpace = 0;
      const errors: string[] = [];

      // Delete oldest files until we're under the size limit
      for (const file of files) {
        if (currentSize <= maxSizeBytes) {
          break;
        }

        try {
          const firebaseFile = this.ensureAdminStorage().bucket().file(file.name);
          await firebaseFile.delete();
          
          currentSize -= file.size;
          freedSpace += file.size;
          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete ${file.name}: ${error}`);
        }
      }

      return {
        deletedCount,
        freedSpace,
        remainingSize: currentSize,
      };
    } catch (error) {
      console.error('Error optimizing cache:', error);
      throw error;
    }
  }

  /**
   * Get cache usage by time period
   */
  async getCacheUsageByPeriod(periodDays: number = 7): Promise<{
    period: string;
    fileCount: number;
    totalSize: number;
    averageFileSize: number;
  }[]> {
    try {
      const files = await this.listCachedFiles({
        includeExpired: true,
        limit: 10000,
      });

      const periods: Map<string, { count: number; size: number }> = new Map();
      const now = new Date();

      for (const file of files) {
        const daysDiff = Math.floor((now.getTime() - file.created.getTime()) / (24 * 60 * 60 * 1000));
        const periodKey = `${Math.floor(daysDiff / periodDays) * periodDays}-${Math.floor(daysDiff / periodDays) * periodDays + periodDays - 1}`;
        
        const existing = periods.get(periodKey) || { count: 0, size: 0 };
        periods.set(periodKey, {
          count: existing.count + 1,
          size: existing.size + file.size,
        });
      }

      return Array.from(periods.entries()).map(([period, data]) => ({
        period: `${period} days ago`,
        fileCount: data.count,
        totalSize: data.size,
        averageFileSize: Math.round(data.size / data.count),
      })).sort((a, b) => a.period.localeCompare(b.period));
    } catch (error) {
      console.error('Error getting cache usage by period:', error);
      throw error;
    }
  }

  /**
   * Extract cache key from file name
   */
  private extractCacheKey(fileName: string): string {
    const parts = fileName.split('/');
    const basename = parts[parts.length - 1];
    return basename.replace('.mp3', '');
  }
}

// Export singleton instance
export const ttsCacheManager = new TTSCacheManager();

// Convenience functions
export async function getCacheStats(): Promise<CacheStats> {
  return ttsCacheManager.getCacheStats();
}

export async function cleanupCache(): Promise<{
  deletedCount: number;
  freedSpace: number;
  errors: string[];
}> {
  return ttsCacheManager.cleanupExpiredFiles();
}

export async function optimizeCache(maxSizeBytes?: number): Promise<{
  deletedCount: number;
  freedSpace: number;
  remainingSize: number;
}> {
  return ttsCacheManager.optimizeCache(maxSizeBytes);
}

// Utility function to format file sizes
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Utility function to format cache stats for display
export function formatCacheStats(stats: CacheStats): string {
  return `
Cache Statistics:
- Total Files: ${stats.totalFiles}
- Total Size: ${formatFileSize(stats.totalSize)}
- Average File Size: ${formatFileSize(stats.averageFileSize)}
- Expired Files: ${stats.expiredFiles}
- Oldest File: ${stats.oldestFile ? `${stats.oldestFile.name} (${stats.oldestFile.created.toISOString()})` : 'N/A'}
- Newest File: ${stats.newestFile ? `${stats.newestFile.name} (${stats.newestFile.created.toISOString()})` : 'N/A'}
  `.trim();
}