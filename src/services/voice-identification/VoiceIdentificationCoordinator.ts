/**
 * Voice Identification Coordinator
 * Orchestrates the entire voice identification pipeline during meetings
 */

import { VoiceCaptureService } from './VoiceCapture';
import { VoiceIdentificationAgent } from './VoiceIdentificationAgent';
import { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';
import type { Meeting, TranscriptEntry } from '@/types';

export class VoiceIdentificationCoordinator {
  private voiceCapture: VoiceCaptureService | null = null;
  private identificationAgent: VoiceIdentificationAgent | null = null;
  private knownSpeakers: Map<string, string> = new Map(); // voiceId -> userName
  private speakerStats: Map<string, {
    firstSeen: Date;
    lastSeen: Date;
    totalDuration: number;
    messageCount: number;
  }> = new Map();
  
  constructor(
    private meeting: Meeting,
    private deepgramService: DeepgramSTT
  ) {
    this.initialize();
  }

  /**
   * Initialize all voice identification services
   */
  private async initialize(): Promise<void> {
    console.log('Initializing Voice Identification Coordinator for meeting', this.meeting.meetingId);
    
    // Start voice capture service
    this.voiceCapture = new VoiceCaptureService(
      this.meeting.meetingId,
      this.deepgramService
    );
    
    // Start identification agent
    this.identificationAgent = new VoiceIdentificationAgent(
      this.meeting.meetingId,
      this.meeting.hostId
    );
    
    // Load known speakers from previous meetings
    await this.loadKnownSpeakers();
    
    // Setup transcript processing
    this.setupTranscriptProcessing();
  }

  /**
   * Load previously identified speakers
   */
  private async loadKnownSpeakers(): Promise<void> {
    try {
      // Get all participants who might be in this meeting
      const participantIds = this.meeting.participantIds || [];
      
      // Dynamic import for client-side safety
      const { VoiceLibraryService } = await import('@/services/firebase/VoiceLibraryService');
      
      for (const userId of participantIds) {
        // Check if this user has a voice profile
        const voiceProfiles = await VoiceLibraryService.getUserVoiceProfiles(userId);
        
        for (const profile of voiceProfiles) {
          this.knownSpeakers.set(profile.deepgramVoiceId, profile.userName || 'Unknown');
          console.log(`Loaded voice profile for ${profile.userName} (${profile.deepgramVoiceId})`);
        }
      }
      
      console.log(`Loaded ${this.knownSpeakers.size} known speaker profiles`);
    } catch (error) {
      console.error('Failed to load known speakers:', error);
    }
  }

  /**
   * Setup real-time transcript processing
   */
  private setupTranscriptProcessing(): void {
    // DeepgramSTT doesn't support event emitters
    // Integration needs to happen through the UniversalAssistantCoordinator
    // which should call our processTranscript method when transcripts arrive
    
    // TODO: Integrate with UniversalAssistantCoordinator's transcript callbacks
    console.log('Voice identification coordinator ready for transcript processing');
  }

  /**
   * Process incoming transcript with voice identification
   */
  public async processTranscript(data: {
    speaker: string;
    text: string;
    confidence: number;
    timestamp: number;
  }): Promise<void> {
    const { speaker: deepgramVoiceId, text, confidence, timestamp } = data;
    
    // Update speaker stats
    this.updateSpeakerStats(deepgramVoiceId);
    
    // Check if speaker is already identified
    let speakerName = this.knownSpeakers.get(deepgramVoiceId);
    
    if (!speakerName) {
      try {
        // Dynamic import for client-side safety
        const { VoiceLibraryService } = await import('@/services/firebase/VoiceLibraryService');
        
        // Check voice library
        const identity = await VoiceLibraryService.getOrCreateVoiceEntry(deepgramVoiceId);
        
        if (identity) {
          speakerName = identity.userName || 'Unknown';
          this.knownSpeakers.set(deepgramVoiceId, speakerName);
          console.log(`Identified ${deepgramVoiceId} as ${speakerName} from voice library`);
        } else {
          speakerName = `Speaker ${this.getAnonymousSpeakerNumber(deepgramVoiceId)}`;
        }
      } catch (error) {
        console.error('Error checking voice library:', error);
        speakerName = `Speaker ${this.getAnonymousSpeakerNumber(deepgramVoiceId)}`;
      }
    }
    
    // Create transcript entry
    const transcriptEntry: Omit<TranscriptEntry, 'id'> = {
      meetingId: this.meeting.meetingId,
      content: text,
      speaker: speakerName || 'Unknown',
      speakerId: deepgramVoiceId,
      speakerName: speakerName || 'Unknown',
      text,
      duration: 0,
      timestamp: new Date(timestamp),
      confidence,
      language: 'en',
      isFragment: false,
      isComplete: true,
      isProcessed: true
    };
    
    try {
      // Dynamic import for client-side safety
      const { DatabaseService } = await import('@/services/firebase/DatabaseService');
      
      // Save to database
      await DatabaseService.addTranscriptEntry(this.meeting.meetingId, transcriptEntry);
    } catch (error) {
      console.error('Error saving transcript entry:', error);
    }
    
    // Send to identification agent for analysis
    if (this.identificationAgent && !this.knownSpeakers.has(deepgramVoiceId)) {
      await this.identificationAgent.processTranscript(transcriptEntry as TranscriptEntry);
    }
  }

  /**
   * Update speaker statistics
   */
  private updateSpeakerStats(deepgramVoiceId: string): void {
    const now = new Date();
    
    if (!this.speakerStats.has(deepgramVoiceId)) {
      this.speakerStats.set(deepgramVoiceId, {
        firstSeen: now,
        lastSeen: now,
        totalDuration: 0,
        messageCount: 0
      });
    }
    
    const stats = this.speakerStats.get(deepgramVoiceId)!;
    stats.lastSeen = now;
    stats.messageCount++;
  }

  /**
   * Get anonymous speaker number for display
   */
  private getAnonymousSpeakerNumber(deepgramVoiceId: string): number {
    const speakers = Array.from(this.speakerStats.keys());
    const index = speakers.indexOf(deepgramVoiceId);
    return index + 1;
  }

  /**
   * Get real-time speaker information
   */
  getSpeakerInfo(deepgramVoiceId: string): {
    name: string;
    isIdentified: boolean;
    stats: any;
  } {
    return {
      name: this.knownSpeakers.get(deepgramVoiceId) || 
            `Speaker ${this.getAnonymousSpeakerNumber(deepgramVoiceId)}`,
      isIdentified: this.knownSpeakers.has(deepgramVoiceId),
      stats: this.speakerStats.get(deepgramVoiceId) || null
    };
  }

  /**
   * Get all speakers in the meeting
   */
  getAllSpeakers(): Array<{
    deepgramVoiceId: string;
    name: string;
    isIdentified: boolean;
    stats: any;
  }> {
    const speakers = [];
    
    for (const [voiceId, stats] of this.speakerStats) {
      speakers.push({
        deepgramVoiceId: voiceId,
        name: this.knownSpeakers.get(voiceId) || 
              `Speaker ${this.getAnonymousSpeakerNumber(voiceId)}`,
        isIdentified: this.knownSpeakers.has(voiceId),
        stats
      });
    }
    
    return speakers;
  }

  /**
   * Manually identify a speaker during the meeting
   */
  async identifySpeaker(
    deepgramVoiceId: string,
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      // Dynamic imports for client-side safety
      const [{ VoiceLibraryService }, { DatabaseService }] = await Promise.all([
        import('@/services/firebase/VoiceLibraryService'),
        import('@/services/firebase/DatabaseService')
      ]);
      
      // Save to voice library
      await VoiceLibraryService.identifyVoice(
        deepgramVoiceId,
        userId,
        userName,
        'manual',
        this.meeting.meetingId,
        1.0
      );
      
      // Update local cache
      this.knownSpeakers.set(deepgramVoiceId, userName);
      
      // Update all transcripts retroactively
      const transcripts = await DatabaseService.getTranscriptEntriesBySpeaker(
        this.meeting.meetingId,
        deepgramVoiceId,
        { limit: 1000 }
      );
      
      const updates = transcripts.data.map(entry => ({
        id: entry.id,
        data: { 
          speakerName: userName,
          isIdentified: true
        }
      }));
      
      if (updates.length > 0) {
        await DatabaseService.batchUpdateTranscriptEntries(
          this.meeting.meetingId, 
          updates
        );
      }
      
      console.log(`Manually identified ${deepgramVoiceId} as ${userName}`);
    } catch (error) {
      console.error('Error identifying speaker:', error);
      throw error;
    }
  }

  /**
   * End meeting and finalize identification
   */
  async endMeeting(): Promise<{
    identifiedCount: number;
    unidentifiedCount: number;
    totalSpeakers: number;
  }> {
    console.log('Finalizing voice identification for meeting', this.meeting.meetingId);
    
    // Save any remaining voice segments
    if (this.voiceCapture) {
      this.voiceCapture.dispose();
    }
    
    // Get final statistics
    const allSpeakers = this.getAllSpeakers();
    const identified = allSpeakers.filter(s => s.isIdentified);
    const unidentified = allSpeakers.filter(s => !s.isIdentified);
    
    // Log speaker information
    console.log(`Meeting has ${allSpeakers.length} speakers: ${identified.length} identified, ${unidentified.length} unidentified`);
    
    // TODO: Update meeting's participant IDs once we have user ID mapping
    
    // Clean up
    if (this.identificationAgent) {
      this.identificationAgent.dispose();
    }
    
    return {
      identifiedCount: identified.length,
      unidentifiedCount: unidentified.length,
      totalSpeakers: allSpeakers.length
    };
  }

  /**
   * Get meeting summary with speaker breakdown
   */
  async getMeetingSummary(): Promise<{
    speakers: Array<{
      name: string;
      speakingTime: number;
      messageCount: number;
      isIdentified: boolean;
    }>;
    totalDuration: number;
    identificationRate: number;
  }> {
    const speakers = [];
    let totalDuration = 0;
    
    for (const [voiceId, stats] of this.speakerStats) {
      const duration = (stats.lastSeen.getTime() - stats.firstSeen.getTime()) / 1000;
      totalDuration += duration;
      
      speakers.push({
        name: this.knownSpeakers.get(voiceId) || 
              `Speaker ${this.getAnonymousSpeakerNumber(voiceId)}`,
        speakingTime: duration,
        messageCount: stats.messageCount,
        isIdentified: this.knownSpeakers.has(voiceId)
      });
    }
    
    const identifiedCount = speakers.filter(s => s.isIdentified).length;
    const identificationRate = speakers.length > 0 
      ? (identifiedCount / speakers.length) * 100 
      : 0;
    
    return {
      speakers: speakers.sort((a, b) => b.speakingTime - a.speakingTime),
      totalDuration,
      identificationRate
    };
  }
}