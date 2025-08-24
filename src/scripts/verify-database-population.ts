#!/usr/bin/env node

/**
 * Database Population Verification Script
 * 
 * This script verifies that the Firestore database was populated correctly
 * with all expected collections, documents, and data relationships.
 */

import { adminDb } from '../lib/firebase/admin';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface VerificationResult {
  collection: string;
  expected: number;
  actual: number;
  status: 'PASS' | 'FAIL';
  sampleData?: any;
}

class DatabaseVerifier {
  private db: FirebaseFirestore.Firestore;
  private results: VerificationResult[] = [];

  constructor() {
    this.db = adminDb();
    if (!this.db) {
      console.error('❌ Failed to initialize Firebase Admin SDK');
      process.exit(1);
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const icon = level === 'info' ? '✅' : level === 'warn' ? '⚠️' : '❌';
    console.log(`${icon} ${message}`);
  }

  private async verifyCollection(collectionName: string, expectedCount: number): Promise<void> {
    try {
      const snapshot = await this.db.collection(collectionName).get();
      const actualCount = snapshot.size;
      
      const result: VerificationResult = {
        collection: collectionName,
        expected: expectedCount,
        actual: actualCount,
        status: actualCount === expectedCount ? 'PASS' : 'FAIL'
      };

      // Get sample document for structure verification
      if (!snapshot.empty) {
        const sampleDoc = snapshot.docs[0];
        result.sampleData = {
          id: sampleDoc.id,
          fields: Object.keys(sampleDoc.data()),
          hasData: Object.keys(sampleDoc.data()).length > 0
        };
      }

      this.results.push(result);
      
      const status = result.status === 'PASS' ? '✅' : '❌';
      this.log(`${collectionName}: ${actualCount}/${expectedCount} documents ${status}`);
      
      if (result.status === 'FAIL') {
        this.log(`Expected ${expectedCount} documents, found ${actualCount}`, 'error');
      }

    } catch (error) {
      this.log(`Error verifying ${collectionName}: ${error}`, 'error');
      this.results.push({
        collection: collectionName,
        expected: expectedCount,
        actual: 0,
        status: 'FAIL'
      });
    }
  }

  private async verifyDataRelationships(): Promise<void> {
    this.log('\n🔗 Verifying Data Relationships...');
    
    try {
      // Check users have corresponding voice profiles
      const usersSnapshot = await this.db.collection('users').get();
      let relationshipIssues = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        if (userData.primaryVoiceId) {
          const voiceDoc = await this.db.collection('voice_library').doc(userData.primaryVoiceId).get();
          if (!voiceDoc.exists) {
            this.log(`User ${userDoc.id} references non-existent voice profile ${userData.primaryVoiceId}`, 'warn');
            relationshipIssues++;
          }
        }
      }

      // Check meetings reference valid users and meeting types
      const meetingsSnapshot = await this.db.collection('meetings').get();
      for (const meetingDoc of meetingsSnapshot.docs) {
        const meetingData = meetingDoc.data();
        
        // Verify meeting type exists
        if (meetingData.meetingTypeId) {
          const meetingTypeDoc = await this.db.collection('meeting_types').doc(meetingData.meetingTypeId).get();
          if (!meetingTypeDoc.exists) {
            this.log(`Meeting ${meetingDoc.id} references non-existent meeting type ${meetingData.meetingTypeId}`, 'warn');
            relationshipIssues++;
          }
        }

        // Verify host exists
        if (meetingData.hostId) {
          const hostDoc = await this.db.collection('users').doc(meetingData.hostId).get();
          if (!hostDoc.exists) {
            this.log(`Meeting ${meetingDoc.id} references non-existent host ${meetingData.hostId}`, 'warn');
            relationshipIssues++;
          }
        }
      }

      if (relationshipIssues === 0) {
        this.log('All data relationships are valid ✅');
      } else {
        this.log(`Found ${relationshipIssues} relationship issues ⚠️`, 'warn');
      }

    } catch (error) {
      this.log(`Error verifying relationships: ${error}`, 'error');
    }
  }

  private async verifyDataStructure(): Promise<void> {
    this.log('\n📋 Verifying Data Structures...');

    // Check users collection structure
    const usersSnapshot = await this.db.collection('users').limit(1).get();
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      const requiredUserFields = ['email', 'displayName', 'createdAt', 'isAdmin', 'settings'];
      const missingFields = requiredUserFields.filter(field => !(field in userData));
      
      if (missingFields.length === 0) {
        this.log('Users collection structure: Valid ✅');
      } else {
        this.log(`Users missing fields: ${missingFields.join(', ')} ❌`, 'error');
      }
    }

    // Check voice_library collection structure
    const voiceSnapshot = await this.db.collection('voice_library').limit(1).get();
    if (!voiceSnapshot.empty) {
      const voiceData = voiceSnapshot.docs[0].data();
      const requiredVoiceFields = ['confirmed', 'confidence', 'firstHeard', 'lastHeard', 'meetingsCount'];
      const missingFields = requiredVoiceFields.filter(field => !(field in voiceData));
      
      if (missingFields.length === 0) {
        this.log('Voice library collection structure: Valid ✅');
      } else {
        this.log(`Voice library missing fields: ${missingFields.join(', ')} ❌`, 'error');
      }
    }

    // Check meetings collection structure
    const meetingsSnapshot = await this.db.collection('meetings').limit(1).get();
    if (!meetingsSnapshot.empty) {
      const meetingData = meetingsSnapshot.docs[0].data();
      const requiredMeetingFields = ['meetingTypeId', 'hostId', 'title', 'date', 'status', 'participants'];
      const missingFields = requiredMeetingFields.filter(field => !(field in meetingData));
      
      if (missingFields.length === 0) {
        this.log('Meetings collection structure: Valid ✅');
      } else {
        this.log(`Meetings missing fields: ${missingFields.join(', ')} ❌`, 'error');
      }
    }
  }

  private printSummary(): void {
    console.log('\n📊 Verification Summary');
    console.log('=======================');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`Collections Verified: ${this.results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 All verification tests passed!');
    } else {
      console.log(`\n⚠️  ${failed} verification tests failed. See details above.`);
    }

    console.log('\nCollection Details:');
    this.results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`  ${result.collection}: ${result.actual} documents ${status}`);
      if (result.sampleData && result.sampleData.fields.length > 0) {
        console.log(`    Fields: ${result.sampleData.fields.slice(0, 5).join(', ')}${result.sampleData.fields.length > 5 ? '...' : ''}`);
      }
    });
  }

  async verify(): Promise<void> {
    this.log('🔍 Starting Database Population Verification');
    this.log('============================================');

    // Verify expected document counts
    await this.verifyCollection('users', 5);
    await this.verifyCollection('voice_library', 6);
    await this.verifyCollection('meeting_types', 6);
    await this.verifyCollection('meetings', 3);
    await this.verifyCollection('needs_identification', 3);
    await this.verifyCollection('voice_matches', 5);

    // Verify data relationships
    await this.verifyDataRelationships();

    // Verify data structures
    await this.verifyDataStructure();

    this.printSummary();
  }
}

// Execute verification
if (require.main === module) {
  const verifier = new DatabaseVerifier();
  verifier.verify().catch(console.error);
}

export { DatabaseVerifier };