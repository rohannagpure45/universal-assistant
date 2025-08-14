/**
 * EnhancedInputGatekeeper - Improved input gating with concurrent message handling
 * 
 * This class extends the basic InputGatekeeper with:
 * - Integration with ConcurrentGatekeeper
 * - Enhanced context management
 * - Speaker-aware input processing
 * - Better error handling and recovery
 * - Performance metrics
 */

import { InputGatekeeper, InputItem, InputHandlers, createInputGatekeeper } from '../gating/InputGatekeeper';
import { ConcurrentGatekeeper, ConcurrentGatekeeperConfig } from './ConcurrentGatekeeper';
import { ConversationProcessor } from '../universal-assistant/ConversationProcessor';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface EnhancedInputItem extends InputItem {
  speakerId: string;
  priority: number;
  processingType: 'immediate' | 'queued' | 'context_only';
  retryCount: number;
  originalTimestamp: number;
}

export interface EnhancedInputHandlers extends InputHandlers {
  handleSpeakerInput: (input: EnhancedInputItem, speakerId: string) => Promise<void>;
  categorizeInput: (input: EnhancedInputItem) => Promise<'immediate' | 'queued' | 'context_only'>;
  shouldGateInput: (input: EnhancedInputItem) => Promise<boolean>;
}

export interface GatingState {
  isGated: boolean;
  gatingReason: string;
  gatingStartTime: number;
  gatedItemsCount: number;
  contextItemsCount: number;
}

export interface EnhancedInputGatekeeperConfig {
  enableConcurrentProcessing: boolean;
  maxGatedItems: number;
  gatedItemTimeout: number;
  contextRetentionTime: number;
  prioritizeInterrupts: boolean;
  speakerContextWindow: number;
  enableGatingMetrics: boolean;
}

/**
 * EnhancedInputGatekeeper provides advanced input gating with concurrency control
 */
export class EnhancedInputGatekeeper {
  private baseGatekeeper: InputGatekeeper;
  private concurrentGatekeeper: ConcurrentGatekeeper | null = null;
  private config: EnhancedInputGatekeeperConfig;
  private handlers: EnhancedInputHandlers;
  
  // Enhanced gating state
  private gatingState: GatingState = {
    isGated: false,
    gatingReason: '',
    gatingStartTime: 0,
    gatedItemsCount: 0,
    contextItemsCount: 0,
  };
  
  // Speaker-specific context
  private speakerContexts: Map<string, EnhancedInputItem[]> = new Map();
  private gatedItems: Map<string, EnhancedInputItem[]> = new Map();
  private gatingPromises: Set<Promise<void>> = new Set();
  
  // Performance tracking
  private processingStats = {
    totalInputs: 0,
    gatedInputs: 0,
    contextOnlyInputs: 0,
    processedInputs: 0,
    errors: 0,
    averageGatingTime: 0,
  };

  constructor(
    handlers: EnhancedInputHandlers,
    config: Partial<EnhancedInputGatekeeperConfig> = {}
  ) {
    this.config = {
      enableConcurrentProcessing: true,
      maxGatedItems: 100,
      gatedItemTimeout: 30000,
      contextRetentionTime: 300000, // 5 minutes
      prioritizeInterrupts: true,
      speakerContextWindow: 10,
      enableGatingMetrics: true,
      ...config,
    };

    this.handlers = handlers;
    
    // Create base gatekeeper
    this.baseGatekeeper = createInputGatekeeper({
      handleInput: this.enhancedHandleInput.bind(this),
      saveAsContext: this.enhancedSaveAsContext.bind(this),
      addToContext: this.enhancedAddToContext.bind(this),
    });
  }

  /**
   * Integrates with ConcurrentGatekeeper for advanced processing
   */
  integrateConcurrentGatekeeper(
    conversationProcessor: ConversationProcessor,
    concurrentConfig: Partial<ConcurrentGatekeeperConfig> = {}
  ): void {
    if (!this.config.enableConcurrentProcessing) {
      console.log('Concurrent processing disabled, skipping integration');
      return;
    }

    try {
      // Create enhanced input handlers for concurrent processing
      const concurrentHandlers = {
        handleInput: this.enhancedHandleInput.bind(this),
        saveAsContext: this.enhancedSaveAsContext.bind(this),
        addToContext: this.enhancedAddToContext.bind(this),
      };

      // Import and create ConcurrentGatekeeper
      const { createConcurrentGatekeeper } = require('./ConcurrentGatekeeper');
      this.concurrentGatekeeper = createConcurrentGatekeeper(
        conversationProcessor,
        {
          enableInputGating: true,
          maxConcurrentProcessing: 3,
          processingTimeout: 20000,
          enablePerformanceMonitoring: this.config.enableGatingMetrics,
          ...concurrentConfig,
        },
        concurrentHandlers
      );

      console.log('EnhancedInputGatekeeper integrated with ConcurrentGatekeeper');
    } catch (error) {
      console.error('Failed to integrate ConcurrentGatekeeper:', error);
      this.concurrentGatekeeper = null;
    }
  }

