import { FragmentDetector, FragmentAnalysis } from './FragmentDetector';

export interface ProcessResult {
  type: 'COMPLETE' | 'AGGREGATED' | 'FRAGMENT';
  text?: string;
  shouldRespond: boolean;
  shouldWait?: boolean;
  summary?: string;
  confidence?: number;
  fragmentAnalysis?: FragmentAnalysis;
}

export interface FragmentBuffer {
  speakerId: string;
  fragments: Array<{
    text: string;
    timestamp: number;
    confidence: number;
  }>;
  lastActivity: number;
  totalSilence: number;
}

export interface FragmentProcessorConfig {
  silenceThreshold: number;
  bufferTimeout: number;
  minFragmentsForAggregation: number;
  maxBufferSize: number;
  confidenceThreshold: number;
}

export class FragmentProcessor {
  private fragmentBuffer: Map<string, FragmentBuffer> = new Map();
  private fragmentDetector: FragmentDetector;
  private config: FragmentProcessorConfig;
  
  constructor(config?: Partial<FragmentProcessorConfig>) {
    this.fragmentDetector = new FragmentDetector();
    this.config = {
      silenceThreshold: 2000, // 2 seconds
      bufferTimeout: 10000,   // 10 seconds
      minFragmentsForAggregation: 2,
      maxBufferSize: 10,
      confidenceThreshold: 0.6,
      ...config,
    };
  }

  processInput(
    text: string,
    speakerId: string,
    timestamp: number,
    context?: {
      speakerChanged?: boolean;
      silenceDuration?: number;
      previousUtterances?: string[];
    }
  ): ProcessResult {
    const trimmedText = text.trim();
    if (!trimmedText) {
      return { type: 'FRAGMENT', shouldRespond: false, shouldWait: true };
    }

    // Analyze the fragment using existing FragmentDetector
    const analysis = this.fragmentDetector.analyzeUtterance(trimmedText, {
      previousUtterances: context?.previousUtterances,
      speakerPaused: context?.silenceDuration ? context.silenceDuration > 1000 : false,
      pauseDuration: context?.silenceDuration,
    });

    // Check if this is a complete thought
    if (this.isCompleteThought(trimmedText, analysis)) {
      // Clear any existing fragments for this speaker
      this.clearBuffer(speakerId);
      
      return {
        type: 'COMPLETE',
        text: trimmedText,
        shouldRespond: analysis.suggestedAction === 'respond',
        confidence: analysis.confidence,
        fragmentAnalysis: analysis,
      };
    }

    // Add to fragment buffer
    this.addToBuffer(speakerId, trimmedText, timestamp, analysis.confidence);

    // Check if we should process accumulated fragments
    if (this.shouldProcessBuffer(speakerId, timestamp, context)) {
      const aggregated = this.aggregateFragments(speakerId);
      const summary = this.generateSummary(aggregated);
      
      return {
        type: 'AGGREGATED',
        text: aggregated,
        shouldRespond: this.shouldRespondToAggregated(aggregated),
        summary,
        fragmentAnalysis: analysis,
      };
    }

    return { 
      type: 'FRAGMENT', 
      shouldRespond: false, 
      shouldWait: true,
      fragmentAnalysis: analysis,
    };
  }

  private isCompleteThought(text: string, analysis: FragmentAnalysis): boolean {
    // Use the existing fragment detector's analysis
    if (analysis.isComplete && analysis.confidence > this.config.confidenceThreshold) {
      return true;
    }

    // Additional checks for completeness
    const hasStrongEnding = /[.!?]\s*$/.test(text);
    const isDirectQuestion = analysis.type === 'question' && text.length > 10;
    const isCommand = /^(please|can you|could you|would you)/i.test(text);
    
    return hasStrongEnding || isDirectQuestion || isCommand;
  }

  private addToBuffer(
    speakerId: string, 
    text: string, 
    timestamp: number, 
    confidence: number
  ): void {
    if (!this.fragmentBuffer.has(speakerId)) {
      this.fragmentBuffer.set(speakerId, {
        speakerId,
        fragments: [],
        lastActivity: timestamp,
        totalSilence: 0,
      });
    }

    const buffer = this.fragmentBuffer.get(speakerId)!;
    
    // Add fragment to buffer
    buffer.fragments.push({
      text: text.trim(),
      timestamp,
      confidence,
    });

    // Maintain buffer size limit
    if (buffer.fragments.length > this.config.maxBufferSize) {
      buffer.fragments.shift(); // Remove oldest fragment
    }

    buffer.lastActivity = timestamp;
  }

