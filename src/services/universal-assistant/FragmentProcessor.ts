import { FragmentDetector, FragmentAnalysis } from './FragmentDetector';

// Enhanced Phase 3 semantic analysis types
export interface SemanticAnalysis {
  intent: IntentClassification;
  entities: EntityExtraction[];
  sentiment: SentimentAnalysis;
  topics: TopicAnalysis[];
  coherence: CoherenceMetrics;
  complexity: ComplexityAnalysis;
  urgency: UrgencyLevel;
  actionItems: ActionItem[];
  confidence: number;
}

export interface IntentClassification {
  primary: string;
  secondary?: string;
  confidence: number;
  category: 'question' | 'command' | 'statement' | 'exclamation' | 'greeting' | 'farewell';
}

export interface EntityExtraction {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export interface SentimentAnalysis {
  polarity: 'positive' | 'negative' | 'neutral';
  intensity: number; // 0-1
  emotions: Record<string, number>;
}

export interface TopicAnalysis {
  topic: string;
  relevance: number;
  keywords: string[];
}

export interface CoherenceMetrics {
  sentenceFlow: number;
  topicConsistency: number;
  semanticCohesion: number;
  overallScore: number;
}

export interface ComplexityAnalysis {
  syntactic: number;
  semantic: number;
  vocabulary: number;
  overall: number;
}

export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface ActionItem {
  text: string;
  type: 'task' | 'reminder' | 'decision' | 'follow_up';
  confidence: number;
  dueContext?: string;
}

export interface ProcessResult {
  type: 'COMPLETE' | 'AGGREGATED' | 'FRAGMENT';
  text?: string;
  shouldRespond: boolean;
  shouldWait?: boolean;
  summary?: string;
  confidence?: number;
  fragmentAnalysis?: FragmentAnalysis;
  semanticAnalysis?: SemanticAnalysis; // Enhanced Phase 3 addition
}

export interface FragmentBuffer {
  speakerId: string;
  fragments: Array<{
    text: string;
    timestamp: number;
    confidence: number;
  }>;
  lastActivity: number;
  totalSilence: number;
}

export interface FragmentProcessorConfig {
  silenceThreshold: number;
  bufferTimeout: number;
  minFragmentsForAggregation: number;
  maxBufferSize: number;
  confidenceThreshold: number;
  // Enhanced Phase 3 semantic analysis configuration
  enableSemanticAnalysis: boolean;
  semanticAnalysisDepth: 'basic' | 'standard' | 'deep';
  enableEmotionDetection: boolean;
  enableActionItemExtraction: boolean;
  contextWindow: number; // Number of previous utterances to consider for context
}

export class FragmentProcessor {
  private fragmentBuffer: Map<string, FragmentBuffer> = new Map();
  private fragmentDetector: FragmentDetector;
  private config: FragmentProcessorConfig;
  
  // Enhanced Phase 3 properties
  private conversationHistory: Array<{ text: string; speakerId: string; timestamp: number; }> = [];
  private semanticCache: Map<string, SemanticAnalysis> = new Map();
  
  constructor(config?: Partial<FragmentProcessorConfig>) {
    this.fragmentDetector = new FragmentDetector();
    this.config = {
      silenceThreshold: 2000, // 2 seconds
      bufferTimeout: 10000,   // 10 seconds
      minFragmentsForAggregation: 2,
      maxBufferSize: 10,
      confidenceThreshold: 0.6,
      // Enhanced Phase 3 defaults
      enableSemanticAnalysis: true,
      semanticAnalysisDepth: 'standard',
      enableEmotionDetection: true,
      enableActionItemExtraction: true,
      contextWindow: 5,
      ...config,
    };
  }

