/**
 * Migration helpers for smooth data structure transitions
 * Provides utilities for migrating between different versions of data structures
 * while maintaining backward compatibility and data integrity
 */

import type { 
  VoiceSample,
  VoiceSampleCore,
  VoiceSampleIdentity,
  VoiceSampleAnalysis,
  VoiceSampleOrganization,
  VoiceSampleStorage,
  VoiceSampleUI
} from '@/types/voice-identification';
// Removed unused VoiceSampleValidator import
import { createValidationSuccess, createValidationFailure, ValidationResult } from '@/domain/validation/ValidationResult';

/**
 * Version tracking for migrations
 */
export interface MigrationVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Migration result tracking
 */
export interface MigrationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
  migratedFields?: string[];
  version?: MigrationVersion;
}

/**
 * Generic migration strategy interface
 */
export interface MigrationStrategy<TFrom, TTo> {
  canMigrate: (data: unknown) => data is TFrom;
  migrate: (data: TFrom) => TTo;
  version: MigrationVersion;
}

/**
 * Migration registry for managing multiple migration strategies
 */
export class MigrationRegistry<T> {
  private strategies: Map<string, MigrationStrategy<any, T>> = new Map();

  /**
   * Register a migration strategy
   */
  register(key: string, strategy: MigrationStrategy<any, T>): void {
    this.strategies.set(key, strategy);
  }

  /**
   * Attempt to migrate data using registered strategies
   */
  migrate(data: unknown): MigrationResult<T> {
    for (const [key, strategy] of this.strategies) {
      if (strategy.canMigrate(data)) {
        try {
          const migrated = strategy.migrate(data);
          return {
            success: true,
            data: migrated,
            version: strategy.version,
            migratedFields: [key]
          };
        } catch (error) {
          return {
            success: false,
            error: `Migration failed for strategy ${key}: ${String(error)}`
          };
        }
      }
    }

    return {
      success: false,
      error: 'No suitable migration strategy found'
    };
  }
}

/**
 * Legacy VoiceSample structure (pre-segregation)
 */
interface LegacyVoiceSample {
  id?: string;
  url: string;
  transcript: string;
  quality: number;
  duration: number;
  timestamp: Date | string;
  // Mixed concerns - all in one interface
  speakerId?: string;
  speakerName?: string;
  deepgramVoiceId?: string;
  meetingId?: string;
  source?: string;
  confidence?: number;
  qualityLevel?: string;
  isStarred?: boolean;
  isActive?: boolean;
  selected?: boolean;
  filePath?: string;
  blob?: Blob;
  tags?: string[];
  notes?: string;
  method?: string;
  // Legacy fields that might exist
  audioUrl?: string;
  audioBlob?: Blob;
  metadata?: any;
}

/**
 * Migrate legacy VoiceSample to new segregated structure
 */
export class VoiceSampleMigrator {
  /**
   * Check if data is a legacy VoiceSample
   */
  static isLegacyVoiceSample(data: unknown): data is LegacyVoiceSample {
    if (!data || typeof data !== 'object') return false;
    
    const obj = data as any;
    return (
      typeof obj.url === 'string' &&
      typeof obj.transcript === 'string' &&
      typeof obj.quality === 'number' &&
      typeof obj.duration === 'number' &&
      (obj.timestamp instanceof Date || typeof obj.timestamp === 'string')
    );
  }

