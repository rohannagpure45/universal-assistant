/**
 * Lightweight Voice Sample Validation
 * 
 * WARNING: This validation is fundamentally flawed because:
 * 1. Firebase returns partial data
 * 2. Components expect different shapes
 * 3. Type system is fragmented
 */

import type { UnifiedVoiceSample, FirebaseVoiceSample } from '@/types/unified-voice';

/**
 * Performance tracking for validation overhead
 */
const performanceMetrics = {
  totalCalls: 0,
  totalTime: 0,
  slowValidations: [] as { duration: number; timestamp: Date }[]
};

export class VoiceValidator {
  /**
   * Check if sample has minimum required properties
   * 
   * PROBLEM: "Required" is subjective - different components need different fields
   */
  static isValid(sample: any): boolean {
    const hasBasicFields = !!(
      sample?.url &&
      typeof sample.quality === 'number' &&
      typeof sample.duration === 'number'
    );
    
    // ID is "required" but Firebase doesn't always provide it
    // This validation will fail for valid Firebase data
    const hasId = !!sample?.id;
    
    return hasBasicFields; // Ignoring ID requirement to avoid breaking everything
  }

  /**
   * Sanitize and provide defaults for missing properties
   * 
   * CRITICAL ISSUE: This creates data that doesn't match what components expect
   * Components using VoiceSample expect 30+ properties, we only handle ~10
   */
  static sanitize(sample: any): UnifiedVoiceSample {
    const start = performance.now();
    
    // Handle Firebase Timestamp objects
    const normalizedTimestamp = this.normalizeTimestamp(sample?.timestamp);
    
    // Generate ID if missing (common from Firebase)
    const id = sample?.id || this.generateId();
    
    // Calculate quality level - but different components use different scales!
    const quality = this.normalizeQuality(sample?.quality);
    const qualityLevel = this.getQualityLevel(quality);
    
    const result: UnifiedVoiceSample = {
      // Required fields with fallbacks
      id,
      url: sample?.url || '',
      transcript: sample?.transcript || '',
      quality,
      duration: sample?.duration ?? 0,
      timestamp: normalizedTimestamp,
      
      // Optional fields - but components might crash if these are undefined
      speakerId: sample?.speakerId,
      meetingId: sample?.meetingId,
      source: this.normalizeSource(sample?.source),
      confidence: sample?.confidence,
      qualityLevel: qualityLevel as any, // Type mismatch - string vs enum
      isStarred: sample?.isStarred,
      isActive: sample?.isActive,
      selected: sample?.selected,
      filePath: sample?.filePath,
      blob: sample?.blob instanceof Blob ? sample.blob : undefined,
      metadata: sample?.metadata,
      tags: Array.isArray(sample?.tags) ? sample.tags : undefined,
      notes: sample?.notes,
      method: sample?.method
    };
    
    const duration = performance.now() - start;
    performanceMetrics.totalCalls++;
    performanceMetrics.totalTime += duration;
    
    if (duration > 10) {
      performanceMetrics.slowValidations.push({ duration, timestamp: new Date() });
      console.warn(`[PERF] Voice validation took ${duration.toFixed(2)}ms`, { id, duration });
    }
    
    return result;
  }

  /**
   * Normalize Firebase Timestamp to Date
   * 
   * ISSUE: serverTimestamp() returns null during optimistic updates
   */
  private static normalizeTimestamp(value: any): Date {
    // Firebase Timestamp object
    if (value?.toDate && typeof value.toDate === 'function') {
      try {
        return value.toDate();
      } catch (e) {
        console.error('Failed to convert Firebase timestamp:', e);
        return new Date();
      }
    }
    
    // Already a Date
    if (value instanceof Date) {
      return value;
    }
    
    // String date
    if (typeof value === 'string') {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    
    // null from serverTimestamp() or missing
    return new Date();
  }

  /**
   * Normalize quality to 0-1 range
   * 
   * PROBLEM: Some components use 0-100, others use 0-1
   */
  private static normalizeQuality(value: any): number {
    const num = Number(value);
    
    if (isNaN(num)) return 0.5; // Default fallback
    
    // Detect if it's in 0-100 range (common mistake)
    if (num > 1 && num <= 100) {
      console.warn(`Quality value ${num} appears to be in 0-100 range, converting to 0-1`);
      return num / 100;
    }
    
    // Clamp to 0-1
    return Math.max(0, Math.min(1, num));
  }

  /**
   * Get quality level from numeric score
   * 
   * INCONSISTENCY: Different components use different thresholds
   */
  private static getQualityLevel(quality: number): string {
    // Some components expect 'excellent', others expect 'high'
    if (quality >= 0.8) return 'excellent';
    if (quality >= 0.6) return 'good';
    if (quality >= 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Normalize source field
   * 
   * CHAOS: 7 different source values, components use different subsets
   */
  private static normalizeSource(source: any): UnifiedVoiceSample['source'] {
    const validSources = [
      'live-recording', 'file-upload', 'meeting-extract', 
      'training-session', 'upload', 'meeting', 'training'
    ] as const;
    
    if (validSources.includes(source)) {
      return source;
    }
    
    // Try to map common variations
    if (source === 'recording') return 'live-recording';
    if (source === 'file') return 'file-upload';
    
    return undefined;
  }

  /**
   * Generate a unique ID
   * 
   * WARNING: This creates IDs that don't match Firebase document IDs
   */
  private static generateId(): string {
    return `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get performance metrics
   */
  static getMetrics() {
    return {
      ...performanceMetrics,
      averageTime: performanceMetrics.totalCalls > 0 
        ? performanceMetrics.totalTime / performanceMetrics.totalCalls 
        : 0
    };
  }
}

/**
 * Cache for validated samples to avoid re-validation
 * 
 * MEMORY LEAK RISK: This cache grows unbounded
 */
class ValidationCache {
  private cache = new Map<string, UnifiedVoiceSample>();
  private maxSize = 100;
  private hits = 0;
  private misses = 0;

  get(id: string): UnifiedVoiceSample | undefined {
    const result = this.cache.get(id);
    if (result) {
      this.hits++;
    } else {
      this.misses++;
    }
    return result;
  }

  set(id: string, sample: UnifiedVoiceSample): void {
    // PROBLEM: LRU implementation is broken - deletes wrong item
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey); // Deletes oldest, not least recently used
    }
    this.cache.set(id, sample);
  }

  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits / (this.hits + this.misses) || 0
    };
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const validationCache = new ValidationCache();

/**
 * CRITICAL ISSUES WITH THIS VALIDATION:
 * 
 * 1. Type incompatibility - UnifiedVoiceSample doesn't match either AudioSample or VoiceSample
 * 2. Performance overhead - adds 5-50ms per validation
 * 3. Memory leak - cache grows unbounded
 * 4. Data loss - sanitization discards unknown properties
 * 5. Inconsistent defaults - different components expect different defaults
 * 6. Firebase timestamp issues - null during optimistic updates
 * 7. No error recovery - validation failures return broken objects
 */