/**
 * Usage Examples for DatabaseService and RealtimeService
 * 
 * This file demonstrates how to integrate the new database services
 * with the Universal Assistant application components.
 */

import { DatabaseService, DatabaseError } from './DatabaseService';
import { RealtimeService, RealtimeError } from './RealtimeService';
import { auth } from '@/lib/firebase/client';
import type { 
  User, 
  Meeting, 
  TranscriptEntry, 
  SpeakerProfile, 
  CustomRule,
  MeetingType 
} from '@/types';

// ============ REACT HOOK EXAMPLES ============

/**
 * Example: Custom React hook for user data with real-time updates
 */
import { useState, useEffect } from 'react';

export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Initial load
    DatabaseService.getUser(userId)
      .then(userData => {
        setUser(userData);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    // Real-time listener
    const unsubscribe = RealtimeService.listenToUser(userId, (userData) => {
      setUser(userData);
      setError(null);
    });

    return unsubscribe;
  }, [userId]);

  return { user, loading, error };
}

/**
 * Example: Custom React hook for meeting transcripts with real-time updates
 */
export function useMeetingTranscripts(meetingId: string) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    // Set up real-time listener with debouncing for high-frequency updates
    const debouncedHandler = RealtimeService.createDebouncedListener(
      (update: any) => {
        setTranscripts(update.data);
        setLoading(false);
        setError(null);
      },
      300
    );

    const unsubscribe = RealtimeService.listenToTranscriptEntries(
      meetingId,
      debouncedHandler,
      {
        limit: 200,
        orderBy: 'timestamp',
        orderDirection: 'asc'
      }
    );

    return unsubscribe;
  }, [meetingId]);

  return { transcripts, loading, error };
}

// ============ AUDIO MANAGER INTEGRATION ============

/**
 * Example: Integration with AudioManager for transcript processing
 */
export class TranscriptProcessor {
  private meetingId: string;
  private unsubscribeTranscripts?: () => void;

  constructor(meetingId: string) {
    this.meetingId = meetingId;
  }

  /**
   * Start processing transcripts for a meeting
   */
  async startProcessing(onTranscriptUpdate: (entries: TranscriptEntry[]) => void) {
    try {
      // Set up real-time listener for new transcript entries
      this.unsubscribeTranscripts = RealtimeService.listenToTranscriptEntries(
        this.meetingId,
        (update) => {
          // Process only new additions
          const newEntries = update.changes
            .filter(change => change.type === 'added')
            .map(change => change.doc);

          if (newEntries.length > 0) {
            console.log(`📝 Processing ${newEntries.length} new transcript entries`);
            onTranscriptUpdate(newEntries);
          }

          // Handle modifications (for fragment completion)
          const modifiedEntries = update.changes
            .filter(change => change.type === 'modified')
            .map(change => change.doc);

          if (modifiedEntries.length > 0) {
            console.log(`✏️ Updated ${modifiedEntries.length} transcript entries`);
            onTranscriptUpdate(modifiedEntries);
          }
        },
        {
          limit: 50,
          orderBy: 'timestamp',
          orderDirection: 'desc'
        }
      );

    } catch (error) {
      console.error('Failed to start transcript processing:', error);
      throw new RealtimeError(
        'Failed to start transcript processing',
        'TRANSCRIPT_PROCESSING_FAILED',
        'startProcessing',
        error as Error
      );
    }
  }

  /**
   * Add a new transcript entry (called by AudioManager)
   */
  async addTranscriptEntry(
    speakerId: string,
    text: string,
    confidence: number,
    isFragment: boolean = false
  ): Promise<string> {
    try {
      const transcriptEntry = {
        speaker: await this.getSpeakerName(speakerId),
        speakerId,
        text,
        timestamp: new Date(),
        confidence,
        isFragment,
        isComplete: !isFragment,
        language: 'en',
        content: text,
        duration: 0,
        meetingId: 'example-meeting',
        type: 'transcript' as const,
        metadata: {
          volume: 0.5,
          pace: 1.0,
          sentiment: 'neutral',
          keywords: [],
        },
        speakerName: await this.getSpeakerName(speakerId),
        isProcessed: false,
      };

      return await DatabaseService.addTranscriptEntry(this.meetingId, transcriptEntry);
    } catch (error) {
      console.error('Failed to add transcript entry:', error);
      throw error;
    }
  }

