/**
 * Voice Identification Agent
 * Intelligent agent that identifies speakers using multiple strategies
 */

import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { NeedsIdentificationService } from '@/services/firebase/NeedsIdentificationService';
import { DatabaseService } from '@/services/firebase/DatabaseService';
import { 
  TranscriptEntry, 
  IdentificationResult, 
  VoiceIdentificationStrategy,
  PaginatedResult,
  PaginationOptions,
  BatchUpdateEntry
} from '@/types';

export class VoiceIdentificationAgent {
  private transcriptBuffer: TranscriptEntry[] = [];
  private speakerPatterns: Map<string, string[]> = new Map(); // voiceId -> common phrases
  private identificationQueue: Set<string> = new Set();
  
  constructor(
    private meetingId: string,
    private hostUserId: string
  ) {
    this.startIdentificationLoop();
  }

  /**
   * Main identification loop that runs in background
   */
  private async startIdentificationLoop(): Promise<void> {
    // Check for unidentified speakers every 30 seconds
    setInterval(async () => {
      await this.processUnidentifiedSpeakers();
    }, 30000);
  }

  /**
   * Process transcript entry for identification clues
   */
  async processTranscript(entry: TranscriptEntry): Promise<void> {
    // Buffer recent transcripts for context
    this.transcriptBuffer.push(entry);
    if (this.transcriptBuffer.length > 20) {
      this.transcriptBuffer.shift();
    }
    
    // If speaker is unknown, add to identification queue
    const voiceEntry = await VoiceLibraryService.getOrCreateVoiceEntry(entry.speakerId);
    if (!voiceEntry.userId) {
      this.identificationQueue.add(entry.speakerId);
      
      // Try immediate identification strategies
      await this.attemptIdentification(entry);
    }
    
    // Learn speech patterns for known speakers
    if (voiceEntry.userId) {
      this.learnSpeechPattern(entry.speakerId, entry.text);
    }
  }

  /**
   * Attempt to identify a speaker using multiple strategies
   */
  private async attemptIdentification(entry: TranscriptEntry): Promise<IdentificationResult | null> {
    const strategies: VoiceIdentificationStrategy[] = [
      // Strategy 1: Self-introduction detection
      {
        name: 'self-introduction',
        confidence: 0.95,
        execute: () => this.detectSelfIntroduction(entry)
      },
      
      // Strategy 2: Name mention followed by response
      {
        name: 'name-mention',
        confidence: 0.85,
        execute: () => this.detectNameMention(entry)
      },
      
      // Strategy 3: Speech pattern matching
      {
        name: 'pattern-matching',
        confidence: 0.75,
        execute: () => this.matchSpeechPatterns(entry)
      },
      
      // Strategy 4: Contextual inference
      {
        name: 'contextual',
        confidence: 0.65,
        execute: () => this.inferFromContext(entry)
      }
    ];
    
    // Try each strategy in order of confidence
    for (const strategy of strategies) {
      try {
        const result = await strategy.execute();
        if (result && result.confidence >= strategy.confidence) {
          await this.confirmIdentification(result);
          return result;
        }
      } catch (error) {
        console.error(`Strategy ${strategy.name} failed:`, error);
      }
    }
    
    return null;
  }

