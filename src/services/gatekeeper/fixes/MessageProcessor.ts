class AsyncLock {
  private locks: Map<string, Promise<void>> = new Map();
  
  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) || Promise.resolve();
    let release!: () => void;
    const next = prev.then(() => new Promise<void>(resolve => (release = resolve)));
    this.locks.set(key, next);

    try {
      const result = await fn();
      release();
      return result;
    } catch (e) {
      release();
      throw e;
    } finally {
      if (this.locks.get(key) === next) this.locks.delete(key);
    }
  }
}

export interface Message {
  id: string;
  text: string;
  timestamp: number;
}

export class MessageProcessor {
  private processingLock = new AsyncLock();
  private messageQueue: Message[] = [];
  
  constructor(private gatekeeper: { processMessage: (m: Message) => Promise<void> }) {}
  
  enqueue(message: Message): void {
    this.messageQueue.push(message);
  }
  
  async processNext(): Promise<void> {
    const message = this.messageQueue.shift();
    if (!message) return;
    
    await this.processingLock.acquire('process', async () => {
      await this.gatekeeper.processMessage(message);
    });
  }
}

export class RuleValidator {
  validateRule(rule: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Conflicting conditions: simplistic check for duplicated messageCount equals values
    const counts = rule.conditions?.filter((c: any) => c.type === 'messageCount' && c.operator === 'equals');
    if (counts && new Set(counts.map((c: any) => c.value)).size !== counts.length) {
      errors.push('Rule has conflicting messageCount conditions');
    }
    
    // Validate actions
    rule.actions?.forEach((a: any) => {
      if (!['respond', 'summarize', 'note'].includes(a.type)) {
        errors.push(`Invalid action: ${a.type}`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }
}

export interface FragmentContext {
  silenceDuration: number;
  previousText?: string;
}

export class ImprovedFragmentDetector {
  private readonly INCOMPLETE_WORDS: readonly string[] = ['um', 'uh', 'so', 'and', 'but', 'or'];
  private readonly COMPLETE_TOKENS: readonly string[] = ['.', '!', '?', 'thanks', 'please', 'yes', 'no'];
  
  isComplete(text: string, context: FragmentContext): boolean {
    const normalized = text.toLowerCase().trim();
    const factors = [
      this.hasCompletePunctuation(text),
      this.hasCompleteGrammar(normalized),
      this.contextSuggestsCompletion(context),
      this.silenceDurationExceeded(context.silenceDuration),
    ];
    const score = factors.reduce((sum, factor, i) => sum + (factor ? [0.3, 0.3, 0.2, 0.2][i] : 0), 0);
    return score >= 0.6;
  }
  
  private hasCompletePunctuation(text: string): boolean {
    return /[.!?]\s*$/.test(text);
  }
  
  private hasCompleteGrammar(text: string): boolean {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length < 3) return false;
    if (this.INCOMPLETE_WORDS.includes(words[0])) return false;
    return true;
  }
  
  private contextSuggestsCompletion(ctx: FragmentContext): boolean {
    if (!ctx.previousText) return false;
    return /\b(thanks|that helps|got it)\b/i.test(ctx.previousText);
  }
  
  private silenceDurationExceeded(ms: number): boolean {
    return ms >= 1500;
  }
}