  /**
   * Update transcript entry (for fragment completion)
   */
  async completeFragment(
    transcriptId: string,
    completeText: string,
    finalConfidence: number
  ): Promise<void> {
    try {
      await DatabaseService.updateTranscriptEntry(this.meetingId, transcriptId, {
        text: completeText,
        confidence: finalConfidence,
        isFragment: false,
        isComplete: true
      });
    } catch (error) {
      console.error('Failed to complete fragment:', error);
      throw error;
    }
  }

  private async getSpeakerName(speakerId: string): Promise<string> {
    // This would integrate with your SpeakerIdentificationService
    return `Speaker ${speakerId.substring(0, 8)}`;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.unsubscribeTranscripts) {
      this.unsubscribeTranscripts();
      this.unsubscribeTranscripts = undefined;
    }
  }
}

// ============ MEETING MANAGEMENT INTEGRATION ============

/**
 * Example: Meeting lifecycle management
 */
export class MeetingManager {
  private meetingId?: string;
  private unsubscribers: Array<() => void> = [];

  /**
   * Start a new meeting
   */
  async startMeeting(
    hostId: string,
    title: string,
    type: MeetingType,
    participants: string[]
  ): Promise<string> {
    try {
      const meeting = {
        hostId,
        title,
        type,
        participants: participants.map(userId => ({
          userId,
          id: userId,
          displayName: `User ${userId}`,
          email: `${userId}@example.com`,
          role: 'participant' as const,
          joinedAt: new Date(),
          leftAt: undefined,
          userName: `User ${userId}`,
          voiceProfileId: `voice-${userId}`,
          joinTime: new Date(),
          speakingTime: 0,
          isActive: true,
        })),
        transcript: [],
        notes: [],
        keywords: [],
        appliedRules: [],
        startTime: new Date(),
        endTime: undefined
      };

      this.meetingId = await DatabaseService.createMeeting(meeting as any);
      
      // Set up real-time listeners
      this.setupRealtimeListeners();

      console.log(`🎯 Meeting started: ${this.meetingId}`);
      return this.meetingId;

    } catch (error) {
      console.error('Failed to start meeting:', error);
      throw error;
    }
  }

  /**
   * End the current meeting
   */
  async endMeeting(): Promise<void> {
    if (!this.meetingId) {
      throw new Error('No active meeting to end');
    }

    try {
      await DatabaseService.updateMeeting(this.meetingId, {
        endTime: new Date()
      });

      this.cleanup();
      console.log(`🏁 Meeting ended: ${this.meetingId}`);

    } catch (error) {
      console.error('Failed to end meeting:', error);
      throw error;
    }
  }

  /**
   * Add participant to meeting
   */
  async addParticipant(userId: string, userName: string): Promise<void> {
    if (!this.meetingId) {
      throw new Error('No active meeting');
    }

    try {
      const meeting = await DatabaseService.getMeeting(this.meetingId);
      if (!meeting) {
        throw new Error('Meeting not found');
      }

      const updatedParticipants = [...meeting.participants, {
        userId,
        userName,
        voiceProfileId: `voice-${userId}`,
        joinTime: new Date(),
        speakingTime: 0
      }];

      await DatabaseService.updateMeeting(this.meetingId, {
        participants: updatedParticipants as any
      });

      console.log(`👤 Participant added: ${userName}`);

    } catch (error) {
      console.error('Failed to add participant:', error);
      throw error;
    }
  }

  /**
   * Update speaking time for participant
   */
  async updateSpeakingTime(userId: string, additionalTime: number): Promise<void> {
    if (!this.meetingId) return;

    try {
      const meeting = await DatabaseService.getMeeting(this.meetingId);
      if (!meeting) return;

      const updatedParticipants = meeting.participants.map(participant => {
        if (participant.userId === userId) {
          return {
            ...participant,
            speakingTime: participant.speakingTime + additionalTime
          };
        }
        return participant;
      });

      await DatabaseService.updateMeeting(this.meetingId, {
        participants: updatedParticipants as any
      });

    } catch (error) {
      console.error('Failed to update speaking time:', error);
    }
  }

  private setupRealtimeListeners() {
    if (!this.meetingId) return;

    // Listen to meeting changes
    const unsubscribeMeeting = RealtimeService.listenToMeeting(
      this.meetingId,
      (meeting) => {
        if (meeting) {
          console.log(`📊 Meeting updated: ${meeting.title}`);
          // Emit event or update state
        }
      }
    );

    this.unsubscribers.push(unsubscribeMeeting);
  }

