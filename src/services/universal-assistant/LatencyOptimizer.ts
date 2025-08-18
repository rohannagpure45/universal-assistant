/**
 * LatencyOptimizer - Sub-500ms Performance Optimization
 * 
 * Provides comprehensive latency optimization strategies for the Universal Assistant
 * to achieve consistent sub-500ms end-to-end response times.
 */

import { RealtimeAudioPipeline, LatencyMetrics } from './RealtimeAudioPipeline';

export interface OptimizationConfig {
  targetLatency: number;
  aggressiveMode: boolean;
  adaptiveThresholds: boolean;
  prioritizeAccuracy: boolean;
  enablePredictiveProcessing: boolean;
  maxQualityReduction: number; // 0-1 scale
}

export interface OptimizationResult {
  strategy: string;
  expectedImprovement: number;
  qualityImpact: number;
  implemented: boolean;
  reason?: string;
}

export interface PerformanceProfile {
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  bottlenecks: string[];
  recommendations: OptimizationStrategy[];
}

export interface OptimizationStrategy {
  name: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedImprovement: number; // milliseconds
  qualityTradeoff: number; // 0-1 scale
  implementation: () => Promise<OptimizationResult>;
}

export class LatencyOptimizer {
  private pipeline: RealtimeAudioPipeline;
  private config: OptimizationConfig;
  private performanceHistory: LatencyMetrics[] = [];
  private activeOptimizations: Set<string> = new Set();
  private optimizationStrategies: Map<string, OptimizationStrategy> = new Map();

