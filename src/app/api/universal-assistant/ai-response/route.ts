import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { AIService } from '@/services/universal-assistant/AIService';
import { AIModel } from '@/types';
import { validateModelRequest, getModelWithFallback, isValidModel } from '@/config/modelConfigs';
import { withSecurity } from '@/lib/security/middleware';
import { aiRequestSchema } from '@/lib/security/validation';
import { SecurityLogger } from '@/lib/security/monitoring';

/**
 * POST /api/universal-assistant/ai-response
 * 
 * Generates AI responses for transcribed conversations
 * Used by UniversalAssistantCoordinator for real-time AI responses
 */
async function handleAIResponse(request: NextRequest) {
  let decodedToken: any;
  let text: string = '';
  let model: AIModel = 'claude-3-5-sonnet';
  let workingModel: AIModel = 'claude-3-5-sonnet';
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

    // Parse and validate request body
    body = await request.json();
    
    // Validate request using Zod schema
    const validationResult = aiRequestSchema.safeParse(body);
    if (!validationResult.success) {
      SecurityLogger.suspiciousActivity(
        request.headers.get('x-forwarded-for') || 'unknown',
        decodedToken?.uid,
        { 
          action: 'invalid_ai_request',
          errors: validationResult.error.errors,
          body: body
        }
      );
      
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { 
      text: requestText, 
      context, 
      meetingId,
      model: requestModel = 'claude-3-5-sonnet' as AIModel,
      temperature,
      maxTokens
    } = validationResult.data;
    
    text = requestText;
    model = requestModel;

    // Validate the requested model
    const modelValidation = validateModelRequest(model);
    if (!modelValidation.valid) {
      SecurityLogger.suspiciousActivity(
        request.headers.get('x-forwarded-for') || 'unknown',
        decodedToken?.uid,
        { 
          action: 'invalid_model_request',
          model: model,
          error: modelValidation.message
        }
      );
      
      return NextResponse.json(
        { 
          error: 'Invalid AI model specified',
          details: modelValidation.message,
          supportedModels: Object.keys(await import('@/config/modelConfigs').then(m => m.modelConfigs))
        },
        { status: 400 }
      );
    }

    // Get working model with fallback if needed
    workingModel = getModelWithFallback(model);

    // Initialize AI service
    const aiService = new AIService();
    
    // Prepare context for AI response
    const aiContext = {
      meetingId: meetingId || null,
      timestamp: new Date().toISOString(),
      userId: decodedToken.uid,
      ...context
    };

    // Prepare context array for AI response
    const contextArray = context ? Object.values(context).filter(val => typeof val === 'string') : [];
    
    // Generate AI response with cost tracking using the working model
    const startTime = Date.now();
    const response = await aiService.generateResponse(
      text, 
      workingModel as AIModel, 
      contextArray,
      {
        userId: decodedToken.uid,
        meetingId: body.meetingId,
        operation: 'ai_response_generation'
      }
    );

    const latency = Date.now() - startTime;

    // Production monitoring would log this to proper logging service
    // const costInfo = response.cost ? ` ($${response.cost.toFixed(4)})` : '';
    // AI response generated for user ${decodedToken.uid}: ${latency}ms latency${costInfo}

    return NextResponse.json({
      success: true,
      response: {
        text: response.text,
        model: response.model,
        tokensUsed: response.tokensUsed,
        latency: response.latency,
        timestamp: response.timestamp.toISOString(),
        cost: response.cost,
        costMetadata: response.costMetadata,
        modelUsed: workingModel,
        originalModel: model !== workingModel ? model : undefined,
        fallbackUsed: model !== workingModel
      },
      context: aiContext
    });

  } catch (error) {
    console.error('Error in ai-response API route:', error);
    
    // Log security event
    SecurityLogger.error(
      request.headers.get('x-forwarded-for') || 'unknown',
      decodedToken?.uid,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        endpoint: '/api/universal-assistant/ai-response',
        method: 'POST',
        requestedModel: model,
        workingModel: workingModel || 'unknown',
        textLength: text?.length || 0
      }
    );
    
    // Attempt to track failed API call for cost monitoring
    try {
      const aiService = new AIService();
      // Track failed call with minimal cost (estimated input tokens only)
      const estimatedInputTokens = Math.ceil((text || '').length / 4);
      
      await aiService.trackResponseCost({
        model: (workingModel || model) as AIModel,
        tokenUsage: { inputTokens: estimatedInputTokens, outputTokens: 0, totalTokens: estimatedInputTokens },
        latency: 0, // 0 for failed calls
        metadata: {
          userId: decodedToken?.uid,
          meetingId: body?.meetingId,
          operation: 'ai_response_generation_failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          originalModel: model !== workingModel ? model : undefined,
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

// Apply security middleware and export
export const POST = withSecurity(handleAIResponse, {
  requireAuth: true,
  rateLimitRpm: 30, // 30 AI requests per minute per user
  allowedMethods: ['POST'],
  skipCSRF: false
});

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