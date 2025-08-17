import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { AIService } from '@/services/universal-assistant/AIService';
import { AIModel } from '@/types';

/**
 * POST /api/universal-assistant/ai-response
 * 
 * Generates AI responses for transcribed conversations
 * Used by UniversalAssistantCoordinator for real-time AI responses
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

    // Parse request body
    const body = await request.json();
    const { 
      text, 
      context, 
      meetingType, 
      participants,
      model = 'claude-3-5-sonnet' as AIModel,
      options = {}
    } = body;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text field is required and must be a string' },
        { status: 400 }
      );
    }

    if (text.length > 10000) {
      return NextResponse.json(
        { error: 'Text exceeds maximum length of 10,000 characters' },
        { status: 400 }
      );
    }

    // Initialize AI service
    const aiService = new AIService();
    
    // Prepare context for AI response
    const aiContext = {
      meetingType: meetingType || 'general',
      participants: participants || [],
      timestamp: new Date().toISOString(),
      userId: decodedToken.uid,
      ...context
    };

    // Generate AI response
    const startTime = Date.now();
    const response = await aiService.generateResponse(text, aiContext, {
      model,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      ...options
    });

    const latency = Date.now() - startTime;

    // Log for monitoring
    console.log(`AI response generated for user ${decodedToken.uid}: ${latency}ms latency`);

    return NextResponse.json({
      success: true,
      response: {
        text: response.text,
        model: response.model,
        tokensUsed: response.tokensUsed,
        latency,
        timestamp: new Date().toISOString()
      },
      context: aiContext
    });

  } catch (error) {
    console.error('Error in ai-response API route:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('insufficient quota')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow POST requests
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to generate AI responses.' },
    { status: 405 }
  );
}

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