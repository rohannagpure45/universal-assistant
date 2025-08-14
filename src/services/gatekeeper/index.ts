/**
 * Gatekeeper Integration Hub - Main integration points with existing systems
 * 
 * This file provides:
 * - Integration with ConversationProcessor
 * - Integration with AudioManager
 * - Factory functions for creating gatekeeper instances
 * - Configuration management
 * - System-wide coordination
 */

import { ConversationProcessor, ConversationProcessorConfig } from '../universal-assistant/ConversationProcessor';
import { AudioManager } from '../universal-assistant/AudioManager';
import { InputHandlers, createInputGatekeeper } from '../gating/InputGatekeeper';
import { createConversationInputHandlers } from '../gating/ConversationInputHandlers';
import { ConcurrentGatekeeper, ConcurrentGatekeeperConfig, createConcurrentGatekeeper } from './ConcurrentGatekeeper';
import { EnhancedInputGatekeeper, EnhancedInputGatekeeperConfig, createEnhancedInputGatekeeper } from './EnhancedInputGatekeeper';
import { GatekeeperErrorHandler, GatekeeperErrorHandlerConfig, createDefaultErrorHandler } from './GatekeeperErrorHandler';
import { GatekeeperMetrics, GatekeeperMetricsConfig, createDefaultMetrics } from './GatekeeperMetrics';

// Export all types and classes
export * from './utils/AsyncQueue';
export * from './utils/AsyncLock';
export * from './ConcurrentGatekeeper';
export * from './EnhancedInputGatekeeper';
export * from './GatekeeperErrorHandler';
export * from './GatekeeperMetrics';

export interface IntegratedGatekeeperConfig {
  // Core gatekeeper settings
  concurrent: Partial<ConcurrentGatekeeperConfig>;
  enhanced: Partial<EnhancedInputGatekeeperConfig>;
  errorHandler: Partial<GatekeeperErrorHandlerConfig>;
  metrics: Partial<GatekeeperMetricsConfig>;
  
  // Integration settings
  enableConversationProcessorIntegration: boolean;
  enableAudioManagerIntegration: boolean;
  enableMetrics: boolean;
  enableErrorHandling: boolean;
  
  // System settings
  gracefulShutdownTimeout: number;
  startupValidation: boolean;
}

export interface GatekeeperSystem {
  concurrentGatekeeper: ConcurrentGatekeeper;
  enhancedInputGatekeeper: EnhancedInputGatekeeper;
  errorHandler: GatekeeperErrorHandler;
  metrics: GatekeeperMetrics;
  
  // System management
  shutdown: () => Promise<void>;
  getStats: () => any;
  cleanup: () => void;
}

/**
 * Creates an integrated gatekeeper system with all components
 */