  private cleanup() {
    this.unsubscribers.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.error('Error cleaning up listener:', error);
      }
    });
    this.unsubscribers = [];
  }

  getMeetingId(): string | undefined {
    return this.meetingId;
  }
}

// ============ VOICE PROFILE MANAGEMENT ============

/**
 * Example: Voice profile management for speaker identification
 */
export class VoiceProfileManager {
  private userId: string;
  private profiles: SpeakerProfile[] = [];
  private unsubscribeProfiles?: () => void;

  constructor(userId: string) {
    this.userId = userId;
    this.initializeProfiles();
  }

  private async initializeProfiles() {
    try {
      // Load existing profiles
      // Note: getUserVoiceProfiles is not implemented yet
      this.profiles = [];
      
      // Set up real-time listener
      this.unsubscribeProfiles = RealtimeService.listenToUserVoiceProfiles(
        this.userId,
        (update) => {
          this.profiles = update.data;
          console.log(`🎤 Voice profiles updated: ${this.profiles.length}`);
        }
      );

    } catch (error) {
      console.error('Failed to initialize voice profiles:', error);
    }
  }

  /**
   * Create or update voice profile
   */
  async updateVoiceProfile(
    voiceId: string,
    voiceEmbedding: number[],
    userName?: string
  ): Promise<string> {
    try {
      // Check if profile exists
      const existingProfile = this.profiles.find(p => p.voiceId === voiceId);

      if (existingProfile) {
        // Update existing profile
        // Note: updateVoiceProfile is not implemented yet
        console.log('Would update voice profile for:', existingProfile.speakerId);
        return existingProfile.speakerId;
      } else {
        // Create new profile
        // Note: createVoiceProfile is not implemented yet
        console.log('Would create voice profile for:', voiceId);
        return `speaker_${voiceId}`;
      }

    } catch (error) {
      console.error('Failed to update voice profile:', error);
      throw error;
    }
  }

  /**
   * Find matching voice profile
   */
  findMatchingProfile(voiceEmbedding: number[], threshold: number = 0.8): SpeakerProfile | null {
    // This would implement actual voice matching logic
    // For now, return a mock implementation
    return this.profiles.find(profile => profile.confidence > threshold) || null;
  }

  cleanup() {
    if (this.unsubscribeProfiles) {
      this.unsubscribeProfiles();
    }
  }
}

// ============ CUSTOM RULES INTEGRATION ============

/**
 * Example: Custom rules engine integration
 */
export class RulesManager {
  private userId: string;
  private rules: CustomRule[] = [];
  private unsubscribeRules?: () => void;

  constructor(userId: string) {
    this.userId = userId;
    this.initializeRules();
  }

  private async initializeRules() {
    try {
      // Load existing rules
      // Note: getUserCustomRules is not implemented yet
      this.rules = [];
      
      // Set up real-time listener
      this.unsubscribeRules = RealtimeService.listenToUserCustomRules(
        this.userId,
        (update) => {
          this.rules = update.data.filter(rule => rule.enabled);
          console.log(`📋 Active rules: ${this.rules.length}`);
        }
      );

    } catch (error) {
      console.error('Failed to initialize rules:', error);
    }
  }

  /**
   * Evaluate transcript against rules
   */
  evaluateTranscript(transcript: TranscriptEntry, meetingType: MeetingType): CustomRule[] {
    const matchingRules: CustomRule[] = [];

    for (const rule of this.rules) {
      // Check meeting type
      if (!rule.meetingTypes.includes(meetingType)) {
        continue;
      }

      // Check conditions
      const conditionsMet = rule.conditions.every(condition => {
        switch (condition.type) {
          case 'keyword':
            return transcript.text.toLowerCase().includes(
              (condition.value as string).toLowerCase()
            );
          case 'speaker':
            return transcript.speakerId === condition.value;
          default:
            return false;
        }
      });

      if (conditionsMet) {
        matchingRules.push(rule);
      }
    }

    return matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Create new custom rule
   */
  async createRule(ruleData: Omit<CustomRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Note: createCustomRule is not implemented yet
      console.log('Would create custom rule:', ruleData);
      return 'mock-rule-id';
    } catch (error) {
      console.error('Failed to create rule:', error);
      throw error;
    }
  }

