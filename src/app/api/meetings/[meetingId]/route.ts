import { NextRequest, NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase/admin';
import { databaseService } from '@/services/firebase/DatabaseService';
import { Meeting, MeetingType } from '@/types';

// Request interfaces
export interface UpdateMeetingRequest {
  title?: string;
  type?: MeetingType;
  description?: string;
  scheduledFor?: string;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  summary?: string;
  actionItems?: string[];
  settings?: {
    autoTranscribe?: boolean;
    speakerIdentification?: boolean;
    aiAssistance?: boolean;
    recordAudio?: boolean;
  };
}

// Response interfaces
export interface MeetingResponse {
  success: boolean;
  meeting?: Meeting;
  error?: string;
}

// Helper function to validate meeting update input
function validateUpdateMeetingInput(data: UpdateMeetingRequest): { isValid: boolean; error?: string } {
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      return { isValid: false, error: 'Title must be a string' };
    }
    if (data.title.trim().length === 0) {
      return { isValid: false, error: 'Title cannot be empty' };
    }
    if (data.title.length > 200) {
      return { isValid: false, error: 'Title must be less than 200 characters' };
    }
  }

  if (data.type !== undefined) {
    const validTypes: MeetingType[] = [
      'general', 'standup', 'planning', 'retrospective', 
      'one-on-one', 'interview', 'client', 'presentation'
    ];
    if (!validTypes.includes(data.type)) {
      return { isValid: false, error: 'Invalid meeting type' };
    }
  }

  if (data.description !== undefined) {
    if (typeof data.description !== 'string') {
      return { isValid: false, error: 'Description must be a string' };
    }
    if (data.description.length > 1000) {
      return { isValid: false, error: 'Description must be less than 1000 characters' };
    }
  }

  if (data.scheduledFor !== undefined) {
    if (typeof data.scheduledFor !== 'string') {
      return { isValid: false, error: 'Scheduled time must be a valid date string' };
    }
    const scheduledDate = new Date(data.scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return { isValid: false, error: 'Scheduled time must be a valid date' };
    }
  }

  if (data.status !== undefined) {
    const validStatuses = ['scheduled', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(data.status)) {
      return { isValid: false, error: 'Invalid meeting status' };
    }
  }

  if (data.summary !== undefined) {
    if (typeof data.summary !== 'string') {
      return { isValid: false, error: 'Summary must be a string' };
    }
    if (data.summary.length > 5000) {
      return { isValid: false, error: 'Summary must be less than 5000 characters' };
    }
  }

  if (data.actionItems !== undefined) {
    if (!Array.isArray(data.actionItems)) {
      return { isValid: false, error: 'Action items must be an array' };
    }
    for (const item of data.actionItems) {
      if (typeof item !== 'string') {
        return { isValid: false, error: 'All action items must be strings' };
      }
      if (item.length > 500) {
        return { isValid: false, error: 'Action items must be less than 500 characters each' };
      }
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

// Helper function to check if user has access to meeting
async function checkMeetingAccess(meetingId: string, userId: string): Promise<{ hasAccess: boolean; meeting?: Meeting }> {
  try {
    const meeting = await databaseService.getMeeting(meetingId);
    if (!meeting) {
      return { hasAccess: false };
    }

    // Check if user is the creator or a participant
    const hasAccess = meeting.createdBy === userId || meeting.participants.includes(userId);
    return { hasAccess, meeting };
  } catch (error) {
    console.error('Error checking meeting access:', error);
    return { hasAccess: false };
  }
}

// GET - Get specific meeting
export async function GET(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;

    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check meeting access
    const { hasAccess, meeting } = await checkMeetingAccess(meetingId, userId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      meeting,
    } as MeetingResponse);

  } catch (error) {
    console.error('Get meeting API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update meeting
export async function PUT(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;

    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check meeting access
    const { hasAccess, meeting } = await checkMeetingAccess(meetingId, userId);
    if (!hasAccess || !meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found or access denied' },
        { status: 404 }
      );
    }

    // Only creator can update meeting details
    if (meeting.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the meeting creator can update meeting details' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateMeetingRequest = await request.json();

    // Validate input
    const validation = validateUpdateMeetingInput(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<Meeting> = {
      updatedAt: new Date().toISOString(),
    };

    // Add fields that are being updated
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.description !== undefined) updateData.description = body.description.trim() || null;
    if (body.scheduledFor !== undefined) updateData.scheduledFor = body.scheduledFor;
    if (body.status !== undefined) {
      updateData.status = body.status;
      
      // Set timestamps based on status changes
      if (body.status === 'active' && !meeting.startedAt) {
        updateData.startedAt = new Date().toISOString();
      } else if (body.status === 'completed' && !meeting.endedAt) {
        updateData.endedAt = new Date().toISOString();
        
        // Calculate duration if we have both start and end times
        if (meeting.startedAt) {
          const startTime = new Date(meeting.startedAt);
          const endTime = new Date();
          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000 / 60); // minutes
          updateData.metadata = {
            ...meeting.metadata,
            duration,
          };
        }
      }
    }
    
    if (body.summary !== undefined) updateData.summary = body.summary.trim() || null;
    if (body.actionItems !== undefined) updateData.actionItems = body.actionItems;
    if (body.settings !== undefined) {
      updateData.settings = {
        ...meeting.settings,
        ...body.settings,
      };
    }

    try {
      // Update meeting in database
      const updatedMeeting = await databaseService.updateMeeting(meetingId, updateData);

      return NextResponse.json({
        success: true,
        meeting: updatedMeeting,
      } as MeetingResponse);

    } catch (dbError) {
      console.error('Database error updating meeting:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to update meeting' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Update meeting API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete meeting
export async function DELETE(
  request: NextRequest,
  { params }: { params: { meetingId: string } }
) {
  try {
    const { meetingId } = params;

    // Verify authentication
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check meeting access
    const { hasAccess, meeting } = await checkMeetingAccess(meetingId, userId);
    if (!hasAccess || !meeting) {
      return NextResponse.json(
        { success: false, error: 'Meeting not found or access denied' },
        { status: 404 }
      );
    }

    // Only creator can delete meeting
    if (meeting.createdBy !== userId) {
      return NextResponse.json(
        { success: false, error: 'Only the meeting creator can delete the meeting' },
        { status: 403 }
      );
    }

    try {
      // Delete meeting from database
      await databaseService.deleteMeeting(meetingId);

      return NextResponse.json({
        success: true,
        message: 'Meeting deleted successfully',
      });

    } catch (dbError) {
      console.error('Database error deleting meeting:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete meeting' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Delete meeting API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}