  processInput(
    text: string,
    speakerId: string,
    timestamp: number,
    context?: {
      speakerChanged?: boolean;
      silenceDuration?: number;
      previousUtterances?: string[];
    }
  ): ProcessResult {
    console.log('[FragmentProcessor] Received input:', {
      text,
      speakerId,
      timestamp,
      context
    });
    
    const trimmedText = text.trim();
    if (!trimmedText) {
      console.log('[FragmentProcessor] Empty text after trimming, returning FRAGMENT');
      return { type: 'FRAGMENT', shouldRespond: false, shouldWait: true };
    }

    // Update conversation history
    this.updateConversationHistory(trimmedText, speakerId, timestamp);
    console.log('[FragmentProcessor] Updated conversation history, total entries:', this.conversationHistory.length);

    // Analyze the fragment using existing FragmentDetector
    const analysis = this.fragmentDetector.analyzeUtterance(trimmedText, {
      previousUtterances: context?.previousUtterances,
      speakerPaused: context?.silenceDuration ? context.silenceDuration > 1000 : false,
      pauseDuration: context?.silenceDuration,
    });

    // Enhanced Phase 3: Perform semantic analysis
    const semanticAnalysis = this.config.enableSemanticAnalysis 
      ? this.performSemanticAnalysis(trimmedText, speakerId, context)
      : undefined;

    // Check if this is a complete thought
    if (this.isCompleteThought(trimmedText, analysis)) {
      // Clear any existing fragments for this speaker
      this.clearBuffer(speakerId);
      
      return {
        type: 'COMPLETE',
        text: trimmedText,
        shouldRespond: analysis.suggestedAction === 'respond',
        confidence: analysis.confidence,
        fragmentAnalysis: analysis,
        semanticAnalysis,
      };
    }

    // Add to fragment buffer
    this.addToBuffer(speakerId, trimmedText, timestamp, analysis.confidence);

    // Check if we should process accumulated fragments
    if (this.shouldProcessBuffer(speakerId, timestamp, context)) {
      const aggregated = this.aggregateFragments(speakerId);
      const summary = this.generateSummary(aggregated);
      
      // Perform semantic analysis on aggregated text
      const aggregatedSemanticAnalysis = this.config.enableSemanticAnalysis 
        ? this.performSemanticAnalysis(aggregated, speakerId, context)
        : undefined;
      
      return {
        type: 'AGGREGATED',
        text: aggregated,
        shouldRespond: this.shouldRespondToAggregated(aggregated),
        summary,
        fragmentAnalysis: analysis,
        semanticAnalysis: aggregatedSemanticAnalysis,
      };
    }

    return { 
      type: 'FRAGMENT', 
      shouldRespond: false, 
      shouldWait: true,
      fragmentAnalysis: analysis,
      semanticAnalysis,
    };
  }

  private isCompleteThought(text: string, analysis: FragmentAnalysis): boolean {
    // Use the existing fragment detector's analysis
    if (analysis.isComplete && analysis.confidence > this.config.confidenceThreshold) {
      return true;
    }

    // Additional checks for completeness
    const hasStrongEnding = /[.!?]\s*$/.test(text);
    const isDirectQuestion = analysis.type === 'question' && text.length > 10;
    const isCommand = /^(please|can you|could you|would you)/i.test(text);
    
    return hasStrongEnding || isDirectQuestion || isCommand;
  }

  private addToBuffer(
    speakerId: string, 
    text: string, 
    timestamp: number, 
    confidence: number
  ): void {
    if (!this.fragmentBuffer.has(speakerId)) {
      this.fragmentBuffer.set(speakerId, {
        speakerId,
        fragments: [],
        lastActivity: timestamp,
        totalSilence: 0,
      });
    }

    const buffer = this.fragmentBuffer.get(speakerId)!;
    
    // Add fragment to buffer
    buffer.fragments.push({
      text: text.trim(),
      timestamp,
      confidence,
    });

    // Maintain buffer size limit
    if (buffer.fragments.length > this.config.maxBufferSize) {
      buffer.fragments.shift(); // Remove oldest fragment
    }

    buffer.lastActivity = timestamp;
  }

  private shouldProcessBuffer(
    speakerId: string, 
    timestamp: number, 
    context?: {
      speakerChanged?: boolean;
      silenceDuration?: number;
    }
  ): boolean {
    const buffer = this.fragmentBuffer.get(speakerId);
    if (!buffer || buffer.fragments.length < this.config.minFragmentsForAggregation) {
      return false;
    }

    // Process if speaker changed
    if (context?.speakerChanged) {
      return true;
    }

    // Process if silence threshold exceeded
    if (context?.silenceDuration && context.silenceDuration > this.config.silenceThreshold) {
      return true;
    }

    // Process if buffer timeout reached
    const timeSinceLastActivity = timestamp - buffer.lastActivity;
    if (timeSinceLastActivity > this.config.bufferTimeout) {
      return true;
    }

    // Process if buffer is getting full
    if (buffer.fragments.length >= this.config.maxBufferSize - 1) {
      return true;
    }

    return false;
  }