  /**
   * Migrate legacy VoiceSample to new structure
   */
  static migrateLegacyToNew(legacy: LegacyVoiceSample): ValidationResult<VoiceSample> {
    try {
      // Extract core fields
      const core: VoiceSampleCore = {
        id: legacy.id || `legacy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: legacy.audioUrl || legacy.url,
        transcript: legacy.transcript,
        quality: legacy.quality,
        duration: legacy.duration,
        timestamp: legacy.timestamp instanceof Date 
          ? legacy.timestamp 
          : new Date(legacy.timestamp)
      };

      // Extract identity fields
      const identity: VoiceSampleIdentity = {
        speakerId: legacy.speakerId,
        meetingId: legacy.meetingId,
        source: this.mapLegacySource(legacy.source),
        confidence: legacy.confidence
      };

      // Extract analysis fields
      const analysis: VoiceSampleAnalysis = {
        qualityLevel: this.mapLegacyQualityLevel(legacy.qualityLevel),
        qualityAssessment: legacy.metadata?.qualityAssessment
      };

      // Extract organization fields
      const organization: VoiceSampleOrganization = {
        tags: legacy.tags,
        notes: legacy.notes,
        method: this.mapLegacyMethod(legacy.method)
      };

      // Extract storage fields
      const storage: VoiceSampleStorage = {
        filePath: legacy.filePath,
        blob: legacy.audioBlob || legacy.blob,
        metadata: legacy.metadata
      };

      // Extract UI fields
      const ui: VoiceSampleUI = {
        isStarred: legacy.isStarred,
        isActive: legacy.isActive,
        selected: legacy.selected
      };

      // Combine all fields
      const migrated: VoiceSample = {
        ...core,
        ...identity,
        ...analysis,
        ...organization,
        ...storage,
        ...ui
      };

      // Components handle validation themselves - no complex validation needed
      const validated = migrated;
      
      return createValidationSuccess(validated, {
        migrationVersion: '2.0.0',
        migratedFrom: 'legacy'
      });
    } catch (error) {
      return createValidationFailure(
        [new Error(`Migration failed: ${String(error)}`) as any],
        ['Some fields may not have been migrated correctly']
      );
    }
  }

  /**
   * Map legacy source values to new enum
   */
  private static mapLegacySource(source?: string): VoiceSampleIdentity['source'] {
    const sourceMap: Record<string, VoiceSampleIdentity['source']> = {
      'live': 'live-recording',
      'upload': 'file-upload',
      'meeting': 'meeting-extract',
      'training': 'training-session',
      'file': 'file-upload',
      'recording': 'live-recording'
    };

    if (!source) return undefined;
    
    const mapped = sourceMap[source.toLowerCase()];
    if (mapped) return mapped;
    
    // Check if it's already a valid value
    const validSources: VoiceSampleIdentity['source'][] = [
      'live-recording', 'file-upload', 'meeting-extract', 
      'training-session', 'upload', 'meeting', 'training'
    ];
    
    return validSources.includes(source as any) 
      ? source as VoiceSampleIdentity['source']
      : undefined;
  }

  /**
   * Map legacy quality level values
   */
  private static mapLegacyQualityLevel(level?: string): VoiceSampleAnalysis['qualityLevel'] {
    if (!level) return undefined;
    
    const levelMap: Record<string, VoiceSampleAnalysis['qualityLevel']> = {
      'excellent': 'excellent',
      'good': 'good',
      'fair': 'fair',
      'poor': 'poor',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
      'best': 'excellent',
      'average': 'fair',
      'bad': 'poor'
    };

    return levelMap[level.toLowerCase()] || undefined;
  }

  /**
   * Map legacy method values
   */
  private static mapLegacyMethod(method?: string): VoiceSampleOrganization['method'] {
    if (!method) return undefined;
    
    const methodMap: Record<string, VoiceSampleOrganization['method']> = {
      'self': 'self-recording',
      'upload': 'upload',
      'meeting': 'meeting-clips',
      'recording': 'self-recording',
      'file': 'upload',
      'clips': 'meeting-clips'
    };

    return methodMap[method.toLowerCase()] || undefined;
  }

  /**
   * Batch migrate an array of voice samples
   */
  static migrateBatch(samples: unknown[]): {
    migrated: VoiceSample[];
    failed: Array<{ index: number; error: string }>;
    warnings: string[];
  } {
    const migrated: VoiceSample[] = [];
    const failed: Array<{ index: number; error: string }> = [];
    const warnings: string[] = [];

    samples.forEach((sample, index) => {
      if (this.isLegacyVoiceSample(sample)) {
        const result = this.migrateLegacyToNew(sample);
        if (result.isValid) {
          migrated.push(result.data);
        } else {
          failed.push({
            index,
            error: result.errors?.map(e => e.message).join(', ') || 'Unknown error'
          });
        }
        if (result.warnings?.length) {
          warnings.push(...result.warnings.map(w => `Sample ${index}: ${w}`));
        }
      } else if (VoiceSampleValidator.isValid(sample)) {
        migrated.push(sample as VoiceSample);
      } else {
        failed.push({
          index,
          error: 'Invalid sample format'
        });
      }
    });

    return { migrated, failed, warnings };
  }
}

/**
 * Database schema migration helper
 */
export class SchemaMigrator {
  /**
   * Migrate a document with version tracking
   */
  static async migrateDocument<T>(
    document: any,
    migrations: Array<{
      version: string;
      up: (doc: any) => any;
      description?: string;
    }>
  ): Promise<T> {
    let current = { ...document };
    const currentVersion = current.__version || '0.0.0';

    for (const migration of migrations) {
      if (this.compareVersions(currentVersion, migration.version) < 0) {
        console.log(`Applying migration ${migration.version}: ${migration.description || 'No description'}`);
        current = await migration.up(current);
        current.__version = migration.version;
      }
    }

    return current as T;
  }

  /**
   * Compare semantic versions
   */
  private static compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  /**
   * Create a backup before migration
   */
  static createBackup<T>(data: T): string {
    const backup = {
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(data))
    };
    
    // In production, this would save to a backup storage
    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Store in session storage for recovery
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(backupId, JSON.stringify(backup));
      } catch (e) {
        console.warn('Failed to create backup:', e);
      }
    }
    
    return backupId;
  }

  /**
   * Restore from backup
   */
  static restoreBackup<T>(backupId: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const backupStr = sessionStorage.getItem(backupId);
      if (!backupStr) return null;
      
      const backup = JSON.parse(backupStr);
      return backup.data as T;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      return null;
    }
  }
}

/**
 * Progressive migration for large datasets
 */
export class ProgressiveMigrator<TFrom, TTo> {
  private batchSize: number;
  private onProgress?: (progress: number, total: number) => void;
  private onError?: (error: Error, item: TFrom, index: number) => void;

  constructor(options: {
    batchSize?: number;
    onProgress?: (progress: number, total: number) => void;
    onError?: (error: Error, item: TFrom, index: number) => void;
  } = {}) {
    this.batchSize = options.batchSize || 100;
    this.onProgress = options.onProgress;
    this.onError = options.onError;
  }

  /**
   * Migrate data progressively in batches
   */
  async *migrateAsync(
    items: TFrom[],
    migrator: (item: TFrom) => TTo | Promise<TTo>
  ): AsyncGenerator<TTo[], void, unknown> {
    const total = items.length;
    let processed = 0;

    for (let i = 0; i < total; i += this.batchSize) {
      const batch = items.slice(i, Math.min(i + this.batchSize, total));
      const results: TTo[] = [];

      for (let j = 0; j < batch.length; j++) {
        try {
          const result = await migrator(batch[j]);
          results.push(result);
          processed++;
          
          if (this.onProgress) {
            this.onProgress(processed, total);
          }
        } catch (error) {
          if (this.onError) {
            this.onError(error as Error, batch[j], i + j);
          }
        }
      }

      yield results;
    }
  }

  /**
   * Migrate all items and return complete result
   */
  async migrateAll(
    items: TFrom[],
    migrator: (item: TFrom) => TTo | Promise<TTo>
  ): Promise<{
    success: TTo[];
    failed: Array<{ item: TFrom; error: Error; index: number }>;
  }> {
    const success: TTo[] = [];
    const failed: Array<{ item: TFrom; error: Error; index: number }> = [];

    const generator = this.migrateAsync(items, async (item) => {
      try {
        return await migrator(item);
      } catch (error) {
        throw error;
      }
    });

    for await (const batch of generator) {
      success.push(...batch);
    }

    return { success, failed };
  }
}

/**
 * Feature flag based migration for A/B testing
 */
export class FeatureFlagMigration<T> {
  private flags: Map<string, boolean> = new Map();

  /**
   * Set a feature flag
   */
  setFlag(name: string, enabled: boolean): void {
    this.flags.set(name, enabled);
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(name: string): boolean {
    return this.flags.get(name) || false;
  }

  /**
   * Conditionally apply migration based on feature flags
   */
  migrate(data: T, migrations: Record<string, (data: T) => T>): T {
    let result = { ...data };

    for (const [flag, migration] of Object.entries(migrations)) {
      if (this.isEnabled(flag)) {
        result = migration(result);
      }
    }

    return result;
  }

  /**
   * Get migration status
   */
  getStatus(): Record<string, boolean> {
    return Object.fromEntries(this.flags);
  }
}

// Export convenience functions
export const migrateVoiceSample = VoiceSampleMigrator.migrateLegacyToNew.bind(VoiceSampleMigrator);
export const migrateVoiceSampleBatch = VoiceSampleMigrator.migrateBatch.bind(VoiceSampleMigrator);

export default {
  VoiceSampleMigrator,
  SchemaMigrator,
  ProgressiveMigrator,
  FeatureFlagMigration,
  MigrationRegistry
};