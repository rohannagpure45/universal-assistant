import { SpeakerProfile } from '../../types';
import { db } from '../../lib/firebase/client';
import { collection, doc, setDoc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { nanoid } from 'nanoid';

// Enhanced voice profile with advanced embeddings
export interface EnhancedSpeakerProfile extends SpeakerProfile {
  // Override required fields from SpeakerProfile
  userName: string; // Make userName required in enhanced profile
  
  // Advanced embeddings
  speakerEmbedding: number[]; // Speaker identity embedding
  emotionalEmbedding: number[]; // Emotional state embedding
  linguisticEmbedding: number[]; // Speaking patterns embedding
  prosodyEmbedding: number[]; // Prosody and rhythm embedding
  
  // Voice characteristics
  voiceCharacteristics: {
    pitch: { mean: number; std: number; range: [number, number] };
    formants: { f1: number; f2: number; f3: number; f4: number };
    spectralCentroid: number;
    spectralRolloff: number;
    zeroCrossingRate: number;
    mfccCoefficients: number[];
    fundamentalFrequency: { mean: number; std: number };
    jitter: number; // Voice stability
    shimmer: number; // Amplitude variation
  };
  
  // Speaking patterns
  speechPatterns: {
    speakingRate: number; // words per minute
    pausePatterns: number[]; // pause durations
    stressPatterns: number[]; // stress emphasis
    intonationPatterns: number[]; // pitch contours
    fillerWords: string[]; // um, uh, etc.
    commonPhrases: string[]; // frequently used phrases
    vocabularyComplexity: number; // lexical diversity
    sentenceStructureComplexity: number;
  };
  
  // Emotional characteristics
  emotionalProfile: {
    baselineEmotion: 'neutral' | 'happy' | 'sad' | 'excited' | 'calm' | 'stressed';
    emotionalRange: number; // 0-1, how expressive
    emotionalStability: number; // 0-1, consistency
    dominantEmotions: Array<{ emotion: string; frequency: number }>;
    emotionalTransitions: Array<{ from: string; to: string; frequency: number }>;
  };
  
  // Learning and adaptation
  adaptationMetrics: {
    learningRate: number; // how quickly profile adapts
    stabilityScore: number; // how stable the profile is
    confidenceScore: number; // overall confidence
    dataQuality: number; // quality of training data
    lastAdaptation: Date;
    adaptationCount: number;
    validationScore: number; // cross-validation score
  };
  
  // Advanced metadata
  environmentalFactors: {
    backgroundNoiseLevel: number;
    roomAcoustics: 'reverberant' | 'dry' | 'echoey' | 'normal';
    microphoneQuality: 'high' | 'medium' | 'low';
    compressionArtifacts: number; // 0-1
  };
  
  // Performance metrics
  recognitionMetrics: {
    accuracy: number;
    falsePositiveRate: number;
    falseNegativeRate: number;
    averageConfidence: number;
    recognitionLatency: number;
    lastEvaluated: Date;
  };
  
  // Privacy and security
  privacySettings: {
    dataRetentionDays: number;
    allowCrossMeetingRecognition: boolean;
    enableBiometricAuth: boolean;
    anonymizeData: boolean;
  };
}

// Voice embedding configuration
export interface EmbeddingConfig {
  speakerEmbeddingSize: number;
  emotionalEmbeddingSize: number;
  linguisticEmbeddingSize: number;
  prosodyEmbeddingSize: number;
  updateThreshold: number;
  maxProfiles: number;
  adaptationEnabled: boolean;
  crossValidationEnabled: boolean;
}

// Voice analysis metrics
export interface VoiceAnalysisMetrics {
  totalProfiles: number;
  activeProfiles: number;
  averageAccuracy: number;
  totalRecognitions: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  averageProcessingTime: number;
  modelVersion: string;
  lastModelUpdate: Date;
  dataQualityScore: number;
  sessionHistory: Array<any>;
  responseTimeHistory: Array<any>;
  confidenceHistory: Array<any>;
}

// Voice recognition events
export interface VoiceProfileEvents {
  onProfileCreated: (profile: EnhancedSpeakerProfile) => void;
  onProfileUpdated: (profile: EnhancedSpeakerProfile) => void;
  onSpeakerIdentified: (speakerId: string, confidence: number) => void;
  onUnknownSpeaker: (embedding: number[], suggestedId: string) => void;
  onModelUpdated: (version: string, improvements: string[]) => void;
  onAccuracyThresholdReached: (accuracy: number) => void;
  onPrivacyViolation: (violation: string, speakerId: string) => void;
}

// Machine learning model interface
export interface VoiceMLModel {
  version: string;
  accuracy: number;
  trainingData: number;
  lastTrained: Date;
  features: string[];
  hyperparameters: Record<string, any>;
}

export class VoiceProfileManager {
  private profiles: Map<string, EnhancedSpeakerProfile> = new Map();
  private userId: string | null = null;
  private similarityThreshold: number = 0.85;
  
  // Enhanced properties
  private config: EmbeddingConfig;
  private eventListeners: Partial<VoiceProfileEvents> = {};
  private metrics: VoiceAnalysisMetrics;
  private mlModel: VoiceMLModel | null = null;
  private isEnhancedMode: boolean = true;
  
  // Performance optimization
  private embeddingCache: Map<string, number[]> = new Map();
  private recognitionHistory: Array<{ speakerId: string; confidence: number; timestamp: number }> = [];
  private adaptationQueue: EnhancedSpeakerProfile[] = [];
  private metricsTimer: NodeJS.Timeout | null = null;
  
  // Audio processing
  private audioContext: AudioContext | null = null;
  private analysisBuffer: Float32Array[] = [];
  private processedTranscripts: Set<string> = new Set();
  
  constructor(config?: Partial<EmbeddingConfig>) {
    // Initialize enhanced configuration
    this.config = {
      speakerEmbeddingSize: 512,
      emotionalEmbeddingSize: 128,
      linguisticEmbeddingSize: 256,
      prosodyEmbeddingSize: 64,
      updateThreshold: 0.8,
      maxProfiles: 100,
      adaptationEnabled: true,
      crossValidationEnabled: true,
      ...config,
    };
    
    // Initialize metrics
    this.metrics = {
      totalProfiles: 0,
      activeProfiles: 0,
      averageAccuracy: 0,
      totalRecognitions: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
      averageProcessingTime: 0,
      modelVersion: '1.0.0',
      lastModelUpdate: new Date(),
      dataQualityScore: 0,
      sessionHistory: [],
      responseTimeHistory: [],
      confidenceHistory: [],
    };
    
    this.initializeEnhancedFeatures();
  }

  /**
   * Initialize enhanced voice profile features
   */
  private initializeEnhancedFeatures(): void {
    console.log('VoiceProfileManager: Initializing Phase 3 enhanced features');
    
    // Initialize audio context for voice analysis
    this.initializeAudioContext();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Load ML model if available
    this.loadMLModel();
    
    console.log('VoiceProfileManager: Enhanced features initialized');
  }

  /**
   * Initialize Web Audio API for voice analysis
   */
  private async initializeAudioContext(): Promise<void> {
    // Only initialize audio context on client-side
    if (typeof window === 'undefined') {
      console.log('VoiceProfileManager: Skipping audio context initialization (server-side)');
      return;
    }
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('VoiceProfileManager: Audio context initialized');
    } catch (error) {
      console.warn('VoiceProfileManager: Failed to initialize audio context:', error);
    }
  }

  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadProfiles();
    
    if (this.isEnhancedMode) {
      await this.initializeEnhancedProfiles();
    }
  }

  /**
   * Initialize enhanced profiles from existing basic profiles
   */
  private async initializeEnhancedProfiles(): Promise<void> {
    const basicProfiles = Array.from(this.profiles.values());
    
    for (const profile of basicProfiles) {
      if (!this.isEnhancedProfile(profile)) {
        const enhancedProfile = await this.upgradeToEnhancedProfile(profile as SpeakerProfile);
        this.profiles.set((profile as any).speakerId || (profile as any).id, enhancedProfile);
      }
    }
    
    console.log(`VoiceProfileManager: Enhanced ${basicProfiles.length} profiles`);
  }

  /**
   * Check if profile is enhanced
   */
  private isEnhancedProfile(profile: any): profile is EnhancedSpeakerProfile {
    return profile.speakerEmbedding !== undefined && 
           profile.voiceCharacteristics !== undefined &&
           profile.speechPatterns !== undefined;
  }

  /**
   * Upgrade basic profile to enhanced profile
   */
  private async upgradeToEnhancedProfile(basicProfile: SpeakerProfile): Promise<EnhancedSpeakerProfile> {
    const enhancedProfile: EnhancedSpeakerProfile = {
      ...basicProfile,
      userName: basicProfile.userName || 'Unknown',
      speakerEmbedding: this.generateRandomEmbedding(this.config.speakerEmbeddingSize),
      emotionalEmbedding: this.generateRandomEmbedding(this.config.emotionalEmbeddingSize),
      linguisticEmbedding: this.generateRandomEmbedding(this.config.linguisticEmbeddingSize),
      prosodyEmbedding: this.generateRandomEmbedding(this.config.prosodyEmbeddingSize),
      
      voiceCharacteristics: {
        pitch: { mean: 150, std: 20, range: [100, 200] },
        formants: { f1: 500, f2: 1500, f3: 2500, f4: 3500 },
        spectralCentroid: 2000,
        spectralRolloff: 8000,
        zeroCrossingRate: 0.1,
        mfccCoefficients: Array(13).fill(0).map(() => Math.random() * 2 - 1),
        fundamentalFrequency: { mean: 120, std: 15 },
        jitter: 0.02,
        shimmer: 0.05,
      },
      
      speechPatterns: {
        speakingRate: 150,
        pausePatterns: [0.2, 0.5, 1.0],
        stressPatterns: [0.5, 0.8, 0.3],
        intonationPatterns: [0.1, 0.3, -0.2, 0.5],
        fillerWords: ['um', 'uh', 'like'],
        commonPhrases: [],
        vocabularyComplexity: 0.5,
        sentenceStructureComplexity: 0.6,
      },
      
      emotionalProfile: {
        baselineEmotion: 'neutral',
        emotionalRange: 0.5,
        emotionalStability: 0.7,
        dominantEmotions: [{ emotion: 'neutral', frequency: 0.8 }],
        emotionalTransitions: [],
      },
      
      adaptationMetrics: {
        learningRate: 0.1,
        stabilityScore: 0.5,
        confidenceScore: basicProfile.confidence,
        dataQuality: 0.6,
        lastAdaptation: new Date(),
        adaptationCount: 0,
        validationScore: 0.5,
      },
      
      environmentalFactors: {
        backgroundNoiseLevel: 0.1,
        roomAcoustics: 'normal',
        microphoneQuality: 'medium',
        compressionArtifacts: 0.1,
      },
      
      recognitionMetrics: {
        accuracy: basicProfile.confidence,
        falsePositiveRate: 0.05,
        falseNegativeRate: 0.05,
        averageConfidence: basicProfile.confidence,
        recognitionLatency: 50,
        lastEvaluated: new Date(),
      },
      
      privacySettings: {
        dataRetentionDays: 90,
        allowCrossMeetingRecognition: true,
        enableBiometricAuth: false,
        anonymizeData: false,
      },
    };
    
    return enhancedProfile;
  }

  /**
   * Generate random embedding vector
   */
  private generateRandomEmbedding(size: number): number[] {
    return Array(size).fill(0).map(() => Math.random() * 2 - 1);
  }

  private async loadProfiles(): Promise<void> {
    if (!this.userId) return;

    try {
      const profilesRef = collection(db, 'users', this.userId, 'voiceProfiles');
      const snapshot = await getDocs(profilesRef);
      
      snapshot.forEach(doc => {
        const profileData = doc.data();
        
        // Convert timestamp fields back to Date objects
        if (profileData.lastSeen && typeof profileData.lastSeen === 'string') {
          profileData.lastSeen = new Date(profileData.lastSeen);
        }
        if (profileData.adaptationMetrics?.lastAdaptation && typeof profileData.adaptationMetrics.lastAdaptation === 'string') {
          profileData.adaptationMetrics.lastAdaptation = new Date(profileData.adaptationMetrics.lastAdaptation);
        }
        if (profileData.recognitionMetrics?.lastEvaluated && typeof profileData.recognitionMetrics.lastEvaluated === 'string') {
          profileData.recognitionMetrics.lastEvaluated = new Date(profileData.recognitionMetrics.lastEvaluated);
        }
        
        const profile = profileData as EnhancedSpeakerProfile;
        this.profiles.set(profile.speakerId, profile);
      });
      
      this.metrics.totalProfiles = this.profiles.size;
      this.metrics.activeProfiles = Array.from(this.profiles.values())
        .filter(p => this.isProfileActive(p)).length;
      
      console.log(`Loaded ${this.profiles.size} voice profiles (${this.metrics.activeProfiles} active)`);
    } catch (error) {
      console.error('Error loading voice profiles:', error);
    }
  }

  /**
   * Check if profile is considered active
   */
  private isProfileActive(profile: EnhancedSpeakerProfile): boolean {
    const daysSinceLastSeen = (Date.now() - profile.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceLastSeen <= 30 && profile.sessionCount >= 3;
  }

  /**
   * Enhanced speaker matching with multi-dimensional embeddings
   */
  async matchSpeaker(
    voiceEmbedding: number[], 
    speakerId: number, 
    audioFeatures?: {
      text?: string;
      audioBuffer?: ArrayBuffer;
      emotionalContext?: string;
      environmentalFactors?: Partial<EnhancedSpeakerProfile['environmentalFactors']>;
    }
  ): Promise<EnhancedSpeakerProfile | null> {
    const startTime = Date.now();
    let bestMatch: EnhancedSpeakerProfile | null = null;
    let highestSimilarity = 0;

    // Enhanced matching if in enhanced mode
    if (this.isEnhancedMode && audioFeatures) {
      bestMatch = await this.performEnhancedMatching(voiceEmbedding, audioFeatures);
      if (bestMatch) {
        highestSimilarity = this.calculateEnhancedSimilarity(voiceEmbedding, bestMatch, audioFeatures);
      }
    } else {
      // Legacy matching
      const profileValues = Array.from(this.profiles.values());
      for (const profile of profileValues) {
        const similarity = this.calculateCosineSimilarity(
          voiceEmbedding,
          profile.voiceEmbedding || profile.speakerEmbedding
        );

        if (similarity > highestSimilarity && similarity >= this.similarityThreshold) {
          highestSimilarity = similarity;
          bestMatch = profile;
        }
      }
    }

    // Record recognition attempt
    const processingTime = Date.now() - startTime;
    this.recordRecognitionAttempt(bestMatch?.speakerId || 'unknown', highestSimilarity, processingTime);

    if (bestMatch && highestSimilarity >= this.similarityThreshold) {
      // Update existing profile
      await this.updateProfileFromRecognition(bestMatch, voiceEmbedding, audioFeatures, highestSimilarity);
      this.eventListeners.onSpeakerIdentified?.(bestMatch.speakerId, highestSimilarity);
    } else {
      // Create new profile or handle unknown speaker
      if (this.shouldCreateNewProfile(highestSimilarity)) {
        bestMatch = await this.createEnhancedProfile(voiceEmbedding, speakerId, audioFeatures);
        this.eventListeners.onProfileCreated?.(bestMatch);
      } else {
        this.eventListeners.onUnknownSpeaker?.(voiceEmbedding, `speaker_${speakerId}_${Date.now()}`);
      }
    }

    return bestMatch;
  }

  /**
   * Perform enhanced multi-dimensional matching
   */
  private async performEnhancedMatching(
    voiceEmbedding: number[],
    audioFeatures: NonNullable<Parameters<typeof this.matchSpeaker>[2]>
  ): Promise<EnhancedSpeakerProfile | null> {
    let bestMatch: EnhancedSpeakerProfile | null = null;
    let bestScore = 0;

    // Extract features from audio if available
    const extractedFeatures = audioFeatures.audioBuffer ? 
      await this.extractAudioFeatures(audioFeatures.audioBuffer) : null;

    const profileValues = Array.from(this.profiles.values());
    for (const profile of profileValues) {
      if (!this.isEnhancedProfile(profile)) continue;

      // Multi-dimensional similarity calculation
      const scores = {
        speaker: this.calculateCosineSimilarity(voiceEmbedding, profile.speakerEmbedding),
        emotional: extractedFeatures?.emotionalEmbedding ? 
          this.calculateCosineSimilarity(extractedFeatures.emotionalEmbedding, profile.emotionalEmbedding) : 0,
        linguistic: audioFeatures.text ? 
          this.calculateLinguisticSimilarity(audioFeatures.text, profile) : 0,
        prosody: extractedFeatures?.prosodyEmbedding ?
          this.calculateCosineSimilarity(extractedFeatures.prosodyEmbedding, profile.prosodyEmbedding) : 0,
      };

      // Weighted combination of similarity scores
      const combinedScore = (
        scores.speaker * 0.4 +
        scores.emotional * 0.2 +
        scores.linguistic * 0.2 +
        scores.prosody * 0.2
      );

      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestMatch = profile;
      }
    }

    return bestScore >= this.similarityThreshold ? bestMatch : null;
  }

  /**
   * Calculate enhanced similarity with context
   */
  private calculateEnhancedSimilarity(
    voiceEmbedding: number[],
    profile: EnhancedSpeakerProfile,
    audioFeatures: NonNullable<Parameters<typeof this.matchSpeaker>[2]>
  ): number {
    // Base similarity
    let similarity = this.calculateCosineSimilarity(voiceEmbedding, profile.speakerEmbedding);

    // Environmental factor adjustments
    if (audioFeatures.environmentalFactors) {
      const envSimilarity = this.compareEnvironmentalFactors(
        audioFeatures.environmentalFactors,
        profile.environmentalFactors
      );
      similarity = (similarity + envSimilarity * 0.1) / 1.1;
    }

    // Confidence boost for frequent speakers
    if (profile.sessionCount > 10) {
      similarity *= 1.05;
    }

    // Recent interaction boost
    const daysSinceLastSeen = (Date.now() - profile.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastSeen < 1) {
      similarity *= 1.02;
    }

    return Math.min(similarity, 1.0);
  }

  /**
   * Extract audio features from buffer
   */
  private async extractAudioFeatures(audioBuffer: ArrayBuffer): Promise<{
    emotionalEmbedding: number[];
    prosodyEmbedding: number[];
    voiceCharacteristics: Partial<EnhancedSpeakerProfile['voiceCharacteristics']>;
  } | null> {
    if (!this.audioContext) {
      return null;
    }

    try {
      // Decode audio buffer
      const decodedBuffer = await this.audioContext.decodeAudioData(audioBuffer.slice(0));
      const audioData = decodedBuffer.getChannelData(0);

      // Extract basic features
      const features = this.analyzeAudioSignal(audioData, decodedBuffer.sampleRate);

      return {
        emotionalEmbedding: this.extractEmotionalFeatures(features),
        prosodyEmbedding: this.extractProsodyFeatures(features),
        voiceCharacteristics: features,
      };
    } catch (error) {
      console.error('VoiceProfileManager: Audio feature extraction failed:', error);
      return null;
    }
  }

  /**
   * Analyze audio signal to extract voice characteristics
   */
  private analyzeAudioSignal(audioData: Float32Array, sampleRate: number): Partial<EnhancedSpeakerProfile['voiceCharacteristics']> {
    // Basic audio analysis
    const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
    const zeroCrossings = this.calculateZeroCrossingRate(audioData);
    const spectralFeatures = this.calculateSpectralFeatures(audioData, sampleRate);

    return {
      zeroCrossingRate: zeroCrossings,
      spectralCentroid: spectralFeatures.centroid,
      spectralRolloff: spectralFeatures.rolloff,
      fundamentalFrequency: { mean: spectralFeatures.f0, std: spectralFeatures.f0Std },
    };
  }

  /**
   * Calculate zero crossing rate
   */
  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / audioData.length;
  }

  /**
   * Calculate spectral features
   */
  private calculateSpectralFeatures(audioData: Float32Array, sampleRate: number): {
    centroid: number;
    rolloff: number;
    f0: number;
    f0Std: number;
  } {
    // Simplified spectral analysis
    // In a real implementation, this would use FFT
    const nyquist = sampleRate / 2;
    
    return {
      centroid: nyquist * 0.3, // Placeholder
      rolloff: nyquist * 0.8,   // Placeholder
      f0: 150,                  // Placeholder fundamental frequency
      f0Std: 20,               // Placeholder std deviation
    };
  }

  /**
   * Extract emotional features from audio characteristics
   */
  private extractEmotionalFeatures(characteristics: any): number[] {
    // Simplified emotional feature extraction
    // In practice, this would use trained models
    return this.generateRandomEmbedding(this.config.emotionalEmbeddingSize);
  }

  /**
   * Extract prosody features
   */
  private extractProsodyFeatures(characteristics: any): number[] {
    // Simplified prosody feature extraction
    return this.generateRandomEmbedding(this.config.prosodyEmbeddingSize);
  }

  /**
   * Calculate linguistic similarity based on text
   */
  private calculateLinguisticSimilarity(text: string, profile: EnhancedSpeakerProfile): number {
    if (!text || !profile.speechPatterns) return 0;

    let similarity = 0;
    let factors = 0;

    // Check for common phrases
    const textLower = text.toLowerCase();
    const commonPhraseMatches = profile.speechPatterns.commonPhrases.filter(phrase => 
      textLower.includes(phrase.toLowerCase())
    ).length;
    
    if (profile.speechPatterns.commonPhrases.length > 0) {
      similarity += (commonPhraseMatches / profile.speechPatterns.commonPhrases.length) * 0.3;
      factors += 0.3;
    }

    // Check for filler words
    const fillerWordMatches = profile.speechPatterns.fillerWords.filter(filler =>
      textLower.includes(filler.toLowerCase())
    ).length;

    if (profile.speechPatterns.fillerWords.length > 0) {
      similarity += (fillerWordMatches / profile.speechPatterns.fillerWords.length) * 0.2;
      factors += 0.2;
    }

    // Vocabulary complexity approximation
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size;
    const totalWords = text.split(/\s+/).length;
    const complexity = totalWords > 0 ? uniqueWords / totalWords : 0;
    
    const complexityDiff = Math.abs(complexity - profile.speechPatterns.vocabularyComplexity);
    similarity += (1 - complexityDiff) * 0.3;
    factors += 0.3;

    return factors > 0 ? similarity / factors : 0;
  }

  /**
   * Compare environmental factors
   */
  private compareEnvironmentalFactors(
    current: Partial<EnhancedSpeakerProfile['environmentalFactors']>,
    profile: EnhancedSpeakerProfile['environmentalFactors']
  ): number {
    let similarity = 0;
    let factors = 0;

    if (current.backgroundNoiseLevel !== undefined) {
      const noiseDiff = Math.abs(current.backgroundNoiseLevel - profile.backgroundNoiseLevel);
      similarity += (1 - noiseDiff);
      factors++;
    }

    if (current.roomAcoustics && current.roomAcoustics === profile.roomAcoustics) {
      similarity += 1;
      factors++;
    }

    if (current.microphoneQuality && current.microphoneQuality === profile.microphoneQuality) {
      similarity += 1;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0.5;
  }

  /**
   * Enhanced profile creation with comprehensive features
   */
  private async createEnhancedProfile(
    voiceEmbedding: number[],
    speakerId: number,
    audioFeatures?: NonNullable<Parameters<typeof this.matchSpeaker>[2]>
  ): Promise<EnhancedSpeakerProfile> {
    const profileId = `speaker_${speakerId}_${Date.now()}`;
    
    // Extract features if audio is available
    const extractedFeatures = audioFeatures?.audioBuffer ? 
      await this.extractAudioFeatures(audioFeatures.audioBuffer) : null;

    const profile: EnhancedSpeakerProfile = {
      speakerId: profileId,
      voiceId: `voice_${speakerId}`,
      userName: `Speaker ${speakerId}`,
      voiceEmbedding, // Legacy compatibility
      lastSeen: new Date(),
      confidence: 0.7,
      sessionCount: 1,
      
      // Enhanced embeddings
      speakerEmbedding: voiceEmbedding,
      emotionalEmbedding: extractedFeatures?.emotionalEmbedding || 
        this.generateRandomEmbedding(this.config.emotionalEmbeddingSize),
      linguisticEmbedding: this.generateRandomEmbedding(this.config.linguisticEmbeddingSize),
      prosodyEmbedding: extractedFeatures?.prosodyEmbedding || 
        this.generateRandomEmbedding(this.config.prosodyEmbeddingSize),
      
      // Voice characteristics
      voiceCharacteristics: {
        ...(extractedFeatures?.voiceCharacteristics || {}),
        pitch: { mean: 150, std: 20, range: [100, 200] },
        formants: { f1: 500, f2: 1500, f3: 2500, f4: 3500 },
        spectralCentroid: extractedFeatures?.voiceCharacteristics?.spectralCentroid || 2000,
        spectralRolloff: extractedFeatures?.voiceCharacteristics?.spectralRolloff || 8000,
        zeroCrossingRate: extractedFeatures?.voiceCharacteristics?.zeroCrossingRate || 0.1,
        mfccCoefficients: Array(13).fill(0).map(() => Math.random() * 2 - 1),
        fundamentalFrequency: extractedFeatures?.voiceCharacteristics?.fundamentalFrequency || { mean: 120, std: 15 },
        jitter: 0.02,
        shimmer: 0.05,
      },
      
      // Speech patterns (will be learned over time)
      speechPatterns: {
        speakingRate: 150,
        pausePatterns: [],
        stressPatterns: [],
        intonationPatterns: [],
        fillerWords: [],
        commonPhrases: [],
        vocabularyComplexity: 0.5,
        sentenceStructureComplexity: 0.6,
      },
      
      // Emotional profile
      emotionalProfile: {
        baselineEmotion: 'neutral',
        emotionalRange: 0.5,
        emotionalStability: 0.7,
        dominantEmotions: [{ emotion: 'neutral', frequency: 1.0 }],
        emotionalTransitions: [],
      },
      
      // Adaptation metrics
      adaptationMetrics: {
        learningRate: 0.1,
        stabilityScore: 0.5,
        confidenceScore: 0.7,
        dataQuality: 0.6,
        lastAdaptation: new Date(),
        adaptationCount: 0,
        validationScore: 0.5,
      },
      
      // Environmental factors
      environmentalFactors: {
        backgroundNoiseLevel: audioFeatures?.environmentalFactors?.backgroundNoiseLevel || 0.1,
        roomAcoustics: audioFeatures?.environmentalFactors?.roomAcoustics || 'normal',
        microphoneQuality: audioFeatures?.environmentalFactors?.microphoneQuality || 'medium',
        compressionArtifacts: audioFeatures?.environmentalFactors?.compressionArtifacts || 0.1,
      },
      
      // Recognition metrics
      recognitionMetrics: {
        accuracy: 0.7,
        falsePositiveRate: 0.05,
        falseNegativeRate: 0.05,
        averageConfidence: 0.7,
        recognitionLatency: 50,
        lastEvaluated: new Date(),
      },
      
      // Privacy settings
      privacySettings: {
        dataRetentionDays: 90,
        allowCrossMeetingRecognition: true,
        enableBiometricAuth: false,
        anonymizeData: false,
      },
    };

    this.profiles.set(profile.speakerId, profile);
    await this.saveProfile(profile);
    
    this.metrics.totalProfiles++;
    
    return profile;
  }

  // Legacy method for backward compatibility
  private async createNewProfile(
    voiceEmbedding: number[],
    speakerId: number
  ): Promise<SpeakerProfile> {
    return this.createEnhancedProfile(voiceEmbedding, speakerId);
  }

  /**
   * Enhanced profile saving with proper data serialization
   */
  private async saveProfile(profile: EnhancedSpeakerProfile): Promise<void> {
    if (!this.userId) return;

    try {
      const profileRef = doc(
        db,
        'users',
        this.userId,
        'voiceProfiles',
        profile.speakerId
      );
      
      // Serialize profile for Firestore
      const serializedProfile = {
        ...profile,
        lastSeen: profile.lastSeen.toISOString(),
        adaptationMetrics: {
          ...profile.adaptationMetrics,
          lastAdaptation: profile.adaptationMetrics.lastAdaptation.toISOString(),
        },
        recognitionMetrics: {
          ...profile.recognitionMetrics,
          lastEvaluated: profile.recognitionMetrics.lastEvaluated.toISOString(),
        },
      };
      
      await setDoc(profileRef, serializedProfile);
      
      // Update local metrics
      this.updateSaveMetrics();
      
    } catch (error) {
      console.error('Error saving voice profile:', error);
    }
  }

  /**
   * Update profile from recognition data
   */
  private async updateProfileFromRecognition(
    profile: EnhancedSpeakerProfile,
    voiceEmbedding: number[],
    audioFeatures: NonNullable<Parameters<typeof this.matchSpeaker>[2]> | undefined,
    confidence: number
  ): Promise<void> {
    const now = new Date();
    
    // Update basic stats
    profile.confidence = this.adaptiveLerp(profile.confidence, confidence, profile.adaptationMetrics.learningRate);
    profile.sessionCount++;
    profile.lastSeen = now;
    
    // Update embeddings with exponential moving average
    const alpha = profile.adaptationMetrics.learningRate;
    this.updateEmbeddingWithEMA(profile.speakerEmbedding, voiceEmbedding, alpha);
    
    // Update speech patterns if text is available
    if (audioFeatures?.text) {
      this.updateSpeechPatternsFromText(profile, audioFeatures.text);
    }
    
    // Update environmental factors
    if (audioFeatures?.environmentalFactors) {
      this.updateEnvironmentalFactors(profile, audioFeatures.environmentalFactors);
    }
    
    // Update adaptation metrics
    profile.adaptationMetrics.lastAdaptation = now;
    profile.adaptationMetrics.adaptationCount++;
    profile.adaptationMetrics.confidenceScore = this.adaptiveLerp(
      profile.adaptationMetrics.confidenceScore,
      confidence,
      0.1
    );
    
    // Update recognition metrics
    profile.recognitionMetrics.averageConfidence = this.adaptiveLerp(
      profile.recognitionMetrics.averageConfidence,
      confidence,
      0.1
    );
    profile.recognitionMetrics.lastEvaluated = now;
    
    // Queue for adaptation if enabled
    if (this.config.adaptationEnabled) {
      this.queueForAdaptation(profile);
    }
    
    await this.saveProfile(profile);
    this.eventListeners.onProfileUpdated?.(profile);
  }

  /**
   * Adaptive linear interpolation
   */
  private adaptiveLerp(current: number, target: number, alpha: number): number {
    return current + alpha * (target - current);
  }

  /**
   * Update embedding with exponential moving average
   */
  private updateEmbeddingWithEMA(current: number[], new_data: number[], alpha: number): void {
    for (let i = 0; i < Math.min(current.length, new_data.length); i++) {
      current[i] = this.adaptiveLerp(current[i], new_data[i], alpha);
    }
  }

  /**
   * Update speech patterns from transcribed text
   */
  private updateSpeechPatternsFromText(profile: EnhancedSpeakerProfile, text: string): void {
    const words = text.toLowerCase().split(/\s+/);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // Update vocabulary complexity
    const uniqueWords = new Set(words).size;
    const complexity = words.length > 0 ? uniqueWords / words.length : 0;
    profile.speechPatterns.vocabularyComplexity = this.adaptiveLerp(
      profile.speechPatterns.vocabularyComplexity,
      complexity,
      0.1
    );
    
    // Update sentence structure complexity
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const structureComplexity = Math.min(avgSentenceLength / 20, 1); // Normalize to 0-1
    profile.speechPatterns.sentenceStructureComplexity = this.adaptiveLerp(
      profile.speechPatterns.sentenceStructureComplexity,
      structureComplexity,
      0.1
    );
    
    // Detect and update filler words
    const commonFillers = ['um', 'uh', 'like', 'you know', 'basically', 'actually'];
    const detectedFillers = commonFillers.filter(filler => 
      text.toLowerCase().includes(filler)
    );
    
    detectedFillers.forEach(filler => {
      if (!profile.speechPatterns.fillerWords.includes(filler)) {
        profile.speechPatterns.fillerWords.push(filler);
      }
    });
    
    // Update common phrases (simplified approach)
    const phrases = this.extractPhrases(text);
    phrases.forEach(phrase => {
      const existing = profile.speechPatterns.commonPhrases.find(p => p === phrase);
      if (!existing && phrase.length > 10) { // Only store longer phrases
        profile.speechPatterns.commonPhrases.push(phrase);
        // Keep only most recent 20 phrases
        if (profile.speechPatterns.commonPhrases.length > 20) {
          profile.speechPatterns.commonPhrases.shift();
        }
      }
    });
  }

  /**
   * Extract meaningful phrases from text
   */
  private extractPhrases(text: string): string[] {
    // Simple phrase extraction - look for repeated patterns
    const sentences = text.split(/[.!?]+/);
    const phrases: string[] = [];
    
    sentences.forEach(sentence => {
      const words = sentence.trim().split(/\s+/);
      // Extract 3-6 word phrases
      for (let i = 0; i <= words.length - 3; i++) {
        for (let len = 3; len <= Math.min(6, words.length - i); len++) {
          const phrase = words.slice(i, i + len).join(' ').trim();
          if (phrase.length > 10) {
            phrases.push(phrase);
          }
        }
      }
    });
    
    return phrases;
  }

  /**
   * Update environmental factors
   */
  private updateEnvironmentalFactors(
    profile: EnhancedSpeakerProfile,
    factors: Partial<EnhancedSpeakerProfile['environmentalFactors']>
  ): void {
    if (factors.backgroundNoiseLevel !== undefined) {
      profile.environmentalFactors.backgroundNoiseLevel = this.adaptiveLerp(
        profile.environmentalFactors.backgroundNoiseLevel,
        factors.backgroundNoiseLevel,
        0.2
      );
    }
    
    // Update categorical factors based on frequency
    if (factors.roomAcoustics && factors.roomAcoustics !== profile.environmentalFactors.roomAcoustics) {
      // Simple frequency-based update - in practice, this would be more sophisticated
      profile.environmentalFactors.roomAcoustics = factors.roomAcoustics;
    }
    
    if (factors.microphoneQuality && factors.microphoneQuality !== profile.environmentalFactors.microphoneQuality) {
      profile.environmentalFactors.microphoneQuality = factors.microphoneQuality;
    }
  }

  /**
   * Helper methods for enhanced functionality
   */
  private shouldCreateNewProfile(bestSimilarity: number): boolean {
    return bestSimilarity < this.similarityThreshold * 0.5; // Only create if very different
  }

  private recordRecognitionAttempt(speakerId: string, confidence: number, processingTime: number): void {
    this.recognitionHistory.push({
      speakerId,
      confidence,
      timestamp: Date.now()
    });
    
    // Prevent memory leaks with automatic cleanup
    const maxHistorySize = 1000;
    const trimToSize = 500;
    
    if (this.recognitionHistory.length > maxHistorySize) {
      // Remove oldest entries and keep most recent
      this.recognitionHistory = this.recognitionHistory.slice(-trimToSize);
      console.log(`VoiceProfileManager: Trimmed recognition history to ${trimToSize} entries to prevent memory leak`);
    }
    
    // Update metrics
    this.metrics.totalRecognitions++;
    this.metrics.averageProcessingTime = this.adaptiveLerp(
      this.metrics.averageProcessingTime,
      processingTime,
      0.1
    );
    
    // Update accuracy metrics
    const recentRecognitions = this.recognitionHistory.slice(-100);
    const successfulRecognitions = recentRecognitions.filter(r => r.confidence >= this.similarityThreshold);
    this.metrics.averageAccuracy = successfulRecognitions.length / recentRecognitions.length;
  }

  private queueForAdaptation(profile: EnhancedSpeakerProfile): void {
    if (!this.adaptationQueue.includes(profile)) {
      this.adaptationQueue.push(profile);
      
      // Process adaptation queue periodically
      if (this.adaptationQueue.length >= 5) {
        this.processAdaptationQueue();
      }
    }
  }

  private async processAdaptationQueue(): Promise<void> {
    const profilesToAdapt = this.adaptationQueue.splice(0, 5); // Process up to 5 at a time
    
    for (const profile of profilesToAdapt) {
      await this.adaptProfile(profile);
    }
  }

  private async adaptProfile(profile: EnhancedSpeakerProfile): Promise<void> {
    // Simplified adaptation - in practice, this would use ML models
    
    // Update stability score based on recent performance
    const recentRecognitions = this.recognitionHistory
      .filter(r => r.speakerId === profile.speakerId)
      .slice(-10);
    
    if (recentRecognitions.length >= 3) {
      const confidenceVariance = this.calculateVariance(
        recentRecognitions.map(r => r.confidence)
      );
      profile.adaptationMetrics.stabilityScore = 1 - Math.min(confidenceVariance, 1);
    }
    
    // Update data quality score
    profile.adaptationMetrics.dataQuality = Math.min(
      profile.sessionCount / 20, // More sessions = better quality
      1.0
    );
    
    // Cross-validation if enabled
    if (this.config.crossValidationEnabled) {
      profile.adaptationMetrics.validationScore = await this.performCrossValidation(profile);
    }
    
    await this.saveProfile(profile);
  }

  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private async performCrossValidation(profile: EnhancedSpeakerProfile): Promise<number> {
    // Simplified cross-validation score
    // In practice, this would split the data and test recognition accuracy
    return Math.min(profile.adaptationMetrics.confidenceScore + 0.1, 1.0);
  }

  private startMetricsCollection(): void {
    // Only start metrics collection on client-side
    if (typeof window === 'undefined') {
      return;
    }
    
    this.metricsTimer = setInterval(() => {
      this.updateMetrics();
    }, 30000); // Update every 30 seconds
  }

  private updateMetrics(): void {
    const now = Date.now();
    
    // Update active profiles count
    this.metrics.activeProfiles = Array.from(this.profiles.values())
      .filter(p => this.isProfileActive(p)).length;
    
    // Calculate error rates from recent recognitions
    const recentRecognitions = this.recognitionHistory.filter(
      r => now - r.timestamp < 3600000 // Last hour
    );
    
    if (recentRecognitions.length > 0) {
      const failedRecognitions = recentRecognitions.filter(r => r.confidence < this.similarityThreshold);
      this.metrics.falseNegativeRate = failedRecognitions.length / recentRecognitions.length;
    }
    
    // Update data quality score
    this.metrics.dataQualityScore = Array.from(this.profiles.values())
      .reduce((sum, p) => sum + (p.adaptationMetrics?.dataQuality || 0.5), 0) / 
      Math.max(this.profiles.size, 1);
    
    this.metrics.lastModelUpdate = new Date(now);
  }

  private updateSaveMetrics(): void {
    // Track save operations for performance monitoring
  }

  private async loadMLModel(): Promise<void> {
    // Placeholder for loading ML model
    // In practice, this would load a trained model for voice recognition
    this.mlModel = {
      version: '1.0.0',
      accuracy: 0.85,
      trainingData: 1000,
      lastTrained: new Date(),
      features: ['mfcc', 'spectral_centroid', 'zero_crossing_rate'],
      hyperparameters: {
        embedding_size: this.config.speakerEmbeddingSize,
        learning_rate: 0.001,
      },
    };
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (normA * normB);
  }

  // Enhanced Public API methods

  /**
   * Enhanced profile name update
   */
  async updateProfileName(speakerId: string, userName: string): Promise<void> {
    const profile = this.profiles.get(speakerId);
    if (profile) {
      profile.userName = userName;
      await this.saveProfile(profile);
      
      if (this.isEnhancedProfile(profile)) {
        this.eventListeners.onProfileUpdated?.(profile);
      }
    }
  }

  /**
   * Get enhanced profile
   */
  getProfile(speakerId: string): EnhancedSpeakerProfile | undefined {
    return this.profiles.get(speakerId);
  }

  /**
   * Get all enhanced profiles
   */
  getAllProfiles(): EnhancedSpeakerProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Get active profiles only
   */
  getActiveProfiles(): EnhancedSpeakerProfile[] {
    return Array.from(this.profiles.values()).filter(p => this.isProfileActive(p));
  }

  /**
   * Enhanced profile search with fuzzy matching
   */
  searchProfiles(query: string): EnhancedSpeakerProfile[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.profiles.values()).filter(profile => {
      // Search by name
      if (profile.userName.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // Search by common phrases
      if (profile.speechPatterns?.commonPhrases.some(phrase => 
        phrase.toLowerCase().includes(queryLower)
      )) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get profiles by emotional characteristics
   */
  getProfilesByEmotion(emotion: string): EnhancedSpeakerProfile[] {
    return Array.from(this.profiles.values()).filter(profile => 
      profile.emotionalProfile?.baselineEmotion === emotion ||
      profile.emotionalProfile?.dominantEmotions.some(e => e.emotion === emotion)
    );
  }

  /**
   * Get voice recognition statistics
   */
  getRecognitionStats(): {
    totalProfiles: number;
    activeProfiles: number;
    averageAccuracy: number;
    recentRecognitions: number;
    topPerformers: Array<{ speakerId: string; userName: string; accuracy: number }>;
  } {
    const recentRecognitions = this.recognitionHistory.filter(
      r => Date.now() - r.timestamp < 86400000 // Last 24 hours
    );

    // Calculate per-profile accuracy
    const profileAccuracy = new Map<string, { correct: number; total: number }>();
    
    recentRecognitions.forEach(r => {
      if (!profileAccuracy.has(r.speakerId)) {
        profileAccuracy.set(r.speakerId, { correct: 0, total: 0 });
      }
      const stats = profileAccuracy.get(r.speakerId)!;
      stats.total++;
      if (r.confidence >= this.similarityThreshold) {
        stats.correct++;
      }
    });

    const topPerformers = Array.from(profileAccuracy.entries())
      .map(([speakerId, stats]) => {
        const profile = this.profiles.get(speakerId);
        return {
          speakerId,
          userName: profile?.userName || 'Unknown',
          accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    return {
      totalProfiles: this.profiles.size,
      activeProfiles: this.metrics.activeProfiles,
      averageAccuracy: this.metrics.averageAccuracy,
      recentRecognitions: recentRecognitions.length,
      topPerformers,
    };
  }

  /**
   * Export profile data for backup
   */
  async exportProfiles(): Promise<string> {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userId: this.userId,
      profiles: Array.from(this.profiles.values()).map(profile => ({
        ...profile,
        lastSeen: profile.lastSeen.toISOString(),
        adaptationMetrics: {
          ...profile.adaptationMetrics,
          lastAdaptation: profile.adaptationMetrics?.lastAdaptation.toISOString(),
        },
        recognitionMetrics: {
          ...profile.recognitionMetrics,
          lastEvaluated: profile.recognitionMetrics?.lastEvaluated.toISOString(),
        },
      })),
      metrics: this.metrics,
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import profile data from backup
   */
  async importProfiles(jsonData: string): Promise<boolean> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.profiles || !Array.isArray(importData.profiles)) {
        throw new Error('Invalid import format');
      }

      // Clear existing profiles
      this.profiles.clear();

      // Import profiles
      for (const profileData of importData.profiles) {
        // Convert timestamp fields back to Date objects
        if (profileData.lastSeen) {
          profileData.lastSeen = new Date(profileData.lastSeen);
        }
        if (profileData.adaptationMetrics?.lastAdaptation) {
          profileData.adaptationMetrics.lastAdaptation = new Date(profileData.adaptationMetrics.lastAdaptation);
        }
        if (profileData.recognitionMetrics?.lastEvaluated) {
          profileData.recognitionMetrics.lastEvaluated = new Date(profileData.recognitionMetrics.lastEvaluated);
        }

        const profile = profileData as EnhancedSpeakerProfile;
        this.profiles.set(profile.speakerId, profile);
        await this.saveProfile(profile);
      }

      console.log(`VoiceProfileManager: Imported ${importData.profiles.length} profiles`);
      return true;
    } catch (error) {
      console.error('VoiceProfileManager: Import failed:', error);
      return false;
    }
  }

  /**
   * Update similarity threshold
   */
  setSimilarityThreshold(threshold: number): void {
    this.similarityThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  /**
   * Enable/disable enhanced mode
   */
  setEnhancedMode(enabled: boolean): void {
    this.isEnhancedMode = enabled;
    console.log(`VoiceProfileManager: Enhanced mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set event listeners
   */
  setEventListeners(listeners: Partial<VoiceProfileEvents>): void {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }

  /**
   * Get current metrics
   */
  getMetrics(): VoiceAnalysisMetrics {
    return { ...this.metrics };
  }

  /**
   * Get ML model information
   */
  getMLModelInfo(): VoiceMLModel | null {
    return this.mlModel ? { ...this.mlModel } : null;
  }

  /**
   * Update embedding configuration
   */
  updateEmbeddingConfig(config: Partial<EmbeddingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Force profile adaptation
   */
  async forceAdaptProfile(speakerId: string): Promise<boolean> {
    const profile = this.profiles.get(speakerId);
    if (!profile || !this.isEnhancedProfile(profile)) {
      return false;
    }

    await this.adaptProfile(profile);
    return true;
  }

  /**
   * Clear profiles with cleanup
   */
  clearProfiles(): void {
    this.profiles.clear();
    this.embeddingCache.clear();
    this.recognitionHistory = [];
    this.adaptationQueue = [];
    
    // Reset metrics
    this.metrics.totalProfiles = 0;
    this.metrics.activeProfiles = 0;
    this.metrics.totalRecognitions = 0;
    
    console.log('VoiceProfileManager: All profiles cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    embeddingCacheSize: number;
    recognitionHistorySize: number;
    adaptationQueueSize: number;
    memoryUsage: number; // Estimated in bytes
  } {
    const estimatedMemoryUsage = 
      this.profiles.size * 50000 + // Estimate 50KB per profile
      this.embeddingCache.size * 2048 + // Estimate 2KB per embedding
      this.recognitionHistory.length * 100; // Estimate 100 bytes per history entry

    return {
      embeddingCacheSize: this.embeddingCache.size,
      recognitionHistorySize: this.recognitionHistory.length,
      adaptationQueueSize: this.adaptationQueue.length,
      memoryUsage: estimatedMemoryUsage,
    };
  }

  /**
   * Cleanup resources with comprehensive memory leak prevention
   */
  cleanup(): void {
    console.log('VoiceProfileManager: Initiating comprehensive cleanup...');

    // Clear all timers
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }

    // Clear large data structures to prevent memory leaks
    this.embeddingCache.clear();
    this.recognitionHistory = [];
    this.adaptationQueue = [];
    this.analysisBuffer = [];

    // Clear processed transcripts set (can grow large)
    this.processedTranscripts.clear();

    // Close audio context properly
    if (this.audioContext) {
      this.audioContext.close().then(() => {
        console.log('VoiceProfileManager: Audio context closed successfully');
      }).catch(error => {
        console.warn('VoiceProfileManager: Error closing audio context:', error);
      });
      this.audioContext = null;
    }

    // Clear event listeners to prevent memory leaks
    this.eventListeners = {};

    // Reset metrics to prevent memory accumulation
    this.metrics.sessionHistory = [];
    this.metrics.responseTimeHistory = [];
    this.metrics.confidenceHistory = [];

    // Log memory usage before cleanup
    const cacheStats = this.getCacheStats();
    console.log('VoiceProfileManager: Memory usage before cleanup:', {
      profiles: this.profiles.size,
      recognitionHistory: this.recognitionHistory.length,
      estimatedMemory: `${Math.round(cacheStats.memoryUsage / 1024)}KB`
    });

    // Force garbage collection hint (if available in dev)
    if (typeof window !== 'undefined' && (window as any).gc) {
      setTimeout(() => (window as any).gc(), 100);
    }
    
    console.log('VoiceProfileManager: Comprehensive cleanup completed');
  }

  /**
   * Check if enhanced mode is enabled
   */
  isEnhancedModeEnabled(): boolean {
    return this.isEnhancedMode;
  }
}

export const voiceProfileManager = new VoiceProfileManager();