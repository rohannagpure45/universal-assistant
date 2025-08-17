import { DiarizationService, Speaker } from './DiarizationService';
import { VoiceProfileService } from './VoiceProfileService';

export interface NameDetectionResult {
  names: DetectedName[];
  confidence: number;
  suggestions: NameSuggestion[];
}

export interface DetectedName {
  name: string;
  confidence: number;
  context: string;
  position: { start: number; end: number };
  type: 'introduction' | 'mention' | 'reference';
}

export interface NameSuggestion {
  speakerId: string;
  suggestedName: string;
  confidence: number;
  evidence: string[];
  needsConfirmation: boolean;
}

export interface NameRecognitionConfig {
  contextWindow: number;
  confidenceThreshold: number;
  minNameLength: number;
  maxNameLength: number;
  enableLearning: boolean;
  requireConfirmation: boolean;
}

export interface NameContext {
  previousTranscripts: string[];
  speakerHistory: Map<string, string[]>;
  currentSpeaker: string;
  conversationContext: string[];
}

export class NameRecognitionService {
  private knownNames: Set<string> = new Set();
  private namePatterns: Map<string, RegExp> = new Map();
  private contextClues: Map<string, number> = new Map();
  private negativePossessiveContexts: Set<string> = new Set([
    "it's",
    'its',
    "that's",
    "there's",
    "here's",
    "who's",
    "what's",
  ]);
  private speakerNameMap: Map<string, string> = new Map();
  private pendingSuggestions: Map<string, NameSuggestion[]> = new Map();
  private config: NameRecognitionConfig;

  constructor(
    private diarizationService: DiarizationService,
    private voiceProfileService?: VoiceProfileService,
    config?: Partial<NameRecognitionConfig>
  ) {
    this.config = {
      contextWindow: 10,
      confidenceThreshold: 0.7,
      minNameLength: 2,
      maxNameLength: 20,
      enableLearning: true,
      requireConfirmation: false,
      ...config,
    };

    this.initializeContextClues();
    this.initializeNamePatterns();
    this.loadKnownNames();
  }

  private initializeContextClues(): void {
    // Introduction patterns
    this.contextClues.set('name is', 0.9);
    this.contextClues.set('call me', 0.8);
    this.contextClues.set('i am', 0.7);
    this.contextClues.set("i'm", 0.7);
    this.contextClues.set('my name', 0.8);
    
    // Presentation patterns
    this.contextClues.set('this is', 0.6);
    this.contextClues.set('meet', 0.5);
    this.contextClues.set('introduce', 0.6);
    this.contextClues.set('presenting', 0.5);
    
    // Reference patterns
    this.contextClues.set('ask', 0.4);
    this.contextClues.set('tell', 0.3);
    this.contextClues.set('said', 0.3);
    this.contextClues.set('mentioned', 0.4);
    
    // Greeting patterns
    this.contextClues.set('hello', 0.3);
    this.contextClues.set('hi', 0.3);
    this.contextClues.set('hey', 0.3);
  }

