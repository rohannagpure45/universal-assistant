import { AIModel } from '@/types';

export interface ModelConfig {
  provider: 'openai' | 'anthropic';
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
    fallbackModels: ['gpt-4o-mini', 'gpt-4-turbo'],
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
    fallbackModels: ['gpt-4-turbo'],
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

  'gpt-4-turbo': {
    provider: 'openai',
    maxTokens: 4096,
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
      codeExecution: false,
      maxContextLength: 128000,
    },
    rateLimit: {
      requestsPerMinute: 500,
      tokensPerMinute: 30000,
    },
    systemPrompt: 'You are GPT-4 Turbo, an advanced AI assistant with enhanced capabilities for complex meeting scenarios.',
    fallbackModels: ['gpt-4o', 'gpt-4o-mini'],
  },

  'claude-3-haiku': {
    provider: 'anthropic',
    maxTokens: 2048,
    temperature: 0.7,
    endpoint: '/api/anthropic/messages',
    pricing: {
      inputTokenCost: 0.00025,
      outputTokenCost: 0.00125,
    },
    capabilities: {
      streaming: true,
      functionCalling: false,
      vision: false,
      codeExecution: false,
      maxContextLength: 200000,
    },
    rateLimit: {
      requestsPerMinute: 1000,
      tokensPerMinute: 50000,
    },
    systemPrompt: 'You are Claude 3 Haiku, a fast and efficient AI assistant optimized for quick responses.',
    fallbackModels: ['claude-3-5-sonnet'],
  },

  'claude-3-opus': {
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
    systemPrompt: 'You are Claude 3 Opus, the most capable AI assistant with superior reasoning abilities for complex analysis.',
    fallbackModels: ['claude-3-5-sonnet', 'claude-3-haiku'],
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

// Model validation
export function isValidModel(model: string): model is AIModel {
  return Object.keys(modelConfigs).includes(model as AIModel);
}

export function validateModelRequest(model: string): { valid: boolean; message?: string } {
  if (!isValidModel(model)) {
    const validModels = Object.keys(modelConfigs).join(', ');
    return {
      valid: false,
      message: `Invalid model '${model}'. Valid models are: ${validModels}`
    };
  }
  
  const config = modelConfigs[model as AIModel];
  
  // Check if provider is properly configured
  if (config.provider === 'openai' && !process.env.OPENAI_API_KEY) {
    return {
      valid: false,
      message: `OpenAI API key not configured for model '${model}'`
    };
  }
  
  if (config.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
    return {
      valid: false,
      message: `Anthropic API key not configured for model '${model}'`
    };
  }
  
  return { valid: true };
}

export function getAvailableModels(): AIModel[] {
  return Object.keys(modelConfigs).filter(model => {
    const config = modelConfigs[model as AIModel];
    if (config.provider === 'openai' && !process.env.OPENAI_API_KEY) return false;
    if (config.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) return false;
    return true;
  }) as AIModel[];
}

export function getModelWithFallback(preferredModel: AIModel, requirements?: {
  maxLatency?: number;
  maxCost?: number;
  needsVision?: boolean;
  needsFunctionCalling?: boolean;
}): AIModel {
  const validation = validateModelRequest(preferredModel);
  if (validation.valid) {
    return preferredModel;
  }
  
  // Try fallback models from the preferred model's configuration
  const config = modelConfigs[preferredModel];
  if (config?.fallbackModels) {
    for (const fallback of config.fallbackModels) {
      const fallbackValidation = validateModelRequest(fallback);
      if (fallbackValidation.valid) {
        console.log(`Using fallback model '${fallback}' instead of '${preferredModel}': ${validation.message}`);
        return fallback;
      }
    }
  }
  
  // If no fallbacks work, select optimal model based on requirements
  try {
    return selectOptimalModel(requirements || {});
  } catch {
    // Last resort: return the first available model
    const availableModels = getAvailableModels();
    if (availableModels.length > 0) {
      console.warn(`Using fallback model '${availableModels[0]}' as last resort`);
      return availableModels[0];
    }
    
    throw new Error('No AI models are available. Please check your API key configuration.');
  }
}

// Model recommendation based on use case
export function recommendModel(useCase: 'quick_response' | 'detailed_analysis' | 'creative' | 'technical' | 'cost_efficient'): AIModel {
  switch (useCase) {
    case 'quick_response':
      return 'claude-3-haiku';
    case 'detailed_analysis':
      return 'claude-3-opus';
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
