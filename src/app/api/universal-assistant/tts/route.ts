import { NextRequest, NextResponse } from 'next/server';
import { ElevenLabsTTS } from '@/services/universal-assistant/ElevenLabsTTS';
import { voiceProfileService } from '@/services/universal-assistant/VoiceProfileService';
import { adminStorage, verifyIdToken } from '@/lib/firebase/admin';
import { createHash } from 'crypto';

// Request interface
export interface TTSRequest {
  text: string;
  voiceId?: string;
  voiceProfileId?: string;
  options?: {
    modelId?: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
    useCache?: boolean;
  };
}

// Response interface
export interface TTSResponse {
  success: boolean;
  audioUrl?: string;
  cached?: boolean;
  metadata?: {
    duration?: number;
    size?: number;
    voiceId?: string;
    modelId?: string;
  };
  error?: string;
}

// Cache configuration
const CACHE_CONFIG = {
  bucketPath: 'tts-cache',
  expirationDays: 7,
  maxCacheSize: 50 * 1024 * 1024, // 50MB
};

// Helper function to generate cache key
function generateCacheKey(text: string, voiceId: string, modelId: string, voiceSettings: any): string {
  const payload = {
    text: text.trim().toLowerCase(),
    voiceId,
    modelId,
    settings: voiceSettings,
  };
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// Helper function to check if cached audio exists
async function getCachedAudio(cacheKey: string): Promise<string | null> {
  try {
    const fileName = `${CACHE_CONFIG.bucketPath}/${cacheKey}.mp3`;
    const file = adminStorage.bucket().file(fileName);
    
    const [exists] = await file.exists();
    if (!exists) {
      return null;
    }

    // Check if file is within expiration period
    const [metadata] = await file.getMetadata();
    const createdTime = new Date(metadata.timeCreated);
    const expirationTime = new Date(createdTime.getTime() + (CACHE_CONFIG.expirationDays * 24 * 60 * 60 * 1000));
    
    if (new Date() > expirationTime) {
      // File expired, delete it
      await file.delete().catch(console.error);
      return null;
    }

    // Generate signed URL for the cached file
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return url;
  } catch (error) {
    console.error('Error checking cached audio:', error);
    return null;
  }
}

// Helper function to cache generated audio
async function cacheAudio(cacheKey: string, audioBuffer: ArrayBuffer): Promise<string> {
  try {
    const fileName = `${CACHE_CONFIG.bucketPath}/${cacheKey}.mp3`;
    const file = adminStorage.bucket().file(fileName);
    
    // Save audio to Firebase Storage
    await file.save(Buffer.from(audioBuffer), {
      metadata: {
        contentType: 'audio/mpeg',
        cacheControl: `public, max-age=${CACHE_CONFIG.expirationDays * 24 * 60 * 60}`,
        metadata: {
          generatedAt: new Date().toISOString(),
          cacheKey,
        },
      },
    });

    // Generate signed URL
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return url;
  } catch (error) {
    console.error('Error caching audio:', error);
    throw error;
  }
}

// Helper function to validate and process voice settings
async function processVoiceSettings(
  userId: string | null,
  voiceId?: string,
  voiceProfileId?: string,
  options?: TTSRequest['options']
) {
  let finalVoiceId = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Default Rachel voice
  let voiceSettings = {
    stability: options?.stability || 0.5,
    similarityBoost: options?.similarityBoost || 0.5,
    speed: options?.speed || 1.0,
  };
  let modelId = options?.modelId || 'eleven_multilingual_v2';

  // If voice profile ID is provided, get settings from voice profile
  if (voiceProfileId && userId) {
    try {
      const profile = await voiceProfileService.getProfile(userId, voiceProfileId);
      if (profile) {
        finalVoiceId = profile.voiceId || finalVoiceId;
        voiceSettings = {
          stability: profile.voiceSettings.stability,
          similarityBoost: profile.voiceSettings.similarityBoost,
          speed: profile.voiceSettings.speed,
        };
      }
    } catch (error) {
      console.warn('Could not retrieve voice profile, using defaults:', error);
    }
  }

  return {
    voiceId: finalVoiceId,
    voiceSettings,
    modelId,
  };
}

// Helper function to validate text input
function validateTextInput(text: string): { isValid: boolean; error?: string } {
  if (!text || typeof text !== 'string') {
    return { isValid: false, error: 'Text is required and must be a string' };
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return { isValid: false, error: 'Text cannot be empty' };
  }

  if (trimmedText.length > 5000) {
    return { isValid: false, error: 'Text exceeds maximum length of 5000 characters' };
  }

  return { isValid: true };
}

// Helper function to clean up expired cache files
async function cleanupExpiredCache(): Promise<void> {
  try {
    const [files] = await adminStorage.bucket().getFiles({
      prefix: CACHE_CONFIG.bucketPath,
      maxResults: 100,
    });

    const now = new Date();
    const deletionPromises: Promise<any>[] = [];

    for (const file of files) {
      try {
        const [metadata] = await file.getMetadata();
        const createdTime = new Date(metadata.timeCreated);
        const expirationTime = new Date(createdTime.getTime() + (CACHE_CONFIG.expirationDays * 24 * 60 * 60 * 1000));
        
        if (now > expirationTime) {
          deletionPromises.push(file.delete().catch(console.error));
        }
      } catch (error) {
        console.error('Error checking file metadata:', error);
      }
    }

    if (deletionPromises.length > 0) {
      await Promise.all(deletionPromises);
      console.log(`Cleaned up ${deletionPromises.length} expired cache files`);
    }
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: TTSRequest = await request.json();
    const { text, voiceId, voiceProfileId, options = {} } = body;

    // Validate text input
    const textValidation = validateTextInput(text);
    if (!textValidation.isValid) {
      return NextResponse.json(
        { success: false, error: textValidation.error },
        { status: 400 }
      );
    }

    // Get user ID from authorization header
    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decodedToken = await verifyIdToken(token);
      userId = decodedToken?.uid || null;
    }

    // Process voice settings
    const { voiceId: finalVoiceId, voiceSettings, modelId } = await processVoiceSettings(
      userId,
      voiceId,
      voiceProfileId,
      options
    );

    // Check cache if enabled
    let audioUrl: string | null = null;
    let cached = false;
    
    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(text.trim(), finalVoiceId, modelId, voiceSettings);
      audioUrl = await getCachedAudio(cacheKey);
      
      if (audioUrl) {
        cached = true;
        return NextResponse.json({
          success: true,
          audioUrl,
          cached,
          metadata: {
            voiceId: finalVoiceId,
            modelId,
          },
        } as TTSResponse);
      }
    }

    // Validate ElevenLabs API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error('ElevenLabs API key not configured');
      return NextResponse.json(
        { success: false, error: 'TTS service not configured' },
        { status: 500 }
      );
    }

    // Initialize ElevenLabs service
    const ttsService = new ElevenLabsTTS(apiKey);

    // Generate speech
    const audioBuffer = await ttsService.generateSpeech(text.trim(), {
      voiceId: finalVoiceId,
      modelId,
      stability: voiceSettings.stability,
      similarityBoost: voiceSettings.similarityBoost,
      speed: voiceSettings.speed,
    });

    // Cache the generated audio if caching is enabled
    if (options.useCache !== false) {
      try {
        const cacheKey = generateCacheKey(text.trim(), finalVoiceId, modelId, voiceSettings);
        audioUrl = await cacheAudio(cacheKey, audioBuffer);
        cached = false; // Newly generated, not from cache
      } catch (cacheError) {
        console.error('Failed to cache audio, returning direct buffer:', cacheError);
        // If caching fails, return the audio buffer as blob URL
        // Note: In production, you might want to stream this differently
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(blob);
      }
    } else {
      // Convert buffer to blob URL for direct use
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      audioUrl = URL.createObjectURL(blob);
    }

    // Cleanup expired cache files periodically (with low probability to avoid performance impact)
    if (Math.random() < 0.01) { // 1% chance
      cleanupExpiredCache().catch(console.error);
    }

    // Prepare response metadata
    const metadata = {
      size: audioBuffer.byteLength,
      voiceId: finalVoiceId,
      modelId,
    };

    return NextResponse.json({
      success: true,
      audioUrl,
      cached,
      metadata,
    } as TTSResponse);

  } catch (error) {
    console.error('TTS API error:', error);
    
    // Handle specific ElevenLabs API errors
    if (error instanceof Error) {
      if (error.message.includes('TTS generation failed')) {
        return NextResponse.json(
          { success: false, error: 'Failed to generate speech. Please try again.' },
          { status: 502 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { success: false, error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}