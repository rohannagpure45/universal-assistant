import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { DeepgramSTT } from '@/services/universal-assistant/DeepgramSTT';

/**
 * POST /api/universal-assistant/transcribe
 * 
 * Transcribes audio data using Deepgram STT
 * Used by UniversalAssistantCoordinator for audio transcription
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check content type
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      // Handle JSON payload with base64 audio
      const body = await request.json();
      const { 
        audioData, 
        format = 'webm',
        language = 'en',
        model = 'nova-2',
        enableSpeakerDiarization = false,
        options = {}
      } = body;

      if (!audioData) {
        return NextResponse.json(
          { error: 'audioData field is required' },
          { status: 400 }
        );
      }

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Initialize Deepgram service
      const deepgramSTT = new DeepgramSTT();
      
      // Transcribe audio
      const startTime = Date.now();
      const transcription = await deepgramSTT.transcribeAudio(audioBuffer, {
        language,
        model,
        enableSpeakerDiarization,
        ...options
      });

      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        transcription: {
          text: transcription.text,
          confidence: transcription.confidence,
          speakers: transcription.speakers || [],
          segments: transcription.segments || [],
          language: transcription.language || language,
          model: model
        },
        metadata: {
          audioFormat: format,
          audioSize: audioBuffer.length,
          latency,
          timestamp: new Date().toISOString(),
          userId: decodedToken.uid
        }
      });

    } else if (contentType?.includes('audio/') || contentType?.includes('multipart/form-data')) {
      // Handle direct audio file upload
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      const language = formData.get('language') as string || 'en';
      const model = formData.get('model') as string || 'nova-2';
      const enableSpeakerDiarization = formData.get('enableSpeakerDiarization') === 'true';

      if (!audioFile) {
        return NextResponse.json(
          { error: 'audio file is required' },
          { status: 400 }
        );
      }

      // Convert file to buffer
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      
      // Initialize Deepgram service
      const deepgramSTT = new DeepgramSTT();
      
      // Transcribe audio
      const startTime = Date.now();
      const transcription = await deepgramSTT.transcribeAudio(audioBuffer, {
        language,
        model,
        enableSpeakerDiarization
      });

      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        transcription: {
          text: transcription.text,
          confidence: transcription.confidence,
          speakers: transcription.speakers || [],
          segments: transcription.segments || [],
          language: transcription.language || language,
          model: model
        },
        metadata: {
          audioFormat: audioFile.type,
          audioSize: audioBuffer.length,
          originalFilename: audioFile.name,
          latency,
          timestamp: new Date().toISOString(),
          userId: decodedToken.uid
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Unsupported content type. Use application/json with base64 audio or multipart/form-data with audio file' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error in transcribe API route:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Deepgram API')) {
        return NextResponse.json(
          { error: 'Transcription service temporarily unavailable' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.message.includes('audio format')) {
        return NextResponse.json(
          { error: 'Unsupported audio format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle WebSocket upgrade for real-time transcription
export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  
  if (upgrade === 'websocket') {
    return NextResponse.json(
      { 
        error: 'WebSocket transcription not implemented in this route',
        suggestion: 'Use POST for batch transcription or implement WebSocket handler'
      },
      { status: 501 }
    );
  }

  return NextResponse.json(
    { 
      error: 'Method not allowed. Use POST to transcribe audio.',
      supportedMethods: ['POST'],
      supportedContentTypes: ['application/json', 'multipart/form-data', 'audio/*']
    },
    { status: 405 }
  );
}

// Only allow POST and GET requests
export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}