import { AIModel } from '@/types';

export interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google';
  maxTokens: number;
  temperature: number;
  endpoint: string;
  pricing: {
    inputTokenCost: number;  // Cost per 1K input tokens in USD
    outputTokenCost: number; // Cost per 1K output tokens in USD
  };
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    vision: boolean;
    codeExecution: boolean;
    maxContextLength: number;
  };
  rateLimit: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  systemPrompt?: string;
  fallbackModels?: AIModel[];
}

export interface ConversationContext {
  speakerHistory: Map<string, string[]>;
  meetingType?: string;
  currentSpeaker?: string;
  conversationTopics?: string[];
  timeContext?: {
    startTime: Date;
    duration: number;
  };
  participants?: Array<{
    id: string;
    name?: string;
    role?: string;
  }>;
}

// Enhanced model configurations
export const modelConfigs: Record<AIModel, ModelConfig> = {
  'gpt-4o': {
    provider: 'openai',
    maxTokens: 4096,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.005,
      outputTokenCost: 0.015,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: false,
      maxContextLength: 128000,
    },
    rateLimit: {
      requestsPerMinute: 500,
      tokensPerMinute: 30000,
    },
    systemPrompt: 'You are an intelligent meeting assistant. Provide helpful, concise responses based on the conversation context.',
    fallbackModels: ['gpt-4o-mini', 'gpt-5-mini'],
  },

  'gpt-4o-mini': {
    provider: 'openai',
    maxTokens: 2048,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.00015,
      outputTokenCost: 0.0006,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      codeExecution: false,
      maxContextLength: 128000,
    },
    rateLimit: {
      requestsPerMinute: 1000,
      tokensPerMinute: 50000,
    },
    systemPrompt: 'You are a helpful meeting assistant. Be concise and relevant to the conversation.',
    fallbackModels: ['gpt-5-mini'],
  },

  'claude-3-5-sonnet': {
    provider: 'anthropic',
    maxTokens: 4096,
    temperature: 0.7,
    endpoint: '/api/anthropic/messages',
    pricing: {
      inputTokenCost: 0.003,
      outputTokenCost: 0.015,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: false,
      maxContextLength: 200000,
    },
    rateLimit: {
      requestsPerMinute: 300,
      tokensPerMinute: 40000,
    },
    systemPrompt: 'You are Claude, an AI assistant specialized in meeting facilitation and conversation analysis.',
    fallbackModels: ['claude-3-5-opus'],
  },

  'claude-3-5-opus': {
    provider: 'anthropic',
    maxTokens: 4096,
    temperature: 0.7,
    endpoint: '/api/anthropic/messages',
    pricing: {
      inputTokenCost: 0.015,
      outputTokenCost: 0.075,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: false,
      maxContextLength: 200000,
    },
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 20000,
    },
    systemPrompt: 'You are Claude, a highly capable AI assistant with advanced reasoning abilities for complex meeting scenarios.',
    fallbackModels: ['claude-3-5-sonnet'],
  },

  'claude-3-7-sonnet': {
    provider: 'anthropic',
    maxTokens: 4096,
    temperature: 0.7,
    endpoint: '/api/anthropic/messages',
    pricing: {
      inputTokenCost: 0.003,
      outputTokenCost: 0.015,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: true,
      maxContextLength: 200000,
    },
    rateLimit: {
      requestsPerMinute: 300,
      tokensPerMinute: 40000,
    },
    systemPrompt: 'You are Claude, an advanced AI assistant with code execution capabilities for technical meetings.',
    fallbackModels: ['claude-3-5-sonnet'],
  },

  'claude-3-7-opus': {
    provider: 'anthropic',
    maxTokens: 4096,
    temperature: 0.7,
    endpoint: '/api/anthropic/messages',
    pricing: {
      inputTokenCost: 0.015,
      outputTokenCost: 0.075,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: true,
      maxContextLength: 200000,
    },
    rateLimit: {
      requestsPerMinute: 100,
      tokensPerMinute: 20000,
    },
    systemPrompt: 'You are Claude, the most advanced AI assistant with superior reasoning and code execution for complex technical discussions.',
    fallbackModels: ['claude-3-7-sonnet', 'claude-3-5-opus'],
  },

  'gpt-5-mini': {
    provider: 'openai',
    maxTokens: 2048,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.0001,
      outputTokenCost: 0.0004,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: false,
      codeExecution: false,
      maxContextLength: 256000,
    },
    rateLimit: {
      requestsPerMinute: 2000,
      tokensPerMinute: 100000,
    },
    systemPrompt: 'You are GPT-5 Mini, an efficient meeting assistant optimized for quick, accurate responses.',
    fallbackModels: ['gpt-4o-mini'],
  },

  'gpt-5-nano': {
    provider: 'openai',
    maxTokens: 1024,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.00005,
      outputTokenCost: 0.0002,
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      codeExecution: false,
      maxContextLength: 128000,
    },
    rateLimit: {
      requestsPerMinute: 5000,
      tokensPerMinute: 200000,
    },
    systemPrompt: 'You are GPT-5 Nano, a fast and efficient assistant for brief meeting interactions.',
    fallbackModels: ['gpt-5-mini', 'gpt-4o-mini'],
  },

  'gpt-5': {
    provider: 'openai',
    maxTokens: 8192,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.01,
      outputTokenCost: 0.03,
    },
    capabilities: {
      streaming: true,
      functionCalling: true,
      vision: true,
      codeExecution: true,
      maxContextLength: 1000000,
    },
    rateLimit: {
      requestsPerMinute: 200,
      tokensPerMinute: 20000,
    },
    systemPrompt: 'You are GPT-5, the most advanced AI assistant with superior reasoning capabilities for complex meeting scenarios.',
    fallbackModels: ['gpt-4o', 'claude-3-5-opus'],
  },

  'gpt-4.1-nano': {
    provider: 'openai',
    maxTokens: 1024,
    temperature: 0.7,
    endpoint: '/api/openai/chat',
    pricing: {
      inputTokenCost: 0.0001,
      outputTokenCost: 0.0003,
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      codeExecution: false,
      maxContextLength: 64000,
    },
    rateLimit: {
      requestsPerMinute: 3000,
      tokensPerMinute: 150000,
    },
    systemPrompt: 'You are GPT-4.1 Nano, optimized for quick responses in meeting contexts.',
    fallbackModels: ['gpt-4o-mini', 'gpt-5-nano'],
  },
};