  private shouldProcessBuffer(
    speakerId: string, 
    timestamp: number, 
    context?: {
      speakerChanged?: boolean;
      silenceDuration?: number;
    }
  ): boolean {
    const buffer = this.fragmentBuffer.get(speakerId);
    if (!buffer || buffer.fragments.length < this.config.minFragmentsForAggregation) {
      return false;
    }

    // Process if speaker changed
    if (context?.speakerChanged) {
      return true;
    }

    // Process if silence threshold exceeded
    if (context?.silenceDuration && context.silenceDuration > this.config.silenceThreshold) {
      return true;
    }

    // Process if buffer timeout reached
    const timeSinceLastActivity = timestamp - buffer.lastActivity;
    if (timeSinceLastActivity > this.config.bufferTimeout) {
      return true;
    }

    // Process if buffer is getting full
    if (buffer.fragments.length >= this.config.maxBufferSize - 1) {
      return true;
    }

    return false;
  }

  private aggregateFragments(speakerId: string): string {
    const buffer = this.fragmentBuffer.get(speakerId);
    if (!buffer || buffer.fragments.length === 0) {
      return '';
    }

    // Sort fragments by timestamp
    const sortedFragments = buffer.fragments.sort((a, b) => a.timestamp - b.timestamp);
    
    // Combine fragments with intelligent spacing
    let aggregated = '';
    for (let i = 0; i < sortedFragments.length; i++) {
      const fragment = sortedFragments[i];
      const text = fragment.text.trim();
      
      if (i === 0) {
        aggregated = text;
      } else {
        // Add appropriate spacing/punctuation
        const needsSpace = !aggregated.endsWith(' ') && !text.startsWith(' ');
        const needsPunctuation = this.shouldAddPunctuation(aggregated, text);
        
        if (needsPunctuation && !aggregated.match(/[.!?]$/)) {
          aggregated += ',';
        }
        
        aggregated += needsSpace ? ' ' + text : text;
      }
    }

    // Clear the buffer after aggregation
    this.clearBuffer(speakerId);

    return aggregated.trim();
  }

  private shouldAddPunctuation(previous: string, current: string): boolean {
    // Add comma if transitioning between different sentence structures
    const previousEndsWithWord = /\w$/.test(previous);
    const currentStartsWithWord = /^\w/.test(current);
    const isConjunction = /^(and|but|or|so|because|since|although)/i.test(current);
    
    return previousEndsWithWord && currentStartsWithWord && !isConjunction;
  }

  private generateSummary(aggregatedText: string): string {
    if (!aggregatedText || aggregatedText.length < 20) {
      return aggregatedText;
    }

    // Simple extractive summary - take first and key sentences
    const sentences = aggregatedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return aggregatedText;
    }

    // Take first sentence and any question sentences
    const summary: string[] = [];
    summary.push(sentences[0].trim());
    
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.includes('?') || sentence.length > 50) {
        summary.push(sentence);
        break;
      }
    }

    return summary.join('. ') + (summary[summary.length - 1].endsWith('?') ? '' : '.');
  }

  private shouldRespondToAggregated(aggregatedText: string): boolean {
    // Check for question indicators
    const hasQuestion = /\?/.test(aggregatedText);
    const hasQuestionWords = /\b(what|why|how|when|where|who|can|could|would|should)\b/i.test(aggregatedText);
    
    // Check for request indicators
    const hasRequest = /\b(please|can you|could you|would you|help|assist)\b/i.test(aggregatedText);
    
    return hasQuestion || hasQuestionWords || hasRequest;
  }

  private clearBuffer(speakerId: string): void {
    this.fragmentBuffer.delete(speakerId);
  }

  // Public methods for external control
  public clearAllBuffers(): void {
    this.fragmentBuffer.clear();
  }

  public getBufferStatus(speakerId?: string): FragmentBuffer[] | FragmentBuffer | null {
    if (speakerId) {
      return this.fragmentBuffer.get(speakerId) || null;
    }
    return Array.from(this.fragmentBuffer.values());
  }

  public updateConfig(config: Partial<FragmentProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): FragmentProcessorConfig {
    return { ...this.config };
  }

  // Utility method to check if conversation has ended
  public detectConversationEnd(
    utterances: string[], 
    pauseDuration: number, 
    speakerId: string
  ): boolean {
    const hasBufferedFragments = this.fragmentBuffer.has(speakerId);
    const fragmentDetectorResult = this.fragmentDetector.detectConversationEnd(utterances, pauseDuration);
    
    // If fragment detector says conversation ended and no buffered fragments, confirm end
    return fragmentDetectorResult && !hasBufferedFragments;
  }
}

export const fragmentProcessor = new FragmentProcessor();
