import { FragmentProcessor, ProcessResult } from './FragmentProcessor';
import { improvedFragmentAggregator } from '@/services/fragments/ImprovedFragmentAggregator';
import { ContextTracker } from './ContextTracker';
import { VocalInterruptService } from './VocalInterruptService';
import { InputGatekeeper, createInputGatekeeper } from '@/services/gating/InputGatekeeper';
import { createConversationInputHandlers } from '@/services/gating/ConversationInputHandlers';
import { performanceMonitor } from '@/services/monitoring/PerformanceMonitor';
import { ConcurrentGatekeeper } from '@/services/gatekeeper/ConcurrentGatekeeper';
import { EnhancedInputGatekeeper } from '@/services/gatekeeper/EnhancedInputGatekeeper';

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
  enableInputGating: boolean;
  enableConcurrentProcessing: boolean;
  responseDelayMs: number;
  maxSpeakers: number;
}

export class ConversationProcessor {
  private fragmentProcessor: FragmentProcessor;
  private contextTracker: ContextTracker;
  private vocalInterruptService: VocalInterruptService;
  private inputGatekeeper: InputGatekeeper | null = null;
  private concurrentGatekeeper: ConcurrentGatekeeper | null = null;
  private enhancedInputGatekeeper: EnhancedInputGatekeeper | null = null;
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
      enableInputGating: false, // Disabled by default to avoid breaking existing flows
      enableConcurrentProcessing: false, // Disabled by default for backward compatibility
      responseDelayMs: 1000,
      maxSpeakers: 10,
      ...config,
    };

    // Initialize gatekeepers if enabled
    if (this.config.enableInputGating) {
      this.initializeInputGatekeeper();
    }

    if (this.config.enableConcurrentProcessing) {
      this.initializeConcurrentGatekeeper();
    }
  }

  async processConversationEvent(event: ConversationEvent): Promise<ConversationResponse> {
    // Use concurrent processing if enabled and speakerId is available
    if (this.config.enableConcurrentProcessing && this.concurrentGatekeeper && event.data.speakerId) {
      return this.processConcurrentEvent(event);
    }

    return performanceMonitor.measureAsync(
      'conversation_processing',
      async () => {
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

        // Use coordinated fragment processing: try improved aggregator first, fallback to original
        const aggResult = improvedFragmentAggregator.aggregate(text, speakerId, timestamp);
        
        if (aggResult.type === 'complete') {
          // Improved aggregator found a complete fragment
          processResult = {
            type: 'COMPLETE',
            text: aggResult.text,
            shouldRespond: aggResult.shouldRespond,
            confidence: 0.85,
            fragmentAnalysis: { 
              isComplete: true, 
              confidence: 0.85, 
              type: aggResult.shouldRespond ? 'question' : 'statement', 
              suggestedAction: aggResult.shouldRespond ? 'respond' : 'acknowledge' 
            },
          } as unknown as ProcessResult;
        } else {
          // Fallback to original fragment processor for incomplete fragments
          processResult = this.fragmentProcessor.processInput(
            text,
            speakerId,
            timestamp,
            {
              speakerChanged: !!(previousSpeaker && previousSpeaker !== speakerId),
              silenceDuration,
              previousUtterances: this.getRecentUtterances(speakerId),
            }
          );
        }

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
      },
      { eventType: event.type, speakerId: event.data.speakerId }
    );
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
      const aggregated = improvedFragmentAggregator.flush(speakerId);
      if (aggregated) {
        return { type: 'COMPLETE', text: aggregated, shouldRespond: /\?|\b(what|why|how|when|where|who|can|could|would|should)\b/i.test(aggregated), confidence: 0.8 } as unknown as ProcessResult;
      }
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
      const aggregated = improvedFragmentAggregator.flush(previousSpeaker);
      if (aggregated) {
        return { type: 'COMPLETE', text: aggregated, shouldRespond: /\?|\b(what|why|how|when|where|who|can|could|would|should)\b/i.test(aggregated), confidence: 0.8 } as unknown as ProcessResult;
      }
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
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // Reinitialize gatekeepers if settings changed
    if (oldConfig.enableInputGating !== this.config.enableInputGating) {
      if (this.config.enableInputGating) {
        this.initializeInputGatekeeper();
      } else {
        this.inputGatekeeper = null;
      }
    }

    if (oldConfig.enableConcurrentProcessing !== this.config.enableConcurrentProcessing) {
      if (this.config.enableConcurrentProcessing) {
        this.initializeConcurrentGatekeeper();
      } else {
        this.concurrentGatekeeper = null;
        this.enhancedInputGatekeeper = null;
      }
    }
  }

  private initializeInputGatekeeper(): void {
    try {
      const handlers = createConversationInputHandlers(this);
      this.inputGatekeeper = createInputGatekeeper(handlers);
      console.log('ConversationProcessor: Input gatekeeper initialized');
    } catch (error) {
      console.error('ConversationProcessor: Failed to initialize input gatekeeper:', error);
      this.inputGatekeeper = null;
    }
  }

  private initializeConcurrentGatekeeper(): void {
    try {
      const messageProcessor = {
        processMessage: async (message: any) => {
          const event = {
            type: message.metadata?.eventType || 'transcript',
            data: {
              text: message.text,
              speakerId: message.speakerId,
              timestamp: message.timestamp,
              confidence: 0.9,
              ...(message.metadata?.eventData || {}),
            },
          };
          return this.processConversationEvent(event);
        },
      };

      this.concurrentGatekeeper = new ConcurrentGatekeeper(messageProcessor, {
        maxConcurrentProcessing: this.config.maxSpeakers,
        processingTimeout: this.config.responseDelayMs * 2,
        enablePerformanceMonitoring: true,
      });

      // Also initialize enhanced input gatekeeper
      const baseHandlers = createConversationInputHandlers(this);
      const enhancedHandlers = {
        handleInput: baseHandlers.handleInput,
        saveAsContext: baseHandlers.saveAsContext,
        addToContext: baseHandlers.addToContext,
        concurrentGatekeeper: this.concurrentGatekeeper,
        handleSpeakerInput: async (input: any, speakerId: string) => {
          console.log('Handling speaker input:', input, speakerId);
        },
        categorizeInput: async (input: any) => 'queued' as const,
        shouldGateInput: async (input: any) => false,
      };

      this.enhancedInputGatekeeper = new EnhancedInputGatekeeper(enhancedHandlers, {
        enableConcurrentProcessing: true,
        speakerContextWindow: this.config.maxSpeakers,
      });

      console.log('ConversationProcessor: Concurrent gatekeeper initialized');
    } catch (error) {
      console.error('ConversationProcessor: Failed to initialize concurrent gatekeeper:', error);
      this.concurrentGatekeeper = null;
      this.enhancedInputGatekeeper = null;
    }
  }

  private async processConcurrentEvent(event: ConversationEvent): Promise<ConversationResponse> {
    try {
      const { type, data } = event;
      const { text, speakerId, timestamp } = data;

      if (!speakerId) {
        // Fallback to regular processing if no speakerId
        return this.processConversationEvent({ ...event, data: { ...data, speakerId: 'unknown' } });
      }

      // Create message for concurrent processing
      const message = {
        id: `${type}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
        content: text || '',
        type: type as 'transcript' | 'silence' | 'speaker_change' | 'interrupt',
        metadata: {
          timestamp,
          confidence: data.confidence,
          silenceDuration: data.silenceDuration,
          previousSpeaker: data.previousSpeaker,
        },
      };

      // Process through concurrent gatekeeper with speaker-specific locking
      const result = await this.concurrentGatekeeper!.processMessage(speakerId, message.content, { 
        priority: 5,
        metadata: message.metadata,
      });

      // Convert result to ConversationResponse format
      return this.convertConcurrentResultToResponse(result, speakerId, timestamp);

    } catch (error) {
      console.error('ConversationProcessor: Error in concurrent processing, falling back to regular processing:', error);
      performanceMonitor.recordError('concurrent_processing', error);
      
      // Fallback to regular processing
      return this.processConversationEvent({ 
        ...event, 
        data: { ...event.data, speakerId: event.data.speakerId || 'unknown' } 
      });
    }
  }

  private convertConcurrentResultToResponse(
    result: any, 
    speakerId: string, 
    timestamp: number
  ): ConversationResponse {
    return {
      shouldRespond: result?.shouldRespond ?? false,
      responseType: result?.priority > 7 ? 'immediate' : result?.priority > 4 ? 'delayed' : 'none',
      processedText: result?.processedContent || '',
      summary: result?.summary,
      confidence: result?.confidence ?? 0.5,
      metadata: {
        fragmentType: result?.type || 'CONCURRENT',
        speakerContext: this.getRecentUtterances(speakerId),
        conversationTopics: this.config.enableContextTracking 
          ? this.contextTracker.getTopKeywords(5)
          : [],
        interruptDetected: result?.type === 'interrupt',
      },
    };
  }

  // Method to gate input during TTS playback (called by AudioManager)
  public gateDuringTTS(ttsPromise: Promise<void>): void {
    if (this.inputGatekeeper) {
      this.inputGatekeeper.gateDuringTTS(ttsPromise);
    }
  }

  // Method to check if input is currently gated
  public isInputGated(): boolean {
    return this.inputGatekeeper !== null && this.config.enableInputGating;
  }

  public getProcessorStats(): {
    activeSpeakers: number;
    bufferedFragments: number;
    conversationTopics: string[];
    performance: {
      averageProcessingTime: number;
      successRate: number;
      errorCount: number;
      recentSlowOperations: number;
    };
    fragmentAggregator: {
      activeSpeakers: number;
      totalFragments: number;
      speakerFragmentCounts: Record<string, number>;
      oldestFragmentAge?: number;
    };
  } {
    try {
      const buffers = this.fragmentProcessor.getBufferStatus();
      const bufferedFragments = Array.isArray(buffers) 
        ? buffers.reduce((sum, buffer) => sum + buffer.fragments.length, 0)
        : 0;

      const performanceStats = performanceMonitor.getStats();
      const aggregatorStats = improvedFragmentAggregator.getStats();

      return {
        activeSpeakers: this.activeSpeekers.size,
        bufferedFragments,
        conversationTopics: this.config.enableContextTracking 
          ? this.contextTracker.getTopKeywords(10)
          : [],
        performance: {
          averageProcessingTime: performanceMonitor.getAverageProcessingTime('conversation_processing'),
          successRate: performanceMonitor.getSuccessRate('conversation_processing'),
          errorCount: performanceStats.errorCount,
          recentSlowOperations: performanceStats.slowOperations.length,
        },
        fragmentAggregator: aggregatorStats,
      };
    } catch (error) {
      performanceMonitor.recordError('getProcessorStats', error);
      return {
        activeSpeakers: 0,
        bufferedFragments: 0,
        conversationTopics: [],
        performance: {
          averageProcessingTime: 0,
          successRate: 1.0,
          errorCount: 1,
          recentSlowOperations: 0,
        },
        fragmentAggregator: {
          activeSpeakers: 0,
          totalFragments: 0,
          speakerFragmentCounts: {},
        },
      };
    }
  }
}

/**
 * Factory function to create ConversationProcessor instance
 * Use this instead of the singleton to avoid SSR issues
 */
export function createConversationProcessor(config?: Partial<ConversationProcessorConfig>): ConversationProcessor {
  return new ConversationProcessor(undefined, undefined, undefined, config);
}

// Safe singleton pattern for browser-dependent service
let conversationProcessorInstance: ConversationProcessor | null = null;

export function getConversationProcessor(): ConversationProcessor | null {
  if (typeof window === 'undefined') {
    return null; // SSR safe
  }
  
  if (!conversationProcessorInstance) {
    conversationProcessorInstance = new ConversationProcessor();
  }
  
  return conversationProcessorInstance;
}

/**
 * @deprecated Use getConversationProcessor() factory function instead for better SSR safety
 * This singleton export will be removed in a future version
 */
export const conversationProcessor = getConversationProcessor();
