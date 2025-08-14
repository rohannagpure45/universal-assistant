import { EnhancedAIService, AIRequestOptions, EnhancedAIResponse } from './EnhancedAIService';
import { ConversationContext } from '@/config/modelConfigs';
import { ContextTracker } from './ContextTracker';
import { FragmentProcessor, ProcessResult } from './FragmentProcessor';
import { AIModel } from '@/types';

export interface AIHandlerContext extends ConversationContext {
  fragmentResult?: ProcessResult;
  urgency?: 'low' | 'medium' | 'high';
  responseType?: 'quick' | 'detailed' | 'creative' | 'analytical';
  constraints?: {
    maxCost?: number;
    maxLatency?: number;
    requiresAccuracy?: boolean;
  };
}

export interface AIHandlerResponse extends EnhancedAIResponse {
  responseStrategy: string;
  contextUsed: boolean;
  recommendedFollowUp?: string[];
}

export class UnifiedAIHandler {
  private responseCache: Map<string, { response: AIHandlerResponse; timestamp: number }> = new Map();
  private contextHistory: Map<string, AIHandlerContext[]> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private aiService: EnhancedAIService,
    private contextTracker?: ContextTracker,
    private fragmentProcessor?: FragmentProcessor
  ) {}

  async generateAIResponse(
    prompt: string,
    model: AIModel,
    context: AIHandlerContext,
    options: AIRequestOptions = {}
  ): Promise<AIHandlerResponse> {
    // Check cache first
    const cacheKey = this.generateCacheKey(prompt, model, context);
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      return cached;
    }

    // Enhance context with additional intelligence
    const enhancedContext = await this.enhanceContext(context);

    // Select optimal strategy based on context
    const strategy = this.selectResponseStrategy(context);
    const optimizedOptions = this.optimizeRequestOptions(options, strategy, context);

    // Generate response
    const response = await this.aiService.generateResponse(
      prompt,
      model,
      enhancedContext,
      optimizedOptions
    );

    // Post-process response
    const handlerResponse = await this.postProcessResponse(response, context, strategy);

    // Cache the response
    this.cacheResponse(cacheKey, handlerResponse);

    // Update context history
    this.updateContextHistory(context);

    return handlerResponse;
  }

  private async enhanceContext(context: AIHandlerContext): Promise<ConversationContext> {
    const enhanced: ConversationContext = { ...context };

    // Add conversation topics from context tracker
    if (this.contextTracker && !context.conversationTopics) {
      enhanced.conversationTopics = this.contextTracker.getTopKeywords(5);
    }

    // Add fragment analysis insights
    if (this.fragmentProcessor && context.fragmentResult) {
      if (context.fragmentResult.type === 'AGGREGATED' && context.fragmentResult.summary) {
        // Add summary as context
        enhanced.conversationTopics = [
          ...(enhanced.conversationTopics || []),
          context.fragmentResult.summary
        ];
      }
    }

    // Enrich participant information
    if (enhanced.participants) {
      enhanced.participants = enhanced.participants.map(participant => ({
        ...participant,
        // Add any additional participant context here
      }));
    }

    return enhanced;
  }

  private selectResponseStrategy(context: AIHandlerContext): string {
    // Determine response strategy based on context
    if (context.urgency === 'high') {
      return 'quick_response';
    }

    if (context.responseType === 'detailed') {
      return 'detailed_analysis';
    }

    if (context.responseType === 'creative') {
      return 'creative_response';
    }

    if (context.responseType === 'analytical') {
      return 'analytical_response';
    }

    if (context.fragmentResult?.type === 'COMPLETE' && 
        context.fragmentResult.fragmentAnalysis?.type === 'question') {
      return 'direct_answer';
    }

    if (context.fragmentResult?.type === 'AGGREGATED') {
      return 'contextual_summary';
    }

    // Default strategy
    return 'balanced_response';
  }

  private optimizeRequestOptions(
    options: AIRequestOptions,
    strategy: string,
    context: AIHandlerContext
  ): AIRequestOptions {
    const optimized: AIRequestOptions = { ...options };

    switch (strategy) {
      case 'quick_response':
        optimized.maxTokens = Math.min(optimized.maxTokens || 150, 150);
        optimized.temperature = 0.3;
        optimized.priority = 'speed';
        break;

      case 'detailed_analysis':
        optimized.maxTokens = Math.max(optimized.maxTokens || 1024, 1024);
        optimized.temperature = 0.5;
        optimized.priority = 'quality';
        break;

      case 'creative_response':
        optimized.temperature = 0.9;
        optimized.priority = 'quality';
        break;

      case 'analytical_response':
        optimized.temperature = 0.2;
        optimized.priority = 'quality';
        break;

      case 'direct_answer':
        optimized.maxTokens = 300;
        optimized.temperature = 0.1;
        break;

      case 'contextual_summary':
        optimized.maxTokens = 500;
        optimized.temperature = 0.4;
        break;

      default:
        optimized.temperature = 0.7;
        optimized.maxTokens = 512;
        break;
    }

    // Apply constraints
    if (context.constraints) {
      if (context.constraints.maxCost) {
        optimized.costLimit = context.constraints.maxCost;
      }
      if (context.constraints.requiresAccuracy) {
        optimized.temperature = Math.min(optimized.temperature || 0.7, 0.3);
        optimized.fallbackEnabled = true;
      }
    }

    return optimized;
  }

  private async postProcessResponse(
    response: EnhancedAIResponse,
    context: AIHandlerContext,
    strategy: string
  ): Promise<AIHandlerResponse> {
    const handlerResponse: AIHandlerResponse = {
      ...response,
      responseStrategy: strategy,
      contextUsed: !!context.speakerHistory || !!context.conversationTopics,
    };

    // Generate follow-up suggestions based on response and context
    handlerResponse.recommendedFollowUp = this.generateFollowUpSuggestions(
      response.text,
      context,
      strategy
    );

    return handlerResponse;
  }

  private generateFollowUpSuggestions(
    responseText: string,
    context: AIHandlerContext,
    strategy: string
  ): string[] {
    const suggestions: string[] = [];

    // Strategy-based suggestions
    switch (strategy) {
      case 'quick_response':
        suggestions.push('Would you like me to elaborate on any part?');
        break;

      case 'detailed_analysis':
        suggestions.push('Should I focus on any specific aspect?');
        suggestions.push('Do you need additional examples?');
        break;

      case 'direct_answer':
        suggestions.push('Is there anything else you\'d like to know?');
        break;

      case 'contextual_summary':
        suggestions.push('Would you like me to clarify any points?');
        suggestions.push('Should I provide more details on specific topics?');
        break;
    }

    // Context-based suggestions
    if (context.fragmentResult?.type === 'AGGREGATED') {
      suggestions.push('Should I help organize these thoughts?');
    }

    if (context.conversationTopics && context.conversationTopics.length > 3) {
      suggestions.push('Would you like me to summarize the key points?');
    }

    // Limit suggestions
    return suggestions.slice(0, 3);
  }

  private generateCacheKey(prompt: string, model: AIModel, context: AIHandlerContext): string {
    const contextKey = JSON.stringify({
      currentSpeaker: context.currentSpeaker,
      meetingType: context.meetingType,
      topics: context.conversationTopics?.slice(0, 3), // Only cache based on top topics
      urgency: context.urgency,
      responseType: context.responseType,
    });
    
    return `${model}:${prompt.slice(0, 50)}:${contextKey}`.replace(/\s+/g, '_');
  }

  private getCachedResponse(cacheKey: string): AIHandlerResponse | null {
    const cached = this.responseCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  private cacheResponse(cacheKey: string, response: AIHandlerResponse): void {
    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });

    // Clean up old cache entries
    if (this.responseCache.size > 100) {
      const entries = Array.from(this.responseCache.entries());
      const sorted = entries.sort(([, a], [, b]) => b.timestamp - a.timestamp);
      this.responseCache.clear();
      sorted.slice(0, 50).forEach(([key, value]) => {
        this.responseCache.set(key, value);
      });
    }
  }

  private updateContextHistory(context: AIHandlerContext): void {
    const speakerId = context.currentSpeaker || 'unknown';
    if (!this.contextHistory.has(speakerId)) {
      this.contextHistory.set(speakerId, []);
    }

    const history = this.contextHistory.get(speakerId)!;
    history.push(context);

    // Keep only recent history
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
  }

  // Convenience methods for different response types
  async generateQuickResponse(
    prompt: string,
    context: AIHandlerContext
  ): Promise<AIHandlerResponse> {
    return this.generateAIResponse(prompt, 'gpt-4o-mini', {
      ...context,
      urgency: 'high',
      responseType: 'quick',
    });
  }

  async generateDetailedResponse(
    prompt: string,
    context: AIHandlerContext
  ): Promise<AIHandlerResponse> {
    return this.generateAIResponse(prompt, 'claude-3-5-opus', {
      ...context,
      responseType: 'detailed',
    });
  }

  async generateCreativeResponse(
    prompt: string,
    context: AIHandlerContext
  ): Promise<AIHandlerResponse> {
    return this.generateAIResponse(prompt, 'gpt-4o', {
      ...context,
      responseType: 'creative',
    });
  }

  async generateAnalyticalResponse(
    prompt: string,
    context: AIHandlerContext
  ): Promise<AIHandlerResponse> {
    return this.generateAIResponse(prompt, 'claude-3-5-sonnet', {
      ...context,
      responseType: 'analytical',
    });
  }

  // Utility methods
  clearCache(): void {
    this.responseCache.clear();
  }

  getStats(): {
    cacheSize: number;
    cacheHitRate: number;
    averageResponseTime: number;
  } {
    return {
      cacheSize: this.responseCache.size,
      cacheHitRate: 0, // Would need to track hits/misses
      averageResponseTime: 0, // Would need to track response times
    };
  }
}

// Factory function
export function createUnifiedAIHandler(
  aiService?: EnhancedAIService,
  contextTracker?: ContextTracker,
  fragmentProcessor?: FragmentProcessor
): UnifiedAIHandler {
  return new UnifiedAIHandler(
    aiService || new EnhancedAIService(),
    contextTracker,
    fragmentProcessor
  );
}

export const unifiedAIHandler = createUnifiedAIHandler();
