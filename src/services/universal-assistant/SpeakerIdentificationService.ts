import { NameRecognitionService, NameDetectionResult, NameSuggestion } from './NameRecognitionService';
import { DiarizationService } from './DiarizationService';
import { ConversationProcessor, ConversationEvent } from './ConversationProcessor';

export interface SpeakerIdentificationResult {
  speakerId: string;
  identifiedName?: string;
  confidence: number;
  nameDetection?: NameDetectionResult;
  suggestions: NameSuggestion[];
  shouldPromptForConfirmation: boolean;
}

export interface SpeakerIdentificationConfig {
  autoApplyHighConfidenceNames: boolean;
  confirmationThreshold: number;
  maxPendingSuggestions: number;
  learningEnabled: boolean;
}

export class SpeakerIdentificationService {
  private pendingConfirmations: Map<string, NameSuggestion[]> = new Map();
  private conversationHistory: Map<string, string[]> = new Map();
  private config: SpeakerIdentificationConfig;

  constructor(
    private nameRecognitionService: NameRecognitionService,
    private diarizationService: DiarizationService,
    private conversationProcessor?: ConversationProcessor,
    config?: Partial<SpeakerIdentificationConfig>
  ) {
    this.config = {
      autoApplyHighConfidenceNames: true,
      confirmationThreshold: 0.85,
      maxPendingSuggestions: 5,
      learningEnabled: true,
      ...config,
    };

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for speaker changes
    this.diarizationService.onSpeakerChange((speakerId) => {
      this.handleSpeakerChange(speakerId);
    });
  }

  async processTranscript(
    transcript: string,
    speakerId: string,
    timestamp: number
  ): Promise<SpeakerIdentificationResult> {
    // Update conversation history
    this.updateConversationHistory(speakerId, transcript);

    // Prepare context for name recognition
    const context = {
      previousTranscripts: this.getRecentTranscripts(speakerId, 5),
      speakerHistory: this.conversationHistory,
      currentSpeaker: speakerId,
      conversationContext: this.getAllRecentTranscripts(10),
    };

    // Detect names in the transcript
    const nameDetection = await this.nameRecognitionService.detectNames(transcript, context);

    // Get current speaker info
    const speaker = this.diarizationService.getSpeaker(speakerId);
    const currentName = speaker?.name;

    // Process name detection results
    const result: SpeakerIdentificationResult = {
      speakerId,
      identifiedName: currentName,
      confidence: currentName ? 1.0 : 0.0,
      nameDetection,
      suggestions: nameDetection.suggestions,
      shouldPromptForConfirmation: false,
    };

    // Handle new name suggestions
    if (nameDetection.suggestions.length > 0) {
      await this.processSuggestions(nameDetection.suggestions, result);
    }

    // Check for other speakers mentioned
    await this.checkForOtherSpeakerMentions(nameDetection, speakerId);

    return result;
  }

  private async processSuggestions(
    suggestions: NameSuggestion[],
    result: SpeakerIdentificationResult
  ): Promise<void> {
    for (const suggestion of suggestions) {
      const speaker = this.diarizationService.getSpeaker(suggestion.speakerId);
      
      // Skip if speaker already has a name
      if (speaker?.name) {
        continue;
      }

      // Auto-apply high confidence suggestions
      if (
        this.config.autoApplyHighConfidenceNames &&
        suggestion.confidence >= this.config.confirmationThreshold &&
        !suggestion.needsConfirmation
      ) {
        await this.applySuggestion(suggestion);
        result.identifiedName = suggestion.suggestedName;
        result.confidence = suggestion.confidence;
        continue;
      }

      // Queue for confirmation
      if (suggestion.confidence >= 0.6) {
        this.queueSuggestionForConfirmation(suggestion);
        result.shouldPromptForConfirmation = true;
      }
    }
  }

  private async checkForOtherSpeakerMentions(
    nameDetection: NameDetectionResult,
    currentSpeakerId: string
  ): Promise<void> {
    // Look for mentions of other people who might be speakers
    const mentionedNames = nameDetection.names.filter(name => 
      name.type === 'reference' || name.type === 'mention'
    );

    for (const mention of mentionedNames) {
      // Check if this name matches any unnamed speakers
      const unnamedSpeakers = this.diarizationService.getAllSpeakers()
        .filter(speaker => !speaker.name && speaker.id !== currentSpeakerId);

      if (unnamedSpeakers.length > 0) {
        // Create suggestion for the most recent unnamed speaker
        const targetSpeaker = unnamedSpeakers.sort((a, b) => 
          b.lastActiveTime - a.lastActiveTime
        )[0];

        const suggestion: NameSuggestion = {
          speakerId: targetSpeaker.id,
          suggestedName: mention.name,
          confidence: mention.confidence * 0.7, // Lower confidence for indirect mentions
          evidence: [mention.context],
          needsConfirmation: true,
        };

        this.queueSuggestionForConfirmation(suggestion);
      }
    }
  }