  /**
   * Strategy 1: Detect self-introduction
   * "Hi, I'm John" or "This is Sarah speaking"
   */
  private async detectSelfIntroduction(entry: TranscriptEntry): Promise<IdentificationResult | null> {
    const introPatterns = [
      /(?:hi|hello|hey),?\s+(?:i'm|i am|this is|my name is)\s+(\w+)/i,
      /(\w+)\s+(?:here|speaking|talking)/i,
      /(?:call me|i go by)\s+(\w+)/i,
    ];
    
    for (const pattern of introPatterns) {
      const match = entry.text.match(pattern);
      if (match && match[1]) {
        const name = match[1];
        
        // Try to find user by name
        const user = await this.findUserByName(name);
        if (user) {
          return {
            deepgramVoiceId: entry.speakerId,
            userId: user.uid,
            userName: name,
            confidence: 0.95,
            method: 'self',
            evidence: `Self-introduction: "${entry.text}"`
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Strategy 2: Detect name mention followed by response
   * "John, what do you think?" -> next speaker might be John
   */
  private async detectNameMention(entry: TranscriptEntry): Promise<IdentificationResult | null> {
    // Look for name mentions in previous entries
    const recentEntries = this.transcriptBuffer.slice(-5);
    
    for (let i = recentEntries.length - 2; i >= 0; i--) {
      const prevEntry = recentEntries[i];
      
      // Skip if same speaker
      if (prevEntry.speakerId === entry.speakerId) continue;
      
      // Look for name mentions at start or end of sentence
      const namePatterns = [
        /^(\w+)[,:]/, // "John, ..."
        /^hey\s+(\w+)/i, // "Hey John"
        /(\w+)\?$/, // "... John?"
        /what (?:do you think|about|say),?\s+(\w+)/i,
      ];
      
      for (const pattern of namePatterns) {
        const match = prevEntry.text.match(pattern);
        if (match && match[1]) {
          const name = match[1];
          
          // Check if the timing is right (response within 10 seconds)
          const timeDiff = new Date(entry.timestamp).getTime() - 
                          new Date(prevEntry.timestamp).getTime();
          
          if (timeDiff < 10000) {
            const user = await this.findUserByName(name);
            if (user) {
              return {
                deepgramVoiceId: entry.speakerId,
                userId: user.uid,
                userName: name,
                confidence: 0.85,
                method: 'mentioned',
                evidence: `Responded after being addressed as "${name}"`
              };
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Strategy 3: Match speech patterns
   * Compare common phrases and speaking style
   */
  private async matchSpeechPatterns(entry: TranscriptEntry): Promise<IdentificationResult | null> {
    // Common phrases people use repeatedly
    const commonPhrases = [
      'you know',
      'i think',
      'basically',
      'actually',
      'to be honest',
      'in my opinion',
      'the thing is',
    ];
    
    // Extract phrases from current entry
    const currentPhrases = commonPhrases.filter(phrase => 
      entry.text.toLowerCase().includes(phrase)
    );
    
    if (currentPhrases.length === 0) return null;
    
    // Compare with known speaker patterns
    let bestMatch: IdentificationResult | null = null;
    let highestSimilarity = 0;
    
    for (const [voiceId, patterns] of this.speakerPatterns) {
      const similarity = this.calculatePatternSimilarity(currentPhrases, patterns);
      
      if (similarity > highestSimilarity && similarity > 0.7) {
        const identity = await VoiceLibraryService.getOrCreateVoiceEntry(voiceId);
        if (identity) {
          highestSimilarity = similarity;
          bestMatch = {
            deepgramVoiceId: entry.speakerId,
            userId: identity.userId!,
            userName: identity.userName!,
            confidence: similarity,
            method: 'pattern',
            evidence: `Speech pattern match (${Math.round(similarity * 100)}% similar)`
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Strategy 4: Infer from context
   * Use meeting context and role information
   */
  private async inferFromContext(entry: TranscriptEntry): Promise<IdentificationResult | null> {
    const contextClues = [
      { pattern: /as the (?:host|organizer|moderator)/i, role: 'host' },
      { pattern: /(?:i'm|i am) (?:leading|running|facilitating)/i, role: 'host' },
      { pattern: /welcome everyone/i, role: 'host' },
      { pattern: /let's get started/i, role: 'host' },
    ];
    
    for (const clue of contextClues) {
      if (entry.text.match(clue.pattern)) {
        if (clue.role === 'host') {
          // Host is likely the meeting creator
          const meeting = await DatabaseService.getMeeting(this.meetingId);
          if (meeting) {
            const host = await DatabaseService.getUser(meeting.hostId);
            if (host) {
              return {
                deepgramVoiceId: entry.speakerId,
                userId: host.uid,
                userName: host.displayName || 'Host',
                confidence: 0.65,
                method: 'pattern',
                evidence: `Identified as meeting host from context`
              };
            }
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Process all unidentified speakers
   */
  private async processUnidentifiedSpeakers(): Promise<void> {
    const pendingRequests = await NeedsIdentificationService.getPendingRequests(this.meetingId);
    
    for (const request of pendingRequests) {
      // Skip if already being processed
      if (this.identificationQueue.has(request.deepgramVoiceId)) continue;
      
      // Get recent transcript entries for this speaker
      const transcripts = await DatabaseService.getTranscriptEntriesBySpeaker(
        this.meetingId,
        request.deepgramVoiceId,
        { limit: 10 }
      );
      
      // Try to identify from transcript content
      for (const entry of transcripts.data) {
        const result = await this.attemptIdentification(entry);
        if (result) {
          await this.confirmIdentification(result);
          break;
        }
      }
    }
  }

  /**
   * Confirm and save identification
   */
  private async confirmIdentification(result: IdentificationResult): Promise<void> {
    console.log(`Identified ${result.deepgramVoiceId} as ${result.userName} with ${result.confidence} confidence`);
    
    // Save to voice library
    await VoiceLibraryService.identifyVoice(
      result.deepgramVoiceId,
      result.userId,
      result.userName,
      result.method,
      this.meetingId,
      result.confidence
    );
    
    // Mark identification request as resolved
    await NeedsIdentificationService.resolveRequest(
      `${this.meetingId}_${result.deepgramVoiceId}`, // docId format
      'identified',
      result.userId,
      result.userName
    );
    
    // Remove from queue
    this.identificationQueue.delete(result.deepgramVoiceId);
    
    // Update all transcript entries retroactively
    await this.updateTranscriptsWithIdentity(result.deepgramVoiceId, result.userName);
  }

  /**
   * Update past transcripts with newly identified speaker
   */
  private async updateTranscriptsWithIdentity(
    deepgramVoiceId: string,
    userName: string
  ): Promise<void> {
    const transcripts = await DatabaseService.getTranscriptEntriesBySpeaker(
      this.meetingId,
      deepgramVoiceId,
      { limit: 1000 }
    );
    
    const updates = transcripts.data.map(entry => ({
      id: entry.id,
      data: { speakerName: userName }
    }));
    
    if (updates.length > 0) {
      await DatabaseService.batchUpdateTranscriptEntries(this.meetingId, updates);
      console.log(`Updated ${updates.length} transcript entries with speaker name ${userName}`);
    }
  }

  /**
   * Learn speech patterns from identified speakers
   */
  private learnSpeechPattern(voiceId: string, text: string): void {
    if (!this.speakerPatterns.has(voiceId)) {
      this.speakerPatterns.set(voiceId, []);
    }
    
    const patterns = this.speakerPatterns.get(voiceId)!;
    
    // Extract notable phrases
    const phrases = text.toLowerCase().split(/[.!?]/)
      .filter(p => p.length > 10)
      .slice(0, 3);
    
    patterns.push(...phrases);
    
    // Keep only recent patterns
    if (patterns.length > 50) {
      this.speakerPatterns.set(voiceId, patterns.slice(-50));
    }
  }

  /**
   * Calculate similarity between phrase patterns
   */
  private calculatePatternSimilarity(phrases1: string[], phrases2: string[]): number {
    if (phrases1.length === 0 || phrases2.length === 0) return 0;
    
    let matches = 0;
    for (const phrase1 of phrases1) {
      if (phrases2.some(p2 => p2.includes(phrase1) || phrase1.includes(p2))) {
        matches++;
      }
    }
    
    return matches / Math.max(phrases1.length, phrases2.length);
  }

  /**
   * Find user by name (fuzzy match)
   */
  private async findUserByName(name: string): Promise<any> {
    // This would query your users collection
    // For now, returning a mock implementation
    const normalizedName = name.toLowerCase().trim();
    
    // You'd implement actual user lookup here
    // This is a placeholder
    return null;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.transcriptBuffer = [];
    this.speakerPatterns.clear();
    this.identificationQueue.clear();
  }
}