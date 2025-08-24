import type { SimpleVoiceSample } from '@/types/voice-identification';

/**
 * Simple type guard for voice samples
 * Only checks properties that components actually use
 * 
 * This replaces the complex VoiceSampleValidator with simple, fast validation
 * that matches how components actually handle voice samples.
 */
export function isValidVoiceSample(sample: any): sample is SimpleVoiceSample {
  return (
    sample &&
    typeof sample.id === 'string' &&
    typeof sample.url === 'string' &&
    typeof sample.transcript === 'string' &&
    typeof sample.quality === 'number' &&
    typeof sample.duration === 'number' &&
    (sample.timestamp instanceof Date || typeof sample.timestamp === 'string')
  );
}

/**
 * Create voice sample with defaults (what components actually do)
 * 
 * This utility provides the same functionality as the complex validator
 * but with simple default values that match component usage patterns.
 */
export function createVoiceSample(partial: Partial<SimpleVoiceSample>): SimpleVoiceSample {
  return {
    id: partial.id || `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url: partial.url || '',
    transcript: partial.transcript || '',
    quality: partial.quality ?? 0.5,
    duration: partial.duration ?? 0,
    timestamp: partial.timestamp instanceof Date ? partial.timestamp : new Date(partial.timestamp || Date.now()),
    // Copy all other optional properties
    ...partial
  };
}

/**
 * Get quality level from numeric quality (what components actually do)
 * 
 * This maps the numeric quality score to human-readable labels
 * using the same thresholds components actually use.
 */
export function getQualityLevel(quality: number): string {
  if (quality >= 0.8) return 'excellent';
  if (quality >= 0.6) return 'good';
  if (quality >= 0.4) return 'fair';
  return 'poor';
}

/**
 * Check if sample meets quality threshold (what components actually do)
 * 
 * This matches the actual quality checks found in components:
 * `s.quality >= 0.7` for high quality filtering
 */
export function isHighQuality(sample: SimpleVoiceSample): boolean {
  return sample.quality >= 0.7;
}

/**
 * Create a sample with safe fallbacks (what components actually do)
 * 
 * This matches the actual fallback patterns found in components:
 * `sample.quality || 0.5`, `sample.transcript || ''`, etc.
 */
export function withSafeFallbacks(sample: Partial<SimpleVoiceSample>): SimpleVoiceSample {
  return createVoiceSample({
    quality: sample.quality || 0.5,
    duration: sample.duration || 0,
    transcript: sample.transcript || '',
    ...sample
  });
}

/**
 * Simple validation for components that need it
 * Returns boolean instead of throwing exceptions
 */
export function hasRequiredProperties(sample: any): boolean {
  return !!(
    sample?.id &&
    sample?.url &&
    typeof sample.quality === 'number' &&
    typeof sample.duration === 'number'
  );
}

/**
 * Get display-friendly quality text (what UI components need)
 */
export function getQualityDisplay(quality: number): { level: string; color: string } {
  if (quality >= 0.8) return { level: 'Excellent', color: 'green' };
  if (quality >= 0.6) return { level: 'Good', color: 'blue' };
  if (quality >= 0.4) return { level: 'Fair', color: 'yellow' };
  return { level: 'Poor', color: 'red' };
}