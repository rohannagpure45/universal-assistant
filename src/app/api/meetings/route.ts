import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { databaseService } from '@/services/firebase/DatabaseService';
import { Meeting, MeetingType } from '@/types';

// Request interfaces
export interface CreateMeetingRequest {
  title: string;
  type: MeetingType;
  description?: string;
  scheduledFor?: string; // ISO date string
  participants?: string[]; // Array of user IDs or email addresses
  settings?: {
    autoTranscribe?: boolean;
    speakerIdentification?: boolean;
    aiAssistance?: boolean;
    recordAudio?: boolean;
  };
}

export interface GetMeetingsQuery {
  limit?: string;
  offset?: string;
  type?: MeetingType;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

// Response interfaces
export interface CreateMeetingResponse {
  success: boolean;
  meeting?: Meeting;
  error?: string;
}

export interface GetMeetingsResponse {
  success: boolean;
  meetings?: Meeting[];
  total?: number;
  hasMore?: boolean;
  error?: string;
}

// Helper function to validate meeting creation input
function validateCreateMeetingInput(
  title: string,
  type: MeetingType,
  description?: string,
  scheduledFor?: string
): { isValid: boolean; error?: string } {
  if (!title || typeof title !== 'string') {
    return { isValid: false, error: 'Title is required and must be a string' };
  }

  if (title.trim().length === 0) {
    return { isValid: false, error: 'Title cannot be empty' };
  }

  if (title.length > 200) {
    return { isValid: false, error: 'Title must be less than 200 characters' };
  }

  if (!type || typeof type !== 'string') {
    return { isValid: false, error: 'Meeting type is required' };
  }

  const validTypes: MeetingType[] = [
    'general', 'standup', 'planning', 'retrospective', 
    'one-on-one', 'interview', 'client', 'presentation'
  ];
  
  if (!validTypes.includes(type)) {
    return { isValid: false, error: 'Invalid meeting type' };
  }

  if (description && typeof description !== 'string') {
    return { isValid: false, error: 'Description must be a string' };
  }

  if (description && description.length > 1000) {
    return { isValid: false, error: 'Description must be less than 1000 characters' };
  }

  if (scheduledFor) {
    if (typeof scheduledFor !== 'string') {
      return { isValid: false, error: 'Scheduled time must be a valid date string' };
    }
    
    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return { isValid: false, error: 'Scheduled time must be a valid date' };
    }
    
    // Check if scheduled time is in the past (with 5 minute buffer)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (scheduledDate < fiveMinutesAgo) {
      return { isValid: false, error: 'Scheduled time cannot be in the past' };
    }
  }

  return { isValid: true };
}

// Helper function to validate query parameters
function validateGetMeetingsQuery(query: GetMeetingsQuery): { isValid: boolean; error?: string } {
  if (query.limit) {
    const limit = parseInt(query.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return { isValid: false, error: 'Limit must be between 1 and 100' };
    }
  }

  if (query.offset) {
    const offset = parseInt(query.offset);
    if (isNaN(offset) || offset < 0) {
      return { isValid: false, error: 'Offset must be a non-negative number' };
    }
  }

  if (query.type) {
    const validTypes: MeetingType[] = [
      'general', 'standup', 'planning', 'retrospective', 
      'one-on-one', 'interview', 'client', 'presentation'
    ];
    if (!validTypes.includes(query.type)) {
      return { isValid: false, error: 'Invalid meeting type filter' };
    }
  }

  if (query.status) {
    const validStatuses = ['scheduled', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(query.status)) {
      return { isValid: false, error: 'Invalid status filter' };
    }
  }

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (isNaN(startDate.getTime())) {
      return { isValid: false, error: 'Start date must be a valid date' };
    }
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: 'End date must be a valid date' };
    }
  }

  if (query.startDate && query.endDate) {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (startDate > endDate) {
      return { isValid: false, error: 'Start date must be before end date' };
    }
  }

  return { isValid: true };
}

// Helper function to get user ID from request
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decodedToken = await verifyIdToken(token);
    return decodedToken?.uid || null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

// POST - Create a new meeting
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: CreateMeetingRequest = await request.json();
    const { title, type, description, scheduledFor, participants, settings } = body;

    // Validate input
    const validation = validateCreateMeetingInput(title, type, description, scheduledFor);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Create meeting object
    const now = new Date().toISOString();
    const meetingData: Omit<Meeting, 'id'> = {
      title: title.trim(),
      type,
      description: description?.trim() || null,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
      scheduledFor: scheduledFor || null,
      startedAt: null,
      endedAt: null,
      status: scheduledFor ? 'scheduled' : 'active',
      participants: participants || [userId],
      transcript: [],
      summary: null,
      actionItems: [],
      settings: {
        autoTranscribe: settings?.autoTranscribe ?? true,
        speakerIdentification: settings?.speakerIdentification ?? true,
        aiAssistance: settings?.aiAssistance ?? true,
        recordAudio: settings?.recordAudio ?? false,
      },
      metadata: {
        duration: null,
        participantCount: (participants?.length || 1),
        transcriptWordCount: 0,
        aiResponseCount: 0,
      },
    };

    try {
      // Create meeting in database
      const meeting = await databaseService.createMeeting(userId, meetingData);

      return NextResponse.json({
        success: true,
        meeting,
      } as CreateMeetingResponse);

    } catch (dbError) {
      console.error('Database error creating meeting:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Create meeting API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get meetings for user
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query: GetMeetingsQuery = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      type: searchParams.get('type') as MeetingType || undefined,
      status: searchParams.get('status') as any || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    // Validate query parameters
    const validation = validateGetMeetingsQuery(query);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Set defaults
    const limit = parseInt(query.limit || '20');
    const offset = parseInt(query.offset || '0');

    try {
      // Get meetings from database
      const result = await databaseService.getMeetingsForUser(userId, {
        limit,
        offset,
        type: query.type,
        status: query.status,
        startDate: query.startDate,
        endDate: query.endDate,
      });

      return NextResponse.json({
        success: true,
        meetings: result.meetings,
        total: result.total,
        hasMore: (offset + limit) < result.total,
      } as GetMeetingsResponse);

    } catch (dbError) {
      console.error('Database error getting meetings:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve meetings' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Get meetings API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
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