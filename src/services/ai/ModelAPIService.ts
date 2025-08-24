import { AIModel } from '@/types';
import { ModelMappingError } from '@/domain/validation/ValidationResult';

export interface APIModelMapping {
  modelId: AIModel;
  apiModelName: string;
  provider: 'openai' | 'anthropic';
  deprecated?: boolean;
  replacedBy?: AIModel;
  validationPattern?: RegExp;
}

export interface ModelAPIService {
  getAPIModelName(model: AIModel): string;
  validateAPIModel(apiModelName: string, provider: string): boolean;
  getMappingVersion(): string;
  isModelDeprecated(model: AIModel): boolean;
  getReplacementModel(model: AIModel): AIModel | undefined;
}

export class ProductionModelAPIService implements ModelAPIService {
  private readonly mappings: Map<AIModel, APIModelMapping> = new Map([
    // OpenAI Models
    ['gpt-4o', {
      modelId: 'gpt-4o',
      apiModelName: 'gpt-4o',
      provider: 'openai',
      validationPattern: /^gpt-4o$/
    }],
    ['gpt-4o-mini', {
      modelId: 'gpt-4o-mini',
      apiModelName: 'gpt-4o-mini',
      provider: 'openai',
      validationPattern: /^gpt-4o-mini$/
    }],
    ['gpt-4-turbo', {
      modelId: 'gpt-4-turbo',
      apiModelName: 'gpt-4-turbo-preview',
      provider: 'openai',
      validationPattern: /^gpt-4-turbo(-preview)?$/
    }],
    
    // Anthropic Models - Current
    ['claude-3-5-sonnet', {
      modelId: 'claude-3-5-sonnet',
      apiModelName: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      validationPattern: /^claude-3-5-sonnet-\d{8}$/
    }],
    ['claude-3-haiku', {
      modelId: 'claude-3-haiku',
      apiModelName: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      validationPattern: /^claude-3-haiku-\d{8}$/
    }],
    ['claude-3-opus', {
      modelId: 'claude-3-opus',
      apiModelName: 'claude-3-opus-20240229',
      provider: 'anthropic',
      validationPattern: /^claude-3-opus-\d{8}$/
    }],
    
    // Anthropic Models - Deprecated/Legacy
    ['claude-3-5-opus', {
      modelId: 'claude-3-5-opus',
      apiModelName: 'claude-3-opus-20240229', // Map to available model
      provider: 'anthropic',
      deprecated: true,
      replacedBy: 'claude-3-opus',
      validationPattern: /^claude-3-opus-\d{8}$/
    }],
    ['claude-3-7-sonnet', {
      modelId: 'claude-3-7-sonnet',
      apiModelName: 'claude-3-5-sonnet-20241022', // Map to available model
      provider: 'anthropic',
      deprecated: true,
      replacedBy: 'claude-3-5-sonnet',
      validationPattern: /^claude-3-5-sonnet-\d{8}$/
    }],
    ['claude-3-7-opus', {
      modelId: 'claude-3-7-opus',
      apiModelName: 'claude-3-opus-20240229', // Map to available model
      provider: 'anthropic',
      deprecated: true,
      replacedBy: 'claude-3-opus',
      validationPattern: /^claude-3-opus-\d{8}$/
    }]
  ]);

  private readonly version = '1.0.0';

  getAPIModelName(model: AIModel): string {
    const mapping = this.mappings.get(model);
    if (!mapping) {
      throw new ModelMappingError(`No API mapping for model: ${model}`, model);
    }
    
    if (mapping.deprecated) {
      this.logDeprecationWarning(model, mapping.replacedBy);
    }
    
    // Validate the API model name before returning
    if (!this.validateAPIModel(mapping.apiModelName, mapping.provider)) {
      throw new ModelMappingError(
        `Invalid API model name for ${model}: ${mapping.apiModelName}`,
        model
      );
    }
    
    return mapping.apiModelName;
  }

  validateAPIModel(apiModelName: string, provider: string): boolean {
    for (const [_, mapping] of this.mappings) {
      if (mapping.provider === provider && 
          mapping.validationPattern?.test(apiModelName)) {
        return true;
      }
    }
    
    // Additional validation patterns for known providers
    const providerPatterns: Record<string, RegExp[]> = {
      'openai': [
        /^gpt-[0-9a-z-]+$/,
        /^text-[a-z-]+$/
      ],
      'anthropic': [
        /^claude-[0-9a-z-]+-\d{8}$/,
        /^claude-[0-9a-z-]+$/
      ]
    };
    
    const patterns = providerPatterns[provider];
    if (patterns) {
      return patterns.some(pattern => pattern.test(apiModelName));
    }
    
    return false;
  }

  getMappingVersion(): string {
    return this.version;
  }

  isModelDeprecated(model: AIModel): boolean {
    const mapping = this.mappings.get(model);
    return mapping?.deprecated === true;
  }

  getReplacementModel(model: AIModel): AIModel | undefined {
    const mapping = this.mappings.get(model);
    return mapping?.replacedBy;
  }

  private logDeprecationWarning(model: AIModel, replacedBy?: AIModel): void {
    const replacement = replacedBy ? ` Use '${replacedBy}' instead.` : '';
    console.warn(`[ModelAPIService] Model '${model}' is deprecated.${replacement}`);
  }

  // Utility methods
  getAllMappings(): Map<AIModel, APIModelMapping> {
    return new Map(this.mappings);
  }

  getProviderModels(provider: 'openai' | 'anthropic'): AIModel[] {
    return Array.from(this.mappings.entries())
      .filter(([_, mapping]) => mapping.provider === provider)
      .map(([modelId, _]) => modelId);
  }

  getSupportedModels(): AIModel[] {
    return Array.from(this.mappings.keys());
  }
}

// Factory for creating the service
export class ModelAPIServiceFactory {
  private static instance: ModelAPIService | null = null;

  static getInstance(): ModelAPIService {
    if (!this.instance) {
      this.instance = new ProductionModelAPIService();
    }
    return this.instance;
  }

  static createService(): ModelAPIService {
    return new ProductionModelAPIService();
  }
}

// Utility function for easy access
export function getModelAPIService(): ModelAPIService {
  return ModelAPIServiceFactory.getInstance();
}