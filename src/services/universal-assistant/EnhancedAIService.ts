import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIModel, AIResponse } from '@/types';
import { 
  ModelConfig, 
  ConversationContext, 
  getModelConfig, 
  buildPromptWithContext,
  estimateTokens,
  calculateCost,
  selectOptimalModel,
  validateModelRequest,
  getModelWithFallback,
  isValidModel
} from '@/config/modelConfigs';
import { getModelAPIService, ModelAPIService } from '@/services/ai/ModelAPIService';
import { 
  getAIProviderRateLimitingService, 
  AIProviderRateLimitingService 
} from '@/services/ai/rate-limiting/AIProviderRateLimitingService';

export interface AIRequestOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  fallbackEnabled?: boolean;
  costLimit?: number;
  priority?: 'speed' | 'quality' | 'cost';
}

export interface EnhancedAIResponse extends AIResponse {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  provider: string;
  fallbackUsed?: boolean;
  processingTime: number;
}

export class EnhancedAIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private requestCount: Map<AIModel, number> = new Map();
  private lastRequestTime: Map<AIModel, number> = new Map();
  private modelAPIService: ModelAPIService;
  private rateLimitingService: AIProviderRateLimitingService;

  constructor(
    modelAPIService?: ModelAPIService, 
    rateLimitingService?: AIProviderRateLimitingService
  ) {
    this.modelAPIService = modelAPIService || getModelAPIService();
    this.rateLimitingService = rateLimitingService || getAIProviderRateLimitingService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  async generateResponse(
    prompt: string,
    model: AIModel,
    context?: ConversationContext,
    options: AIRequestOptions = {}
  ): Promise<EnhancedAIResponse> {
    const startTime = Date.now();
    
    // Validate and get working model with fallback
    const workingModel = getModelWithFallback(model, {
      needsVision: options.priority === 'quality',
      needsFunctionCalling: true,
      maxCost: options.costLimit
    });
    
    const config = getModelConfig(workingModel);
    
    // Check rate limits with token estimation
    const fullPrompt = context ? buildPromptWithContext(prompt, context, workingModel) : prompt;
    await this.checkRateLimit(workingModel, config, fullPrompt);
    
    // Build context-aware prompt
    const enhancedPrompt = context 
      ? buildPromptWithContext(prompt, context, workingModel)
      : prompt;

    // Estimate input tokens
    const inputTokens = estimateTokens(enhancedPrompt);
    
    // Check cost limit
    if (options.costLimit) {
      const estimatedCost = calculateCost(workingModel, inputTokens, config.maxTokens);
      if (estimatedCost > options.costLimit) {
        // Try to find a cheaper model
        const cheaperModel = selectOptimalModel({ maxCost: options.costLimit });
        if (cheaperModel !== workingModel) {
          console.log(`Switching from ${workingModel} to ${cheaperModel} due to cost limit`);
          return this.generateResponse(prompt, cheaperModel, context, options);
        }
      }
    }

    let response: EnhancedAIResponse | undefined;
    let fallbackUsed = false;

    try {
      response = await this.callProvider(enhancedPrompt, workingModel, config, options);
      
      // Log if we used a fallback model
      if (workingModel !== model) {
        fallbackUsed = true;
        console.log(`Successfully used fallback model '${workingModel}' instead of '${model}'`);
      }
    } catch (error) {
      console.error(`Error with model ${workingModel}:`, error);
      
      // Try fallback models if enabled
      if (options.fallbackEnabled !== false && config.fallbackModels) {
        for (const fallbackModel of config.fallbackModels) {
          try {
            const fallbackValidation = validateModelRequest(fallbackModel);
            if (!fallbackValidation.valid) {
              console.warn(`Skipping invalid fallback model '${fallbackModel}': ${fallbackValidation.message}`);
              continue;
            }
            
            console.log(`Trying fallback model: ${fallbackModel}`);
            response = await this.callProvider(enhancedPrompt, fallbackModel, getModelConfig(fallbackModel), options);
            fallbackUsed = true;
            break;
          } catch (fallbackError) {
            console.error(`Fallback model ${fallbackModel} also failed:`, fallbackError);
            continue;
          }
        }
      }
      
      if (!response) {
        throw new Error(`All models failed. Last error: ${error}. Original model: ${model}, Working model: ${workingModel}`);
      }
    }

    // Calculate final metrics
    const processingTime = Date.now() - startTime;
    const outputTokens = estimateTokens(response.text);
    const cost = calculateCost(workingModel, inputTokens, outputTokens);

    // Update request tracking
    this.updateRequestTracking(workingModel);

    return {
      ...response,
      cost,
      inputTokens,
      outputTokens,
      fallbackUsed,
      processingTime,
    };
  }

  private async callProvider(
    prompt: string,
    model: AIModel,
    config: ModelConfig,
    options: AIRequestOptions
  ): Promise<EnhancedAIResponse> {
    const startTime = Date.now();
    
    switch (config.provider) {
      case 'openai':
        return await this.callOpenAI(prompt, model, config, options);
      case 'anthropic':
        return await this.callAnthropic(prompt, model, config, options);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
  }

  private async callOpenAI(
    prompt: string,
    model: AIModel,
    config: ModelConfig,
    options: AIRequestOptions
  ): Promise<EnhancedAIResponse> {
    if (!this.openai) {
      throw new Error('OpenAI not initialized');
    }

    const startTime = Date.now();
    const messages = [
      { role: 'system' as const, content: config.systemPrompt || 'You are a helpful assistant.' },
      { role: 'user' as const, content: prompt },
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.mapToActualModel(model),
      messages,
      temperature: options.temperature ?? config.temperature,
      max_tokens: options.maxTokens ?? config.maxTokens,
      stream: options.stream ?? false,
    });

    const text = 'choices' in completion ? completion.choices[0]?.message?.content || '' : '';
    const tokensUsed = 'usage' in completion ? completion.usage?.total_tokens || 0 : 0;

    return {
      text,
      model,
      tokensUsed,
      latency: Date.now() - startTime,
      timestamp: new Date(),
      cost: 0, // Will be calculated in parent method
      inputTokens: 'usage' in completion ? completion.usage?.prompt_tokens || 0 : 0,
      outputTokens: 'usage' in completion ? completion.usage?.completion_tokens || 0 : 0,
      provider: 'openai',
      processingTime: 0, // Will be set in parent method
    };
  }

  private async callAnthropic(
    prompt: string,
    model: AIModel,
    config: ModelConfig,
    options: AIRequestOptions
  ): Promise<EnhancedAIResponse> {
    if (!this.anthropic) {
      throw new Error('Anthropic not initialized');
    }

    const startTime = Date.now();
    const message = await this.anthropic.messages.create({
      model: this.mapToActualModel(model),
      max_tokens: options.maxTokens ?? config.maxTokens,
      temperature: options.temperature ?? config.temperature,
      system: config.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      text,
      model,
      tokensUsed,
      latency: Date.now() - startTime,
      timestamp: new Date(),
      cost: 0,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      provider: 'anthropic',
      processingTime: 0,
    };
  }


  private async checkRateLimit(model: AIModel, config: ModelConfig, prompt?: string): Promise<void> {
    // Determine the provider for this model
    const provider = model.startsWith('gpt-') ? 'openai' : 'anthropic';
    
    // Estimate tokens for rate limiting
    const estimatedTokens = prompt ? estimateTokens(prompt) : 1000;
    
    try {
      await this.rateLimitingService.checkProviderLimit(provider, model, estimatedTokens);
    } catch (error) {
      console.error(`[EnhancedAIService] Rate limit check failed for ${provider}/${model}:`, error);
      throw error;
    }
  }

  private updateRequestTracking(model: AIModel): void {
    this.requestCount.set(model, (this.requestCount.get(model) || 0) + 1);
    this.lastRequestTime.set(model, Date.now());
  }

  private mapToActualModel(model: AIModel): string {
    try {
      return this.modelAPIService.getAPIModelName(model);
    } catch (error) {
      console.error(`[EnhancedAIService] Failed to get API model name for ${model}:`, error);
      throw error;
    }
  }

  // Utility methods
  async generateQuickResponse(
    prompt: string,
    context?: ConversationContext
  ): Promise<EnhancedAIResponse> {
    const model = selectOptimalModel({ maxLatency: 2000 });
    return this.generateResponse(prompt, model, context, { 
      priority: 'speed',
      maxTokens: 150,
      fallbackEnabled: true 
    });
  }

  async generateDetailedResponse(
    prompt: string,
    context?: ConversationContext
  ): Promise<EnhancedAIResponse> {
    return this.generateResponse(prompt, 'claude-3-5-opus', context, {
      priority: 'quality',
      maxTokens: 2048,
      fallbackEnabled: true
    });
  }

  async generateCostEfficientResponse(
    prompt: string,
    context?: ConversationContext
  ): Promise<EnhancedAIResponse> {
    const model = selectOptimalModel({});
    return this.generateResponse(prompt, model, context, {
      priority: 'cost',
      costLimit: 0.01,
      fallbackEnabled: true
    });
  }

  // Analytics and monitoring
  getUsageStats(): {
    totalRequests: number;
    requestsByModel: Record<AIModel, number>;
    averageLatency: number;
    totalCost: number;
  } {
    const totalRequests = Array.from(this.requestCount.values()).reduce((sum, count) => sum + count, 0);
    const requestsByModel = Object.fromEntries(this.requestCount.entries()) as Record<AIModel, number>;

    return {
      totalRequests,
      requestsByModel,
      averageLatency: 0, // Would need to track this
      totalCost: 0, // Would need to track this
    };
  }

  resetStats(): void {
    this.requestCount.clear();
    this.lastRequestTime.clear();
  }

  // Health check
  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    if (this.openai) {
      try {
        await this.openai.models.list();
        health.openai = true;
      } catch {
        health.openai = false;
      }
    }

    if (this.anthropic) {
      try {
        // Anthropic doesn't have a simple health check, so we'll assume it's healthy if initialized
        health.anthropic = true;
      } catch {
        health.anthropic = false;
      }
    }

    return health;
  }

  // Cleanup and management methods
  public destroy(): void {
    // Clean up rate limiting service
    this.rateLimitingService.destroy();
    
    // Clear tracking maps
    this.requestCount.clear();
    this.lastRequestTime.clear();
  }

  public getProviderStatus(): Record<string, any> {
    return {
      openai: this.rateLimitingService.getProviderStatus('openai'),
      anthropic: this.rateLimitingService.getProviderStatus('anthropic')
    };
  }

  public async resetProviderLimits(provider: 'openai' | 'anthropic'): Promise<void> {
    await this.rateLimitingService.resetProvider(provider);
  }
}

export const enhancedAIService = new EnhancedAIService();
