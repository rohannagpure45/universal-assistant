#!/usr/bin/env node

/**
 * Database Query Performance Test
 * 
 * This script tests basic query performance with the populated sample data
 */

import { adminDb } from '../lib/firebase/admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

class QueryTester {
  private db!: FirebaseFirestore.Firestore;

  constructor() {
    const db = adminDb();
    if (!db) {
      console.error('❌ Failed to initialize Firebase Admin SDK');
      process.exit(1);
    }
    this.db = db;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const icon = level === 'info' ? '✅' : level === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${message}`);
  }

  async testBasicQueries(): Promise<void> {
    console.log('🔍 Testing Basic Database Queries');
    console.log('=================================');

    const startTime = Date.now();

    try {
      // Test 1: Get all users
      const usersStart = Date.now();
      const users = await this.db.collection('users').get();
      const usersTime = Date.now() - usersStart;
      this.log(`Users query: ${users.size} documents in ${usersTime}ms`);

      // Test 2: Get confirmed voice profiles
      const voicesStart = Date.now();
      const confirmedVoices = await this.db.collection('voice_library')
        .where('confirmed', '==', true)
        .get();
      const voicesTime = Date.now() - voicesStart;
      this.log(`Confirmed voices: ${confirmedVoices.size} documents in ${voicesTime}ms`);

      // Test 3: Get recent meetings
      const meetingsStart = Date.now();
      const recentMeetings = await this.db.collection('meetings')
        .where('status', '==', 'ended')
        .orderBy('date', 'desc')
        .limit(5)
        .get();
      const meetingsTime = Date.now() - meetingsStart;
      this.log(`Recent meetings: ${recentMeetings.size} documents in ${meetingsTime}ms`);

      // Test 4: Get pending identifications
      const pendingStart = Date.now();
      const pendingIdentifications = await this.db.collection('needs_identification')
        .where('status', '==', 'pending')
        .get();
      const pendingTime = Date.now() - pendingStart;
      this.log(`Pending identifications: ${pendingIdentifications.size} documents in ${pendingTime}ms`);

      // Test 5: Get meeting types by owner
      const meetingTypesStart = Date.now();
      const meetingTypes = await this.db.collection('meeting_types')
        .where('ownerId', '==', 'user_001')
        .get();
      const meetingTypesTime = Date.now() - meetingTypesStart;
      this.log(`Meeting types by owner: ${meetingTypes.size} documents in ${meetingTypesTime}ms`);

      const totalTime = Date.now() - startTime;
      this.log(`\nTotal query time: ${totalTime}ms`);
      
      console.log('\n📋 Sample Data Preview:');
      console.log('======================');

      // Show sample user
      if (!users.empty) {
        const sampleUser = users.docs[0].data();
        console.log(`\nSample User (${users.docs[0].id}):`);
        console.log(`  Name: ${sampleUser.displayName}`);
        console.log(`  Email: ${sampleUser.email}`);
        console.log(`  Admin: ${sampleUser.isAdmin}`);
        console.log(`  Primary Voice: ${sampleUser.primaryVoiceId || 'None'}`);
      }

      // Show sample meeting
      if (!recentMeetings.empty) {
        const sampleMeeting = recentMeetings.docs[0].data();
        console.log(`\nSample Meeting (${recentMeetings.docs[0].id}):`);
        console.log(`  Title: ${sampleMeeting.title}`);
        console.log(`  Host: ${sampleMeeting.hostId}`);
        console.log(`  Status: ${sampleMeeting.status}`);
        console.log(`  Participants: ${sampleMeeting.participantIds?.length || 0}`);
        console.log(`  Duration: ${sampleMeeting.duration} minutes`);
      }

      // Show sample voice profile
      if (!confirmedVoices.empty) {
        const sampleVoice = confirmedVoices.docs[0].data();
        console.log(`\nSample Voice Profile (${confirmedVoices.docs[0].id}):`);
        console.log(`  User: ${sampleVoice.userName}`);
        console.log(`  Confidence: ${(sampleVoice.confidence * 100).toFixed(1)}%`);
        console.log(`  Meetings: ${sampleVoice.meetingsCount}`);
        console.log(`  Speaking Time: ${Math.round(sampleVoice.totalSpeakingTime / 60)} minutes`);
      }

    } catch (error) {
      this.log(`Query test failed: ${error}`, 'error');
    }
  }

  async testComplexQueries(): Promise<void> {
    console.log('\n🔎 Testing Complex Queries');
    console.log('==========================');

    try {
      // Complex query: Get users with their voice profiles
      const users = await this.db.collection('users').get();
      let usersWithVoices = 0;
      
      for (const userDoc of users.docs) {
        const userData = userDoc.data();
        if (userData.primaryVoiceId) {
          const voiceProfile = await this.db.collection('voice_library')
            .doc(userData.primaryVoiceId)
            .get();
          if (voiceProfile.exists) {
            usersWithVoices++;
          }
        }
      }

      this.log(`Users with voice profiles: ${usersWithVoices}/${users.size}`);

      // Complex query: Meeting participation statistics
      const meetings = await this.db.collection('meetings').get();
      const participationStats: Record<string, number> = {};

      meetings.docs.forEach(doc => {
        const meeting = doc.data();
        if (meeting.participantIds && Array.isArray(meeting.participantIds)) {
          meeting.participantIds.forEach((participantId: string) => {
            participationStats[participantId] = (participationStats[participantId] || 0) + 1;
          });
        }
      });

      const mostActiveUser = Object.entries(participationStats)
        .sort(([,a], [,b]) => b - a)[0];
      
      if (mostActiveUser) {
        this.log(`Most active participant: ${mostActiveUser[0]} (${mostActiveUser[1]} meetings)`);
      }

      this.log('Complex queries completed successfully');

    } catch (error) {
      this.log(`Complex query test failed: ${error}`, 'error');
    }
  }
}

// Execute tests
if (require.main === module) {
  const tester = new QueryTester();
  tester.testBasicQueries()
    .then(() => tester.testComplexQueries())
    .catch(console.error);
}

export { QueryTester };