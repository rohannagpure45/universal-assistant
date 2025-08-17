// ISSUE: Fragments sometimes aggregate incorrectly
// FIX: Improved aggregation logic

export interface Fragment {
  text: string;
  timestamp: number;
  isComplete: boolean;
}

export type AggregationResult =
  | { type: 'complete'; text: string; shouldRespond: boolean }
  | { type: 'fragment'; shouldWait: boolean };

export class ImprovedFragmentAggregator {
  private fragments = new Map<string, Fragment[]>();
  private readonly MAX_FRAGMENT_AGE = 5000; // 5 seconds

  aggregate(fragment: string, speakerId: string, timestamp: number): AggregationResult {
    try {
      // Input validation
      if (!fragment || typeof fragment !== 'string') {
        console.warn('ImprovedFragmentAggregator: Invalid fragment input');
        return { type: 'fragment', shouldWait: true };
      }

      if (!speakerId || typeof speakerId !== 'string') {
        console.warn('ImprovedFragmentAggregator: Invalid speakerId input');
        speakerId = 'unknown_speaker';
      }

      if (!timestamp || typeof timestamp !== 'number' || timestamp <= 0) {
        console.warn('ImprovedFragmentAggregator: Invalid timestamp, using current time');
        timestamp = Date.now();
      }

      // Clean old fragments
      this.cleanOldFragments(timestamp);

      // Get speaker's fragments
      const speakerFragments = this.fragments.get(speakerId) || [];

      // Prevent memory overflow
      if (speakerFragments.length > 100) {
        console.warn(`ImprovedFragmentAggregator: Too many fragments for speaker ${speakerId}, clearing oldest`);
        speakerFragments.splice(0, 50); // Keep only the latest 50
      }

      // Add new fragment
      speakerFragments.push({
        text: fragment,
        timestamp,
        isComplete: this.isComplete(fragment),
      });

      // Check for aggregation triggers
      if (this.shouldAggregate(speakerFragments)) {
        const aggregated = this.performAggregation(speakerFragments);
        this.fragments.delete(speakerId);

        return {
          type: 'complete',
          text: aggregated,
          shouldRespond: this.containsQuestion(aggregated),
        };
      }

      // Update fragments
      this.fragments.set(speakerId, speakerFragments);

      return {
        type: 'fragment',
        shouldWait: true,
      };
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error in aggregate method:', error);
      return { type: 'fragment', shouldWait: true };
    }
  }

  // Force aggregation of buffered fragments for a speaker
  flush(speakerId: string): string | null {
    try {
      if (!speakerId || typeof speakerId !== 'string') {
        console.warn('ImprovedFragmentAggregator: Invalid speakerId in flush');
        return null;
      }

      const frags = this.fragments.get(speakerId);
      if (!frags || frags.length === 0) {
        return null;
      }

      const aggregated = this.performAggregation(frags);
      this.fragments.delete(speakerId);
      return aggregated;
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error in flush method:', error);
      // Clean up potentially corrupted speaker data
      this.fragments.delete(speakerId);
      return null;
    }
  }

  private cleanOldFragments(now: number): void {
    try {
      if (!now || typeof now !== 'number') {
        console.warn('ImprovedFragmentAggregator: Invalid timestamp for cleanup');
        return;
      }

      const speakersToDelete: string[] = [];
      
      for (const [speakerId, frags] of this.fragments.entries()) {
        try {
          if (!Array.isArray(frags)) {
            speakersToDelete.push(speakerId);
            continue;
          }

          const fresh = frags.filter(f => 
            f && 
            typeof f.timestamp === 'number' && 
            now - f.timestamp <= this.MAX_FRAGMENT_AGE
          );
          
          if (fresh.length > 0) {
            this.fragments.set(speakerId, fresh);
          } else {
            speakersToDelete.push(speakerId);
          }
        } catch (error) {
          console.error(`ImprovedFragmentAggregator: Error cleaning fragments for speaker ${speakerId}:`, error);
          speakersToDelete.push(speakerId);
        }
      }

      // Clean up corrupted speaker data
      speakersToDelete.forEach(speakerId => this.fragments.delete(speakerId));
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error in cleanOldFragments:', error);
    }
  }

