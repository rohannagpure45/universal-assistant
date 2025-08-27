'use client';

import React, { useState, useEffect } from 'react';

export default function SimpleTestPage() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Initial message');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('SimpleTest: Component mounted!');
    setMessage('Component has mounted successfully');
  }, []);

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>Simple React Test Page</h1>
      <p>This tests if React is working without any Firebase dependencies.</p>
      
      <div style={{ margin: '20px 0', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <p><strong>Mount Status:</strong> {mounted ? 'Mounted ✅' : 'Not mounted ❌'}</p>
        <p><strong>Message:</strong> {message}</p>
        <p><strong>Counter:</strong> {count}</p>
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          onClick={() => {
            setCount(count + 1);
            console.log('Button clicked, count:', count + 1);
          }}
          style={{
            padding: '10px 20px',
            background: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Increment Counter
        </button>
        
        <button 
          onClick={() => {
            alert(`Current count: ${count}`);
          }}
          style={{
            padding: '10px 20px',
            background: '#00aa00',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Show Alert
        </button>
        
        <button 
          onClick={() => {
            setMessage(`Updated at ${new Date().toLocaleTimeString()}`);
          }}
          style={{
            padding: '10px 20px',
            background: '#aa00aa',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Update Message
        </button>
      </div>
      
      <div style={{ marginTop: '30px', padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
        <p style={{ fontSize: '12px', color: '#666' }}>
          If the buttons work and the counter increments, React is hydrating correctly.
        </p>
      </div>
    </div>
  );
}