  private aggregateFragments(speakerId: string): string {
    const buffer = this.fragmentBuffer.get(speakerId);
    if (!buffer || buffer.fragments.length === 0) {
      return '';
    }

    // Sort fragments by timestamp
    const sortedFragments = buffer.fragments.sort((a, b) => a.timestamp - b.timestamp);
    
    // Combine fragments with intelligent spacing
    let aggregated = '';
    for (let i = 0; i < sortedFragments.length; i++) {
      const fragment = sortedFragments[i];
      const text = fragment.text.trim();
      
      if (i === 0) {
        aggregated = text;
      } else {
        // Add appropriate spacing/punctuation
        const needsSpace = !aggregated.endsWith(' ') && !text.startsWith(' ');
        const needsPunctuation = this.shouldAddPunctuation(aggregated, text);
        
        if (needsPunctuation && !aggregated.match(/[.!?]$/)) {
          aggregated += ',';
        }
        
        aggregated += needsSpace ? ' ' + text : text;
      }
    }

    // Clear the buffer after aggregation
    this.clearBuffer(speakerId);

    return aggregated.trim();
  }

  private shouldAddPunctuation(previous: string, current: string): boolean {
    // Add comma if transitioning between different sentence structures
    const previousEndsWithWord = /\w$/.test(previous);
    const currentStartsWithWord = /^\w/.test(current);
    const isConjunction = /^(and|but|or|so|because|since|although)/i.test(current);
    
    return previousEndsWithWord && currentStartsWithWord && !isConjunction;
  }

  private generateSummary(aggregatedText: string): string {
    if (!aggregatedText || aggregatedText.length < 20) {
      return aggregatedText;
    }

    // Simple extractive summary - take first and key sentences
    const sentences = aggregatedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 2) {
      return aggregatedText;
    }

