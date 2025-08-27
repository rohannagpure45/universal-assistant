/**
 * MigrationMonitor - Monitoring and logging service for migration status changes
 * 
 * This service tracks migration progress, logs important events, and provides
 * analytics for the hybrid security migration.
 */

import { 
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { featureFlagService } from './FeatureFlagService';

export interface MigrationEvent {
  id?: string;
  type: 'flag_change' | 'user_migration' | 'error' | 'phase_change' | 'rollback';
  userId?: string;
  details: Record<string, any>;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  source: string;
}

export interface MigrationMetrics {
  totalUsers: number;
  migratedUsers: number;
  failedMigrations: number;
  averageMigrationTime: number;
  migrationPhase: string;
  storagePathDistribution: {
    legacy: number;
    new: number;
  };
  errorRate: number;
  lastUpdated: Date;
}

export interface UserMigrationStatus {
  userId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  migratedCollections: string[];
  filesProcessed: number;
  errors: string[];
}

class MigrationMonitorService {
  private static instance: MigrationMonitorService;
  private listeners: Set<(event: MigrationEvent) => void> = new Set();
  private metricsCache: MigrationMetrics | null = null;
  private unsubscribers: Array<() => void> = [];
  
  private constructor() {
    this.initialize();
  }
  
  static getInstance(): MigrationMonitorService {
    if (!this.instance) {
      this.instance = new MigrationMonitorService();
    }
    return this.instance;
  }
  
  /**
   * Initialize monitoring subscriptions
   */
  private initialize(): void {
    // Monitor feature flag changes
    const unsubscribeFlags = featureFlagService.subscribe((flags) => {
      this.logEvent({
        type: 'flag_change',
        details: { flags },
        timestamp: new Date(),
        severity: 'info',
        source: 'FeatureFlagService'
      });
      
      // Check for phase changes
      const previousPhase = this.metricsCache?.migrationPhase;
      if (previousPhase && flags.migrationPhase !== previousPhase) {
        this.logEvent({
          type: 'phase_change',
          details: {
            from: previousPhase,
            to: flags.migrationPhase
          },
          timestamp: new Date(),
          severity: 'warning',
          source: 'MigrationMonitor'
        });
      }
    });
    
    this.unsubscribers.push(unsubscribeFlags);
    
    // Start metrics collection
    this.startMetricsCollection();
  }
  
  /**
   * Log a migration event
   */
  async logEvent(event: MigrationEvent): Promise<void> {
    try {
      // Add to Firestore for persistence
      await addDoc(collection(db, 'migrationLogs'), {
        ...event,
        timestamp: serverTimestamp()
      });
      
      // Notify local listeners
      this.listeners.forEach(listener => listener(event));
      
      // Log to console if debug mode
      const flags = featureFlagService.getFlags();
      if (flags.logMigrationActions || flags.debugMode) {
        const emoji = this.getEventEmoji(event.type, event.severity);
        console.log(`${emoji} Migration Event:`, event);
      }
      
      // Alert on critical events
      if (event.severity === 'critical') {
        console.error('CRITICAL MIGRATION EVENT:', event);
        // In production, this would trigger alerts/notifications
      }
    } catch (error) {
      console.error('Failed to log migration event:', error, event);
    }
  }
  
  /**
   * Get emoji for event type
   */
  private getEventEmoji(type: MigrationEvent['type'], severity: MigrationEvent['severity']): string {
    if (severity === 'error' || severity === 'critical') return '🚨';
    
    switch (type) {
      case 'flag_change': return '🏁';
      case 'user_migration': return '👤';
      case 'phase_change': return '📊';
      case 'rollback': return '⏮️';
      default: return '📝';
    }
  }
  
  /**
   * Track user migration start
   */
  async startUserMigration(userId: string): Promise<void> {
    const status: UserMigrationStatus = {
      userId,
      startedAt: new Date(),
      status: 'in_progress',
      migratedCollections: [],
      filesProcessed: 0,
      errors: []
    };
    
    await setDoc(
      doc(db, 'userMigrationStatus', userId),
      {
        ...status,
        startedAt: serverTimestamp()
      }
    );
    
    await this.logEvent({
      type: 'user_migration',
      userId,
      details: { action: 'started' },
      timestamp: new Date(),
      severity: 'info',
      source: 'MigrationMonitor'
    });
  }
  
  /**
   * Track user migration completion
   */
  async completeUserMigration(
    userId: string,
    migratedCollections: string[],
    filesProcessed: number
  ): Promise<void> {
    await setDoc(
      doc(db, 'userMigrationStatus', userId),
      {
        completedAt: serverTimestamp(),
        status: 'completed',
        migratedCollections,
        filesProcessed
      },
      { merge: true }
    );
    
    await this.logEvent({
      type: 'user_migration',
      userId,
      details: {
        action: 'completed',
        migratedCollections,
        filesProcessed
      },
      timestamp: new Date(),
      severity: 'info',
      source: 'MigrationMonitor'
    });
  }
  
  /**
   * Track user migration failure
   */
  async failUserMigration(userId: string, error: string): Promise<void> {
    await setDoc(
      doc(db, 'userMigrationStatus', userId),
      {
        status: 'failed',
        errors: [error],
        failedAt: serverTimestamp()
      },
      { merge: true }
    );
    
    await this.logEvent({
      type: 'user_migration',
      userId,
      details: {
        action: 'failed',
        error
      },
      timestamp: new Date(),
      severity: 'error',
      source: 'MigrationMonitor'
    });
  }
  
  /**
   * Start collecting migration metrics
   */
  private async startMetricsCollection(): Promise<void> {
    // Update metrics every 5 minutes
    setInterval(async () => {
      await this.updateMetrics();
    }, 5 * 60 * 1000);
    
    // Initial collection
    await this.updateMetrics();
  }
  
  /**
   * Update migration metrics
   */
  private async updateMetrics(): Promise<void> {
    try {
      const flags = featureFlagService.getFlags();
      const metrics: MigrationMetrics = {
        totalUsers: 0,
        migratedUsers: 0,
        failedMigrations: 0,
        averageMigrationTime: 0,
        migrationPhase: flags.migrationPhase,
        storagePathDistribution: {
          legacy: 0,
          new: 0
        },
        errorRate: 0,
        lastUpdated: new Date()
      };
      
      // Count total users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      metrics.totalUsers = usersSnapshot.size;
      
      // Count migrated users
      const migrationStatusSnapshot = await getDocs(
        query(
          collection(db, 'userMigrationStatus'),
          where('status', '==', 'completed')
        )
      );
      metrics.migratedUsers = migrationStatusSnapshot.size;
      
      // Count failed migrations
      const failedSnapshot = await getDocs(
        query(
          collection(db, 'userMigrationStatus'),
          where('status', '==', 'failed')
        )
      );
      metrics.failedMigrations = failedSnapshot.size;
      
      // Calculate average migration time
      let totalTime = 0;
      let completedCount = 0;
      
      migrationStatusSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.startedAt && data.completedAt) {
          const start = data.startedAt.toDate();
          const end = data.completedAt.toDate();
          totalTime += (end.getTime() - start.getTime());
          completedCount++;
        }
      });
      
      if (completedCount > 0) {
        metrics.averageMigrationTime = totalTime / completedCount;
      }
      
      // Calculate error rate
      const totalAttempts = metrics.migratedUsers + metrics.failedMigrations;
      if (totalAttempts > 0) {
        metrics.errorRate = (metrics.failedMigrations / totalAttempts) * 100;
      }
      
      // Store metrics
      this.metricsCache = metrics;
      
      // Save to Firestore
      await setDoc(
        doc(db, 'migrationMetrics', 'current'),
        {
          ...metrics,
          lastUpdated: serverTimestamp()
        }
      );
      
    } catch (error) {
      console.error('Failed to update metrics:', error);
      await this.logEvent({
        type: 'error',
        details: {
          action: 'update_metrics',
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date(),
        severity: 'warning',
        source: 'MigrationMonitor'
      });
    }
  }
  
  /**
   * Get current migration metrics
   */
  getMetrics(): MigrationMetrics | null {
    return this.metricsCache;
  }
  
  /**
   * Get recent migration events
   */
  async getRecentEvents(limitCount: number = 50): Promise<MigrationEvent[]> {
    try {
      const q = query(
        collection(db, 'migrationLogs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      } as MigrationEvent));
    } catch (error) {
      console.error('Failed to get recent events:', error);
      return [];
    }
  }
  
  /**
   * Subscribe to migration events
   */
  subscribe(listener: (event: MigrationEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Check migration health
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    const metrics = this.getMetrics();
    const flags = featureFlagService.getFlags();
    
    // Check error rate
    if (metrics && metrics.errorRate > 10) {
      issues.push(`High error rate: ${metrics.errorRate.toFixed(2)}%`);
      recommendations.push('Review migration logs for common errors');
    }
    
    // Check for stalled migrations
    if (metrics && metrics.migratedUsers === 0 && metrics.totalUsers > 10) {
      issues.push('No users have been migrated yet');
      recommendations.push('Consider starting with a small beta group');
    }
    
    // Check for inconsistent flags
    if (flags.migrationPhase === 'completed' && flags.enableLegacyPathFallback) {
      issues.push('Migration marked complete but legacy fallback still enabled');
      recommendations.push('Disable legacy fallback to complete migration');
    }
    
    if (flags.migrationPhase === 'migrating' && !flags.autoMigrateOnLogin) {
      recommendations.push('Consider enabling auto-migration for faster completion');
    }
    
    return {
      healthy: issues.length === 0,
      issues,
      recommendations
    };
  }
  
  /**
   * Cleanup resources
   */
  destroy(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.listeners.clear();
  }
}

export const migrationMonitor = MigrationMonitorService.getInstance();