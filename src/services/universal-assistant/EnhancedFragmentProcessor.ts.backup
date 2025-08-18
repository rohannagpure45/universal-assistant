import { FragmentProcessor, ProcessResult, FragmentBuffer, FragmentProcessorConfig } from './FragmentProcessor';
import { FragmentDetector, FragmentAnalysis } from './FragmentDetector';
import { nanoid } from 'nanoid';

// Enhanced semantic analysis interfaces
export interface SemanticAnalysis {
  intent: IntentType;
  entities: ExtractedEntity[];
  sentiment: SentimentAnalysis;
  topics: TopicAnalysis[];
  coherence: CoherenceMetrics;
  complexity: ComplexityMetrics;
  urgency: UrgencyLevel;
  actionItems: ActionItem[];
  confidence: number;
}

export type IntentType = 
  | 'question'
  | 'request'
  | 'information'
  | 'greeting'
  | 'instruction'
  | 'complaint'
  | 'compliment'
  | 'agreement'
  | 'disagreement'
  | 'clarification'
  | 'conclusion'
  | 'other';

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  metadata?: Record<string, any>;
}

export type EntityType = 
  | 'person'
  | 'organization'
  | 'location'
  | 'date'
  | 'time'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'product'
  | 'action'
  | 'emotion'
  | 'technology';

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  subjectivity: number; // 0 to 1
  emotion: EmotionType;
  intensity: number; // 0 to 1
  confidence: number;
}

export type EmotionType = 
  | 'joy'
  | 'sadness'
  | 'anger'
  | 'fear'
  | 'surprise'
  | 'disgust'
  | 'neutral'
  | 'excitement'
  | 'frustration'
  | 'confusion';

export interface TopicAnalysis {
  topic: string;
  relevance: number;
  keywords: string[];
  category: TopicCategory;
}

export type TopicCategory = 
  | 'technical'
  | 'business'
  | 'personal'
  | 'meeting'
  | 'project'
  | 'problem'
  | 'solution'
  | 'decision'
  | 'planning'
  | 'review';

export interface CoherenceMetrics {
  overallCoherence: number;
  logicalFlow: number;
  topicalConsistency: number;
  referentialCohesion: number;
  temporalCoherence: number;
}

export interface ComplexityMetrics {
  lexicalDiversity: number;
  syntacticComplexity: number;
  conceptualDepth: number;
  informationDensity: number;
  readabilityScore: number;
}

export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface ActionItem {
  id: string;
  action: string;
  assignee?: string;
  deadline?: string;
  priority: UrgencyLevel;
  confidence: number;
  dependencies?: string[];
}

export interface EnhancedProcessResult extends ProcessResult {
  semanticAnalysis?: SemanticAnalysis;
  contextualRelevance?: number;
  speakerProfile?: {
    speakingPatterns: string[];
    emotionalState: EmotionType;
    engagementLevel: number;
  };
  followUpSuggestions?: string[];
  relatedTopics?: string[];
}

export interface EnhancedFragmentProcessorConfig extends FragmentProcessorConfig {
  enableSemanticAnalysis: boolean;
  enableIntentDetection: boolean;
  enableEntityExtraction: boolean;
  enableSentimentAnalysis: boolean;
  enableTopicModeling: boolean;
  enableActionItemExtraction: boolean;
  semanticCacheSize: number;
  contextWindowSize: number;
  minConfidenceThreshold: number;
}

// Semantic analysis cache for performance
export interface SemanticCache {
  textHash: string;
  analysis: SemanticAnalysis;
  timestamp: number;
  accessCount: number;
}

// Context window for maintaining conversation history
export interface ConversationContext {
  speakerId: string;
  utterances: Array<{
    text: string;
    timestamp: number;
    semanticAnalysis?: SemanticAnalysis;
  }>;
  activeTopics: Set<string>;
  speakerProfile: {
    preferredTopics: string[];
    speakingStyle: string;
    emotionalBaseline: EmotionType;
    complexityLevel: number;
  };
  ongoingActionItems: ActionItem[];
}

/**
 * Enhanced Fragment Processor with semantic analysis capabilities
 * Extends the base FragmentProcessor with advanced NLP features
 */
