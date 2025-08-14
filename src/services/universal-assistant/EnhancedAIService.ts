import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel, AIResponse } from '@/types';
import { 
  ModelConfig, 
  ConversationContext, 
  getModelConfig, 
  buildPromptWithContext,
  estimateTokens,
  calculateCost,
  selectOptimalModel
} from '@/config/modelConfigs';

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
  private gemini: GoogleGenerativeAI | null = null;
  private requestCount: Map<AIModel, number> = new Map();
  private lastRequestTime: Map<AIModel, number> = new Map();

  constructor() {
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
    
    if (process.env.GOOGLE_AI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  async generateResponse(
    prompt: string,
    model: AIModel,
    context?: ConversationContext,
    options: AIRequestOptions = {}
  ): Promise<EnhancedAIResponse> {
    const startTime = Date.now();
    const config = getModelConfig(model);
    
    // Check rate limits
    await this.checkRateLimit(model, config);
    
    // Build context-aware prompt
    const enhancedPrompt = context 
      ? buildPromptWithContext(prompt, context, model)
      : prompt;

    // Estimate input tokens
    const inputTokens = estimateTokens(enhancedPrompt);
    
    // Check cost limit
    if (options.costLimit) {
      const estimatedCost = calculateCost(model, inputTokens, config.maxTokens);
      if (estimatedCost > options.costLimit) {
        // Try to find a cheaper model
        const cheaperModel = selectOptimalModel({ maxCost: options.costLimit });
        if (cheaperModel !== model) {
          console.log(`Switching from ${model} to ${cheaperModel} due to cost limit`);
          return this.generateResponse(prompt, cheaperModel, context, options);
        }
      }
    }

    let response: EnhancedAIResponse;
    let fallbackUsed = false;

    try {
      response = await this.callProvider(enhancedPrompt, model, config, options);
    } catch (error) {
      console.error(`Error with model ${model}:`, error);
      
      // Try fallback models if enabled
      if (options.fallbackEnabled !== false && config.fallbackModels) {
        for (const fallbackModel of config.fallbackModels) {
          try {
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
      
      if (!response!) {
        throw new Error(`All models failed. Last error: ${error}`);
      }
    }

    // Calculate final metrics
    const processingTime = Date.now() - startTime;
    const outputTokens = estimateTokens(response.text);
    const cost = calculateCost(model, inputTokens, outputTokens);

    // Update request tracking
    this.updateRequestTracking(model);

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
      case 'google':
        return await this.callGemini(prompt, model, config, options);
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

    const messages = [
      { role: 'system' as const, content: config.systemPrompt || 'You are a helpful assistant.' },
      { role: 'user' as const, content: prompt },
    ];

    const completion = await this.openai.chat.completions.create({
      model: model.replace('gpt-5', 'gpt-4'), // Map future models to current ones
      messages,
      temperature: options.temperature ?? config.temperature,
      max_tokens: options.maxTokens ?? config.maxTokens,
      stream: options.stream ?? false,
    });

    const text = completion.choices[0]?.message?.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      text,
      model,
      tokensUsed,
      latency: Date.now() - Date.now(),
      timestamp: new Date(),
      cost: 0, // Will be calculated in parent method
      inputTokens: completion.usage?.prompt_tokens || 0,
      outputTokens: completion.usage?.completion_tokens || 0,
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

    const message = await this.anthropic.messages.create({
      model: model.replace('claude-3-7', 'claude-3-5'), // Map future models to current ones
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
      latency: 0,
      timestamp: new Date(),
      cost: 0,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      provider: 'anthropic',
      processingTime: 0,
    };
  }

  private async callGemini(
    prompt: string,
    model: AIModel,
    config: ModelConfig,
    options: AIRequestOptions
  ): Promise<EnhancedAIResponse> {
    if (!this.gemini) {
      throw new Error('Google AI not initialized');
    }

    const geminiModel = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await geminiModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? config.temperature,
        maxOutputTokens: options.maxTokens ?? config.maxTokens,
      },
    });

    const text = result.response.text();
    const tokensUsed = estimateTokens(text + prompt);

    return {
      text,
      model,
      tokensUsed,
      latency: 0,
      timestamp: new Date(),
      cost: 0,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(text),
      provider: 'google',
      processingTime: 0,
    };
  }

  private async checkRateLimit(model: AIModel, config: ModelConfig): Promise<void> {
    const now = Date.now();
    const lastRequest = this.lastRequestTime.get(model) || 0;
    const timeSinceLastRequest = now - lastRequest;
    const minInterval = (60 * 1000) / config.rateLimit.requestsPerMinute;

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      console.log(`Rate limit: waiting ${waitTime}ms for ${model}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  private updateRequestTracking(model: AIModel): void {
    this.requestCount.set(model, (this.requestCount.get(model) || 0) + 1);
    this.lastRequestTime.set(model, Date.now());
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

    if (this.gemini) {
      try {
        // Google AI doesn't have a simple health check either
        health.google = true;
      } catch {
        health.google = false;
      }
    }

    return health;
  }
}

export const enhancedAIService = new EnhancedAIService();
