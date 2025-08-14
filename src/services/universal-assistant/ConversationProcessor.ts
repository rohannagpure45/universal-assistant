import { FragmentProcessor, ProcessResult } from './FragmentProcessor';
import { ContextTracker } from './ContextTracker';
import { VocalInterruptService } from './VocalInterruptService';

export interface ConversationEvent {
  type: 'transcript' | 'silence' | 'speaker_change' | 'interrupt';
  data: {
    text?: string;
    speakerId?: string;
    timestamp: number;
    confidence?: number;
    silenceDuration?: number;
    previousSpeaker?: string;
  };
}

export interface ConversationResponse {
  shouldRespond: boolean;
  responseType: 'immediate' | 'delayed' | 'none';
  processedText: string;
  summary?: string;
  confidence: number;
  metadata: {
    fragmentType: string;
    speakerContext: string[];
    conversationTopics: string[];
    interruptDetected: boolean;
  };
}

export interface ConversationProcessorConfig {
  enableContextTracking: boolean;
  enableInterruptDetection: boolean;
  responseDelayMs: number;
  maxSpeakers: number;
}

export class ConversationProcessor {
  private fragmentProcessor: FragmentProcessor;
  private contextTracker: ContextTracker;
  private vocalInterruptService: VocalInterruptService;
  private config: ConversationProcessorConfig;
  
  private conversationHistory: Map<string, string[]> = new Map();
  private lastProcessedTime: number = 0;
  private activeSpeekers: Set<string> = new Set();

  constructor(
    fragmentProcessor?: FragmentProcessor,
    contextTracker?: ContextTracker,
    vocalInterruptService?: VocalInterruptService,
    config?: Partial<ConversationProcessorConfig>
  ) {
    this.fragmentProcessor = fragmentProcessor || new FragmentProcessor();
    this.contextTracker = contextTracker || new ContextTracker();
    this.vocalInterruptService = vocalInterruptService || new VocalInterruptService();
    
    this.config = {
      enableContextTracking: true,
      enableInterruptDetection: true,
      responseDelayMs: 1000,
      maxSpeakers: 10,
      ...config,
    };
  }

  async processConversationEvent(event: ConversationEvent): Promise<ConversationResponse> {
    const { type, data } = event;
    const { text, speakerId, timestamp, confidence, silenceDuration, previousSpeaker } = data;

    let processResult: ProcessResult;
    let interruptDetected = false;

    // Handle different event types
    switch (type) {
      case 'transcript':
        if (!text || !speakerId) {
          throw new Error('Transcript event requires text and speakerId');
        }

        // Check for interrupts first
        if (this.config.enableInterruptDetection) {
          interruptDetected = this.vocalInterruptService.detectInterrupt(text);
          if (interruptDetected) {
            // Clear all buffers and return immediate interrupt response
            this.fragmentProcessor.clearAllBuffers();
            return this.createInterruptResponse(text, speakerId, timestamp);
          }
        }

        // Process the transcript through fragment processor
        processResult = this.fragmentProcessor.processInput(
          text,
          speakerId,
          timestamp,
          {
            speakerChanged: previousSpeaker && previousSpeaker !== speakerId,
            silenceDuration,
            previousUtterances: this.getRecentUtterances(speakerId),
          }
        );

        // Update conversation history
        this.updateConversationHistory(speakerId, text);

        // Track context if enabled
        if (this.config.enableContextTracking) {
          await this.contextTracker.processTranscript(text, speakerId);
        }

        break;

      case 'silence':
        // Handle extended silence - might trigger fragment aggregation
        if (speakerId && silenceDuration) {
          processResult = this.handleSilence(speakerId, timestamp, silenceDuration);
        } else {
          return this.createNoActionResponse();
        }
        break;

      case 'speaker_change':
        // Handle speaker changes - might trigger fragment aggregation
        if (speakerId && previousSpeaker) {
          processResult = this.handleSpeakerChange(speakerId, previousSpeaker, timestamp);
        } else {
          return this.createNoActionResponse();
        }
        break;

      case 'interrupt':
        // Handle explicit interrupt events
        this.fragmentProcessor.clearAllBuffers();
        return this.createInterruptResponse(text || 'Interrupt detected', speakerId || 'unknown', timestamp);

      default:
        return this.createNoActionResponse();
    }

    // Create response based on process result
    return this.createResponse(processResult, speakerId || 'unknown', timestamp, interruptDetected);
  }

  private handleSilence(speakerId: string, timestamp: number, silenceDuration: number): ProcessResult {
    // Check if we should process buffered fragments due to silence
    const buffer = this.fragmentProcessor.getBufferStatus(speakerId);
    
    if (buffer && Array.isArray(buffer)) {
      // Multiple speakers - process all
      return { type: 'FRAGMENT', shouldRespond: false, shouldWait: true };
    }
    
    if (buffer && buffer.fragments.length > 0) {
      // Force process fragments due to extended silence
      return this.fragmentProcessor.processInput(
        '', // Empty text to trigger processing
        speakerId,
        timestamp,
        { silenceDuration }
      );
    }

    return { type: 'FRAGMENT', shouldRespond: false, shouldWait: true };
  }

