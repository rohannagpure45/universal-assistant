import { z } from 'zod';

/**
 * Comprehensive input validation schemas for Universal Assistant
 */

// Audio file validation
export const audioFileSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => {
      const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a'];
      return allowedTypes.includes(file.type);
    },
    { message: 'Invalid audio file type' }
  ).refine(
    (file) => file.size <= 50 * 1024 * 1024, // 50MB
    { message: 'Audio file too large (max 50MB)' }
  ).refine(
    (file) => file.size > 0,
    { message: 'Audio file is empty' }
  )
});

// AI Request validation
export const aiRequestSchema = z.object({
  text: z.string()
    .min(1, 'Text cannot be empty')
    .max(10000, 'Text exceeds maximum length of 10,000 characters')
    .refine(
      (text) => !containsMaliciousPatterns(text),
      { message: 'Text contains potentially malicious content' }
    ),
  model: z.enum([
    'gpt-4o',
    'gpt-4o-mini', 
    'gpt-4-turbo',
    'claude-3-5-sonnet',
    'claude-3-haiku',
    'claude-3-opus'
  ]),
  context: z.array(z.string()).optional(),
  meetingId: z.string().uuid().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).max(4000).optional()
});

// Meeting creation validation
export const meetingCreateSchema = z.object({
  title: z.string()
    .min(1, 'Meeting title is required')
    .max(200, 'Meeting title too long')
    .refine(
      (title) => !containsMaliciousPatterns(title),
      { message: 'Meeting title contains invalid characters' }
    ),
  type: z.enum([
    'general',
    'standup',
    'retrospective',
    'planning',
    'review',
    'interview',
    'presentation',
    'brainstorming'
  ]),
  description: z.string()
    .max(1000, 'Description too long')
    .optional(),
  participants: z.array(z.string().email()).optional(),
  scheduledAt: z.date().optional(),
  expectedDuration: z.number().min(1).max(480).optional() // 1 minute to 8 hours
});

// User profile update validation
export const userProfileSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name too long')
    .refine(
      (name) => !containsMaliciousPatterns(name),
      { message: 'Display name contains invalid characters' }
    ),
  email: z.string().email('Invalid email format'),
  photoURL: z.string().url('Invalid photo URL').optional(),
  preferences: z.object({
    defaultModel: z.string(),
    ttsVoice: z.string(),
    ttsSpeed: z.number().min(0.5).max(2),
    autoTranscribe: z.boolean(),
    saveTranscripts: z.boolean(),
    theme: z.enum(['light', 'dark', 'system']),
    language: z.string().length(2) // ISO 639-1 code
  }).partial()
});

// Voice identification request validation
export const voiceIdentificationSchema = z.object({
  deepgramVoiceId: z.string()
    .min(1, 'Voice ID is required')
    .max(100, 'Voice ID too long'),
  meetingId: z.string().uuid('Invalid meeting ID'),
  confidence: z.number().min(0).max(1),
  audioClipUrl: z.string().url('Invalid audio clip URL').optional(),
  suggestedUserId: z.string().uuid().optional()
});

// TTS request validation
export const ttsRequestSchema = z.object({
  text: z.string()
    .min(1, 'Text is required')
    .max(5000, 'Text too long for TTS (max 5000 characters)')
    .refine(
      (text) => !containsMaliciousPatterns(text),
      { message: 'Text contains potentially harmful content' }
    ),
  voiceId: z.string().optional(),
  speed: z.number().min(0.25).max(4).optional(),
  stability: z.number().min(0).max(1).optional(),
  similarityBoost: z.number().min(0).max(1).optional()
});

// Custom rule validation
export const customRuleSchema = z.object({
  name: z.string()
    .min(1, 'Rule name is required')
    .max(100, 'Rule name too long'),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  condition: z.object({
    type: z.enum(['keyword', 'speaker', 'sentiment', 'time', 'participant_count']),
    operator: z.enum(['contains', 'equals', 'greater_than', 'less_than', 'regex']),
    value: z.string().max(200, 'Condition value too long')
  }),
  action: z.object({
    type: z.enum(['block', 'modify', 'alert', 'redirect']),
    value: z.string().max(200, 'Action value too long').optional()
  }),
  isActive: z.boolean(),
  priority: z.number().min(1).max(100)
});

/**
 * Security validation functions
 */

/**
 * Check for malicious patterns in text input
 */
function containsMaliciousPatterns(text: string): boolean {
  const maliciousPatterns = [
    // Script injection patterns
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION.*SELECT)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    
    // Command injection patterns
    /[;&|`$(){}\[\]]/g,
    
    // Path traversal
    /\.\.\//g,
    /\.\.\\+\//g,
    
    // Suspicious characters in context of voice/AI app
    /<[^>]*>/g // Basic HTML tag detection
  ];

  return maliciousPatterns.some(pattern => pattern.test(text));
}

/**
 * Sanitize text input by removing/escaping dangerous characters
 */
export function sanitizeTextInput(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate Firebase document path
 */
export function isValidFirebasePath(path: string): boolean {
  // Firebase document paths have specific rules
  const invalidChars = /[.#$[\]]/;
  return !invalidChars.test(path) && path.length <= 1500;
}

/**
 * Validate audio duration
 */
export function isValidAudioDuration(duration: number): boolean {
  // Maximum 5 minutes for voice samples, 2 hours for meetings
  const MAX_VOICE_SAMPLE = 5 * 60; // 5 minutes in seconds
  const MAX_MEETING = 2 * 60 * 60; // 2 hours in seconds
  
  return duration > 0 && duration <= MAX_MEETING;
}

/**
 * Validate voice profile data
 */
export const voiceProfileSchema = z.object({
  userId: z.string().uuid().optional(),
  deepgramVoiceId: z.string().min(1).max(100),
  confirmed: z.boolean(),
  confidence: z.number().min(0).max(1),
  displayName: z.string()
    .min(1, 'Display name required')
    .max(100, 'Display name too long')
    .refine(
      (name) => !containsMaliciousPatterns(name),
      { message: 'Display name contains invalid characters' }
    ),
  audioSamples: z.array(z.object({
    url: z.string().url(),
    duration: z.number().positive(),
    quality: z.number().min(0).max(1)
  })).optional(),
  lastUsed: z.date().optional(),
  createdAt: z.date(),
  metadata: z.record(z.string()).optional()
});

/**
 * Password strength validation
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
  score: number;
} {
  const errors: string[] = [];
  let score = 0;

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }

  // Character type checks
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letters');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letters');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain numbers');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain special characters');
  } else {
    score += 1;
  }

  // Common password check
  const commonPasswords = [
    'password', '123456', 'password123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'qwerty', 'abc123'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
    score = Math.max(0, score - 2);
  }

  return {
    isValid: errors.length === 0 && score >= 4,
    errors,
    score: Math.min(5, score)
  };
}