  cleanup() {
    if (this.unsubscribeRules) {
      this.unsubscribeRules();
    }
  }
}

// ============ COMPLETE INTEGRATION EXAMPLE ============

/**
 * Example: Complete Universal Assistant session
 */
export class UniversalAssistantSession {
  private meetingManager: MeetingManager;
  private transcriptProcessor?: TranscriptProcessor;
  private voiceProfileManager?: VoiceProfileManager;
  private rulesManager?: RulesManager;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.meetingManager = new MeetingManager();
  }

  /**
   * Start a complete session
   */
  async startSession(
    title: string,
    type: MeetingType,
    participants: string[]
  ): Promise<string> {
    try {
      // Start meeting
      const meetingId = await this.meetingManager.startMeeting(
        this.userId,
        title,
        type,
        participants
      );

      // Initialize components
      this.transcriptProcessor = new TranscriptProcessor(meetingId);
      this.voiceProfileManager = new VoiceProfileManager(this.userId);
      this.rulesManager = new RulesManager(this.userId);

      // Start transcript processing
      await this.transcriptProcessor.startProcessing((transcripts) => {
        this.processTranscripts(transcripts, type);
      });

      console.log(`🚀 Universal Assistant session started: ${meetingId}`);
      return meetingId;

    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  private processTranscripts(transcripts: TranscriptEntry[], meetingType: MeetingType) {
    transcripts.forEach(transcript => {
      // Evaluate against custom rules
      const matchingRules = this.rulesManager?.evaluateTranscript(transcript, meetingType) || [];
      
      if (matchingRules.length > 0) {
        console.log(`🎯 Rules triggered for transcript: ${matchingRules.length}`);
        // Process rule actions
        this.processRuleActions(matchingRules, transcript);
      }
    });
  }

  private processRuleActions(rules: CustomRule[], transcript: TranscriptEntry) {
    rules.forEach(rule => {
      rule.actions.forEach(action => {
        switch (action.type) {
          case 'respond':
            console.log(`🤖 Auto-response triggered: ${action.parameters?.message}`);
            break;
          case 'highlight':
            console.log(`✨ Transcript highlighted: ${transcript.text.substring(0, 50)}...`);
            break;
          case 'notify':
            console.log(`🔔 Notification sent for rule: ${rule.name}`);
            break;
        }
      });
    });
  }

  /**
   * End session and cleanup
   */
  async endSession(): Promise<void> {
    try {
      await this.meetingManager.endMeeting();
      
      // Cleanup all components
      this.transcriptProcessor?.cleanup();
      this.voiceProfileManager?.cleanup();
      this.rulesManager?.cleanup();

      console.log('🏁 Universal Assistant session ended');

    } catch (error) {
      console.error('Failed to end session:', error);
      throw error;
    }
  }
}

// ============ USAGE IN COMPONENTS ============

/**
 * Example React component using the database services
 */
/*
export function MeetingDashboard({ userId }: { userId: string }) {
  const { user } = useUser(userId);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [session, setSession] = useState<UniversalAssistantSession | null>(null);

  useEffect(() => {
    // Set up meetings listener
    const unsubscribe = RealtimeService.listenToUserMeetings(
      userId,
      (update) => {
        setMeetings(update.data);
      },
      { limit: 10 }
    );

    return unsubscribe;
  }, [userId]);

  const startSession = async () => {
    const newSession = new UniversalAssistantSession(userId);
    const meetingId = await newSession.startSession(
      'New Meeting',
      MeetingType.BRAINSTORMING,
      [userId]
    );
    setSession(newSession);
  };

  const endSession = async () => {
    if (session) {
      await session.endSession();
      setSession(null);
    }
  };

  return (
    <div>
      <h1>Welcome, {user?.displayName}</h1>
      <div>
        <h2>Recent Meetings ({meetings.length})</h2>
        {meetings.map(meeting => (
          <div key={meeting.meetingId}>
            <h3>{meeting.title}</h3>
            <p>Participants: {meeting.participants.length}</p>
          </div>
        ))}
      </div>
      <div>
        {session ? (
          <button onClick={endSession}>End Session</button>
        ) : (
          <button onClick={startSession}>Start Session</button>
        )}
      </div>
    </div>
  );
}
*/