  /**
   * Processes input with enhanced capabilities
   */
  async processInput(inputItem: InputItem | EnhancedInputItem): Promise<void> {
    const enhancedItem = this.enhanceInputItem(inputItem);
    this.processingStats.totalInputs++;

    try {
      if (this.config.enableGatingMetrics) {
        await performanceMonitor.measureAsync(
          'enhanced_input_processing',
          () => this.processEnhancedInput(enhancedItem),
          {
            speakerId: enhancedItem.speakerId,
            processingType: enhancedItem.processingType,
            isGated: this.gatingState.isGated,
          }
        );
      } else {
        await this.processEnhancedInput(enhancedItem);
      }
    } catch (error) {
      this.processingStats.errors++;
      console.error('Enhanced input processing error:', error);
      throw error;
    }
  }

  /**
   * Gates input during TTS with enhanced tracking
   */
  gateDuringTTS(ttsPromise: Promise<void>, reason: string = 'TTS playback'): void {
    this.startGating(reason);
    
    const gatingPromise = ttsPromise
      .finally(() => {
        this.endGating();
        this.gatingPromises.delete(gatingPromise);
        void this.processGatedItems();
      })
      .catch((error) => {
        console.error('TTS promise error during gating:', error);
      });

    this.gatingPromises.add(gatingPromise);
    
    // Also gate the base gatekeeper
    this.baseGatekeeper.gateDuringTTS(ttsPromise);
    
    // Gate concurrent gatekeeper if available
    if (this.concurrentGatekeeper) {
      this.concurrentGatekeeper.gateDuringTTS(ttsPromise);
    }
  }

  /**
   * Gets enhanced gating statistics
   */
  getGatingStats(): {
    currentState: GatingState;
    processingStats: typeof this.processingStats;
    speakerStats: Record<string, {
      contextItems: number;
      gatedItems: number;
      lastActivity: number;
    }>;
    concurrentStats?: any;
  } {
    const speakerStats: Record<string, {
      contextItems: number;
      gatedItems: number;
      lastActivity: number;
    }> = {};

    // Collect speaker-specific stats
    for (const [speakerId, contexts] of this.speakerContexts) {
      const gatedItems = this.gatedItems.get(speakerId) || [];
      const lastContext = contexts[contexts.length - 1];
      
      speakerStats[speakerId] = {
        contextItems: contexts.length,
        gatedItems: gatedItems.length,
        lastActivity: lastContext?.timestamp || 0,
      };
    }

    const result: any = {
      currentState: { ...this.gatingState },
      processingStats: { ...this.processingStats },
      speakerStats,
    };

    if (this.concurrentGatekeeper) {
      result.concurrentStats = this.concurrentGatekeeper.getStats();
    }

    return result;
  }

  /**
   * Clears context for a specific speaker
   */
  async clearSpeakerContext(speakerId: string): Promise<void> {
    this.speakerContexts.delete(speakerId);
    
    const gatedItems = this.gatedItems.get(speakerId);
    if (gatedItems) {
      this.gatingState.gatedItemsCount -= gatedItems.length;
      this.gatedItems.delete(speakerId);
    }

    if (this.concurrentGatekeeper) {
      await this.concurrentGatekeeper.clearSpeakerMessages(speakerId);
    }
  }

  /**
   * Checks if input is currently gated
   */
  isGated(): boolean {
    return this.gatingState.isGated;
  }

  /**
   * Gets speaker context
   */
  getSpeakerContext(speakerId: string): EnhancedInputItem[] {
    return this.speakerContexts.get(speakerId) || [];
  }

  /**
   * Forces processing of all gated items
   */
  async forceProcessGatedItems(): Promise<void> {
    if (!this.gatingState.isGated) {
      await this.processGatedItems();
    }
  }