export function createIntegratedGatekeeper(
  conversationProcessor: ConversationProcessor,
  audioManager?: AudioManager,
  config: Partial<IntegratedGatekeeperConfig> = {}
): GatekeeperSystem {
  const fullConfig: IntegratedGatekeeperConfig = {
    concurrent: {},
    enhanced: {},
    errorHandler: {},
    metrics: {},
    enableConversationProcessorIntegration: true,
    enableAudioManagerIntegration: !!audioManager,
    enableMetrics: true,
    enableErrorHandling: true,
    gracefulShutdownTimeout: 30000,
    startupValidation: true,
    ...config,
  };

  // Create metrics collector
  const metrics = fullConfig.enableMetrics 
    ? createDefaultMetrics(fullConfig.metrics)
    : null;

  // Create error handler
  const errorHandler = fullConfig.enableErrorHandling
    ? createDefaultErrorHandler(fullConfig.errorHandler)
    : null;

  // Create input handlers with error handling and metrics
  const inputHandlers = createIntegratedInputHandlers(
    conversationProcessor,
    errorHandler,
    metrics
  );

  // Create concurrent gatekeeper
  const concurrentGatekeeper = createConcurrentGatekeeper(
    conversationProcessor,
    {
      enablePerformanceMonitoring: fullConfig.enableMetrics,
      enableInputGating: true,
      ...fullConfig.concurrent,
    },
    inputHandlers
  );

  // Create enhanced input gatekeeper
  const enhancedInputGatekeeper = createEnhancedInputGatekeeper(
    inputHandlers,
    {
      enableConcurrentProcessing: true,
      enableGatingMetrics: fullConfig.enableMetrics,
      ...fullConfig.enhanced,
    }
  );

  // Integrate concurrent gatekeeper with enhanced input gatekeeper
  if (fullConfig.enableConversationProcessorIntegration) {
    enhancedInputGatekeeper.integrateConcurrentGatekeeper(
      conversationProcessor,
      fullConfig.concurrent
    );
  }

  // Set up audio manager integration
  if (audioManager && fullConfig.enableAudioManagerIntegration) {
    setupAudioManagerIntegration(audioManager, enhancedInputGatekeeper, concurrentGatekeeper);
  }

  // Set up error handler callbacks
  if (errorHandler && metrics) {
    errorHandler.addErrorReportingCallback((error, context, stats) => {
      metrics.recordError(context.operation, error, {
        speakerId: context.speakerId,
        messageId: context.messageId,
      });
    });
  }

  // Perform startup validation
  if (fullConfig.startupValidation) {
    performStartupValidation(concurrentGatekeeper, enhancedInputGatekeeper);
  }

  return {
    concurrentGatekeeper,
    enhancedInputGatekeeper,
    errorHandler: errorHandler!,
    metrics: metrics!,
    
    async shutdown(): Promise<void> {
      const shutdownPromises: Promise<void>[] = [];
      
      if (enhancedInputGatekeeper) {
        shutdownPromises.push(enhancedInputGatekeeper.shutdown());
      }
      
      if (concurrentGatekeeper) {
        shutdownPromises.push(concurrentGatekeeper.shutdown(fullConfig.gracefulShutdownTimeout));
      }
      
      if (errorHandler) {
        errorHandler.shutdown();
      }
      
      if (metrics) {
        metrics.shutdown();
      }

      await Promise.allSettled(shutdownPromises);
      console.log('Integrated gatekeeper system shut down successfully');
    },

    getStats() {
      return {
        concurrent: concurrentGatekeeper?.getStats(),
        enhanced: enhancedInputGatekeeper?.getGatingStats(),
        errors: errorHandler?.getErrorStats(),
        metrics: metrics?.getSnapshot(),
        system: {
          uptime: Date.now(),
          components: {
            concurrentGatekeeper: !!concurrentGatekeeper,
            enhancedInputGatekeeper: !!enhancedInputGatekeeper,
            errorHandler: !!errorHandler,
            metrics: !!metrics,
          },
        },
      };
    },

    cleanup() {
      try {
        concurrentGatekeeper?.cleanup();
        errorHandler?.cleanup();
        
        if (metrics && 'cleanup' in metrics) {
          (metrics as any).cleanup();
        }
      } catch (error) {
        console.error('Error during gatekeeper cleanup:', error);
      }
    },
  };
}

/**
 * Creates integrated input handlers with error handling and metrics
 */
function createIntegratedInputHandlers(
  conversationProcessor: ConversationProcessor,
  errorHandler: GatekeeperErrorHandler | null,
  metrics: GatekeeperMetrics | null
): InputHandlers {
  const baseHandlers = createConversationInputHandlers();

  return {
    async handleInput(input) {
      const startTime = Date.now();
      const speakerId = input.metadata?.speakerId || 'unknown';
      
      try {
        if (errorHandler) {
          await errorHandler.executeWithErrorHandling(
            () => baseHandlers.handleInput(input),
            {
              operation: 'handle_input',
              speakerId,
              messageId: input.id,
              timestamp: Date.now(),
              metadata: input.metadata || {},
              retryCount: 0,
              maxRetries: 3,
            }
          );
        } else {
          await baseHandlers.handleInput(input);
        }

        // Record successful processing
        if (metrics) {
          const processingTime = Date.now() - startTime;
          metrics.recordMessageProcessing(speakerId, processingTime, true, {
            operation: 'handle_input',
            inputLength: input.text.length,
          });
        }
      } catch (error) {
        const processingTime = Date.now() - startTime;
        
        if (metrics) {
          metrics.recordMessageProcessing(speakerId, processingTime, false, {
            operation: 'handle_input',
            error: (error as Error).message,
          });
        }
        
        throw error;
      }
    },

    async saveAsContext(input) {
      const startTime = Date.now();
      const speakerId = input.metadata?.speakerId || 'unknown';
      
      try {
        await baseHandlers.saveAsContext(input);
        
        if (metrics) {
          const processingTime = Date.now() - startTime;
          metrics.recordMessageProcessing(speakerId, processingTime, true, {
            operation: 'save_context',
          });
        }
      } catch (error) {
        if (metrics) {
          const processingTime = Date.now() - startTime;
          metrics.recordMessageProcessing(speakerId, processingTime, false, {
            operation: 'save_context',
            error: (error as Error).message,
          });
        }
        
        throw error;
      }
    },

    async addToContext(input) {
      const startTime = Date.now();
      const speakerId = input.metadata?.speakerId || 'unknown';
      
      try {
        await baseHandlers.addToContext(input);
        
        if (metrics) {
          const processingTime = Date.now() - startTime;
          metrics.recordMessageProcessing(speakerId, processingTime, true, {
            operation: 'add_context',
          });
        }
      } catch (error) {
        if (metrics) {
          const processingTime = Date.now() - startTime;
          metrics.recordMessageProcessing(speakerId, processingTime, false, {
            operation: 'add_context',
            error: (error as Error).message,
          });
        }
        
        throw error;
      }
    },
  };
}