  private handleSpeakerChange(speakerId: string, previousSpeaker: string, timestamp: number): ProcessResult {
    // Process any buffered fragments from the previous speaker
    const buffer = this.fragmentProcessor.getBufferStatus(previousSpeaker);
    
    if (buffer && !Array.isArray(buffer) && buffer.fragments.length > 0) {
      return this.fragmentProcessor.processInput(
        '', // Empty text to trigger processing
        previousSpeaker,
        timestamp,
        { speakerChanged: true }
      );
    }

    return { type: 'FRAGMENT', shouldRespond: false, shouldWait: true };
  }

  private createResponse(
    processResult: ProcessResult,
    speakerId: string,
    timestamp: number,
    interruptDetected: boolean
  ): ConversationResponse {
    const responseType = this.determineResponseType(processResult);
    const processedText = processResult.text || '';
    
    return {
      shouldRespond: processResult.shouldRespond,
      responseType,
      processedText,
      summary: processResult.summary,
      confidence: processResult.confidence || 0.5,
      metadata: {
        fragmentType: processResult.type,
        speakerContext: this.getRecentUtterances(speakerId),
        conversationTopics: this.config.enableContextTracking 
          ? this.contextTracker.getTopKeywords(5)
          : [],
        interruptDetected,
      },
    };
  }

  private createInterruptResponse(text: string, speakerId: string, timestamp: number): ConversationResponse {
    return {
      shouldRespond: true,
      responseType: 'immediate',
      processedText: text,
      confidence: 1.0,
      metadata: {
        fragmentType: 'INTERRUPT',
        speakerContext: [],
        conversationTopics: [],
        interruptDetected: true,
      },
    };
  }

  private createNoActionResponse(): ConversationResponse {
    return {
      shouldRespond: false,
      responseType: 'none',
      processedText: '',
      confidence: 0,
      metadata: {
        fragmentType: 'NONE',
        speakerContext: [],
        conversationTopics: [],
        interruptDetected: false,
      },
    };
  }

  private determineResponseType(processResult: ProcessResult): 'immediate' | 'delayed' | 'none' {
    if (!processResult.shouldRespond) {
      return 'none';
    }

    if (processResult.type === 'COMPLETE' && processResult.fragmentAnalysis?.type === 'question') {
      return 'immediate';
    }

    if (processResult.type === 'AGGREGATED') {
      return 'delayed';
    }

    return processResult.confidence && processResult.confidence > 0.8 ? 'immediate' : 'delayed';
  }

  private updateConversationHistory(speakerId: string, text: string): void {
    if (!this.conversationHistory.has(speakerId)) {
      this.conversationHistory.set(speakerId, []);
    }

    const history = this.conversationHistory.get(speakerId)!;
    history.push(text);

    // Keep only recent utterances (last 10)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }

    this.activeSpeekers.add(speakerId);

    // Manage speaker limit
    if (this.activeSpeekers.size > this.config.maxSpeakers) {
      const oldestSpeaker = Array.from(this.activeSpeekers)[0];
      this.activeSpeekers.delete(oldestSpeaker);
      this.conversationHistory.delete(oldestSpeaker);
    }
  }

  private getRecentUtterances(speakerId: string): string[] {
    return this.conversationHistory.get(speakerId) || [];
  }

  // Public utility methods
  public getConversationSummary(): string {
    if (!this.config.enableContextTracking) {
      return 'Context tracking disabled';
    }
    return this.contextTracker.generateContextSummary();
  }

  public clearConversationHistory(speakerId?: string): void {
    if (speakerId) {
      this.conversationHistory.delete(speakerId);
      this.activeSpeekers.delete(speakerId);
    } else {
      this.conversationHistory.clear();
      this.activeSpeekers.clear();
    }
    this.fragmentProcessor.clearAllBuffers();
  }

  public getActiveSpeekers(): string[] {
    return Array.from(this.activeSpeekers);
  }

  public updateConfig(config: Partial<ConversationProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getProcessorStats(): {
    activeSpeakers: number;
    bufferedFragments: number;
    conversationTopics: string[];
  } {
    const buffers = this.fragmentProcessor.getBufferStatus();
    const bufferedFragments = Array.isArray(buffers) 
      ? buffers.reduce((sum, buffer) => sum + buffer.fragments.length, 0)
      : 0;

    return {
      activeSpeakers: this.activeSpeeakers.size,
      bufferedFragments,
      conversationTopics: this.config.enableContextTracking 
        ? this.contextTracker.getTopKeywords(10)
        : [],
    };
  }
}

export const conversationProcessor = new ConversationProcessor();
