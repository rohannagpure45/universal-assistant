import { AIModel } from '@/types';

// Cost tracking types for AI model usage and analytics
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface APICall {
  id: string;
  timestamp: Date;
  model: AIModel;
  service: 'openai' | 'anthropic' | 'deepgram' | 'elevenlabs';
  operation: 'chat_completion' | 'speech_to_text' | 'text_to_speech' | 'embeddings';
  tokenUsage: TokenUsage;
  latency: number; // in milliseconds
  cost: number; // in USD
  requestSize?: number; // in bytes for audio/file operations
  responseSize?: number; // in bytes
  metadata?: {
    meetingId?: string;
    userId?: string;
    contextLength?: number;
    temperature?: number;
    maxTokens?: number;
  };
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

export interface UsageMetrics {
  totalAPICalls: number;
  totalTokens: TokenUsage;
  totalCost: number;
  averageLatency: number;
  averageCostPerCall: number;
  costByModel: Record<AIModel, CostBreakdown>;
  costByService: Record<string, CostBreakdown>;
  costByOperation: Record<string, CostBreakdown>;
}

export interface CostBudget {
  id: string;
  name: string;
  userId: string;
  limit: number; // in USD
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  currentUsage: number;
  alerts: {
    thresholds: number[]; // percentages [50, 80, 95]
    notified: number[]; // which thresholds have been triggered
  };
  resetDate: Date;
  createdAt: Date;
  updatedAt: Date;
  startDate?: Date;
  endDate?: Date;
}

export interface TimeBasedUsage {
  period: string; // ISO date string (YYYY-MM-DD for daily, YYYY-MM for monthly, etc.)
  usage: UsageMetrics;
  budget?: CostBudget;
}

export interface CostAnalytics {
  totalSpend: number;
  dailyUsage: TimeBasedUsage[];
  weeklyUsage: TimeBasedUsage[];
  monthlyUsage: TimeBasedUsage[];
  topModels: Array<{
    model: AIModel;
    usage: UsageMetrics;
    percentage: number;
  }>;
  costTrends: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
    period: 'day' | 'week' | 'month';
  };
  projectedMonthlySpend: number;
  efficiency: {
    averageTokensPerDollar: number;
    mostEfficientModel: AIModel;
    leastEfficientModel: AIModel;
  };
}

export interface CostEvent {
  type: 'api_call' | 'budget_alert' | 'cost_threshold' | 'efficiency_warning';
  timestamp: Date;
  data: APICall | CostBudget | { threshold: number; current: number } | { model: AIModel; efficiency: number };
  severity: 'info' | 'warning' | 'error';
  message: string;
}

// Cost tracking configuration
export interface CostTrackingConfig {
  enabled: boolean;
  trackingLevel: 'basic' | 'detailed' | 'comprehensive';
  retentionDays: number;
  budgetAlerts: boolean;
  realTimeTracking: boolean;
  aggregationInterval: number; // in minutes
  exportFormat: 'json' | 'csv' | 'xlsx';
}

// Cost estimation types
export interface CostEstimation {
  estimatedTokens: number;
  estimatedCost: number;
  confidence: number; // 0-1
  factors: {
    promptLength: number;
    contextSize: number;
    modelComplexity: number;
    historicalAverage: number;
  };
}

// Service-specific cost types
export interface DeepgramCost {
  audioLength: number; // in seconds
  model: string;
  language: string;
  features: string[];
  cost: number;
}

export interface ElevenLabsCost {
  characterCount: number;
  voiceId: string;
  model: string;
  cost: number;
}

// Batch cost analysis
export interface BatchCostAnalysis {
  requests: APICall[];
  totalCost: number;
  averageCost: number;
  costDistribution: {
    min: number;
    max: number;
    median: number;
    p95: number;
  };
  recommendations: {
    suggestedModel?: AIModel;
    potentialSavings: number;
    optimizationTips: string[];
  };
}

export type CostPeriod = 'hour' | 'day' | 'week' | 'month' | 'year';
export type CostGranularity = 'call' | 'session' | 'meeting' | 'user' | 'global';