/**
 * Integration Example - Complete example of integrating the Concurrent Gatekeeper System
 * 
 * This example shows how to:
 * 1. Set up the integrated gatekeeper system
 * 2. Configure for production use
 * 3. Handle errors and monitoring
 * 4. Integrate with existing components
 * 5. Manage system lifecycle
 */

import { 
  createProductionGatekeeper,
  createIntegratedGatekeeper,
  integrateWithConversationProcessor,
  GatekeeperSystem,
  IntegratedGatekeeperConfig
} from '../index';
import { ConversationProcessor } from '../../universal-assistant/ConversationProcessor';
import { AudioManager } from '../../universal-assistant/AudioManager';

/**
 * Example 1: Quick Production Setup
 */
export async function quickProductionSetup() {
  console.log('Setting up production gatekeeper system...');
  
  // Get existing services (assuming they exist)
  const conversationProcessor = new ConversationProcessor();
  const audioManager = new AudioManager();
  
  // Create production-ready system
  const gatekeeperSystem = createProductionGatekeeper(
    conversationProcessor,
    audioManager
  );
  
  // Integrate with conversation processor
  integrateWithConversationProcessor(conversationProcessor, gatekeeperSystem);
  
  // Set up monitoring
  setupMonitoring(gatekeeperSystem);
  
  // Set up graceful shutdown
  setupGracefulShutdown(gatekeeperSystem);
  
  console.log('Production gatekeeper system ready!');
  return gatekeeperSystem;
}

/**
 * Example 2: Custom Configuration Setup
 */
export async function customConfigurationSetup() {
  const conversationProcessor = new ConversationProcessor();
  const audioManager = new AudioManager();
  
  // Custom configuration for high-volume scenarios
  const config: Partial<IntegratedGatekeeperConfig> = {
    concurrent: {
      maxConcurrentProcessing: 10, // High concurrency
      processingTimeout: 20000, // 20 second timeout
      maxRetries: 5, // More retries
      enablePriorityProcessing: true,
      deadlockDetectionEnabled: true,
    },
    enhanced: {
      enableConcurrentProcessing: true,
      maxGatedItems: 200, // More gated items
      gatedItemTimeout: 45000, // Longer gating timeout
      contextRetentionTime: 600000, // 10 minutes context retention
      enableGatingMetrics: true,
    },
    errorHandler: {
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 10, // More failures before tripping
      maxRetryAttempts: 5,
      enableErrorReporting: true,
      enableGracefulDegradation: true,
    },
    metrics: {
      enableRealTimeMetrics: true,
      enableSpeakerMetrics: true,
      enableSystemMetrics: true,
      enableAlerts: true,
      exportInterval: 30000, // Export every 30 seconds
      alertThresholds: {
        highErrorRate: 0.05, // 5% error rate threshold
        slowProcessing: 3000, // 3 second processing threshold
        highMemoryUsage: 1000 * 1024 * 1024, // 1GB memory threshold
        queueBacklog: 100, // 100 message backlog threshold
      },
    },
    enableConversationProcessorIntegration: true,
    enableAudioManagerIntegration: true,
    enableMetrics: true,
    enableErrorHandling: true,
    gracefulShutdownTimeout: 45000, // 45 second shutdown timeout
    startupValidation: true,
  };
  
  const gatekeeperSystem = createIntegratedGatekeeper(
    conversationProcessor,
    audioManager,
    config
  );
  
  return gatekeeperSystem;
}

/**
 * Example 3: Message Processing Scenarios
 */