export class EnhancedFragmentProcessor extends FragmentProcessor {
  private enhancedConfig: EnhancedFragmentProcessorConfig;
  private semanticCache: Map<string, SemanticCache> = new Map();
  private conversationContext: Map<string, ConversationContext> = new Map();
  private topicModelingKeywords: Set<string> = new Set();
  private entityPatterns: Map<EntityType, RegExp[]> = new Map();
  private sentimentLexicon: Map<string, number> = new Map();
  private actionVerbs: Set<string> = new Set();
  
  // Performance metrics
  private semanticMetrics = {
    totalAnalyses: 0,
    cacheHits: 0,
    averageProcessingTime: 0,
    accuracyScore: 0,
    lastCleanup: Date.now(),
  };

  constructor(config?: Partial<EnhancedFragmentProcessorConfig>) {
    super(config);
    
    this.enhancedConfig = {
      // Base config
      silenceThreshold: 2000,
      bufferTimeout: 10000,
      minFragmentsForAggregation: 2,
      maxBufferSize: 10,
      confidenceThreshold: 0.6,
      
      // Enhanced config
      enableSemanticAnalysis: true,
      enableIntentDetection: true,
      enableEntityExtraction: true,
      enableSentimentAnalysis: true,
      enableTopicModeling: true,
      enableActionItemExtraction: true,
      semanticCacheSize: 500,
      contextWindowSize: 20,
      minConfidenceThreshold: 0.7,
      
      ...config,
    };
    
    this.initializeSemanticResources();
  }

  /**
   * Initialize semantic analysis resources
   */
  private initializeSemanticResources(): void {
    // Initialize entity patterns
    this.entityPatterns.set('email', [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g]);
    this.entityPatterns.set('phone', [/\b\d{3}-\d{3}-\d{4}\b/g, /\b\(\d{3}\)\s*\d{3}-\d{4}\b/g]);
    this.entityPatterns.set('url', [/https?:\/\/[^\s]+/g]);
    this.entityPatterns.set('date', [/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi]);
    this.entityPatterns.set('time', [/\b\d{1,2}:\d{2}\s*(AM|PM)?\b/gi]);
    
    // Initialize sentiment lexicon (simplified)
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'perfect', 'love', 'like', 'happy', 'pleased', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'upset', 'annoyed'];
    
    positiveWords.forEach(word => this.sentimentLexicon.set(word, 0.8));
    negativeWords.forEach(word => this.sentimentLexicon.set(word, -0.8));
    
    // Initialize action verbs
    this.actionVerbs = new Set([
      'do', 'make', 'create', 'build', 'develop', 'implement', 'design', 'plan', 'organize', 'prepare',
      'review', 'analyze', 'research', 'investigate', 'test', 'verify', 'validate', 'check', 'confirm',
      'send', 'email', 'call', 'contact', 'meet', 'discuss', 'schedule', 'arrange', 'coordinate'
    ]);
    
    // Initialize topic modeling keywords
    this.topicModelingKeywords = new Set([
      'project', 'meeting', 'deadline', 'task', 'goal', 'objective', 'requirement', 'feature',
      'bug', 'issue', 'problem', 'solution', 'decision', 'approval', 'budget', 'timeline',
      'team', 'client', 'user', 'customer', 'stakeholder', 'manager', 'developer', 'designer'
    ]);
    
