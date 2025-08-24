/**
 * Environment variable validation utilities for Universal Assistant
 * Validates required environment variables and their security properties
 */

export interface ValidationRule {
  required: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  validator?: (value: string) => boolean;
  description: string;
  category: 'firebase' | 'ai' | 'security' | 'monitoring' | 'development';
  sensitive: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  security: {
    weakKeys: string[];
    exposedSecrets: string[];
    plaintextSecrets: string[];
  };
  score: number;
}

/**
 * Environment variable validation rules
 */
export const ENV_VALIDATION_RULES: Record<string, ValidationRule> = {
  // Firebase Configuration
  'NEXT_PUBLIC_FIREBASE_API_KEY': {
    required: true,
    minLength: 30,
    pattern: /^[A-Za-z0-9_-]+$/,
    description: 'Firebase API key for client-side authentication',
    category: 'firebase',
    sensitive: true
  },
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID': {
    required: true,
    minLength: 6,
    pattern: /^[a-z0-9-]+$/,
    description: 'Firebase project identifier',
    category: 'firebase',
    sensitive: false
  },
  'FIREBASE_ADMIN_PRIVATE_KEY': {
    required: true,
    minLength: 1000,
    validator: (value) => value.includes('BEGIN PRIVATE KEY') && value.includes('END PRIVATE KEY'),
    description: 'Firebase Admin SDK private key',
    category: 'firebase',
    sensitive: true
  },
  'FIREBASE_CLIENT_EMAIL': {
    required: true,
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    description: 'Firebase service account email',
    category: 'firebase',
    sensitive: false
  },

  // AI Service API Keys
  'OPENAI_API_KEY': {
    required: true,
    minLength: 40,
    pattern: /^sk-[A-Za-z0-9_-]+$/,
    description: 'OpenAI API key for GPT models',
    category: 'ai',
    sensitive: true
  },
  'ANTHROPIC_API_KEY': {
    required: true,
    minLength: 40,
    pattern: /^sk-ant-[A-Za-z0-9_-]+$/,
    description: 'Anthropic API key for Claude models',
    category: 'ai',
    sensitive: true
  },
  'DEEPGRAM_API_KEY': {
    required: true,
    minLength: 30,
    description: 'Deepgram API key for speech-to-text',
    category: 'ai',
    sensitive: true
  },
  'ELEVENLABS_API_KEY': {
    required: false,
    minLength: 20,
    description: 'ElevenLabs API key for text-to-speech',
    category: 'ai',
    sensitive: true
  },

  // Security & Encryption Keys
  'VOICE_ENCRYPTION_SECRET': {
    required: true,
    minLength: 32,
    validator: (value) => !value.includes('fallback') && !value.includes('default'),
    description: 'Encryption key for voice data',
    category: 'security',
    sensitive: true
  },
  'FIELD_ENCRYPTION_SECRET': {
    required: true,
    minLength: 32,
    validator: (value) => !value.includes('fallback') && !value.includes('default'),
    description: 'Encryption key for database fields',
    category: 'security',
    sensitive: true
  },
  'API_KEY_ENCRYPTION_SECRET': {
    required: true,
    minLength: 32,
    validator: (value) => !value.includes('fallback') && !value.includes('default'),
    description: 'Encryption key for stored API keys',
    category: 'security',
    sensitive: true
  },
  'TOKEN_SECRET': {
    required: true,
    minLength: 32,
    validator: (value) => !value.includes('fallback') && !value.includes('default'),
    description: 'Secret for session token signing',
    category: 'security',
    sensitive: true
  },
  'BACKUP_ENCRYPTION_KEY': {
    required: true,
    minLength: 32,
    validator: (value) => !value.includes('fallback') && !value.includes('default'),
    description: 'Encryption key for data backups',
    category: 'security',
    sensitive: true
  },

  // Monitoring & Alerting
  'MONITORING_WEBHOOK_URL': {
    required: false,
    pattern: /^https:\/\/.+/,
    description: 'Webhook URL for monitoring alerts',
    category: 'monitoring',
    sensitive: true
  },
  'SECURITY_ALERT_WEBHOOK': {
    required: false,
    pattern: /^https:\/\/.+/,
    description: 'Webhook URL for security alerts',
    category: 'monitoring',
    sensitive: true
  },
  'SENTRY_DSN': {
    required: false,
    pattern: /^https:\/\/.+@.+\.ingest\.sentry\.io\/.+/,
    description: 'Sentry DSN for error tracking',
    category: 'monitoring',
    sensitive: true
  },

  // Development & Testing
  'NODE_ENV': {
    required: true,
    validator: (value) => ['development', 'production', 'test'].includes(value),
    description: 'Node.js environment mode',
    category: 'development',
    sensitive: false
  },
  'NEXT_PUBLIC_APP_ENV': {
    required: false,
    validator: (value) => ['development', 'production', 'staging', 'test'].includes(value),
    description: 'Application environment identifier',
    category: 'development',
    sensitive: false
  }
};

/**
 * Environment validation service
 */
