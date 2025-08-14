import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel, AIResponse } from '@/types';

export class AIService {
  private openai: OpenAI | null = null;
  private anthropic: Anthropic | null = null;
  private gemini: GoogleGenerativeAI | null = null;

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
    
    if (process.env.GOOGLE_AI_API_KEY) {
      this.gemini = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  async generateResponse(
    prompt: string,
    model: AIModel,
    context?: string[]
  ): Promise<AIResponse> {
    const startTime = Date.now();
    let responseText = '';
    let tokensUsed = 0;

    try {
      if (model.startsWith('gpt-')) {
        responseText = await this.generateOpenAIResponse(prompt, model, context);
      } else if (model.startsWith('claude-')) {
        responseText = await this.generateAnthropicResponse(prompt, model, context);
      } else {
        throw new Error(`Unsupported model: ${model}`);
      }

      return {
        text: responseText,
        model,
        tokensUsed,
        latency: Date.now() - startTime,
        timestamp: new Date(),
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
  ): Promise<string> {
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

    return completion.choices[0]?.message?.content || '';
  }

  private async generateAnthropicResponse(
    prompt: string,
    model: string,
    context?: string[]
  ): Promise<string> {
    if (!this.anthropic) throw new Error('Anthropic not initialized');
    
    const message = await this.anthropic.messages.create({
      model,
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : '';
  }

}