// Utility functions for model selection
export function getModelConfig(model: AIModel): ModelConfig {
  const config = modelConfigs[model];
  if (!config) {
    throw new Error(`Unknown model: ${model}`);
  }
  return config;
}

export function selectOptimalModel(
  requirements: {
    maxLatency?: number;
    maxCost?: number;
    needsVision?: boolean;
    needsFunctionCalling?: boolean;
    needsCodeExecution?: boolean;
    contextLength?: number;
  }
): AIModel {
  const availableModels = Object.entries(modelConfigs) as [AIModel, ModelConfig][];
  
  // Filter by requirements
  const suitableModels = availableModels.filter(([model, config]) => {
    if (requirements.needsVision && !config.capabilities.vision) return false;
    if (requirements.needsFunctionCalling && !config.capabilities.functionCalling) return false;
    if (requirements.needsCodeExecution && !config.capabilities.codeExecution) return false;
    if (requirements.contextLength && config.capabilities.maxContextLength < requirements.contextLength) return false;
    return true;
  });

  if (suitableModels.length === 0) {
    throw new Error('No models meet the specified requirements');
  }

  // Sort by cost efficiency (lower cost per token)
  const sortedModels = suitableModels.sort(([, a], [, b]) => {
    const costA = a.pricing.inputTokenCost + a.pricing.outputTokenCost;
    const costB = b.pricing.inputTokenCost + b.pricing.outputTokenCost;
    return costA - costB;
  });

  return sortedModels[0][0];
}

export function buildPromptWithContext(
  prompt: string,
  context: ConversationContext,
  model: AIModel
): string {
  const config = getModelConfig(model);
  let enhancedPrompt = '';

  // Add system context
  if (config.systemPrompt) {
    enhancedPrompt += `${config.systemPrompt}\n\n`;
  }

  // Add conversation context
  if (context.meetingType) {
    enhancedPrompt += `Meeting Type: ${context.meetingType}\n`;
  }

  if (context.participants && context.participants.length > 0) {
    enhancedPrompt += `Participants: ${context.participants.map(p => p.name || p.id).join(', ')}\n`;
  }

  if (context.currentSpeaker) {
    enhancedPrompt += `Current Speaker: ${context.currentSpeaker}\n`;
  }

  if (context.conversationTopics && context.conversationTopics.length > 0) {
    enhancedPrompt += `Discussion Topics: ${context.conversationTopics.join(', ')}\n`;
  }

  if (context.timeContext) {
    const duration = Math.round(context.timeContext.duration / 60000); // Convert to minutes
    enhancedPrompt += `Meeting Duration: ${duration} minutes\n`;
  }

  // Add recent conversation history
  if (context.speakerHistory && context.speakerHistory.size > 0) {
    enhancedPrompt += '\nRecent Conversation:\n';
    const recentMessages: Array<{ speaker: string; message: string }> = [];
    
    context.speakerHistory.forEach((messages, speaker) => {
      messages.slice(-2).forEach(message => {
        recentMessages.push({ speaker, message });
      });
    });

    // Sort by chronological order (this is simplified - in practice you'd want timestamps)
    recentMessages.slice(-6).forEach(({ speaker, message }) => {
      enhancedPrompt += `${speaker}: ${message}\n`;
    });
  }

  enhancedPrompt += `\nUser Query: ${prompt}\n\nPlease provide a helpful response based on the conversation context above.`;

  return enhancedPrompt;
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const config = getModelConfig(model);
  const inputCost = (inputTokens / 1000) * config.pricing.inputTokenCost;
  const outputCost = (outputTokens / 1000) * config.pricing.outputTokenCost;
  return inputCost + outputCost;
}

// Model recommendation based on use case
export function recommendModel(useCase: 'quick_response' | 'detailed_analysis' | 'creative' | 'technical' | 'cost_efficient'): AIModel {
  switch (useCase) {
    case 'quick_response':
      return 'gpt-5-nano';
    case 'detailed_analysis':
      return 'claude-3-5-opus';
    case 'creative':
      return 'gpt-4o';
    case 'technical':
      return 'claude-3-7-opus';
    case 'cost_efficient':
      return 'gpt-4o-mini';
    default:
      return 'gpt-4o-mini';
  }
}
