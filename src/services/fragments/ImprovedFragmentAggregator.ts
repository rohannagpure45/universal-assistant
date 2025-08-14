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
    // Clean old fragments
    this.cleanOldFragments(timestamp);

    // Get speaker's fragments
    const speakerFragments = this.fragments.get(speakerId) || [];

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
  }

  // Force aggregation of buffered fragments for a speaker
  flush(speakerId: string): string | null {
    const frags = this.fragments.get(speakerId);
    if (!frags || frags.length === 0) return null;
    const aggregated = this.performAggregation(frags);
    this.fragments.delete(speakerId);
    return aggregated;
  }

  private cleanOldFragments(now: number): void {
    for (const [speakerId, frags] of this.fragments.entries()) {
      const fresh = frags.filter(f => now - f.timestamp <= this.MAX_FRAGMENT_AGE);
      if (fresh.length > 0) this.fragments.set(speakerId, fresh);
      else this.fragments.delete(speakerId);
    }
  }

  private performAggregation(fragments: Fragment[]): string {
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
}

export const improvedFragmentAggregator = new ImprovedFragmentAggregator();


