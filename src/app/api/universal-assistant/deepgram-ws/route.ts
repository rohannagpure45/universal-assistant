import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS-Free Deepgram WebSocket Proxy Configuration
 * 
 * This endpoint provides WebSocket connection details for the client
 * The actual WebSocket proxy is handled by Next.js rewrites in next.config.js
 */

export async function GET(request: NextRequest) {
  // Return WebSocket proxy endpoint for client to connect to
  // This eliminates CORS by routing through Next.js
  
  const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
  const host = request.headers.get('host') || 'localhost:3000';
  
  return NextResponse.json({
    wsUrl: `${protocol}://${host}/api/ws-proxy/deepgram`,
    message: 'Use the provided WebSocket URL to connect via CORS-free proxy'
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed - Use WebSocket connection' },
    { status: 405 }
  );
}