export async function messageProcessingExamples(gatekeeperSystem: GatekeeperSystem) {
  const { concurrentGatekeeper } = gatekeeperSystem;
  
  // High priority urgent message
  console.log('Processing urgent message...');
  const urgentResponse = await concurrentGatekeeper.processMessage(
    'user1',
    'Emergency! Stop all operations!',
    {
      priority: 10, // Highest priority
      timeout: 5000, // Quick timeout
      bypassQueue: true, // Skip queue for urgency
      metadata: {
        urgent: true,
        source: 'voice_command',
      },
    }
  );
  console.log('Urgent response:', urgentResponse);
  
  // Normal conversation message
  console.log('Processing normal message...');
  const normalResponse = await concurrentGatekeeper.processMessage(
    'user1',
    'What is the weather like today?',
    {
      priority: 5,
      timeout: 30000,
      metadata: {
        source: 'conversation',
        type: 'question',
      },
    }
  );
  console.log('Normal response:', normalResponse);
  
  // Background context message (low priority)
  console.log('Processing background context...');
  const contextResponse = await concurrentGatekeeper.processMessage(
    'user1',
    'The user seems interested in weather information.',
    {
      priority: 1,
      timeout: 60000,
      metadata: {
        source: 'context_inference',
        type: 'background',
      },
    }
  );
  console.log('Context response:', contextResponse);
  
  // Batch processing multiple speakers
  console.log('Processing multiple speakers...');
  const speakers = ['user1', 'user2', 'user3'];
  const messages = [
    'How are you doing?',
    'I need help with this task',
    'Thank you for your assistance'
  ];
  
  const batchPromises = speakers.map((speakerId, index) =>
    concurrentGatekeeper.processMessage(speakerId, messages[index], {
      priority: 5,
      metadata: { batch: true, batchIndex: index },
    })
  );
  
  const batchResults = await Promise.allSettled(batchPromises);
  console.log('Batch processing results:', batchResults);
}

/**
 * Example 4: TTS Integration and Gating
 */
export async function ttsIntegrationExample(gatekeeperSystem: GatekeeperSystem) {
  const { enhancedInputGatekeeper, concurrentGatekeeper } = gatekeeperSystem;
  
  // Simulate TTS playback
  console.log('Starting TTS playback with input gating...');
  
  const ttsPromise = simulateTTSPlayback('Hello, how can I help you today?');
  
  // Gate input during TTS
  enhancedInputGatekeeper.gateDuringTTS(ttsPromise, 'Example TTS playback');
  concurrentGatekeeper.gateDuringTTS(ttsPromise);
  
  // Try to process input during TTS (should be gated)
  console.log('Attempting to process input during TTS...');
  const gatedResponse = await concurrentGatekeeper.processMessage(
    'user1',
    'Can you hear me?',
    { priority: 5 }
  );
  console.log('Gated response:', gatedResponse);
  
  // Wait for TTS to complete
  await ttsPromise;
  console.log('TTS completed, input gating released');
  
  // Process input after TTS (should work normally)
  console.log('Processing input after TTS...');
  const normalResponse = await concurrentGatekeeper.processMessage(
    'user1',
    'I can speak now',
    { priority: 5 }
  );
  console.log('Normal response after TTS:', normalResponse);
}

/**
 * Example 5: Error Handling and Recovery
 */
export async function errorHandlingExample(gatekeeperSystem: GatekeeperSystem) {
  const { errorHandler, concurrentGatekeeper } = gatekeeperSystem;
  
  // Add custom error recovery strategy
  errorHandler.addRecoveryStrategy({
    name: 'CustomBusinessLogicRetry',
    priority: 95,
    canHandle: (error) => error.message.includes('business_logic_error'),
    recover: async (error, context) => {
      console.log(`Handling business logic error for ${context.speakerId}`);
      
      // Custom recovery logic
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: false,
        action: 'retry',
        delay: 2000,
        message: 'Retrying with custom business logic',
      };
    },
  });
  
  // Simulate error scenarios
  console.log('Testing error handling...');
  
  // Create a mock message processor that throws errors
  const originalProcessor = (concurrentGatekeeper as any).messageProcessor;
  let errorCount = 0;
  
  (concurrentGatekeeper as any).messageProcessor = {
    async processMessage(message: any) {
      errorCount++;
      if (errorCount <= 2) {
        throw new Error('business_logic_error: Temporary failure');
      }
      return originalProcessor.processMessage(message);
    },
  };
  
  try {
    const response = await concurrentGatekeeper.processMessage(
      'user1',
      'This message will initially fail',
      { priority: 5 }
    );
    console.log('Message processed after retries:', response);
  } catch (error) {
    console.error('Failed after all retries:', error);
  }
  
  // Restore original processor
  (concurrentGatekeeper as any).messageProcessor = originalProcessor;
  
  // Show error statistics
  const errorStats = errorHandler.getErrorStats();
  console.log('Error statistics:', errorStats);
}

