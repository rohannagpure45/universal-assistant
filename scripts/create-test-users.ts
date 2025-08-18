/**
 * TypeScript version of test user creation script
 * Can be imported and used in test files
 */

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role?: 'user' | 'admin';
  department?: string;
  uid?: string;
}

export const TEST_USERS: TestUser[] = [
  {
    email: 'test1@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User 1',
    role: 'user',
    department: 'Engineering'
  },
  {
    email: 'test2@example.com',
    password: 'TestPassword123!',
    displayName: 'Test User 2',
    role: 'user',
    department: 'Product'
  },
  {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    displayName: 'Admin User',
    role: 'admin',
    department: 'Management'
  },
  {
    email: 'automation@example.com',
    password: 'AutomationTest123!',
    displayName: 'Automation Test User',
    role: 'user',
    department: 'QA'
  }
];

export async function createTestUser(userData: TestUser): Promise<string> {
  try {
    const auth = adminAuth();
    const db = adminDb();
    
    if (!auth || !db) {
      throw new Error('Firebase Admin not initialized');
    }

    // Check if user exists
    try {
      const existingUser = await auth.getUserByEmail(userData.email);
      console.log(`User already exists: ${userData.email}`);
      return existingUser.uid;
    } catch (error) {
      // User doesn't exist, create it
    }

    // Create user in Auth
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      emailVerified: true,
      disabled: false
    });

    // Set admin claims if needed
    if (userData.role === 'admin') {
      await auth.setCustomUserClaims(userRecord.uid, { admin: true });
    }

    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: userData.email,
      displayName: userData.displayName,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      preferences: {
        language: 'en',
        timezone: 'America/Los_Angeles',
        theme: 'light',
        notifications: true,
        ai: {
          defaultModel: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          enableAutoResponse: true
        },
        tts: {
          voiceId: '21m00Tcm4TlvDq8ikWAM',
          speed: 1.0,
          volume: 0.8,
          enabled: true
        },
        ui: {
          theme: 'light',
          language: 'en',
          compact: false
        }
      },
      metadata: {
        role: userData.role || 'user',
        department: userData.department || 'General',
        isTestAccount: true
      }
    });

    console.log(`Created test user: ${userData.email} (${userRecord.uid})`);
    return userRecord.uid;
    
  } catch (error) {
    console.error(`Error creating test user ${userData.email}:`, error);
    throw error;
  }
}

export async function createAllTestUsers(): Promise<void> {
  console.log('Creating all test users...');
  
  for (const user of TEST_USERS) {
    try {
      const uid = await createTestUser(user);
      user.uid = uid;
    } catch (error) {
      console.error(`Failed to create ${user.email}:`, error);
    }
  }
  
  console.log('Test user creation complete');
}

export async function deleteTestUser(email: string): Promise<void> {
  try {
    const auth = adminAuth();
    const db = adminDb();
    
    if (!auth || !db) {
      throw new Error('Firebase Admin not initialized');
    }

    const userRecord = await auth.getUserByEmail(email);
    
    // Delete from Firestore
    await db.collection('users').doc(userRecord.uid).delete();
    
    // Delete from Auth
    await auth.deleteUser(userRecord.uid);
    
    console.log(`Deleted test user: ${email}`);
  } catch (error) {
    console.error(`Error deleting test user ${email}:`, error);
  }
}

export async function deleteAllTestUsers(): Promise<void> {
  console.log('Deleting all test users...');
  
  for (const user of TEST_USERS) {
    await deleteTestUser(user.email);
  }
  
  console.log('Test user deletion complete');
}

// Export for use in tests
export default {
  TEST_USERS,
  createTestUser,
  createAllTestUsers,
  deleteTestUser,
  deleteAllTestUsers
};