  /**
   * Shuts down the enhanced gatekeeper
   */
  async shutdown(): Promise<void> {
    try {
      // Wait for any active gating promises to complete
      await Promise.allSettled(Array.from(this.gatingPromises));
      
      // Shutdown concurrent gatekeeper
      if (this.concurrentGatekeeper) {
        await this.concurrentGatekeeper.shutdown();
      }

      // Clear all data
      this.speakerContexts.clear();
      this.gatedItems.clear();
      this.gatingPromises.clear();
      
      console.log('EnhancedInputGatekeeper shut down successfully');
    } catch (error) {
      console.error('Error during EnhancedInputGatekeeper shutdown:', error);
    }
  }

  /**
   * Enhances basic input item with additional properties
   */
  private enhanceInputItem(inputItem: InputItem | EnhancedInputItem): EnhancedInputItem {
    if ('speakerId' in inputItem && 'processingType' in inputItem) {
      return inputItem as EnhancedInputItem;
    }

    const baseItem = inputItem as InputItem;
    return {
      ...baseItem,
      speakerId: this.extractSpeakerId(baseItem),
      priority: this.determinePriority(baseItem),
      processingType: 'queued',
      retryCount: 0,
      originalTimestamp: baseItem.timestamp,
    };
  }

  /**
   * Processes enhanced input item
   */
  private async processEnhancedInput(item: EnhancedInputItem): Promise<void> {
    // Categorize the input
    item.processingType = await this.handlers.categorizeInput(item);

    if (this.gatingState.isGated) {
      const shouldGate = await this.handlers.shouldGateInput(item);
      
      if (shouldGate && item.processingType !== 'immediate') {
        await this.addToGatedItems(item);
        this.processingStats.gatedInputs++;
        return;
      }
    }

    // Process based on type
    switch (item.processingType) {
      case 'immediate':
        if (this.concurrentGatekeeper) {
          await this.concurrentGatekeeper.processMessage(
            item.speakerId,
            item.text,
            {
              priority: item.priority,
              bypassQueue: true,
              metadata: item.metadata,
            }
          );
        } else {
          await this.handlers.handleSpeakerInput(item, item.speakerId);
        }
        this.processingStats.processedInputs++;
        break;

      case 'queued':
        if (this.concurrentGatekeeper) {
          await this.concurrentGatekeeper.processMessage(
            item.speakerId,
            item.text,
            {
              priority: item.priority,
              metadata: item.metadata,
            }
          );
        } else {
          await this.handlers.handleSpeakerInput(item, item.speakerId);
        }
        this.processingStats.processedInputs++;
        break;

      case 'context_only':
        await this.addToSpeakerContext(item);
        this.processingStats.contextOnlyInputs++;
        break;
    }
  }

  /**
   * Enhanced input handling
   */
  private async enhancedHandleInput(item: InputItem): Promise<void> {
    const enhancedItem = this.enhanceInputItem(item);
    await this.handlers.handleSpeakerInput(enhancedItem, enhancedItem.speakerId);
  }

  /**
   * Enhanced context saving
   */
  private async enhancedSaveAsContext(item: InputItem): Promise<void> {
    const enhancedItem = this.enhanceInputItem(item);
    enhancedItem.processingType = 'context_only';
    await this.addToSpeakerContext(enhancedItem);
    await this.handlers.saveAsContext(item);
  }

  /**
   * Enhanced context addition
   */
  private async enhancedAddToContext(item: InputItem): Promise<void> {
    const enhancedItem = this.enhanceInputItem(item);
    await this.addToSpeakerContext(enhancedItem);
    await this.handlers.addToContext(item);
  }

  /**
   * Starts gating with enhanced tracking
   */
  private startGating(reason: string): void {
    this.gatingState = {
      isGated: true,
      gatingReason: reason,
      gatingStartTime: Date.now(),
      gatedItemsCount: this.gatingState.gatedItemsCount,
      contextItemsCount: this.gatingState.contextItemsCount,
    };
  }

  /**
   * Ends gating and updates metrics
   */
  private endGating(): void {
    if (this.gatingState.isGated) {
      const gatingTime = Date.now() - this.gatingState.gatingStartTime;
      this.updateGatingMetrics(gatingTime);
    }

    this.gatingState.isGated = false;
    this.gatingState.gatingReason = '';
  }