    // Take first sentence and any question sentences
    const summary: string[] = [];
    summary.push(sentences[0].trim());
    
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i].trim();
      if (sentence.includes('?') || sentence.length > 50) {
        summary.push(sentence);
        break;
      }
    }

    return summary.join('. ') + (summary[summary.length - 1].endsWith('?') ? '' : '.');
  }

  private shouldRespondToAggregated(aggregatedText: string): boolean {
    // Check for question indicators
    const hasQuestion = /\?/.test(aggregatedText);
    const hasQuestionWords = /\b(what|why|how|when|where|who|can|could|would|should)\b/i.test(aggregatedText);
    
    // Check for request indicators
    const hasRequest = /\b(please|can you|could you|would you|help|assist)\b/i.test(aggregatedText);
    
    return hasQuestion || hasQuestionWords || hasRequest;
  }

  private clearBuffer(speakerId: string): void {
    this.fragmentBuffer.delete(speakerId);
  }

  // Public methods for external control
  public clearAllBuffers(): void {
    this.fragmentBuffer.clear();
    this.conversationHistory = [];
    this.semanticCache.clear();
  }

  public getBufferStatus(speakerId?: string): FragmentBuffer[] | FragmentBuffer | null {
    if (speakerId) {
      return this.fragmentBuffer.get(speakerId) || null;
    }
    return Array.from(this.fragmentBuffer.values());
  }

  public updateConfig(config: Partial<FragmentProcessorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): FragmentProcessorConfig {
    return { ...this.config };
  }

  // Enhanced Phase 3 public API methods
  public getSemanticAnalysis(text: string, speakerId: string): SemanticAnalysis | null {
    if (!this.config.enableSemanticAnalysis) return null;
    return this.performSemanticAnalysis(text, speakerId);
  }

  public getConversationHistory(): Array<{ text: string; speakerId: string; timestamp: number; }> {
    return [...this.conversationHistory];
  }

  public clearSemanticCache(): void {
    this.semanticCache.clear();
  }

  public getSemanticCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.semanticCache.size,
      maxSize: 100
    };
  }

  public enableSemanticAnalysis(enabled: boolean): void {
    this.config.enableSemanticAnalysis = enabled;
  }

  public setSemanticAnalysisDepth(depth: 'basic' | 'standard' | 'deep'): void {
    this.config.semanticAnalysisDepth = depth;
    // Clear cache when depth changes
    this.semanticCache.clear();
  }

  public enableEmotionDetection(enabled: boolean): void {
    this.config.enableEmotionDetection = enabled;
  }

  public enableActionItemExtraction(enabled: boolean): void {
    this.config.enableActionItemExtraction = enabled;
  }

  public setContextWindow(size: number): void {
    this.config.contextWindow = Math.max(1, Math.min(size, 20)); // Limit between 1-20
    // Trim conversation history if needed
    if (this.conversationHistory.length > this.config.contextWindow * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.contextWindow * 2);
    }
  }

  public isSemanticAnalysisEnabled(): boolean {
    return this.config.enableSemanticAnalysis;
  }

  // Enhanced Phase 3: Semantic Analysis Methods
  private updateConversationHistory(text: string, speakerId: string, timestamp: number): void {
    this.conversationHistory.push({ text, speakerId, timestamp });
    
    // Maintain context window size
    if (this.conversationHistory.length > this.config.contextWindow * 2) {
      this.conversationHistory = this.conversationHistory.slice(-this.config.contextWindow * 2);
    }
  }

  private performSemanticAnalysis(text: string, speakerId: string, context?: any): SemanticAnalysis {
    // Check cache first
    const cacheKey = `${text}_${speakerId}_${this.config.semanticAnalysisDepth}`;
    if (this.semanticCache.has(cacheKey)) {
      return this.semanticCache.get(cacheKey)!;
    }

    const analysis: SemanticAnalysis = {
      intent: this.detectIntent(text),
      entities: this.extractEntities(text),
      sentiment: this.analyzeSentiment(text),
      topics: this.analyzeTopics(text),
      coherence: this.analyzeCoherence(text, speakerId),
      complexity: this.analyzeComplexity(text),
      urgency: this.detectUrgency(text),
      actionItems: this.config.enableActionItemExtraction ? this.extractActionItems(text) : [],
      confidence: 0.8 // Base confidence, would be improved with ML models
    };

    // Cache the result
    this.semanticCache.set(cacheKey, analysis);
    
    // Maintain cache size
    if (this.semanticCache.size > 100) {
      const oldestKey = this.semanticCache.keys().next().value;
      if (oldestKey) {
        this.semanticCache.delete(oldestKey);
      }
    }

    return analysis;
  }

  private detectIntent(text: string): IntentClassification {
    const normalizedText = text.toLowerCase().trim();
    
    // Question patterns
    if (normalizedText.includes('?') || /^(what|why|how|when|where|who|can|could|would|should|is|are|do|does|did|will)\b/.test(normalizedText)) {
      return {
        primary: 'information_seeking',
        confidence: 0.9,
        category: 'question'
      };
    }
    
    // Command patterns
    if (/^(please|can you|could you|would you|help|assist|do|go|stop|start|create|make|build|show|tell)/i.test(normalizedText)) {
      return {
        primary: 'action_request',
        confidence: 0.85,
        category: 'command'
      };
    }
    
    // Greeting patterns
    if (/^(hello|hi|hey|good morning|good afternoon|good evening|greetings)/i.test(normalizedText)) {
      return {
        primary: 'greeting',
        confidence: 0.9,
        category: 'greeting'
      };
    }
    
    // Farewell patterns
    if (/^(goodbye|bye|see you|farewell|good night|talk to you)/i.test(normalizedText)) {
      return {
        primary: 'farewell',
        confidence: 0.9,
        category: 'farewell'
      };
    }

    // Default to statement
    return {
      primary: 'statement',
      confidence: 0.6,
      category: 'statement'
    };
  }

  private extractEntities(text: string): EntityExtraction[] {
    const entities: EntityExtraction[] = [];
    
    // Simple entity extraction patterns
    // Time entities
    const timePatterns = [
      /\b(\d{1,2}:\d{2}(?:\s?[ap]m)?)\b/gi,
      /\b(tomorrow|today|yesterday|next week|last week)\b/gi,
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi
    ];
    
    timePatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        entities.push({
          type: 'TIME',
          value: match[1],
          startIndex: match.index,
          endIndex: match.index + match[1].length,
          confidence: 0.8
        });
      }
    });
    
    // Number entities
    const numberPattern = /\b(\d+(?:\.\d+)?)\b/g;
    let match;
    while ((match = numberPattern.exec(text)) !== null) {
      entities.push({
        type: 'NUMBER',
        value: match[1],
        startIndex: match.index,
        endIndex: match.index + match[1].length,
        confidence: 0.7
      });
    }
    
    return entities;
  }

  private analyzeSentiment(text: string): SentimentAnalysis {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'frustrated', 'disappointed', 'sad'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveScore = 0;
    let negativeScore = 0;
    
    words.forEach(word => {
      if (positiveWords.includes(word)) positiveScore++;
      if (negativeWords.includes(word)) negativeScore++;
    });
    
    const totalSentimentWords = positiveScore + negativeScore;
    let polarity: 'positive' | 'negative' | 'neutral' = 'neutral';
    let intensity = 0;
    
    if (totalSentimentWords > 0) {
      if (positiveScore > negativeScore) {
        polarity = 'positive';
        intensity = positiveScore / words.length;
      } else if (negativeScore > positiveScore) {
        polarity = 'negative';
        intensity = negativeScore / words.length;
      }
    }
    
    // Basic emotion detection
    const emotions: Record<string, number> = {
      joy: positiveWords.filter(word => words.includes(word)).length / words.length,
      anger: negativeWords.filter(word => ['angry', 'frustrated', 'hate'].includes(word) && words.includes(word)).length / words.length,
      sadness: negativeWords.filter(word => ['sad', 'disappointed'].includes(word) && words.includes(word)).length / words.length
    };
    
    return {
      polarity,
      intensity: Math.min(intensity * 2, 1), // Scale up intensity
      emotions
    };
  }

  private analyzeTopics(text: string): TopicAnalysis[] {
    const topicKeywords = {
      'technology': ['computer', 'software', 'app', 'website', 'code', 'programming', 'ai', 'tech'],
      'business': ['meeting', 'project', 'deadline', 'client', 'revenue', 'strategy', 'market'],
      'personal': ['family', 'friend', 'home', 'vacation', 'hobby', 'health', 'personal'],
      'education': ['learn', 'study', 'school', 'university', 'course', 'education', 'training']
    };
    
    const words = text.toLowerCase().split(/\s+/);
    const topics: TopicAnalysis[] = [];
    
    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      const matchingKeywords = keywords.filter(keyword => words.includes(keyword));
      if (matchingKeywords.length > 0) {
        topics.push({
          topic,
          relevance: matchingKeywords.length / keywords.length,
          keywords: matchingKeywords
        });
      }
    });
    
    return topics.sort((a, b) => b.relevance - a.relevance);
  }

  private analyzeCoherence(text: string, speakerId: string): CoherenceMetrics {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Basic coherence metrics
    const sentenceFlow = sentences.length > 1 ? 
      sentences.reduce((score, sentence, index) => {
        if (index === 0) return score;
        // Simple heuristic: check for connecting words
        const connectingWords = ['and', 'but', 'so', 'because', 'also', 'however', 'therefore'];
        const hasConnection = connectingWords.some(word => sentence.toLowerCase().includes(word));
        return score + (hasConnection ? 1 : 0);
      }, 0) / (sentences.length - 1) : 1;
    
    // Topic consistency based on recent conversation
    const recentUtterances = this.conversationHistory
      .filter(h => h.speakerId === speakerId)
      .slice(-this.config.contextWindow)
      .map(h => h.text);
    
    const topicConsistency = recentUtterances.length > 1 ? 
      this.calculateTopicOverlap(text, recentUtterances) : 1;
    
    const semanticCohesion = this.calculateSemanticCohesion(text);
    
    return {
      sentenceFlow,
      topicConsistency,
      semanticCohesion,
      overallScore: (sentenceFlow + topicConsistency + semanticCohesion) / 3
    };
  }

  private calculateTopicOverlap(currentText: string, previousTexts: string[]): number {
    const currentWords = new Set(currentText.toLowerCase().split(/\s+/));
    const previousWords = new Set(previousTexts.join(' ').toLowerCase().split(/\s+/));
    
    const intersection = new Set(Array.from(currentWords).filter(word => previousWords.has(word)));
    const union = new Set([...Array.from(currentWords), ...Array.from(previousWords)]);
    
    return intersection.size / union.size;
  }

  private calculateSemanticCohesion(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 1) return 1;
    
    // Simple heuristic: check for pronoun references and word repetition
    let cohesionScore = 0;
    const pronouns = ['it', 'this', 'that', 'they', 'them', 'he', 'she'];
    
    for (let i = 1; i < sentences.length; i++) {
      const sentence = sentences[i].toLowerCase();
      const prevSentence = sentences[i - 1].toLowerCase();
      
      // Check for pronouns (indicating reference to previous sentence)
      const hasPronouns = pronouns.some(pronoun => sentence.includes(pronoun));
      
      // Check for word overlap
      const currentWords = new Set(sentence.split(/\s+/));
      const prevWords = new Set(prevSentence.split(/\s+/));
      const overlap = Array.from(currentWords).filter(word => prevWords.has(word)).length;
      
      cohesionScore += (hasPronouns ? 0.3 : 0) + (overlap > 0 ? overlap / Math.max(currentWords.size, prevWords.size) : 0);
    }
    
    return Math.min(cohesionScore / (sentences.length - 1), 1);
  }

  private analyzeComplexity(text: string): ComplexityAnalysis {
    const words = text.split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Syntactic complexity: average sentence length and nested clauses
    const avgSentenceLength = words.length / sentences.length;
    const syntactic = Math.min(avgSentenceLength / 15, 1); // Normalize to 0-1
    
    // Semantic complexity: unique words ratio and sophisticated vocabulary
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const semanticComplexityWords = ['however', 'therefore', 'consequently', 'nevertheless', 'furthermore'];
    const complexWords = words.filter(word => 
      word.length > 7 || semanticComplexityWords.includes(word.toLowerCase())
    );
    
    const semantic = Math.min((complexWords.length / words.length) * 2, 1);
    
    // Vocabulary complexity: word length and diversity
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const vocabulary = Math.min(avgWordLength / 8, 1); // Normalize to 0-1
    
    return {
      syntactic,
      semantic,
      vocabulary,
      overall: (syntactic + semantic + vocabulary) / 3
    };
  }

  private detectUrgency(text: string): UrgencyLevel {
    const urgentWords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'now', 'quickly'];
    const highPriorityWords = ['important', 'priority', 'deadline', 'soon'];
    
    const normalizedText = text.toLowerCase();
    
    if (urgentWords.some(word => normalizedText.includes(word))) {
      return 'critical';
    }
    
    if (highPriorityWords.some(word => normalizedText.includes(word))) {
      return 'high';
    }
    
    // Check for exclamation marks as urgency indicators
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount >= 2) {
      return 'high';
    } else if (exclamationCount === 1) {
      return 'normal';
    }
    
    return 'low';
  }

  private extractActionItems(text: string): ActionItem[] {
    const actionPatterns = [
      { pattern: /\b(need to|have to|must|should|will|going to)\s+(.+?)(?=\.|$)/gi, type: 'task' as const },
      { pattern: /\b(remind me|don't forget|remember to)\s+(.+?)(?=\.|$)/gi, type: 'reminder' as const },
      { pattern: /\b(decide|choose|determine|figure out)\s+(.+?)(?=\.|$)/gi, type: 'decision' as const },
      { pattern: /\b(follow up|check back|get back to)\s+(.+?)(?=\.|$)/gi, type: 'follow_up' as const }
    ];
    
    const actionItems: ActionItem[] = [];
    
    actionPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const dueContext = this.extractDueContext(match[0]);
        actionItems.push({
          text: match[2].trim(),
          type,
          confidence: 0.7,
          ...(dueContext && { dueContext })
        });
      }
    });
    
    return actionItems;
  }

  private extractDueContext(actionText: string): string | undefined {
    const timePatterns = [
      /\b(by|before|until)\s+([^.]+)/i,
      /\b(today|tomorrow|next week|this week)/i,
      /\b(\d{1,2}:\d{2}(?:\s?[ap]m)?)/i
    ];
    
    for (const pattern of timePatterns) {
      const match = actionText.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return undefined;
  }

  // Utility method to check if conversation has ended
  public detectConversationEnd(
    utterances: string[], 
    pauseDuration: number, 
    speakerId: string
  ): boolean {
    const hasBufferedFragments = this.fragmentBuffer.has(speakerId);
    const fragmentDetectorResult = this.fragmentDetector.detectConversationEnd(utterances, pauseDuration);
    
    // If fragment detector says conversation ended and no buffered fragments, confirm end
    return fragmentDetectorResult && !hasBufferedFragments;
  }
}

export const fragmentProcessor = new FragmentProcessor();