  private queueSuggestionForConfirmation(suggestion: NameSuggestion): void {
    if (!this.pendingConfirmations.has(suggestion.speakerId)) {
      this.pendingConfirmations.set(suggestion.speakerId, []);
    }

    const pending = this.pendingConfirmations.get(suggestion.speakerId)!;
    
    // Avoid duplicates
    const exists = pending.some(p => 
      p.suggestedName.toLowerCase() === suggestion.suggestedName.toLowerCase()
    );

    if (!exists && pending.length < this.config.maxPendingSuggestions) {
      pending.push(suggestion);
      pending.sort((a, b) => b.confidence - a.confidence);
    }
  }

  private updateConversationHistory(speakerId: string, transcript: string): void {
    if (!this.conversationHistory.has(speakerId)) {
      this.conversationHistory.set(speakerId, []);
    }

    const history = this.conversationHistory.get(speakerId)!;
    history.push(transcript);

    // Keep only recent history (last 20 utterances)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
  }

  private getRecentTranscripts(speakerId: string, count: number): string[] {
    const history = this.conversationHistory.get(speakerId) || [];
    return history.slice(-count);
  }

  private getAllRecentTranscripts(count: number): string[] {
    const allTranscripts: { transcript: string; timestamp: number }[] = [];
    
    this.conversationHistory.forEach((transcripts, speakerId) => {
      const speaker = this.diarizationService.getSpeaker(speakerId);
      if (speaker) {
        transcripts.forEach(transcript => {
          allTranscripts.push({
            transcript,
            timestamp: speaker.lastActiveTime,
          });
        });
      }
    });

    return allTranscripts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, count)
      .map(item => item.transcript);
  }

  private handleSpeakerChange(speakerId: string): void {
    // Check if we have pending suggestions for this speaker
    const pending = this.pendingConfirmations.get(speakerId);
    if (pending && pending.length > 0) {
      // Could trigger a UI prompt here
      console.log(`Speaker ${speakerId} has ${pending.length} pending name suggestions:`, pending);
    }
  }

  // Public methods for external control
  async applySuggestion(suggestion: NameSuggestion): Promise<void> {
    await this.nameRecognitionService.applySuggestion(suggestion);
    
    // Remove from pending confirmations
    const pending = this.pendingConfirmations.get(suggestion.speakerId);
    if (pending) {
      const index = pending.findIndex(p => 
        p.suggestedName === suggestion.suggestedName
      );
      if (index >= 0) {
        pending.splice(index, 1);
      }
      if (pending.length === 0) {
        this.pendingConfirmations.delete(suggestion.speakerId);
      }
    }
  }

  rejectSuggestion(speakerId: string, suggestedName: string): void {
    const pending = this.pendingConfirmations.get(speakerId);
    if (pending) {
      const index = pending.findIndex(p => p.suggestedName === suggestedName);
      if (index >= 0) {
        pending.splice(index, 1);
      }
      if (pending.length === 0) {
        this.pendingConfirmations.delete(speakerId);
      }
    }
  }

  getPendingConfirmations(speakerId?: string): Map<string, NameSuggestion[]> | NameSuggestion[] {
    if (speakerId) {
      return this.pendingConfirmations.get(speakerId) || [];
    }
    return this.pendingConfirmations;
  }

  assignNameManually(speakerId: string, name: string): void {
    this.diarizationService.assignName(speakerId, name);
    // Clear any pending suggestions for this speaker
    this.pendingConfirmations.delete(speakerId);
  }

  getSpeakerSummary(): Array<{
    speakerId: string;
    name?: string;
    utteranceCount: number;
    lastActive: Date;
    pendingSuggestions: number;
  }> {
    return this.diarizationService.getAllSpeakers().map(speaker => ({
      speakerId: speaker.id,
      name: speaker.name,
      utteranceCount: speaker.utterances.length,
      lastActive: new Date(speaker.lastActiveTime),
      pendingSuggestions: this.pendingConfirmations.get(speaker.id)?.length || 0,
    }));
  }

  updateConfig(config: Partial<SpeakerIdentificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reset(): void {
    this.pendingConfirmations.clear();
    this.conversationHistory.clear();
  }
}

// Factory function for easy setup
export function createSpeakerIdentificationService(
  diarizationService: DiarizationService,
  nameRecognitionService?: NameRecognitionService,
  conversationProcessor?: ConversationProcessor
): SpeakerIdentificationService {
  const nameService = nameRecognitionService || new NameRecognitionService(diarizationService);
  
  return new SpeakerIdentificationService(
    nameService,
    diarizationService,
    conversationProcessor
  );
}

export const speakerIdentificationService = createSpeakerIdentificationService(
  require('./DiarizationService').diarizationService
);
