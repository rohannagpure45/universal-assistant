import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';

/**
 * GET /api/universal-assistant/deepgram-token
 * 
 * Creates temporary Deepgram tokens for browser WebSocket authentication
 * Temporary tokens have 30-second TTL and are safer for client-side use
 */
export async function GET(request: NextRequest) {
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

    // Get Deepgram API key from environment
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!deepgramApiKey) {
      console.error('DEEPGRAM_API_KEY not configured in environment variables');
      return NextResponse.json(
        { error: 'Deepgram service not configured' },
        { status: 503 }
      );
    }

    // Create temporary token using Deepgram API
    try {
      const tokenResponse = await fetch('https://api.deepgram.com/v1/auth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scopes: ['usage:write'],
          ttl: 30, // 30 seconds TTL as recommended
        })
      });


      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Deepgram token creation failed:', errorText);
        return NextResponse.json(
          { error: 'Failed to create temporary token' },
          { status: 500 }
        );
      }

      const tokenData = await tokenResponse.json();

      return NextResponse.json({
        success: true,
        token: tokenData.key,
        expiresIn: 30,
        timestamp: new Date().toISOString()
      });

    } catch (tokenError) {
      console.error('Error creating Deepgram temporary token:', tokenError);
      return NextResponse.json(
        { error: 'Token creation failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in deepgram-token API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only allow GET requests
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
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
