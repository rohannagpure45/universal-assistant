'use client';

import React, { useState } from 'react';

export default function TestAuth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(`Form submitted with email: ${email}`);
    console.log('Form submission prevented - React is working!');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
      <h1>Test Authentication</h1>
      <p>Status: {status}</p>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="email">Email:</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <div style={{ marginBottom: '10px' }}>
          <label htmlFor="password">Password:</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
        </div>
        
        <button 
          type="submit"
          style={{ 
            width: '100%', 
            padding: '10px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Test Submit
        </button>
      </form>
      
      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => setStatus('Button click worked - React is working!')}
          style={{ padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          Test Button Click
        </button>
      </div>
    </div>
  );
}