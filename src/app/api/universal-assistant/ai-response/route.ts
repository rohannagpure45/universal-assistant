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
  let decodedToken: any;
  let text: string = '';
  let model: AIModel = 'claude-3-5-sonnet';
  let body: any = {};
  
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
    decodedToken = await verifyIdToken(idToken);
    
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Parse request body
    body = await request.json();
    const { 
      text: requestText, 
      context, 
      meetingType, 
      participants,
      model: requestModel = 'claude-3-5-sonnet' as AIModel,
      options = {}
    } = body;
    
    text = requestText;
    model = requestModel;

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

    // Prepare context array for AI response
    const contextArray = context ? Object.values(context).filter(val => typeof val === 'string') : [];
    
    // Generate AI response with cost tracking
    const startTime = Date.now();
    const response = await aiService.generateResponse(
      text, 
      model as AIModel, 
      contextArray,
      {
        userId: decodedToken.uid,
        meetingId: body.meetingId,
        operation: 'ai_response_generation'
      }
    );

    const latency = Date.now() - startTime;

    // Log for monitoring with cost information
    const costInfo = response.cost ? ` ($${response.cost.toFixed(4)})` : '';
    console.log(`AI response generated for user ${decodedToken.uid}: ${latency}ms latency${costInfo}`);

    return NextResponse.json({
      success: true,
      response: {
        text: response.text,
        model: response.model,
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        timestamp: response.timestamp.toISOString(),
        cost: response.cost,
        costMetadata: response.costMetadata
      },
      context: aiContext
    });

  } catch (error) {
    console.error('Error in ai-response API route:', error);
    
    // Attempt to track failed API call for cost monitoring
    try {
      const aiService = new AIService();
      // Track failed call with minimal cost (estimated input tokens only)
      const estimatedInputTokens = Math.ceil((text || '').length / 4);
      
      await aiService.trackResponseCost({
        model: model as AIModel,
        tokenUsage: { inputTokens: estimatedInputTokens, outputTokens: 0, totalTokens: estimatedInputTokens },
        latency: 0, // 0 for failed calls
        metadata: {
          userId: decodedToken?.uid,
          meetingId: body?.meetingId,
          operation: 'ai_response_generation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    } catch (costTrackingError) {
      console.warn('Failed to track cost for failed API call:', costTrackingError);
    }
    
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