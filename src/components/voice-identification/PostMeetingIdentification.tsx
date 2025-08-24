/**
 * Post-Meeting Voice Identification Component
 * Allows meeting hosts to manually identify unknown speakers after the meeting
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { 
  Play, 
  Pause, 
  User as UserIcon, 
  Check, 
  X,
  Volume2,
  Clock,
  MessageSquare 
} from 'lucide-react';
import { NeedsIdentificationService } from '@/services/firebase/NeedsIdentificationService';
import { VoiceLibraryService } from '@/services/firebase/VoiceLibraryService';
import { DatabaseService } from '@/services/firebase/DatabaseService';
import type { User, UnidentifiedSpeaker } from '@/types';

interface PostMeetingIdentificationProps {
  meetingId: string;
  hostUserId: string;
  participants: User[];
}

export const PostMeetingIdentification: React.FC<PostMeetingIdentificationProps> = ({
  meetingId,
  hostUserId,
  participants
}) => {
  const [unidentifiedSpeakers, setUnidentifiedSpeakers] = useState<UnidentifiedSpeaker[]>([]);
  const [currentSpeaker, setCurrentSpeaker] = useState<UnidentifiedSpeaker | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadUnidentifiedSpeakers();
  }, [meetingId]);

  const loadUnidentifiedSpeakers = async () => {
    try {
      setLoading(true);
      const requests = await NeedsIdentificationService.getPendingRequests(meetingId);
      
      // Group by speaker and get sample data
      const speakerMap = new Map<string, UnidentifiedSpeaker>();
      
      for (const request of requests) {
        if (!speakerMap.has(request.deepgramVoiceId)) {
          // Get transcript samples for this speaker
          const transcripts = await DatabaseService.getTranscriptEntriesBySpeaker(
            meetingId,
            request.deepgramVoiceId,
            { limit: 5 }
          );
          
          speakerMap.set(request.deepgramVoiceId, {
            deepgramVoiceId: request.deepgramVoiceId,
            sampleUrls: [request.audioUrl],
            transcriptSamples: request.sampleTranscripts.map(t => t.text),
            duration: 10, // Default duration since it's not in the type
            occurrences: 1,
            firstSeen: request.meetingDate,
            lastSeen: request.meetingDate
          });
        } else {
          const speaker = speakerMap.get(request.deepgramVoiceId)!;
          speaker.sampleUrls.push(request.audioUrl);
          speaker.duration += 10; // Add default duration
          speaker.occurrences++;
          speaker.lastSeen = request.meetingDate;
        }
      }
      
      setUnidentifiedSpeakers(Array.from(speakerMap.values()));
      if (speakerMap.size > 0) {
        setCurrentSpeaker(Array.from(speakerMap.values())[0]);
      }
    } catch (error) {
      console.error('Failed to load unidentified speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudioSample = (url: string) => {
    if (audioRef.current) {
      if (playingAudio === url) {
        audioRef.current.pause();
        setPlayingAudio(null);
      } else {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudio(url);
      }
    }
  };

  const identifySpeaker = async () => {
    if (!currentSpeaker || (!selectedUser && !customName)) return;
    
    try {
      let userId = selectedUser;
      let userName = customName;
      
      // If custom name provided, create a guest user
      if (!selectedUser && customName) {
        userId = `guest_${Date.now()}`;
        userName = customName;
      } else {
        // Get selected user's name
        const user = participants.find(p => p.uid === selectedUser);
        userName = user?.displayName || 'Unknown';
      }
      
      // Save identification
      await VoiceLibraryService.identifyVoice(
        currentSpeaker.deepgramVoiceId,
        userId,
        userName,
        'manual',
        meetingId,
        1.0 // Manual identification has 100% confidence
      );
      
      // Mark as resolved
      await NeedsIdentificationService.resolveRequest(
        `${meetingId}_${currentSpeaker.deepgramVoiceId}`, // docId format
        'identified',
        userId,
        userName
      );
      
      // Move to next speaker
      const currentIndex = unidentifiedSpeakers.indexOf(currentSpeaker);
      const remaining = unidentifiedSpeakers.filter((_, i) => i !== currentIndex);
      setUnidentifiedSpeakers(remaining);
      
      if (remaining.length > 0) {
        setCurrentSpeaker(remaining[0]);
      } else {
        setCurrentSpeaker(null);
      }
      
      // Reset form
      setSelectedUser('');
      setCustomName('');
      
    } catch (error) {
      console.error('Failed to identify speaker:', error);
    }
  };

  const skipSpeaker = () => {
    if (!currentSpeaker) return;
    
    const currentIndex = unidentifiedSpeakers.indexOf(currentSpeaker);
    if (currentIndex < unidentifiedSpeakers.length - 1) {
      setCurrentSpeaker(unidentifiedSpeakers[currentIndex + 1]);
    } else if (unidentifiedSpeakers.length > 0) {
      setCurrentSpeaker(unidentifiedSpeakers[0]);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-pulse">Loading unidentified speakers...</div>
        </CardContent>
      </Card>
    );
  }

  if (unidentifiedSpeakers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">All Speakers Identified</h3>
          <p className="text-muted-foreground">
            All participants in this meeting have been successfully identified.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Speaker Identification</span>
            <span className="text-sm font-normal text-muted-foreground">
              {unidentifiedSpeakers.length} unidentified speaker{unidentifiedSpeakers.length !== 1 ? 's' : ''}
            </span>
          </CardTitle>
        </CardHeader>
      </Card>

      {currentSpeaker && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Unknown Speaker #{unidentifiedSpeakers.indexOf(currentSpeaker) + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Speaker Stats */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="text-center">
                <Clock className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{Math.round(currentSpeaker.duration)}s</div>
                <div className="text-xs text-muted-foreground">Speaking Time</div>
              </div>
              <div className="text-center">
                <MessageSquare className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{currentSpeaker.occurrences}</div>
                <div className="text-xs text-muted-foreground">Segments</div>
              </div>
              <div className="text-center">
                <Volume2 className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                <div className="text-sm font-medium">{currentSpeaker.sampleUrls.length}</div>
                <div className="text-xs text-muted-foreground">Audio Samples</div>
              </div>
            </div>

            {/* Audio Samples */}
            <div>
              <h4 className="text-sm font-medium mb-3">Listen to Voice Samples</h4>
              <div className="flex gap-2 flex-wrap">
                {currentSpeaker.sampleUrls.slice(0, 3).map((url, index) => (
                  <Button
                    key={url}
                    variant={playingAudio === url ? "primary" : "outline"}
                    size="sm"
                    onClick={() => playAudioSample(url)}
                    className="flex items-center gap-2"
                  >
                    {playingAudio === url ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Sample {index + 1}
                  </Button>
                ))}
              </div>
              <audio
                ref={audioRef}
                onEnded={() => setPlayingAudio(null)}
                className="hidden"
              />
            </div>

            {/* Transcript Samples */}
            <div>
              <h4 className="text-sm font-medium mb-3">What They Said</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {currentSpeaker.transcriptSamples.map((text, index) => (
                  <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                    "{text}"
                  </div>
                ))}
              </div>
            </div>

            {/* Identification Form */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="text-sm font-medium">Who is this speaker?</h4>
              
              {/* Select from participants */}
              <div>
                <label className="text-xs text-muted-foreground">Select from participants</label>
                <select
                  value={selectedUser}
                  onChange={(e) => {
                    setSelectedUser(e.target.value);
                    setCustomName(''); // Clear custom name when selecting user
                  }}
                  className="w-full mt-1 p-2 border rounded-md"
                  disabled={!!customName}
                >
                  <option value="">Choose a participant...</option>
                  {participants.map(user => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName || user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Or enter custom name */}
              <div>
                <label className="text-xs text-muted-foreground">Or enter a name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => {
                    setCustomName(e.target.value);
                    setSelectedUser(''); // Clear selected user when typing custom name
                  }}
                  placeholder="Enter speaker's name..."
                  className="w-full mt-1 p-2 border rounded-md"
                  disabled={!!selectedUser}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={identifySpeaker}
                  disabled={!selectedUser && !customName}
                  className="flex-1"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Identify Speaker
                </Button>
                <Button
                  onClick={skipSpeaker}
                  variant="outline"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  Skip for Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Overview of Remaining Speakers */}
      {unidentifiedSpeakers.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Remaining Speakers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {unidentifiedSpeakers.slice(1).map((speaker, index) => (
                <div
                  key={speaker.deepgramVoiceId}
                  className="px-3 py-1 bg-muted rounded-full text-xs"
                >
                  Speaker #{index + 2} ({Math.round(speaker.duration)}s)
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};