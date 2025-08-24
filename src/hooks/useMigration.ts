/**
 * React hook for managing data migrations in components
 * Provides smooth transitions when data structures change
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MigrationResult,
  ProgressiveMigrator,
  SchemaMigrator,
  FeatureFlagMigration
} from '@/utils/migration-helpers';

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  isRunning: boolean;
  progress: number;
  total: number;
  completed: number;
  failed: number;
  warnings: string[];
  error?: string;
}

/**
 * Hook options
 */
interface UseMigrationOptions<TFrom, TTo> {
  /** Migration function */
  migrator: (data: TFrom) => TTo | Promise<TTo>;
  /** Batch size for progressive migration */
  batchSize?: number;
  /** Auto-run migration on mount */
  autoRun?: boolean;
  /** Create backup before migration */
  createBackup?: boolean;
  /** Feature flags for conditional migration */
  featureFlags?: Record<string, boolean>;
  /** Callback when migration completes */
  onComplete?: (result: { success: TTo[]; failed: any[] }) => void;
  /** Callback for progress updates */
  onProgress?: (status: MigrationStatus) => void;
  /** Callback for errors */
  onError?: (error: Error, item: TFrom, index: number) => void;
}

/**
 * Hook for managing data migrations
 */
export function useMigration<TFrom, TTo>(
  data: TFrom[] | null,
  options: UseMigrationOptions<TFrom, TTo>
) {
  const {
    migrator,
    batchSize = 100,
    autoRun = false,
    createBackup = true,
    featureFlags,
    onComplete,
    onProgress,
    onError
  } = options;

  const [status, setStatus] = useState<MigrationStatus>({
    isRunning: false,
    progress: 0,
    total: 0,
    completed: 0,
    failed: 0,
    warnings: [],
    error: undefined
  });

  const [migratedData, setMigratedData] = useState<TTo[] | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressiveMigratorRef = useRef<ProgressiveMigrator<TFrom, TTo> | null>(null);
  const featureFlagMigrationRef = useRef<FeatureFlagMigration<TTo> | null>(null);

  // Initialize feature flags
  useEffect(() => {
    if (featureFlags) {
      const ffMigration = new FeatureFlagMigration<TTo>();
      Object.entries(featureFlags).forEach(([flag, enabled]) => {
        ffMigration.setFlag(flag, enabled);
      });
      featureFlagMigrationRef.current = ffMigration;
    }
  }, [featureFlags]);

  // Initialize progressive migrator
  useEffect(() => {
    progressiveMigratorRef.current = new ProgressiveMigrator<TFrom, TTo>({
      batchSize,
      onProgress: (progress, total) => {
        setStatus(prev => ({
          ...prev,
          progress,
          total,
          completed: progress
        }));
        onProgress?.({
          ...status,
          progress,
          total,
          completed: progress
        });
      },
      onError: (error, item, index) => {
        setStatus(prev => ({
          ...prev,
          failed: prev.failed + 1,
          warnings: [...prev.warnings, `Item ${index}: ${error.message}`]
        }));
        onError?.(error, item, index);
      }
    });
  }, [batchSize, onProgress, onError]);

  /**
   * Run the migration
   */
  const runMigration = useCallback(async () => {
    if (!data || data.length === 0) {
      setMigratedData([]);
      return;
    }

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    setStatus({
      isRunning: true,
      progress: 0,
      total: data.length,
      completed: 0,
      failed: 0,
      warnings: [],
      error: undefined
    });

    try {
      // Create backup if requested
      if (createBackup) {
        const backupId = SchemaMigrator.createBackup(data);
        setBackupId(backupId);
      }

      const success: TTo[] = [];
      const failed: any[] = [];

      if (progressiveMigratorRef.current) {
        const generator = progressiveMigratorRef.current.migrateAsync(
          data,
          migrator
        );

        for await (const batch of generator) {
          // Check if migration was cancelled
          if (abortControllerRef.current?.signal.aborted) {
            throw new Error('Migration cancelled');
          }

          // Apply feature flags if configured
          const processedBatch = featureFlagMigrationRef.current
            ? batch.map(item => featureFlagMigrationRef.current!.migrate(item, {}))
            : batch;

          success.push(...processedBatch);
        }
      }

      setMigratedData(success);
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        completed: success.length
      }));

      onComplete?.({ success, failed });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isRunning: false,
        error: String(error)
      }));
      
      // Attempt to restore from backup on error
      if (backupId && createBackup) {
        const backup = SchemaMigrator.restoreBackup<TFrom[]>(backupId);
        if (backup) {
          console.log('Restored from backup after migration error');
        }
      }
    }
  }, [data, migrator, createBackup, onComplete]);

  /**
   * Cancel the migration
   */
  const cancelMigration = useCallback(() => {
    abortControllerRef.current?.abort();
    setStatus(prev => ({
      ...prev,
      isRunning: false,
      error: 'Migration cancelled by user'
    }));
  }, []);

  /**
   * Restore from backup
   */
  const restoreFromBackup = useCallback(() => {
    if (!backupId) {
      console.warn('No backup available to restore');
      return false;
    }

    const backup = SchemaMigrator.restoreBackup<TFrom[]>(backupId);
    if (backup) {
      // Re-run migration with restored data if needed
      console.log('Restored from backup');
      return true;
    }
    
    return false;
  }, [backupId]);

  /**
   * Clear migration results
   */
  const clearMigration = useCallback(() => {
    setMigratedData(null);
    setStatus({
      isRunning: false,
      progress: 0,
      total: 0,
      completed: 0,
      failed: 0,
      warnings: [],
      error: undefined
    });
    setBackupId(null);
  }, []);

  // Auto-run migration if configured
  useEffect(() => {
    if (autoRun && data && !status.isRunning && !migratedData) {
      runMigration();
    }
  }, [autoRun, data, status.isRunning, migratedData, runMigration]);

  return {
    // State
    migratedData,
    status,
    backupId,
    
    // Actions
    runMigration,
    cancelMigration,
    restoreFromBackup,
    clearMigration,
    
    // Computed
    isComplete: status.completed === status.total && !status.isRunning,
    hasErrors: status.failed > 0 || !!status.error,
    progressPercentage: status.total > 0 
      ? Math.round((status.progress / status.total) * 100)
      : 0
  };
}