export class EnvironmentValidator {
  private rules: Record<string, ValidationRule>;

  constructor(customRules: Record<string, ValidationRule> = {}) {
    this.rules = { ...ENV_VALIDATION_RULES, ...customRules };
  }

  /**
   * Validate all environment variables
   */
  validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
      isValid: false,
      errors: [],
      warnings: [],
      missing: [],
      security: {
        weakKeys: [],
        exposedSecrets: [],
        plaintextSecrets: []
      },
      score: 0
    };

    let totalScore = 0;
    let maxScore = 0;

    // Check each rule
    for (const [envVar, rule] of Object.entries(this.rules)) {
      const value = process.env[envVar];
      maxScore += rule.required ? 10 : 5;

      if (!value) {
        if (rule.required) {
          result.errors.push(`Missing required environment variable: ${envVar}`);
          result.missing.push(envVar);
        } else {
          result.warnings.push(`Optional environment variable not set: ${envVar}`);
        }
        continue;
      }

      // Validate value
      const validation = this.validateValue(envVar, value, rule);
      
      if (validation.isValid) {
        totalScore += rule.required ? 10 : 5;
      } else {
        result.errors.push(...validation.errors);
        result.warnings.push(...validation.warnings);
      }

      // Security checks
      if (rule.sensitive) {
        const securityCheck = this.performSecurityCheck(envVar, value);
        
        if (securityCheck.isWeak) {
          result.security.weakKeys.push(envVar);
          result.warnings.push(`Weak key detected: ${envVar}`);
        }
        
        if (securityCheck.isExposed) {
          result.security.exposedSecrets.push(envVar);
          result.errors.push(`Potentially exposed secret: ${envVar}`);
        }
        
        if (securityCheck.isPlaintext) {
          result.security.plaintextSecrets.push(envVar);
          result.warnings.push(`Plaintext secret detected: ${envVar}`);
        }
      }
    }

    // Check for exposed secrets in client-side variables
    this.checkClientSideExposure(result);

    // Calculate final score
    result.score = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    result.isValid = result.errors.length === 0 && result.score >= 80;

    return result;
  }

  /**
   * Validate a single environment variable value
   */
  private validateValue(envVar: string, value: string, rule: ValidationRule): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Length validation
    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${envVar} is too short (minimum ${rule.minLength} characters)`);
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors.push(`${envVar} is too long (maximum ${rule.maxLength} characters)`);
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${envVar} does not match required pattern`);
    }

    // Custom validator
    if (rule.validator && !rule.validator(value)) {
      errors.push(`${envVar} failed custom validation`);
    }

    // Check for placeholder values
    const placeholderPatterns = [
      /your-.*-here/i,
      /example/i,
      /placeholder/i,
      /replace.?me/i,
      /change.?me/i,
      /todo/i
    ];

    if (placeholderPatterns.some(pattern => pattern.test(value))) {
      errors.push(`${envVar} contains placeholder value`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Perform security checks on sensitive values
   */
  private performSecurityCheck(envVar: string, value: string): {
    isWeak: boolean;
    isExposed: boolean;
    isPlaintext: boolean;
  } {
    // Check for weak keys
    const isWeak = this.isWeakKey(value);
    
    // Check for exposed secrets (common patterns)
    const isExposed = this.isExposedSecret(value);
    
    // Check for plaintext secrets
    const isPlaintext = this.isPlaintextSecret(envVar, value);

    return { isWeak, isExposed, isPlaintext };
  }

  /**
   * Check if key is weak
   */
  private isWeakKey(value: string): boolean {
    // Too short
    if (value.length < 16) return true;
    
    // Common weak patterns
    const weakPatterns = [
      /^123+/,
      /^abc+/i,
      /password/i,
      /secret/i,
      /^[a-z]+$/i,
      /^[0-9]+$/,
      /(.)\1{4,}/ // Repeated characters
    ];

    return weakPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if secret is exposed
   */
  private isExposedSecret(value: string): boolean {
    // Check for common exposed secret indicators
    const exposedPatterns = [
      /github/i,
      /public/i,
      /demo/i,
      /test.*key/i,
      /sample/i
    ];

    return exposedPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Check if secret appears to be plaintext
   */
  private isPlaintextSecret(envVar: string, value: string): boolean {
    // If it's supposed to be encrypted/hashed but looks like plaintext
    if (envVar.includes('HASH') || envVar.includes('ENCRYPTED')) {
      return !/^[a-f0-9]{32,}$/.test(value) && !value.includes('$');
    }

    return false;
  }

  /**
   * Check for client-side exposure of secrets
   */
  private checkClientSideExposure(result: ValidationResult): void {
    const sensitiveKeys = Object.entries(this.rules)
      .filter(([_, rule]) => rule.sensitive)
      .map(([key, _]) => key);

    // Check if sensitive keys are exposed as NEXT_PUBLIC_
    for (const key of sensitiveKeys) {
      const publicVersion = `NEXT_PUBLIC_${key}`;
      if (process.env[publicVersion]) {
        result.errors.push(`Sensitive key ${key} exposed as client-side variable ${publicVersion}`);
        result.security.exposedSecrets.push(publicVersion);
      }
    }
  }

  /**
   * Generate validation report
   */
  generateReport(result: ValidationResult): string {
    const lines: string[] = [];
    
    lines.push('Environment Validation Report');
    lines.push('='.repeat(40));
    lines.push('');
    
    // Summary
    lines.push(`Overall Score: ${result.score}/100`);
    lines.push(`Validation Status: ${result.isValid ? 'PASSED' : 'FAILED'}`);
    lines.push(`Errors: ${result.errors.length}`);
    lines.push(`Warnings: ${result.warnings.length}`);
    lines.push(`Missing Variables: ${result.missing.length}`);
    lines.push('');

    // Security summary
    lines.push('Security Summary:');
    lines.push(`- Weak Keys: ${result.security.weakKeys.length}`);
    lines.push(`- Exposed Secrets: ${result.security.exposedSecrets.length}`);
    lines.push(`- Plaintext Secrets: ${result.security.plaintextSecrets.length}`);
    lines.push('');

    // Errors
    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach(error => lines.push(`  ❌ ${error}`));
      lines.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach(warning => lines.push(`  ⚠️  ${warning}`));
      lines.push('');
    }

    // Missing variables
    if (result.missing.length > 0) {
      lines.push('MISSING REQUIRED VARIABLES:');
      result.missing.forEach(missing => {
        const rule = this.rules[missing];
        lines.push(`  📋 ${missing}: ${rule.description}`);
      });
      lines.push('');
    }

    // Recommendations
    lines.push('RECOMMENDATIONS:');
    if (result.score < 60) {
      lines.push('  🚨 Critical: Immediate action required');
    } else if (result.score < 80) {
      lines.push('  ⚠️  Moderate: Improvements needed');
    } else {
      lines.push('  ✅ Good: Minor improvements suggested');
    }
    
    lines.push('  • Ensure all required variables are set');
    lines.push('  • Use strong, randomly generated keys');
    lines.push('  • Never expose secrets in client-side variables');
    lines.push('  • Rotate API keys regularly');
    
    return lines.join('\n');
  }

  /**
   * Get environment variable categories
   */
  getVariablesByCategory(): Record<string, string[]> {
    const categories: Record<string, string[]> = {};
    
    for (const [envVar, rule] of Object.entries(this.rules)) {
      if (!categories[rule.category]) {
        categories[rule.category] = [];
      }
      categories[rule.category].push(envVar);
    }
    
    return categories;
  }

  /**
   * Check specific category
   */
  validateCategory(category: string): ValidationResult {
    const categoryRules = Object.fromEntries(
      Object.entries(this.rules).filter(([_, rule]) => rule.category === category)
    );
    
    const categoryValidator = new EnvironmentValidator(categoryRules);
    return categoryValidator.validateEnvironment();
  }
}

/**
 * Environment setup helpers
 */
export class EnvironmentSetup {
  /**
   * Generate secure random key
   */
  static generateSecureKey(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  /**
   * Check if running in secure environment
   */
  static isSecureEnvironment(): boolean {
    return process.env.NODE_ENV === 'production' && 
           process.env.HTTPS === 'true';
  }

  /**
   * Get missing environment variables
   */
  static getMissingVariables(): string[] {
    const validator = new EnvironmentValidator();
    const result = validator.validateEnvironment();
    return result.missing;
  }

  /**
   * Validate single environment variable
   */
  static validateVariable(envVar: string): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const validator = new EnvironmentValidator();
    const rule = ENV_VALIDATION_RULES[envVar];
    
    if (!rule) {
      return {
        isValid: false,
        errors: [`Unknown environment variable: ${envVar}`],
        warnings: []
      };
    }
    
    const value = process.env[envVar];
    if (!value) {
      return {
        isValid: false,
        errors: [`Environment variable not set: ${envVar}`],
        warnings: []
      };
    }
    
    return validator['validateValue'](envVar, value, rule);
  }
}

// Export singleton validator
export const environmentValidator = new EnvironmentValidator();

// Helper functions for common use cases
export const EnvironmentHelpers = {
  /**
   * Quick validation check
   */
  isValid: (): boolean => {
    const result = environmentValidator.validateEnvironment();
    return result.isValid;
  },

  /**
   * Get validation errors
   */
  getErrors: (): string[] => {
    const result = environmentValidator.validateEnvironment();
    return result.errors;
  },

  /**
   * Get validation warnings
   */
  getWarnings: (): string[] => {
    const result = environmentValidator.validateEnvironment();
    return result.warnings;
  },

  /**
   * Get security score
   */
  getSecurityScore: (): number => {
    const result = environmentValidator.validateEnvironment();
    return result.score;
  },

  /**
   * Generate validation report
   */
  generateReport: (): string => {
    const result = environmentValidator.validateEnvironment();
    return environmentValidator.generateReport(result);
  }
};