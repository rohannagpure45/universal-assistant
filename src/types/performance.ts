import { AIModel } from '@/types';
import { CostBreakdown, APICall, TimeBasedUsage } from './cost';

// Enhanced performance monitoring types for Step 2.1 of Phase 4.2

export interface PerformanceMetrics {
  id: string;
  timestamp: number;
  sessionId?: string;
  meetingId?: string;
  userId?: string;
  
  // Core latency metrics
  latency: {
    total: number;
    stages: {
      audioCapture: number;
      speechToText: number;
      textProcessing: number;
      aiResponse: number;
      textToSpeech: number;
      audioPlayback: number;
    };
    network: {
      deepgram: number;
      openai: number;
      anthropic: number;
      elevenlabs: number;
    };
  };
  
  // Resource usage
  resources: {
    memory: {
      used: number;
      available: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      bandwidth: number;
    };
  };
  
  // Quality metrics
  quality: {
    transcriptionAccuracy?: number;
    responseRelevance?: number;
    audioQuality?: number;
    userSatisfaction?: number;
  };
  
  // Context information
  context: {
    modelUsed: AIModel;
    fallbackUsed: boolean;
    fallbackReason?: string;
    retryCount: number;
    cacheHit: boolean;
    audioLength?: number;
    responseLength?: number;
  };
}

export interface PerformanceTrend {
  period: string; // ISO date string
  metrics: {
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    throughput: number;
    errorRate: number;
    successRate: number;
  };
  scores: {
    overall: number;
    latency: number;
    reliability: number;
    efficiency: number;
    quality: number;
  };
  fallbacks: {
    total: number;
    byReason: Record<string, number>;
    impactOnLatency: number;
  };
  comparison: {
    previousPeriod: {
      latencyChange: number; // percentage
      throughputChange: number;
      errorRateChange: number;
      trend: 'improving' | 'stable' | 'degrading';
    };
  };
}

export interface PerformanceScore {
  overall: number; // 0-100
  components: {
    latency: number; // 0-100
    throughput: number; // 0-100
    reliability: number; // 0-100
    efficiency: number; // 0-100
    quality: number; // 0-100
    resourceUsage: number; // 0-100
  };
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  factors: {
    positive: string[];
    negative: string[];
  };
  recommendations: PerformanceRecommendation[];
}

export interface PerformanceRecommendation {
  id: string;
  type: 'optimization' | 'scaling' | 'configuration' | 'infrastructure' | 'model_selection';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'latency' | 'throughput' | 'reliability' | 'cost' | 'quality';
  title: string;
  description: string;
  impact: {
    latencyImprovement?: number; // milliseconds
    throughputImprovement?: number; // percentage
    costSavings?: number; // USD
    reliabilityImprovement?: number; // percentage
  };
  implementation: {
    effort: 'minimal' | 'low' | 'medium' | 'high' | 'major';
    timeEstimate: string; // e.g., "1-2 hours", "1-2 days"
    resources: string[];
    risks: string[];
  };
  actionItems: string[];
  measurability: {
    beforeMetrics: string[];
    afterMetrics: string[];
    successCriteria: string[];
  };
}

export interface PerformanceAlert {
  id: string;
  timestamp: number;
  type: 'threshold' | 'anomaly' | 'degradation' | 'failure' | 'fallback';
  severity: 'info' | 'warning' | 'error' | 'critical';
  component: 'latency' | 'throughput' | 'reliability' | 'resource' | 'quality';
  title: string;
  message: string;
  metrics: PerformanceMetrics;
  threshold?: {
    metric: string;
    expected: number;
    actual: number;
    unit: string;
  };
  impact: {
    affectedUsers: number;
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: string;
  };
  resolution: {
    status: 'new' | 'investigating' | 'resolved' | 'acknowledged';
    assignee?: string;
    notes?: string;
    resolvedAt?: number;
    resolutionTime?: number;
  };
}

export interface PerformanceThreshold {
  id: string;
  name: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'change_percent';
  value: number;
  unit?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  cooldownMs: number;
  triggerCount: number; // consecutive violations needed
  notifications: {
    email?: boolean;
    slack?: boolean;
    webhook?: string;
  };
}

export interface FallbackTracking {
  id: string;
  timestamp: number;
  originalModel: AIModel;
  fallbackModel: AIModel;
  reason: 'timeout' | 'error' | 'rate_limit' | 'cost_optimization' | 'quality_fallback';
  trigger: {
    errorType?: string;
    latency?: number;
    costThreshold?: number;
    qualityScore?: number;
  };
  impact: {
    latencyChange: number;
    costChange: number;
    qualityChange?: number;
    userExperience: 'improved' | 'neutral' | 'degraded';
  };
  success: boolean;
  fallbackLatency: number;
  metadata?: {
    requestId: string;
    sessionId: string;
    retryAttempt: number;
  };
}

export interface ModelPerformanceAnalysis {
  model: AIModel;
  period: {
    start: number;
    end: number;
  };
  usage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    fallbackRequests: number;
  };
  performance: {
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    minLatency: number;
    maxLatency: number;
    reliabilityScore: number; // 0-100
    qualityScore: number; // 0-100
  };
  cost: {
    totalCost: number;
    averageCostPerRequest: number;
    costPerToken: number;
    efficiency: number; // performance/cost ratio
  };
  trends: {
    latencyTrend: 'improving' | 'stable' | 'degrading';
    reliabilityTrend: 'improving' | 'stable' | 'degrading';
    costTrend: 'improving' | 'stable' | 'degrading';
  };
  recommendations: {
    continue: boolean;
    alternatives: AIModel[];
    optimizations: string[];
  };
}

