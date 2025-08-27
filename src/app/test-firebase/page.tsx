'use client';

import { useEffect, useState } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCge1jViX7kk45dtt_u3DKvj2NnbQwxtOk",
  authDomain: "universal-assis.firebaseapp.com",
  projectId: "universal-assis",
  storageBucket: "universal-assis.firebasestorage.app",
  messagingSenderId: "526015431440",
  appId: "1:526015431440:web:f5e5417787a49c86c89e66"
};

export default function TestFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<string>('Not tested');
  const [testDocs, setTestDocs] = useState<any[]>([]);

  useEffect(() => {
    console.log('[TestFirebase] Initializing...');
    
    // Initialize Firebase
    let app;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log('[TestFirebase] Firebase app initialized');
    } else {
      app = getApps()[0];
      console.log('[TestFirebase] Using existing Firebase app');
    }
    
    const auth = getAuth(app);
    
    // Listen for auth state
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('[TestFirebase] Auth state changed:', user?.uid || 'null');
      setUser(user);
      setLoading(false);
    }, (error) => {
      console.error('[TestFirebase] Auth error:', error);
      setError(error.message);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  const handleSignIn = async () => {
    try {
      setError(null);
      const app = getApps()[0];
      const auth = getAuth(app);
      console.log('[TestFirebase] Signing in anonymously...');
      const result = await signInAnonymously(auth);
      console.log('[TestFirebase] Signed in:', result.user.uid);
    } catch (err: any) {
      console.error('[TestFirebase] Sign in error:', err);
      setError(err.message);
    }
  };
  
  const handleSignOut = async () => {
    try {
      setError(null);
      const app = getApps()[0];
      const auth = getAuth(app);
      await signOut(auth);
      console.log('[TestFirebase] Signed out');
    } catch (err: any) {
      console.error('[TestFirebase] Sign out error:', err);
      setError(err.message);
    }
  };
  
  const testFirestoreWrite = async () => {
    if (!user) {
      setError('Must be signed in to test Firestore');
      return;
    }
    
    try {
      setError(null);
      setFirestoreStatus('Testing write...');
      const app = getApps()[0];
      const db = getFirestore(app);
      
      const testCollection = collection(db, 'test-collection');
      const docRef = await addDoc(testCollection, {
        testMessage: 'Hello from Firebase test!',
        userId: user.uid,
        timestamp: serverTimestamp(),
        isTest: true
      });
      
      console.log('[TestFirebase] Document written with ID:', docRef.id);
      setFirestoreStatus(`Write successful! Doc ID: ${docRef.id}`);
    } catch (err: any) {
      console.error('[TestFirebase] Firestore write error:', err);
      setError(`Firestore write error: ${err.message}`);
      setFirestoreStatus('Write failed');
    }
  };
  
  const testFirestoreRead = async () => {
    try {
      setError(null);
      setFirestoreStatus('Testing read...');
      const app = getApps()[0];
      const db = getFirestore(app);
      
      const testCollection = collection(db, 'test-collection');
      const querySnapshot = await getDocs(testCollection);
      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('[TestFirebase] Documents read:', docs);
      setTestDocs(docs);
      setFirestoreStatus(`Read successful! Found ${docs.length} documents`);
    } catch (err: any) {
      console.error('[TestFirebase] Firestore read error:', err);
      setError(`Firestore read error: ${err.message}`);
      setFirestoreStatus('Read failed');
    }
  };
  
  if (loading) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
        <h1>Firebase Test</h1>
        <p>Loading...</p>
      </div>
    );
  }
  
  return (
    <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
      <h1>Firebase Authentication Test</h1>
      
      <div style={{ 
        margin: '20px 0', 
        padding: '20px', 
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: user ? '#e8f5e9' : '#fff3e0'
      }}>
        <h2>Status</h2>
        <p><strong>Authenticated:</strong> {user ? 'Yes' : 'No'}</p>
        {user && (
          <>
            <p><strong>User ID:</strong> {user.uid}</p>
            <p><strong>Anonymous:</strong> {user.isAnonymous ? 'Yes' : 'No'}</p>
          </>
        )}
        {error && (
          <p style={{ color: 'red' }}><strong>Error:</strong> {error}</p>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {!user ? (
          <button 
            onClick={handleSignIn}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Sign In Anonymously
          </button>
        ) : (
          <>
            <button 
              onClick={handleSignOut}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Sign Out
            </button>
            <button 
              onClick={testFirestoreWrite}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Firestore Write
            </button>
            <button 
              onClick={testFirestoreRead}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Test Firestore Read
            </button>
          </>
        )}
      </div>
      
      {/* Firestore Status */}
      <div style={{ 
        margin: '20px 0', 
        padding: '20px', 
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5'
      }}>
        <h2>Firestore Status</h2>
        <p><strong>Status:</strong> {firestoreStatus}</p>
        {testDocs.length > 0 && (
          <div>
            <h3>Documents Found:</h3>
            <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px', overflow: 'auto' }}>
              {JSON.stringify(testDocs, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}