  /**
   * Processes all gated items
   */
  private async processGatedItems(): Promise<void> {
    const allGatedItems: EnhancedInputItem[] = [];
    
    for (const [speakerId, items] of this.gatedItems) {
      allGatedItems.push(...items);
    }

    // Sort by priority and timestamp
    allGatedItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.originalTimestamp - b.originalTimestamp; // Earlier timestamp first
    });

    // Process items as context
    for (const item of allGatedItems) {
      try {
        await this.handlers.addToContext(item);
      } catch (error) {
        console.error('Error processing gated item as context:', error);
      }
    }

    // Clear gated items
    this.gatedItems.clear();
    this.gatingState.gatedItemsCount = 0;
  }

  /**
   * Adds item to gated items
   */
  private async addToGatedItems(item: EnhancedInputItem): Promise<void> {
    if (!this.gatedItems.has(item.speakerId)) {
      this.gatedItems.set(item.speakerId, []);
    }

    const speakerGatedItems = this.gatedItems.get(item.speakerId)!;
    
    // Check limits
    if (speakerGatedItems.length >= this.config.maxGatedItems / 2) {
      console.warn(`Too many gated items for speaker ${item.speakerId}, dropping oldest`);
      speakerGatedItems.shift();
      this.gatingState.gatedItemsCount--;
    }

    speakerGatedItems.push(item);
    this.gatingState.gatedItemsCount++;

    // Save as context as well
    await this.handlers.saveAsContext(item);
  }

  /**
   * Adds item to speaker context
   */
  private async addToSpeakerContext(item: EnhancedInputItem): Promise<void> {
    if (!this.speakerContexts.has(item.speakerId)) {
      this.speakerContexts.set(item.speakerId, []);
    }

    const context = this.speakerContexts.get(item.speakerId)!;
    context.push(item);

    // Maintain context window
    if (context.length > this.config.speakerContextWindow) {
      context.shift();
    } else {
      this.gatingState.contextItemsCount++;
    }

    // Clean old context
    this.cleanupOldContext();
  }

  /**
   * Cleans up old context items
   */
  private cleanupOldContext(): void {
    const cutoffTime = Date.now() - this.config.contextRetentionTime;
    
    for (const [speakerId, context] of this.speakerContexts) {
      const filteredContext = context.filter(item => item.timestamp > cutoffTime);
      
      if (filteredContext.length !== context.length) {
        this.speakerContexts.set(speakerId, filteredContext);
        this.gatingState.contextItemsCount -= (context.length - filteredContext.length);
      }
    }
  }

  /**
   * Updates gating metrics
   */
  private updateGatingMetrics(gatingTime: number): void {
    if (!this.config.enableGatingMetrics) return;

    // Update average gating time
    const currentAvg = this.processingStats.averageGatingTime;
    const totalInputs = this.processingStats.totalInputs;
    
    this.processingStats.averageGatingTime = 
      ((currentAvg * (totalInputs - 1)) + gatingTime) / totalInputs;
  }

  /**
   * Extracts speaker ID from input item
   */
  private extractSpeakerId(item: InputItem): string {
    return item.metadata?.speakerId || item.metadata?.speaker || 'unknown';
  }

  /**
   * Determines priority for input item
   */
  private determinePriority(item: InputItem): number {
    if (this.config.prioritizeInterrupts && 
        (item.text.toLowerCase().includes('stop') || 
         item.text.toLowerCase().includes('interrupt'))) {
      return 10;
    }

    if (item.text.includes('?')) {
      return 5; // Questions get higher priority
    }

    return 1; // Default priority
  }
}

/**
 * Creates an enhanced input gatekeeper with default handlers
 */
export function createEnhancedInputGatekeeper(
  baseHandlers: InputHandlers,
  config: Partial<EnhancedInputGatekeeperConfig> = {}
): EnhancedInputGatekeeper {
  const enhancedHandlers: EnhancedInputHandlers = {
    ...baseHandlers,
    
    async handleSpeakerInput(input: EnhancedInputItem, speakerId: string): Promise<void> {
      // Default implementation delegates to base handler
      await baseHandlers.handleInput(input);
    },
    
    async categorizeInput(input: EnhancedInputItem): Promise<'immediate' | 'queued' | 'context_only'> {
      // Simple categorization logic
      if (input.priority >= 10) return 'immediate';
      if (input.text.trim().length < 10) return 'context_only';
      return 'queued';
    },
    
    async shouldGateInput(input: EnhancedInputItem): Promise<boolean> {
      // Don't gate high-priority items
      return input.priority < 10;
    },
  };

  return new EnhancedInputGatekeeper(enhancedHandlers, config);
}