    console.log('EnhancedFragmentProcessor: Semantic resources initialized');
  }

  /**
   * Enhanced process input with semantic analysis
   */
  processInput(
    text: string,
    speakerId: string,
    timestamp: number,
    context?: {
      speakerChanged?: boolean;
      silenceDuration?: number;
      previousUtterances?: string[];
      audioFeatures?: any;
      meetingContext?: any;
    }
  ): EnhancedProcessResult {
    const startTime = Date.now();
    
    // Get base processing result
    const baseResult = super.processInput(text, speakerId, timestamp, context);
    
    // If semantic analysis is disabled, return base result
    if (!this.enhancedConfig.enableSemanticAnalysis) {
      return baseResult as EnhancedProcessResult;
    }
    
    // Perform semantic analysis
    const semanticAnalysis = this.performSemanticAnalysis(text, speakerId, context);
    
    // Update conversation context
    this.updateConversationContext(speakerId, text, timestamp, semanticAnalysis);
    
    // Calculate contextual relevance
    const contextualRelevance = this.calculateContextualRelevance(text, speakerId);
    
    // Get speaker profile insights
    const speakerProfile = this.analyzeSpeakerProfile(speakerId);
    
    // Generate follow-up suggestions
    const followUpSuggestions = this.generateFollowUpSuggestions(semanticAnalysis, text);
    
    // Find related topics
    const relatedTopics = this.findRelatedTopics(semanticAnalysis.topics);
    
    // Update performance metrics
    const processingTime = Date.now() - startTime;
    this.updateSemanticMetrics(processingTime);
    
    // Enhanced result
    const enhancedResult: EnhancedProcessResult = {
      ...baseResult,
      semanticAnalysis,
      contextualRelevance,
      speakerProfile,
      followUpSuggestions,
      relatedTopics,
    };
    
    // Adjust shouldRespond based on semantic analysis
    if (semanticAnalysis.intent === 'question' || semanticAnalysis.urgency === 'high') {
      enhancedResult.shouldRespond = true;
    }
    
    return enhancedResult;
  }

  /**
   * Perform comprehensive semantic analysis
   */
  private performSemanticAnalysis(
    text: string, 
    speakerId: string, 
    context?: any
  ): SemanticAnalysis {
    // Check cache first
    const textHash = this.generateTextHash(text);
    const cached = this.semanticCache.get(textHash);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      cached.accessCount++;
      this.semanticMetrics.cacheHits++;
      return cached.analysis;
    }
    
    // Perform analysis
    const analysis: SemanticAnalysis = {
      intent: this.detectIntent(text),
      entities: this.extractEntities(text),
      sentiment: this.analyzeSentiment(text),
      topics: this.analyzeTopics(text),
      coherence: this.analyzeCoherence(text, speakerId),
      complexity: this.analyzeComplexity(text),
      urgency: this.detectUrgency(text),
      actionItems: this.extractActionItems(text),
      confidence: 0.8, // Will be calculated based on sub-analyses
    };
    
    // Calculate overall confidence
    analysis.confidence = this.calculateAnalysisConfidence(analysis);
    
    // Cache the result
    this.cacheSemanticAnalysis(textHash, analysis);
    
    this.semanticMetrics.totalAnalyses++;
    
    return analysis;
  }

  /**
   * Detect intent from text
   */
  private detectIntent(text: string): IntentType {
    const lowerText = text.toLowerCase().trim();
    
    // Question patterns
    if (lowerText.includes('?') || 
        /^(what|why|how|when|where|who|which|can|could|would|should|is|are|do|does|did|will)\b/.test(lowerText)) {
      return 'question';
    }
    
    // Request patterns
    if (/\b(please|can you|could you|would you|help|assist|need|want)\b/.test(lowerText)) {
      return 'request';
    }
    
    // Greeting patterns
    if (/\b(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(lowerText)) {
      return 'greeting';
    }
    
    // Instruction patterns
    if (/^(let's|we should|we need to|make sure|ensure|implement|create|build)\b/.test(lowerText)) {
      return 'instruction';
    }
    
    // Agreement patterns
    if (/\b(yes|agree|correct|exactly|absolutely|definitely|sounds good)\b/.test(lowerText)) {
      return 'agreement';
    }
    
    // Disagreement patterns
    if (/\b(no|disagree|wrong|incorrect|not sure|don't think)\b/.test(lowerText)) {
      return 'disagreement';
    }
    
    // Complaint patterns
    if (/\b(problem|issue|wrong|broken|not working|frustrated|annoyed)\b/.test(lowerText)) {
      return 'complaint';
    }
    
    // Compliment patterns
    if (/\b(great|excellent|amazing|wonderful|good job|well done)\b/.test(lowerText)) {
      return 'compliment';
    }
    
    // Information giving (default for statements)
    if (lowerText.length > 10 && !lowerText.includes('?')) {
      return 'information';
    }
    
    return 'other';
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    
    if (!this.enhancedConfig.enableEntityExtraction) {
      return entities;
    }
    
    // Extract using regex patterns
    for (const [entityType, patterns] of this.entityPatterns.entries()) {
      for (const pattern of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex
        
        while ((match = pattern.exec(text)) !== null) {
          entities.push({
            type: entityType,
            value: match[0],
            confidence: 0.9,
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          });
        }
      }
    }
    
    // Extract person names (simple heuristic)
    const personPattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    let match;
    while ((match = personPattern.exec(text)) !== null) {
      entities.push({
        type: 'person',
        value: match[0],
        confidence: 0.7,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
    
    return entities;
  }

  /**
   * Analyze sentiment
   */
  private analyzeSentiment(text: string): SentimentAnalysis {
    if (!this.enhancedConfig.enableSentimentAnalysis) {
      return {
        polarity: 0,
        subjectivity: 0.5,
        emotion: 'neutral',
        intensity: 0.5,
        confidence: 0.5,
      };
    }
    
    const words = text.toLowerCase().split(/\s+/);
    let totalPolarity = 0;
    let polarityCount = 0;
    
    // Calculate polarity based on sentiment lexicon
    for (const word of words) {
      const sentiment = this.sentimentLexicon.get(word);
      if (sentiment !== undefined) {
        totalPolarity += sentiment;
        polarityCount++;
      }
    }
    
    const polarity = polarityCount > 0 ? totalPolarity / polarityCount : 0;
    
    // Determine emotion
    let emotion: EmotionType = 'neutral';
    if (polarity > 0.5) emotion = 'joy';
    else if (polarity < -0.5) emotion = 'anger';
    else if (polarity > 0.2) emotion = 'surprise';
    else if (polarity < -0.2) emotion = 'sadness';
    
    // Check for specific emotional indicators
    if (/\b(excited|amazing|fantastic)\b/.test(text.toLowerCase())) emotion = 'excitement';
    if (/\b(frustrated|annoyed|angry)\b/.test(text.toLowerCase())) emotion = 'frustration';
    if (/\b(confused|not sure|unclear)\b/.test(text.toLowerCase())) emotion = 'confusion';
    
    return {
      polarity: Math.max(-1, Math.min(1, polarity)),
      subjectivity: polarityCount > 0 ? 0.8 : 0.2,
      emotion,
      intensity: Math.abs(polarity),
      confidence: polarityCount > 0 ? 0.8 : 0.3,
    };
  }

  /**
   * Analyze topics in text
   */
  private analyzeTopics(text: string): TopicAnalysis[] {
    if (!this.enhancedConfig.enableTopicModeling) {
      return [];
    }
    
    const topics: TopicAnalysis[] = [];
    const words = text.toLowerCase().split(/\s+/);
    
    // Find topic keywords
    const foundTopics = new Set<string>();
    const topicKeywords: { [topic: string]: string[] } = {};
    
    for (const word of words) {
      if (this.topicModelingKeywords.has(word)) {
        foundTopics.add(word);
        
        if (!topicKeywords[word]) {
          topicKeywords[word] = [];
        }
        topicKeywords[word].push(word);
      }
    }
    
    // Create topic analyses
    for (const topic of foundTopics) {
      const relevance = (topicKeywords[topic]?.length || 0) / words.length;
      
      let category: TopicCategory = 'technical';
      if (['meeting', 'schedule', 'agenda'].includes(topic)) category = 'meeting';
      if (['project', 'task', 'goal'].includes(topic)) category = 'project';
      if (['problem', 'issue', 'bug'].includes(topic)) category = 'problem';
      if (['decision', 'approval'].includes(topic)) category = 'decision';
      
      topics.push({
        topic,
        relevance,
        keywords: topicKeywords[topic] || [topic],
        category,
      });
    }
    
    return topics.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Analyze text coherence
   */
  private analyzeCoherence(text: string, speakerId: string): CoherenceMetrics {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    
    // Overall coherence based on text structure
    const overallCoherence = sentences.length > 0 ? Math.min(1, sentences.length / 3) : 0;
    
    // Logical flow (simplified - based on conjunctions and transitions)
    const transitionWords = ['however', 'therefore', 'because', 'although', 'furthermore', 'moreover'];
    const transitionCount = transitionWords.reduce((count, word) => 
      count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
    const logicalFlow = Math.min(1, transitionCount / sentences.length);
    
    // Topical consistency (simplified - based on topic keyword repetition)
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const topicalConsistency = uniqueWords.size > 0 ? 1 - (uniqueWords.size / words.length) : 0;
    
    // Referential cohesion (simplified - based on pronouns and references)
    const references = ['this', 'that', 'it', 'they', 'them', 'which', 'what'];
    const referenceCount = references.reduce((count, ref) => 
      count + (text.toLowerCase().includes(ref) ? 1 : 0), 0);
    const referentialCohesion = Math.min(1, referenceCount / sentences.length);
    
    // Temporal coherence (simplified - based on time indicators)
    const timeIndicators = ['then', 'next', 'after', 'before', 'finally', 'first', 'second'];
    const timeCount = timeIndicators.reduce((count, indicator) => 
      count + (text.toLowerCase().includes(indicator) ? 1 : 0), 0);
    const temporalCoherence = Math.min(1, timeCount / sentences.length);
    
    return {
      overallCoherence,
      logicalFlow,
      topicalConsistency,
      referentialCohesion,
      temporalCoherence,
    };
  }

  /**
   * Analyze text complexity
   */
  private analyzeComplexity(text: string): ComplexityMetrics {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    
    // Lexical diversity (Type-Token Ratio)
    const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0;
    
    // Syntactic complexity (average sentence length)
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const syntacticComplexity = Math.min(1, avgSentenceLength / 20); // Normalize to 0-1
    
    // Conceptual depth (simplified - based on abstract words and technical terms)
    const abstractWords = ['concept', 'idea', 'theory', 'principle', 'strategy', 'approach'];
    const abstractCount = abstractWords.reduce((count, word) => 
      count + (text.toLowerCase().includes(word) ? 1 : 0), 0);
    const conceptualDepth = Math.min(1, abstractCount / sentences.length);
    
    // Information density (content words vs total words)
    const contentWords = words.filter(word => 
      word.length > 3 && !['this', 'that', 'with', 'have', 'will', 'from'].includes(word.toLowerCase())
    );
    const informationDensity = words.length > 0 ? contentWords.length / words.length : 0;
    
    // Readability score (simplified Flesch-like formula)
    const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0;
    const avgSyllablesPerWord = 1.5; // Simplified assumption
    const readabilityScore = Math.max(0, Math.min(1, 
      (206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord) / 100
    ));
    
    return {
      lexicalDiversity,
      syntacticComplexity,
      conceptualDepth,
      informationDensity,
      readabilityScore,
    };
  }

  /**
   * Detect urgency level
   */
  private detectUrgency(text: string): UrgencyLevel {
    const lowerText = text.toLowerCase();
    
    // Critical urgency indicators
    if (/\b(urgent|critical|emergency|asap|immediately|now|crisis)\b/.test(lowerText)) {
      return 'critical';
    }
    
    // High urgency indicators
    if (/\b(important|priority|deadline|soon|quickly|fast|hurry)\b/.test(lowerText)) {
      return 'high';
    }
    
    // Low urgency indicators
    if (/\b(later|eventually|sometime|when convenient|no rush)\b/.test(lowerText)) {
      return 'low';
    }
    
    // Check for question marks (questions often need responses)
    if (text.includes('?')) {
      return 'normal';
    }
    
    return 'normal';
  }

  /**
   * Extract action items from text
   */
  private extractActionItems(text: string): ActionItem[] {
    if (!this.enhancedConfig.enableActionItemExtraction) {
      return [];
    }
    
    const actionItems: ActionItem[] = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim().toLowerCase();
      
      // Look for action verbs
      for (const verb of this.actionVerbs) {
        if (trimmed.includes(verb)) {
          // Check if it's actually an action item
          if (/\b(need to|should|must|will|going to|plan to)\b/.test(trimmed) ||
              /\b(let's|we should|can you|please)\b/.test(trimmed)) {
            
            actionItems.push({
              id: nanoid(),
              action: sentence.trim(),
              priority: this.detectUrgency(sentence),
              confidence: 0.7,
            });
            break; // Only one action item per sentence
          }
        }
      }
    }
    
    return actionItems;
  }

  /**
   * Calculate overall analysis confidence
   */
  private calculateAnalysisConfidence(analysis: SemanticAnalysis): number {
    const weights = {
      intent: 0.2,
      sentiment: 0.2,
      entities: 0.15,
      topics: 0.15,
      coherence: 0.15,
      complexity: 0.1,
      urgency: 0.05,
    };
    
    let totalConfidence = 0;
    
    // Intent confidence (based on pattern matching strength)
    totalConfidence += weights.intent * (analysis.intent !== 'other' ? 0.8 : 0.3);
    
    // Sentiment confidence
    totalConfidence += weights.sentiment * analysis.sentiment.confidence;
    
    // Entity confidence
    const avgEntityConfidence = analysis.entities.length > 0 ? 
      analysis.entities.reduce((sum, e) => sum + e.confidence, 0) / analysis.entities.length : 0.5;
    totalConfidence += weights.entities * avgEntityConfidence;
    
    // Topic confidence
    const avgTopicRelevance = analysis.topics.length > 0 ?
      analysis.topics.reduce((sum, t) => sum + t.relevance, 0) / analysis.topics.length : 0.5;
    totalConfidence += weights.topics * avgTopicRelevance;
    
    // Coherence confidence
    totalConfidence += weights.coherence * analysis.coherence.overallCoherence;
    
    // Complexity confidence (normalized)
    totalConfidence += weights.complexity * analysis.complexity.readabilityScore;
    
    // Urgency confidence
    totalConfidence += weights.urgency * (analysis.urgency !== 'normal' ? 0.8 : 0.6);
    
    return Math.max(0, Math.min(1, totalConfidence));
  }

  // Utility and helper methods

  private generateTextHash(text: string): string {
    // Simple hash for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private cacheSemanticAnalysis(textHash: string, analysis: SemanticAnalysis): void {
    // Clean cache if it's getting too large
    if (this.semanticCache.size >= this.enhancedConfig.semanticCacheSize) {
      this.cleanupSemanticCache();
    }
    
    this.semanticCache.set(textHash, {
      textHash,
      analysis,
      timestamp: Date.now(),
      accessCount: 1,
    });
  }

  private cleanupSemanticCache(): void {
    const entries = Array.from(this.semanticCache.entries());
    const cutoffTime = Date.now() - 3600000; // 1 hour
    
    // Remove old entries
    entries.forEach(([hash, cache]) => {
      if (cache.timestamp < cutoffTime) {
        this.semanticCache.delete(hash);
      }
    });
    
    // If still too large, remove least accessed entries
    if (this.semanticCache.size >= this.enhancedConfig.semanticCacheSize) {
      const sortedEntries = entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
      const toRemove = sortedEntries.slice(0, Math.floor(this.enhancedConfig.semanticCacheSize * 0.3));
      
      toRemove.forEach(([hash]) => {
        this.semanticCache.delete(hash);
      });
    }
    
    this.semanticMetrics.lastCleanup = Date.now();
  }

  private updateConversationContext(
    speakerId: string, 
    text: string, 
    timestamp: number, 
    semanticAnalysis: SemanticAnalysis
  ): void {
    if (!this.conversationContext.has(speakerId)) {
      this.conversationContext.set(speakerId, {
        speakerId,
        utterances: [],
        activeTopics: new Set(),
        speakerProfile: {
          preferredTopics: [],
          speakingStyle: 'neutral',
          emotionalBaseline: 'neutral',
          complexityLevel: 0.5,
        },
        ongoingActionItems: [],
      });
    }
    
    const context = this.conversationContext.get(speakerId)!;
    
    // Add utterance
    context.utterances.push({
      text,
      timestamp,
      semanticAnalysis,
    });
    
    // Maintain context window size
    if (context.utterances.length > this.enhancedConfig.contextWindowSize) {
      context.utterances.shift();
    }
    
    // Update active topics
    semanticAnalysis.topics.forEach(topic => {
      context.activeTopics.add(topic.topic);
    });
    
    // Update action items
    context.ongoingActionItems.push(...semanticAnalysis.actionItems);
  }

  private calculateContextualRelevance(text: string, speakerId: string): number {
    const context = this.conversationContext.get(speakerId);
    if (!context || context.utterances.length === 0) {
      return 0.5; // Default relevance
    }
    
    // Calculate relevance based on topic overlap and semantic similarity
    const currentTopics = this.analyzeTopics(text).map(t => t.topic);
    const overlapCount = currentTopics.filter(topic => 
      context.activeTopics.has(topic)
    ).length;
    
    const topicRelevance = currentTopics.length > 0 ? 
      overlapCount / currentTopics.length : 0;
    
    return Math.max(0.1, Math.min(1, topicRelevance * 1.5));
  }

  private analyzeSpeakerProfile(speakerId: string) {
    const context = this.conversationContext.get(speakerId);
    if (!context || context.utterances.length === 0) {
      return {
        speakingPatterns: [],
        emotionalState: 'neutral' as EmotionType,
        engagementLevel: 0.5,
      };
    }
    
    const recentUtterances = context.utterances.slice(-5);
    
    // Analyze speaking patterns
    const patterns: string[] = [];
    const avgComplexity = recentUtterances.reduce((sum, u) => 
      sum + (u.semanticAnalysis?.complexity.lexicalDiversity || 0), 0) / recentUtterances.length;
    
    if (avgComplexity > 0.7) patterns.push('uses complex vocabulary');
    if (avgComplexity < 0.3) patterns.push('uses simple language');
    
    // Determine emotional state
    const emotions = recentUtterances.map(u => u.semanticAnalysis?.sentiment.emotion || 'neutral');
    const emotionalState = emotions[emotions.length - 1] as EmotionType;
    
    // Calculate engagement level
    const avgUrgency = recentUtterances.reduce((sum, u) => {
      const urgency = u.semanticAnalysis?.urgency || 'normal';
      return sum + (['low', 'normal', 'high', 'critical'].indexOf(urgency) / 3);
    }, 0) / recentUtterances.length;
    
    return {
      speakingPatterns: patterns,
      emotionalState,
      engagementLevel: Math.max(0, Math.min(1, avgUrgency)),
    };
  }

  private generateFollowUpSuggestions(analysis: SemanticAnalysis, text: string): string[] {
    const suggestions: string[] = [];
    
    // Based on intent
    switch (analysis.intent) {
      case 'question':
        suggestions.push('Provide a direct answer');
        suggestions.push('Ask for clarification if needed');
        break;
      case 'request':
        suggestions.push('Acknowledge the request');
        suggestions.push('Confirm feasibility and timeline');
        break;
      case 'complaint':
        suggestions.push('Acknowledge the concern');
        suggestions.push('Propose a solution');
        break;
      case 'information':
        suggestions.push('Summarize key points');
        suggestions.push('Ask follow-up questions');
        break;
    }
    
    // Based on urgency
    if (analysis.urgency === 'high' || analysis.urgency === 'critical') {
      suggestions.push('Address urgently');
      suggestions.push('Provide immediate timeline');
    }
    
    // Based on action items
    if (analysis.actionItems.length > 0) {
      suggestions.push('Confirm action items');
      suggestions.push('Assign responsibilities');
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  private findRelatedTopics(topics: TopicAnalysis[]): string[] {
    const relatedTopics: string[] = [];
    
    for (const topic of topics) {
      // Simple topic expansion based on category
      switch (topic.category) {
        case 'technical':
          relatedTopics.push('implementation', 'architecture', 'testing');
          break;
        case 'project':
          relatedTopics.push('timeline', 'resources', 'deliverables');
          break;
        case 'meeting':
          relatedTopics.push('agenda', 'participants', 'follow-up');
          break;
        case 'problem':
          relatedTopics.push('solution', 'root cause', 'prevention');
          break;
      }
    }
    
    return [...new Set(relatedTopics)].slice(0, 5);
  }

  private updateSemanticMetrics(processingTime: number): void {
    this.semanticMetrics.averageProcessingTime = 
      (this.semanticMetrics.averageProcessingTime * (this.semanticMetrics.totalAnalyses - 1) + processingTime) / 
      this.semanticMetrics.totalAnalyses;
  }

  // Public API extensions

  /**
   * Get semantic analysis metrics
   */
  getSemanticMetrics() {
    return {
      ...this.semanticMetrics,
      cacheSize: this.semanticCache.size,
      cacheHitRate: this.semanticMetrics.totalAnalyses > 0 ? 
        this.semanticMetrics.cacheHits / this.semanticMetrics.totalAnalyses : 0,
      contextSize: this.conversationContext.size,
    };
  }

  /**
   * Get conversation context for a speaker
   */
  getConversationContext(speakerId: string): ConversationContext | null {
    return this.conversationContext.get(speakerId) || null;
  }

  /**
   * Update enhanced configuration
   */
  updateEnhancedConfig(config: Partial<EnhancedFragmentProcessorConfig>): void {
    this.enhancedConfig = { ...this.enhancedConfig, ...config };
  }

  /**
   * Clear all semantic caches and context
   */
  clearSemanticData(): void {
    this.semanticCache.clear();
    this.conversationContext.clear();
    this.semanticMetrics = {
      totalAnalyses: 0,
      cacheHits: 0,
      averageProcessingTime: 0,
      accuracyScore: 0,
      lastCleanup: Date.now(),
    };
  }
}

// Export singleton instance
export const enhancedFragmentProcessor = new EnhancedFragmentProcessor();