/**
 * Sets up AudioManager integration
 */
function setupAudioManagerIntegration(
  audioManager: AudioManager,
  enhancedInputGatekeeper: EnhancedInputGatekeeper,
  concurrentGatekeeper: ConcurrentGatekeeper
): void {
  // Store original play method
  const originalPlay = audioManager.play.bind(audioManager);

  // Override play method to integrate with gating
  audioManager.play = async (url: string): Promise<void> => {
    // Create TTS promise
    const ttsPromise = originalPlay(url);
    
    // Gate input during TTS playback
    enhancedInputGatekeeper.gateDuringTTS(ttsPromise, 'AudioManager TTS playback');
    concurrentGatekeeper.gateDuringTTS(ttsPromise);
    
    return ttsPromise;
  };

  console.log('AudioManager integration enabled with gatekeeper');
}

/**
 * Performs startup validation
 */
function performStartupValidation(
  concurrentGatekeeper: ConcurrentGatekeeper,
  enhancedInputGatekeeper: EnhancedInputGatekeeper
): void {
  try {
    // Basic validation checks
    if (!concurrentGatekeeper) {
      throw new Error('ConcurrentGatekeeper is not initialized');
    }
    
    if (!enhancedInputGatekeeper) {
      throw new Error('EnhancedInputGatekeeper is not initialized');
    }

    // Test basic functionality
    const stats = concurrentGatekeeper.getStats();
    if (!stats) {
      throw new Error('ConcurrentGatekeeper stats not available');
    }

    const gatingStats = enhancedInputGatekeeper.getGatingStats();
    if (!gatingStats) {
      throw new Error('EnhancedInputGatekeeper stats not available');
    }

    console.log('Gatekeeper system startup validation passed');
  } catch (error) {
    console.error('Gatekeeper system startup validation failed:', error);
    throw error;
  }
}

/**
 * Updates ConversationProcessor with gatekeeper integration
 */
export function integrateWithConversationProcessor(
  conversationProcessor: ConversationProcessor,
  gatekeeperSystem: GatekeeperSystem
): void {
  // Update conversation processor config to enable input gating
  conversationProcessor.updateConfig({
    enableInputGating: true,
  });

  // Set up gating for TTS operations
  const originalGateDuringTTS = conversationProcessor.gateDuringTTS;
  if (originalGateDuringTTS) {
    conversationProcessor.gateDuringTTS = (ttsPromise: Promise<void>) => {
      // Gate using both the original method and our enhanced gatekeeper
      originalGateDuringTTS.call(conversationProcessor, ttsPromise);
      gatekeeperSystem.enhancedInputGatekeeper.gateDuringTTS(ttsPromise, 'ConversationProcessor TTS');
      gatekeeperSystem.concurrentGatekeeper.gateDuringTTS(ttsPromise);
    };
  }

  console.log('ConversationProcessor integration completed');
}

/**
 * Creates a lightweight gatekeeper for simple use cases
 */
export function createSimpleGatekeeper(
  conversationProcessor: ConversationProcessor,
  config: Partial<ConcurrentGatekeeperConfig> = {}
): ConcurrentGatekeeper {
  const inputHandlers = createConversationInputHandlers();
  
  return createConcurrentGatekeeper(conversationProcessor, {
    maxConcurrentProcessing: 3,
    processingTimeout: 15000,
    enableInputGating: true,
    enablePerformanceMonitoring: false,
    ...config,
  }, inputHandlers);
}

/**
 * Factory function for production-ready gatekeeper system
 */
export function createProductionGatekeeper(
  conversationProcessor: ConversationProcessor,
  audioManager?: AudioManager
): GatekeeperSystem {
  return createIntegratedGatekeeper(conversationProcessor, audioManager, {
    concurrent: {
      maxConcurrentProcessing: 5,
      processingTimeout: 30000,
      maxRetries: 3,
      enablePriorityProcessing: true,
      deadlockDetectionEnabled: true,
    },
    enhanced: {
      enableConcurrentProcessing: true,
      maxGatedItems: 100,
      gatedItemTimeout: 30000,
      enableGatingMetrics: true,
    },
    errorHandler: {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      maxRetryAttempts: 3,
      enableErrorReporting: true,
      enableGracefulDegradation: true,
    },
    metrics: {
      enableRealTimeMetrics: true,
      enableSpeakerMetrics: true,
      enableSystemMetrics: true,
      enableAlerts: true,
      exportInterval: 60000,
    },
    enableConversationProcessorIntegration: true,
    enableAudioManagerIntegration: !!audioManager,
    enableMetrics: true,
    enableErrorHandling: true,
    gracefulShutdownTimeout: 30000,
    startupValidation: true,
  });
}