/**
 * Hook for single item migration
 */
export function useSingleMigration<TFrom, TTo>(
  data: TFrom | null,
  migrator: (data: TFrom) => TTo | Promise<TTo>,
  options: {
    autoRun?: boolean;
    createBackup?: boolean;
  } = {}
) {
  const [migratedData, setMigratedData] = useState<TTo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backupId, setBackupId] = useState<string | null>(null);

  const migrate = useCallback(async () => {
    if (!data) return;

    setIsLoading(true);
    setError(null);

    try {
      // Create backup if requested
      if (options.createBackup) {
        const id = SchemaMigrator.createBackup(data);
        setBackupId(id);
      }

      const result = await migrator(data);
      setMigratedData(result);
    } catch (err) {
      setError(String(err));
      
      // Restore from backup on error
      if (backupId && options.createBackup) {
        const backup = SchemaMigrator.restoreBackup<TFrom>(backupId);
        if (backup) {
          console.log('Restored from backup after migration error');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [data, migrator, backupId, options.createBackup]);

  // Auto-run if configured
  useEffect(() => {
    if (options.autoRun && data && !migratedData && !isLoading) {
      migrate();
    }
  }, [options.autoRun, data, migratedData, isLoading, migrate]);

  return {
    migratedData,
    isLoading,
    error,
    migrate,
    backupId
  };
}

/**
 * Hook for managing schema versions
 */
export function useSchemaVersion(
  initialVersion: string = '0.0.0'
) {
  const [version, setVersion] = useState(initialVersion);
  const [migrations, setMigrations] = useState<Array<{
    version: string;
    applied: boolean;
    timestamp?: Date;
  }>>([]);

  const applyMigration = useCallback((
    targetVersion: string,
    migration: () => void | Promise<void>
  ) => {
    return async () => {
      try {
        await migration();
        setVersion(targetVersion);
        setMigrations(prev => [
          ...prev,
          {
            version: targetVersion,
            applied: true,
            timestamp: new Date()
          }
        ]);
      } catch (error) {
        setMigrations(prev => [
          ...prev,
          {
            version: targetVersion,
            applied: false,
            timestamp: new Date()
          }
        ]);
        throw error;
      }
    };
  }, []);

  const isVersionApplied = useCallback((targetVersion: string) => {
    return migrations.some(m => m.version === targetVersion && m.applied);
  }, [migrations]);

  return {
    version,
    migrations,
    applyMigration,
    isVersionApplied,
    setVersion
  };
}

export default useMigration;