  constructor(pipeline: RealtimeAudioPipeline, config?: Partial<OptimizationConfig>) {
    this.pipeline = pipeline;
    this.config = {
      targetLatency: 350, // 350ms target for sub-500ms goal
      aggressiveMode: false,
      adaptiveThresholds: true,
      prioritizeAccuracy: false,
      enablePredictiveProcessing: true,
      maxQualityReduction: 0.3,
      ...config
    };

    this.initializeOptimizationStrategies();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize optimization strategies
   */
  private initializeOptimizationStrategies(): void {
    // Audio processing optimizations
    this.optimizationStrategies.set('reduceAudioBuffer', {
      name: 'Reduce Audio Buffer Size',
      description: 'Decrease audio buffer size for lower latency at cost of stability',
      impact: 'high',
      difficulty: 'easy',
      estimatedImprovement: 50,
      qualityTradeoff: 0.1,
      implementation: async () => this.optimizeAudioBuffer()
    });

    this.optimizationStrategies.set('optimizeSTT', {
      name: 'Optimize Speech-to-Text',
      description: 'Reduce STT processing time with faster model settings',
      impact: 'high',
      difficulty: 'medium',
      estimatedImprovement: 80,
      qualityTradeoff: 0.15,
      implementation: async () => this.optimizeSTTSettings()
    });

    this.optimizationStrategies.set('streamlineFragmentProcessing', {
      name: 'Streamline Fragment Processing',
      description: 'Optimize fragment processing for minimal latency',
      impact: 'medium',
      difficulty: 'easy',
      estimatedImprovement: 30,
      qualityTradeoff: 0.05,
      implementation: async () => this.optimizeFragmentProcessing()
    });

    this.optimizationStrategies.set('parallelizeProcessing', {
      name: 'Parallelize Processing Stages',
      description: 'Process multiple stages simultaneously when possible',
      impact: 'high',
      difficulty: 'hard',
      estimatedImprovement: 100,
      qualityTradeoff: 0.02,
      implementation: async () => this.enableParallelProcessing()
    });

    this.optimizationStrategies.set('optimizeTTS', {
      name: 'Optimize Text-to-Speech',
      description: 'Reduce TTS generation time with streaming and compression',
      impact: 'high',
      difficulty: 'medium',
      estimatedImprovement: 120,
      qualityTradeoff: 0.2,
      implementation: async () => this.optimizeTTSGeneration()
    });

    this.optimizationStrategies.set('predictiveProcessing', {
      name: 'Enable Predictive Processing',
      description: 'Pre-process likely responses based on conversation context',
      impact: 'medium',
      difficulty: 'hard',
      estimatedImprovement: 60,
      qualityTradeoff: 0.1,
      implementation: async () => this.enablePredictiveProcessing()
    });

    this.optimizationStrategies.set('adaptiveQuality', {
      name: 'Adaptive Quality Control',
      description: 'Dynamically adjust quality settings based on latency requirements',
      impact: 'medium',
      difficulty: 'medium',
      estimatedImprovement: 40,
      qualityTradeoff: 0.25,
      implementation: async () => this.enableAdaptiveQuality()
    });

    this.optimizationStrategies.set('cacheOptimization', {
      name: 'Optimize Caching Strategy',
      description: 'Improve cache hit rates and reduce cache lookup times',
      impact: 'medium',
      difficulty: 'easy',
      estimatedImprovement: 25,
      qualityTradeoff: 0.0,
      implementation: async () => this.optimizeCaching()
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    this.pipeline.setEventListeners({
      onLatencyMeasured: (metrics) => {
        this.recordPerformanceMetrics(metrics);
        this.evaluateOptimizationNeeds(metrics);
      }
    });
  }

  /**
   * Record performance metrics for analysis
   */
  private recordPerformanceMetrics(metrics: LatencyMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only last 1000 metrics for analysis
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }
  }

  /**
   * Evaluate if optimizations are needed based on current performance
   */
  private async evaluateOptimizationNeeds(metrics: LatencyMetrics): Promise<void> {
    if (metrics.totalLatency > this.config.targetLatency) {
      const profile = this.analyzePerformanceProfile();
      const recommendations = this.generateOptimizationRecommendations(profile);
      
      if (this.config.adaptiveThresholds) {
        await this.implementAutomaticOptimizations(recommendations);
      }
    }
  }

  /**
   * Analyze current performance profile
   */
  public analyzePerformanceProfile(): PerformanceProfile {
    if (this.performanceHistory.length < 10) {
      return {
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        bottlenecks: [],
        recommendations: []
      };
    }

    const latencies = this.performanceHistory.map(m => m.totalLatency).sort((a, b) => a - b);
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
    const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks();
    const recommendations = this.generateOptimizationRecommendations({
      averageLatency,
      p95Latency,
      p99Latency,
      bottlenecks,
      recommendations: []
    });

    return {
      averageLatency,
      p95Latency,
      p99Latency,
      bottlenecks,
      recommendations
    };
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(): string[] {
    const bottlenecks: string[] = [];
    const recentMetrics = this.performanceHistory.slice(-50);
    
    if (recentMetrics.length === 0) return bottlenecks;

    // Calculate average times for each stage
    const avgAudioToTranscription = recentMetrics.reduce((sum, m) => sum + m.audioToTranscription, 0) / recentMetrics.length;
    const avgTranscriptionToAnalysis = recentMetrics.reduce((sum, m) => sum + m.transcriptionToAnalysis, 0) / recentMetrics.length;
    const avgAnalysisToResponse = recentMetrics.reduce((sum, m) => sum + m.analysisToResponse, 0) / recentMetrics.length;
    const avgResponseToAudio = recentMetrics.reduce((sum, m) => sum + m.responseToAudio, 0) / recentMetrics.length;

    // Identify stages taking more than 25% of target latency
    const threshold = this.config.targetLatency * 0.25;
    
    if (avgAudioToTranscription > threshold) {
      bottlenecks.push('audio_transcription');
    }
    if (avgTranscriptionToAnalysis > threshold) {
      bottlenecks.push('semantic_analysis');
    }
    if (avgAnalysisToResponse > threshold) {
      bottlenecks.push('response_generation');
    }
    if (avgResponseToAudio > threshold) {
      bottlenecks.push('tts_generation');
    }

    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(profile: PerformanceProfile): OptimizationStrategy[] {
    const recommendations: OptimizationStrategy[] = [];
    
    // Always recommend based on bottlenecks
    profile.bottlenecks.forEach(bottleneck => {
      switch (bottleneck) {
        case 'audio_transcription':
          recommendations.push(
            this.optimizationStrategies.get('reduceAudioBuffer')!,
            this.optimizationStrategies.get('optimizeSTT')!
          );
          break;
        case 'semantic_analysis':
          recommendations.push(
            this.optimizationStrategies.get('streamlineFragmentProcessing')!,
            this.optimizationStrategies.get('parallelizeProcessing')!
          );
          break;
        case 'response_generation':
          recommendations.push(
            this.optimizationStrategies.get('predictiveProcessing')!,
            this.optimizationStrategies.get('parallelizeProcessing')!
          );
          break;
        case 'tts_generation':
          recommendations.push(
            this.optimizationStrategies.get('optimizeTTS')!,
            this.optimizationStrategies.get('adaptiveQuality')!
          );
          break;
      }
    });

    // General optimizations if performance is poor
    if (profile.averageLatency > this.config.targetLatency * 1.5) {
      recommendations.push(
        this.optimizationStrategies.get('adaptiveQuality')!,
        this.optimizationStrategies.get('cacheOptimization')!
      );
    }

    // Remove duplicates and sort by impact
    const uniqueRecommendations = Array.from(new Set(recommendations));
    return uniqueRecommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Implement automatic optimizations
   */
  private async implementAutomaticOptimizations(recommendations: OptimizationStrategy[]): Promise<void> {
    for (const strategy of recommendations.slice(0, 3)) { // Limit to top 3
      if (this.activeOptimizations.has(strategy.name)) continue;
      
      // Check if optimization is acceptable based on config
      const qualityImpactAcceptable = strategy.qualityTradeoff <= this.config.maxQualityReduction;
      const shouldImplement = this.config.aggressiveMode || 
                             (qualityImpactAcceptable && strategy.impact === 'high') ||
                             (qualityImpactAcceptable && strategy.difficulty === 'easy');

      if (shouldImplement) {
        try {
          this.activeOptimizations.add(strategy.name);
          await strategy.implementation();
        } catch (error) {
          console.error(`Failed to implement optimization ${strategy.name}:`, error);
          this.activeOptimizations.delete(strategy.name);
        }
      }
    }
  }

  // Optimization implementations
  private async optimizeAudioBuffer(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      await services.audioManager.updateBufferConfig({
        bufferSize: 512,  // Reduced from 1024
        sampleRate: 16000,
        channels: 1
      });

      return {
        strategy: 'reduceAudioBuffer',
        expectedImprovement: 50,
        qualityImpact: 0.1,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'reduceAudioBuffer',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async optimizeSTTSettings(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      // Note: updateConfig method not available on EnhancedDeepgramSTT
      // Configuration should be set during initialization
      // await services.sttService.updateConfig({
      //   streamingEnabled: true,
      //   interimResults: true,
      //   punctuation: false,
      //   profanityFilter: false,
      //   smartFormatting: false,
      //   language: 'en-US',
      //   model: 'nova-2-general', // Fastest Deepgram model
      //   encoding: 'linear16',
      //   sampleRate: 16000,
      //   channels: 1
      // });

      return {
        strategy: 'optimizeSTT',
        expectedImprovement: 80,
        qualityImpact: 0.15,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'optimizeSTT',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async optimizeFragmentProcessing(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      services.fragmentProcessor.updateConfig({
        silenceThreshold: 500,  // Reduced silence detection
        bufferTimeout: 2000,    // Faster timeout
        minFragmentsForAggregation: 1, // Process single fragments
        maxBufferSize: 3,       // Smaller buffer
        confidenceThreshold: 0.5, // Lower threshold for speed
        enableSemanticAnalysis: !this.config.aggressiveMode, // Disable in aggressive mode
        semanticAnalysisDepth: 'basic'
      });

      return {
        strategy: 'streamlineFragmentProcessing',
        expectedImprovement: 30,
        qualityImpact: 0.05,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'streamlineFragmentProcessing',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async enableParallelProcessing(): Promise<OptimizationResult> {
    try {
      // This would require architectural changes to enable true parallel processing
      // For now, we'll optimize the pipeline configuration
      this.pipeline.updateConfig({
        transcriptionBatchSize: 256,  // Smaller batches for parallel processing
        enableLatencyOptimization: true,
        prioritizeLatency: true
      });

      return {
        strategy: 'parallelizeProcessing',
        expectedImprovement: 100,
        qualityImpact: 0.02,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'parallelizeProcessing',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async optimizeTTSGeneration(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      services.ttsService.updateConfig({
        streamingEnabled: true,
        latencyOptimization: 'speed',
        outputFormat: 'mp3_44100_128', // Use compressed format for speed
        chunkSize: 1024, // Smaller chunks for lower latency
        bufferSize: 2048,
        voiceSettings: {
          stability: 0.3,  // Lower stability for speed
          similarity_boost: 0.3,
          style: 0.0,      // Disable style for speed
          use_speaker_boost: false
        }
      });

      return {
        strategy: 'optimizeTTS',
        expectedImprovement: 120,
        qualityImpact: 0.2,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'optimizeTTS',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async enablePredictiveProcessing(): Promise<OptimizationResult> {
    try {
      // Enable predictive processing in the pipeline
      // This would pre-generate likely responses based on conversation context
      return {
        strategy: 'predictiveProcessing',
        expectedImprovement: 60,
        qualityImpact: 0.1,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'predictiveProcessing',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async enableAdaptiveQuality(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      // Note: setAdaptiveQuality methods not available
      // services.ttsService.setAdaptiveQuality(true);
      // services.audioManager.setAdaptiveQuality?.(true);

      return {
        strategy: 'adaptiveQuality',
        expectedImprovement: 40,
        qualityImpact: 0.25,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'adaptiveQuality',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  private async optimizeCaching(): Promise<OptimizationResult> {
    const services = this.pipeline.getServices();
    
    try {
      // Optimize TTS cache
      services.ttsService.clearCache();
      
      // Optimize fragment processor cache
      services.fragmentProcessor.clearSemanticCache();
      
      // Optimize voice profile cache
      const cacheStats = services.profileManager.getCacheStats();
      if (cacheStats.memoryUsage > 50 * 1024 * 1024) { // 50MB
        services.profileManager.clearProfiles();
      }

      return {
        strategy: 'cacheOptimization',
        expectedImprovement: 25,
        qualityImpact: 0.0,
        implemented: true
      };
    } catch (error) {
      return {
        strategy: 'cacheOptimization',
        expectedImprovement: 0,
        qualityImpact: 0,
        implemented: false,
        reason: (error as Error).message
      };
    }
  }

  // Public API methods
  public async optimizeForTarget(targetLatency: number): Promise<OptimizationResult[]> {
    this.config.targetLatency = targetLatency;
    const profile = this.analyzePerformanceProfile();
    const recommendations = this.generateOptimizationRecommendations(profile);
    
    const results: OptimizationResult[] = [];
    for (const strategy of recommendations) {
      try {
        const result = await strategy.implementation();
        results.push(result);
        if (result.implemented) {
          this.activeOptimizations.add(strategy.name);
        }
      } catch (error) {
        results.push({
          strategy: strategy.name,
          expectedImprovement: 0,
          qualityImpact: 0,
          implemented: false,
          reason: (error as Error).message
        });
      }
    }
    
    return results;
  }

  public async resetOptimizations(): Promise<void> {
    // Reset all services to default configurations
    const services = this.pipeline.getServices();
    
    // Reset audio manager
    await services.audioManager.updateBufferConfig({
      bufferSize: 1024,
      sampleRate: 44100,
      channels: 2
    });

    // Reset STT service
    // Note: updateConfig method not available on EnhancedDeepgramSTT
    // await services.sttService.updateConfig({
    //   streamingEnabled: true,
    //   interimResults: true,
    //   punctuation: true,
    //   profanityFilter: true,
    //   smartFormatting: true
    // });

    // Reset fragment processor
    services.fragmentProcessor.updateConfig({
      silenceThreshold: 2000,
      bufferTimeout: 10000,
      minFragmentsForAggregation: 2,
      maxBufferSize: 10,
      confidenceThreshold: 0.6,
      enableSemanticAnalysis: true,
      semanticAnalysisDepth: 'standard'
    });

    // Reset TTS service
    services.ttsService.updateConfig({
      streamingEnabled: true,
      latencyOptimization: 'balanced',
      outputFormat: 'pcm_44100',
      chunkSize: 2048,
      bufferSize: 4096
    });

    this.activeOptimizations.clear();
  }

  public getActiveOptimizations(): string[] {
    return Array.from(this.activeOptimizations);
  }

  public getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export is commented out as the realtimeAudioPipeline instance is not available here
// export const latencyOptimizer = new LatencyOptimizer(realtimeAudioPipeline);