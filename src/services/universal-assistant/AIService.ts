import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { AIModel, AIResponse } from '@/types';
import { getModelConfig, estimateTokens } from '@/config/modelConfigs';
import { APICall } from '@/types/performance';

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  // Cost tracking removed

  constructor() {
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
    context?: string[],
    metadata?: { userId?: string; meetingId?: string }
  ): Promise<AIResponse & { cost?: number; costMetadata?: any }> {
    const startTime = Date.now();
    let responseText = '';
    let tokensUsed = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    let cost = 0;
    let costMetadata = null;

    try {
      // Estimate input tokens for cost tracking
      const fullPrompt = context ? [prompt, ...context].join('\n') : prompt;
      const estimatedInputTokens = estimateTokens(fullPrompt);

      if (model.startsWith('gpt-')) {
        const result = await this.generateOpenAIResponse(prompt, model, context);
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else if (model.startsWith('claude-')) {
        const result = await this.generateAnthropicResponse(prompt, model, context);
        responseText = result.text;
        tokensUsed = result.tokensUsed;
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      const latency = Date.now() - startTime;

      // Cost tracking removed
      cost = 0;
      costMetadata = {
        tracked: false,
        note: 'Cost tracking disabled',
      };

      return {
        text: responseText,
        model,
        tokensUsed: tokensUsed.totalTokens,
        latency,
        timestamp: new Date(),
        cost,
        costMetadata,
      };
    } catch (error) {
      console.error('AI generation error:', error);
      throw error;
    }
  }

  private async generateOpenAIResponse(
    prompt: string,
    model: string,
    context?: string[]
  ): Promise<{ text: string; tokensUsed: { inputTokens: number; outputTokens: number; totalTokens: number } }> {
    if (!this.openai) throw new Error('OpenAI not initialized');
    
    const messages = [
      { role: 'system' as const, content: 'You are a helpful meeting assistant.' },
      ...(context?.map(c => ({ role: 'assistant' as const, content: c })) || []),
      { role: 'user' as const, content: prompt },
    ];

    const completion = await this.openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    
    return {
      text: completion.choices[0]?.message?.content || '',
      tokensUsed: {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
    };
  }

  private async generateAnthropicResponse(
    prompt: string,
    model: string,
    context?: string[]
  ): Promise<{ text: string; tokensUsed: { inputTokens: number; outputTokens: number; totalTokens: number } }> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');
    
    const message = await this.anthropic.messages.create({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const usage = message.usage || { input_tokens: 0, output_tokens: 0 };
    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';
    
    return {
      text,
      tokensUsed: {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
    };
  }

  // Cost tracking methods removed

}