  private initializeNamePatterns(): void {
    // Common name patterns
    this.namePatterns.set('fullName', /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g);
    this.namePatterns.set('firstName', /\b([A-Z][a-z]{1,15})\b/g);
    this.namePatterns.set('title', /\b(Mr|Mrs|Ms|Dr|Professor|Sir|Madam)\.?\s+([A-Z][a-z]+)\b/g);
    this.namePatterns.set('introduction', /(?:name is|call me|i am|i'm)\s+([A-Z][a-z]+)/gi);
  }

  private async loadKnownNames(): Promise<void> {
    // Load names from existing speakers
    const speakers = this.diarizationService.getAllSpeakers();
    speakers.forEach(speaker => {
      if (speaker.name) {
        this.knownNames.add(speaker.name.toLowerCase());
        this.speakerNameMap.set(speaker.id, speaker.name);
      }
    });

    // Load from voice profiles if available
    if (this.voiceProfileService) {
      // This would need user context - placeholder for now
      // const profiles = await this.voiceProfileService.getUserProfiles(userId);
      // profiles.forEach(profile => this.knownNames.add(profile.name.toLowerCase()));
    }
  }

  async detectNames(
    transcript: string,
    context: NameContext
  ): Promise<NameDetectionResult> {
    const detectedNames: DetectedName[] = [];
    const suggestions: NameSuggestion[] = [];

    // Clean and prepare transcript
    const cleanTranscript = this.preprocessTranscript(transcript);
    const words = cleanTranscript.split(/\s+/);

    // Apply different detection strategies
    const introductionNames = this.detectIntroductionNames(cleanTranscript, context);
    const capitalizedNames = this.detectCapitalizedNames(words, context);
    const contextualNames = this.detectContextualNames(cleanTranscript, context);
    const patternNames = this.detectPatternNames(cleanTranscript);

    // Combine and deduplicate results
    const allDetected = [
      ...introductionNames,
      ...capitalizedNames,
      ...contextualNames,
      ...patternNames,
    ];

    // Filter and rank by confidence
    const filteredNames = this.filterAndRankNames(allDetected, cleanTranscript);
    detectedNames.push(...filteredNames);

    // Generate speaker suggestions
    if (detectedNames.length > 0) {
      const speakerSuggestions = await this.generateSpeakerSuggestions(
        detectedNames,
        context.currentSpeaker,
        context
      );
      suggestions.push(...speakerSuggestions);
    }

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(detectedNames);

    return {
      names: detectedNames,
      confidence: overallConfidence,
      suggestions,
    };
  }

  private preprocessTranscript(transcript: string): string {
    return transcript
      .trim()
      .replace(/[^\w\s.,!?'-]/g, ' ') // Remove special characters except basic punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private detectIntroductionNames(transcript: string, context: NameContext): DetectedName[] {
    const names: DetectedName[] = [];
    const introPattern = /(?:name is|call me|i am|i'm|my name)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
    
    let match;
    while ((match = introPattern.exec(transcript)) !== null) {
      const name = match[1].trim();
      if (this.isValidName(name)) {
        names.push({
          name,
          confidence: 0.9,
          context: match[0],
          position: { start: match.index, end: match.index + match[0].length },
          type: 'introduction',
        });
      }
    }

    return names;
  }

  private detectCapitalizedNames(words: string[], context: NameContext): DetectedName[] {
    const names: DetectedName[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Skip if it's likely a sentence start
      if (i === 0 || this.isSentenceStart(words, i)) {
        continue;
      }

      if (this.isPotentialName(word)) {
        // Skip obvious possessive contractions before the token: it's/its/that's/etc.
        const prev = words[i - 1]?.toLowerCase();
        if (prev && this.negativePossessiveContexts.has(prev)) {
          continue;
        }

        const contextScore = this.analyzeWordContext(words, i, this.config.contextWindow);
        
        if (contextScore > this.config.confidenceThreshold) {
          // Check for compound names (first + last)
          let fullName = word;
          if (i + 1 < words.length && this.isPotentialName(words[i + 1])) {
            fullName = `${word} ${words[i + 1]}`;
            i++; // Skip next word as it's part of the name
          }

          names.push({
            name: fullName,
            confidence: contextScore,
            context: this.getWordContext(words, i, 3),
            position: { start: i, end: i + (fullName.split(' ').length - 1) },
            type: 'mention',
          });
        }
      }
    }

    return names;
  }

  private detectContextualNames(transcript: string, context: NameContext): DetectedName[] {
    const names: DetectedName[] = [];
    
    // Look for names in specific contexts
    const contextPatterns = [
      /(?:this is|meet|introduce)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,
      /(?:ask|tell)\s+([A-Z][a-z]+)\s+(?:about|to|if)/gi,
      /([A-Z][a-z]+)\s+(?:said|mentioned|thinks|believes)/gi,
    ];

    contextPatterns.forEach((pattern, index) => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const name = match[1].trim();
        if (this.isValidName(name)) {
          names.push({
            name,
            confidence: 0.6 + (index * 0.1),
            context: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            type: 'reference',
          });
        }
      }
    });

    return names;
  }

  private detectPatternNames(transcript: string): DetectedName[] {
    const names: DetectedName[] = [];
    
    this.namePatterns.forEach((pattern, patternName) => {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const name = patternName === 'title' ? match[2] : match[1];
        if (this.isValidName(name)) {
          names.push({
            name: name.trim(),
            confidence: patternName === 'introduction' ? 0.9 : 0.6,
            context: match[0],
            position: { start: match.index, end: match.index + match[0].length },
            type: patternName === 'introduction' ? 'introduction' : 'mention',
          });
        }
      }
    });

    return names;
  }

  private isPotentialName(word: string): boolean {
    if (!word || word.length < this.config.minNameLength || word.length > this.config.maxNameLength) {
      return false;
    }

    // Must start with capital letter
    if (!/^[A-Z]/.test(word)) {
      return false;
    }

    // Must be mostly letters
    if (!/^[A-Za-z'-]+$/.test(word)) {
      return false;
    }

    // Exclude common words that are capitalized
    const excludedWords = new Set([
      'The', 'This', 'That', 'These', 'Those', 'What', 'When', 'Where', 'Why', 'How',
      'Yes', 'No', 'Ok', 'Okay', 'Sure', 'Right', 'Good', 'Great', 'Well', 'So',
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ]);

    return !excludedWords.has(word);
  }

  private isSentenceStart(words: string[], index: number): boolean {
    if (index === 0) return true;
    
    const prevWord = words[index - 1];
    return /[.!?]$/.test(prevWord);
  }

  private analyzeWordContext(words: string[], index: number, window: number): number {
    const start = Math.max(0, index - window);
    const end = Math.min(words.length, index + window);
    const contextWords = words.slice(start, end);
    const contextText = contextWords.join(' ').toLowerCase();

    let score = 0.3; // Base score for capitalized word

    // Check for context clues
    this.contextClues.forEach((weight, clue) => {
      if (contextText.includes(clue)) {
        score += weight;
      }
    });

    // Bonus for position after certain words
    if (index > 0) {
      const prevWord = words[index - 1].toLowerCase();
      if (['is', 'am', 'called', 'named'].includes(prevWord)) {
        score += 0.3;
      }
      // Penalize possessive/contracted contexts like "it's X"
      if (this.negativePossessiveContexts.has(prevWord)) {
        score -= 0.6;
      }
    }

    return Math.min(score, 1.0);
  }

  private getWordContext(words: string[], index: number, window: number): string {
    const start = Math.max(0, index - window);
    const end = Math.min(words.length, index + window + 1);
    return words.slice(start, end).join(' ');
  }

  private isValidName(name: string): boolean {
    const trimmed = name.trim();
    
    if (trimmed.length < this.config.minNameLength || trimmed.length > this.config.maxNameLength) {
      return false;
    }

    // Must contain at least one letter
    if (!/[a-zA-Z]/.test(trimmed)) {
      return false;
    }

    // Exclude numbers and most special characters
    if (/[0-9@#$%^&*()+=\[\]{}|\\:";'<>?,./]/.test(trimmed)) {
      return false;
    }

    return true;
  }

  private filterAndRankNames(names: DetectedName[], transcript: string): DetectedName[] {
    // Remove duplicates and merge similar names
    const nameMap = new Map<string, DetectedName>();
    
    names.forEach(name => {
      const key = name.name.toLowerCase();
      const existing = nameMap.get(key);
      
      if (!existing || name.confidence > existing.confidence) {
        nameMap.set(key, name);
      }
    });

    // Sort by confidence
    return Array.from(nameMap.values())
      .filter(name => name.confidence >= this.config.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence);
  }

  private async generateSpeakerSuggestions(
    detectedNames: DetectedName[],
    currentSpeaker: string,
    context: NameContext
  ): Promise<NameSuggestion[]> {
    const suggestions: NameSuggestion[] = [];

    // Check if current speaker needs a name
    const currentSpeakerObj = this.diarizationService.getSpeaker(currentSpeaker);
    if (currentSpeakerObj && !currentSpeakerObj.name) {
      // Look for self-introductions
      const selfIntroductions = detectedNames.filter(name => 
        name.type === 'introduction' && name.confidence > 0.8
      );

      if (selfIntroductions.length > 0) {
        const bestIntroduction = selfIntroductions[0];
        suggestions.push({
          speakerId: currentSpeaker,
          suggestedName: bestIntroduction.name,
          confidence: bestIntroduction.confidence,
          evidence: [bestIntroduction.context],
          needsConfirmation: this.config.requireConfirmation,
        });
      }
    }

    return suggestions;
  }

  private calculateOverallConfidence(names: DetectedName[]): number {
    if (names.length === 0) return 0;
    
    const avgConfidence = names.reduce((sum, name) => sum + name.confidence, 0) / names.length;
    const maxConfidence = Math.max(...names.map(name => name.confidence));
    
    // Weight average and max confidence
    return (avgConfidence * 0.6) + (maxConfidence * 0.4);
  }

  // Public methods for integration
  async applySuggestion(suggestion: NameSuggestion): Promise<void> {
    if (this.config.enableLearning) {
      // Apply the name to the speaker
      this.diarizationService.assignName(suggestion.speakerId, suggestion.suggestedName);
      this.speakerNameMap.set(suggestion.speakerId, suggestion.suggestedName);
      this.knownNames.add(suggestion.suggestedName.toLowerCase());

      // Update voice profile if available
      if (this.voiceProfileService) {
        // This would need proper user/profile context
        // await this.voiceProfileService.updateProfile(userId, profileId, { name: suggestion.suggestedName });
      }
    }
  }

  getKnownNames(): string[] {
    return Array.from(this.knownNames);
  }

  getSpeakerName(speakerId: string): string | undefined {
    return this.speakerNameMap.get(speakerId);
  }

  updateConfig(config: Partial<NameRecognitionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    this.pendingSuggestions.clear();
    // Keep learned names unless explicitly cleared
  }

  clearLearnedNames(): void {
    this.knownNames.clear();
    this.speakerNameMap.clear();
    this.pendingSuggestions.clear();
  }
}

export const nameRecognitionService = new NameRecognitionService(
  require('./DiarizationService').diarizationService
);