  private performAggregation(fragments: Fragment[]): string {
    try {
      if (!Array.isArray(fragments) || fragments.length === 0) {
        console.warn('ImprovedFragmentAggregator: Invalid fragments for aggregation');
        return '';
      }
    // Combine fragments with spacing and minimal punctuation adjustments
    const parts: string[] = [];
    for (let i = 0; i < fragments.length; i++) {
      const current = fragments[i].text.trim();
      if (current.length === 0) continue;
      if (parts.length === 0) {
        parts.push(current);
        continue;
      }

      const prev = parts[parts.length - 1];
      const needsSpace = !prev.endsWith(' ') && !current.startsWith(' ');
      const needsComma = /\w$/.test(prev) && /^[a-z]/.test(current) && !/^[,.;:!?]/.test(current);
      parts[parts.length - 1] = prev + (needsComma ? ',' : '') + (needsSpace ? ' ' : '');
      parts.push(current);
    }

    let aggregated = parts.join('');
    // Ensure terminal punctuation for readability
    if (!/[.!?]$/.test(aggregated)) aggregated += '.';
    return aggregated;
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error in performAggregation:', error);
      // Return best effort aggregation
      return fragments.map(f => f?.text || '').filter(Boolean).join(' ') + '.';
    }
  }

  private isComplete(text: string): boolean {
    const t = text.trim();
    if (/[.!?]$/.test(t)) return true;
    // Short utterances like thanks/yes/no treated as complete
    if (/\b(thanks|thank you|yes|no|okay|ok)\b\.?$/i.test(t)) return true;
    return false;
  }

  private containsQuestion(text: string): boolean {
    if (text.includes('?')) return true;
    return /\b(what|why|how|when|where|who|can|could|would|should)\b/i.test(text);
  }

  private shouldAggregate(fragments: Fragment[]): boolean {
    if (fragments.length === 0) return false;

    const lastFragment = fragments[fragments.length - 1];

    // Aggregate if:
    // 1. Last fragment is complete
    if (lastFragment.isComplete) return true;

    // 2. Total length exceeds threshold
    const totalLength = fragments.reduce((sum, f) => sum + f.text.length, 0);
    if (totalLength > 200) return true;

    // 3. Long pause detected
    const now = Date.now();
    if (now - lastFragment.timestamp > 3000) return true;

    return false;
  }

  // Debug and monitoring methods
  public getStats(): {
    activeSpeakers: number;
    totalFragments: number;
    speakerFragmentCounts: Record<string, number>;
    oldestFragmentAge?: number;
  } {
    try {
      const now = Date.now();
      let totalFragments = 0;
      let oldestTimestamp = now;
      const speakerFragmentCounts: Record<string, number> = {};

      for (const [speakerId, frags] of this.fragments.entries()) {
        const fragCount = frags?.length || 0;
        speakerFragmentCounts[speakerId] = fragCount;
        totalFragments += fragCount;

        if (frags && frags.length > 0) {
          const oldestFrag = frags[0];
          if (oldestFrag?.timestamp && oldestFrag.timestamp < oldestTimestamp) {
            oldestTimestamp = oldestFrag.timestamp;
          }
        }
      }

      return {
        activeSpeakers: this.fragments.size,
        totalFragments,
        speakerFragmentCounts,
        oldestFragmentAge: oldestTimestamp < now ? now - oldestTimestamp : undefined,
      };
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error getting stats:', error);
      return {
        activeSpeakers: 0,
        totalFragments: 0,
        speakerFragmentCounts: {},
      };
    }
  }

  public clearAllFragments(): void {
    try {
      this.fragments.clear();
      console.log('ImprovedFragmentAggregator: All fragments cleared');
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error clearing fragments:', error);
    }
  }

  public clearSpeakerFragments(speakerId: string): void {
    try {
      if (!speakerId) {
        console.warn('ImprovedFragmentAggregator: Invalid speakerId for clear');
        return;
      }
      
      this.fragments.delete(speakerId);
      console.log(`ImprovedFragmentAggregator: Fragments cleared for speaker ${speakerId}`);
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error clearing speaker fragments:', error);
    }
  }

  public getSpeakerFragments(speakerId: string): Fragment[] {
    try {
      return [...(this.fragments.get(speakerId) || [])];
    } catch (error) {
      console.error('ImprovedFragmentAggregator: Error getting speaker fragments:', error);
      return [];
    }
  }
}

export const improvedFragmentAggregator = new ImprovedFragmentAggregator();