/**
 * Example 6: Performance Monitoring
 */
export async function performanceMonitoringExample(gatekeeperSystem: GatekeeperSystem) {
  const { metrics } = gatekeeperSystem;
  
  // Set up custom export callback
  metrics.addExportCallback((snapshot) => {
    console.log('=== PERFORMANCE SNAPSHOT ===');
    console.log('Timestamp:', new Date(snapshot.timestamp).toISOString());
    console.log('Processing Time:', {
      average: snapshot.performance.processingTime.average.toFixed(2) + 'ms',
      p95: snapshot.performance.processingTime.p95.toFixed(2) + 'ms',
      p99: snapshot.performance.processingTime.p99.toFixed(2) + 'ms',
    });
    console.log('Throughput:', {
      messagesPerSecond: snapshot.performance.throughput.messagesPerSecond.toFixed(2),
      peakThroughput: snapshot.performance.throughput.peakThroughput.toFixed(2),
    });
    console.log('Reliability:', {
      successRate: (snapshot.performance.reliability.successRate * 100).toFixed(1) + '%',
      errorRate: (snapshot.performance.reliability.errorRate * 100).toFixed(1) + '%',
    });
    console.log('Active Speakers:', snapshot.speakers.length);
    console.log('Unresolved Alerts:', snapshot.alerts.filter(a => !a.resolved).length);
    console.log('============================');
  });
  
  // Set up alert callback
  metrics.addAlertCallback((alert) => {
    console.log(`🚨 [${alert.type.toUpperCase()}] ${alert.message}`);
    
    // In production, you might send to external systems
    // alertingService.send(alert);
    // slackBot.notify(alert);
  });
  
  // Simulate some processing to generate metrics
  console.log('Generating performance data...');
  const promises = [];
  
  for (let i = 0; i < 10; i++) {
    promises.push(
      gatekeeperSystem.concurrentGatekeeper.processMessage(
        `speaker${i % 3}`, // 3 different speakers
        `Performance test message ${i}`,
        {
          priority: Math.floor(Math.random() * 10),
          metadata: { performanceTest: true, iteration: i },
        }
      )
    );
    
    // Add some delay between messages
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await Promise.allSettled(promises);
  
  // Get and display comprehensive stats
  const stats = gatekeeperSystem.getStats();
  console.log('=== COMPREHENSIVE STATS ===');
  console.log(JSON.stringify(stats, null, 2));
}

/**
 * Example 7: Speaker-Specific Analytics
 */
export async function speakerAnalyticsExample(gatekeeperSystem: GatekeeperSystem) {
  const { concurrentGatekeeper } = gatekeeperSystem;
  
  // Process messages from different speakers
  const speakers = ['alice', 'bob', 'charlie'];
  const messageTypes = ['question', 'statement', 'request'];
  
  console.log('Processing messages from multiple speakers...');
  
  for (let i = 0; i < 15; i++) {
    const speakerId = speakers[i % speakers.length];
    const messageType = messageTypes[i % messageTypes.length];
    
    await concurrentGatekeeper.processMessage(
      speakerId,
      `This is a ${messageType} from ${speakerId} - message ${i}`,
      {
        priority: Math.floor(Math.random() * 5) + 1,
        metadata: {
          messageType,
          messageNumber: i,
        },
      }
    );
    
    // Random delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200));
  }
  
  // Analyze speaker statistics
  console.log('=== SPEAKER ANALYTICS ===');
  for (const speakerId of speakers) {
    const stats = concurrentGatekeeper.getSpeakerStats(speakerId);
    console.log(`Speaker: ${speakerId}`, {
      messagesProcessed: stats.messagesProcessed,
      averageProcessingTime: stats.averageProcessingTime.toFixed(2) + 'ms',
      errorCount: stats.errorCount,
      isCurrentlyLocked: stats.isCurrentlyLocked,
      lastActivity: new Date(stats.lastProcessedAt).toISOString(),
    });
  }
}

/**
 * Helper Functions
 */
function setupMonitoring(gatekeeperSystem: GatekeeperSystem) {
  // Set up periodic monitoring
  setInterval(() => {
    gatekeeperSystem.cleanup();
  }, 60000); // Cleanup every minute
  
  // Set up stats logging
  setInterval(() => {
    const stats = gatekeeperSystem.getStats();
    console.log('System Health Check:', {
      queueLength: stats.concurrent?.messagesInQueue || 0,
      activeProcessing: stats.concurrent?.activeProcessingOperations || 0,
      errorRate: stats.errors?.totalErrors ? 
        (stats.errors.totalErrors / Math.max(stats.concurrent?.messagesProcessed || 1, 1) * 100).toFixed(1) + '%' : '0%',
      uptime: Math.floor((Date.now() - (stats.system?.uptime || Date.now())) / 1000) + 's',
    });
  }, 30000); // Every 30 seconds
}

function setupGracefulShutdown(gatekeeperSystem: GatekeeperSystem) {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, initiating graceful shutdown...`);
    
    try {
      // Export final metrics
      await gatekeeperSystem.metrics.exportMetrics();
      
      // Shutdown the system
      await gatekeeperSystem.shutdown();
      
      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

async function simulateTTSPlayback(text: string): Promise<void> {
  console.log(`🔊 TTS: "${text}"`);
  // Simulate TTS duration based on text length
  const duration = Math.max(1000, text.length * 50); // 50ms per character, min 1s
  await new Promise(resolve => setTimeout(resolve, duration));
  console.log('🔇 TTS completed');
}

/**
 * Main Example Runner
 */
export async function runCompleteExample() {
  console.log('🚀 Starting Concurrent Gatekeeper Integration Example...\n');
  
  try {
    // 1. Quick setup
    console.log('1. Quick Production Setup');
    const gatekeeperSystem = await quickProductionSetup();
    console.log('✅ Production setup complete\n');
    
    // 2. Message processing
    console.log('2. Message Processing Examples');
    await messageProcessingExamples(gatekeeperSystem);
    console.log('✅ Message processing examples complete\n');
    
    // 3. TTS integration
    console.log('3. TTS Integration Example');
    await ttsIntegrationExample(gatekeeperSystem);
    console.log('✅ TTS integration example complete\n');
    
    // 4. Error handling
    console.log('4. Error Handling Example');
    await errorHandlingExample(gatekeeperSystem);
    console.log('✅ Error handling example complete\n');
    
    // 5. Performance monitoring
    console.log('5. Performance Monitoring Example');
    await performanceMonitoringExample(gatekeeperSystem);
    console.log('✅ Performance monitoring example complete\n');
    
    // 6. Speaker analytics
    console.log('6. Speaker Analytics Example');
    await speakerAnalyticsExample(gatekeeperSystem);
    console.log('✅ Speaker analytics example complete\n');
    
    console.log('🎉 All examples completed successfully!');
    
    // Wait a bit before shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean shutdown
    await gatekeeperSystem.shutdown();
    console.log('✅ System shutdown complete');
    
  } catch (error) {
    console.error('❌ Example execution failed:', error);
    throw error;
  }
}

// Export for use in other modules
export {
  setupMonitoring,
  setupGracefulShutdown,
  simulateTTSPlayback,
};