export interface ResourceMonitoring {
  timestamp: number;
  system: {
    memory: {
      total: number;
      used: number;
      free: number;
      percentage: number;
      swapUsed: number;
    };
    cpu: {
      percentage: number;
      loadAverage: number[];
      cores: number;
      processes: number;
    };
    network: {
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
      connectionsActive: number;
    };
    storage: {
      totalSpace: number;
      usedSpace: number;
      freeSpace: number;
      percentage: number;
    };
  };
  application: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    activeConnections: number;
    pendingRequests: number;
    cacheSize: number;
    sessionCount: number;
  };
  thresholds: {
    memoryWarning: number;
    memoryCritical: number;
    cpuWarning: number;
    cpuCritical: number;
    storageWarning: number;
    storageCritical: number;
  };
}

export interface PerformanceAnalytics {
  timeRange: {
    start: number;
    end: number;
    duration: number;
  };
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    p95Latency: number;
    throughput: number;
    uptime: number; // percentage
  };
  trends: PerformanceTrend[];
  scores: PerformanceScore;
  bottlenecks: {
    component: string;
    impact: number;
    frequency: number;
    recommendations: string[];
  }[];
  costPerformanceCorrelation: {
    costPerRequest: number;
    performancePerDollar: number;
    optimalModels: {
      model: AIModel;
      score: number;
      reasoning: string;
    }[];
  };
  alerts: {
    total: number;
    bySeverity: Record<string, number>;
    recent: PerformanceAlert[];
  };
  fallbacks: {
    total: number;
    successRate: number;
    byReason: Record<string, number>;
    averageImpact: number;
  };
}

export interface PerformanceOptimization {
  id: string;
  name: string;
  description: string;
  category: 'caching' | 'model_selection' | 'resource_allocation' | 'network' | 'processing';
  status: 'proposed' | 'testing' | 'implemented' | 'rolled_back';
  
  baseline: {
    metrics: PerformanceMetrics[];
    averageLatency: number;
    throughput: number;
    errorRate: number;
    cost: number;
  };
  
  target: {
    latencyImprovement: number; // percentage
    throughputImprovement: number; // percentage
    errorRateReduction: number; // percentage
    costReduction: number; // percentage
  };
  
  implementation: {
    startedAt?: number;
    completedAt?: number;
    rollbackAt?: number;
    config: Record<string, any>;
    dependencies: string[];
  };
  
  results?: {
    actualLatencyImprovement: number;
    actualThroughputImprovement: number;
    actualErrorRateReduction: number;
    actualCostReduction: number;
    unexpected: string[];
  };
  
  testing: {
    testPlan: string[];
    metrics: PerformanceMetrics[];
    passed: boolean;
    issues: string[];
  };
}

// Integration with cost tracking
export interface CostPerformanceCorrelation {
  period: string;
  metrics: {
    totalCost: number;
    totalRequests: number;
    averageLatency: number;
    costPerRequest: number;
    costPerMillisecond: number;
    performanceScore: number;
  };
  efficiency: {
    bestPerformingModel: {
      model: AIModel;
      costPerRequest: number;
      averageLatency: number;
      score: number;
    };
    mostEfficientModel: {
      model: AIModel;
      costPerPerformancePoint: number;
      score: number;
    };
    leastEfficientModel: {
      model: AIModel;
      costPerPerformancePoint: number;
      score: number;
    };
  };
  recommendations: {
    modelSwitching: {
      from: AIModel;
      to: AIModel;
      expectedSavings: number;
      expectedLatencyChange: number;
      confidence: number;
    }[];
    optimizations: {
      area: string;
      description: string;
      expectedSavings: number;
      expectedPerformanceImpact: number;
    }[];
  };
}

// Configuration types
export interface PerformanceMonitoringConfig {
  enabled: boolean;
  metricsCollection: {
    interval: number; // milliseconds
    retention: number; // days
    detailLevel: 'basic' | 'detailed' | 'comprehensive';
  };
  alerting: {
    enabled: boolean;
    channels: ('email' | 'slack' | 'webhook')[];
    escalation: {
      warning: number; // minutes
      critical: number; // minutes
    };
  };
  fallbackTracking: {
    enabled: boolean;
    trackReasons: boolean;
    trackImpact: boolean;
  };
  resourceMonitoring: {
    enabled: boolean;
    interval: number; // milliseconds
    thresholds: ResourceMonitoring['thresholds'];
  };
  reporting: {
    dailyReports: boolean;
    weeklyReports: boolean;
    monthlyReports: boolean;
    recipients: string[];
  };
  optimization: {
    autoOptimization: boolean;
    testingEnabled: boolean;
    rollbackThreshold: number; // percentage degradation
  };
}

export type PerformancePeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';
export type PerformanceGranularity = 'request' | 'session' | 'meeting' | 'user' | 'global';
export type TrendDirection = 'improving' | 'stable' | 'degrading';