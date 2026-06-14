import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithCustomToken, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import ScorePad from './ScorePad';
import '../styles/global.css';

interface AssignedData {
  tournamentId: string;
  ringId: string;
  cornerId: string;
}

export default function JudgeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<AssignedData | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/auth/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Login failed');

      await signInWithCustomToken(auth, data.token);
      setAssignment(data.assigned);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading...</div>;

  if (!user) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--color-bg)' }}>
        <h1 style={{ marginBottom: '2rem', color: 'var(--color-text)' }}>Corner <span>Click</span></h1>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '300px' }}>
          <input 
            type="text" 
            placeholder="Enter 4-Digit PIN" 
            value={pin}
            onChange={e => setPin(e.target.value)}
            style={{ padding: '1rem', fontSize: '1.5rem', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
          />
          <button type="submit" className="btn btn-start">Login</button>
          {error && <div style={{ color: 'var(--color-danger)', textAlign: 'center', marginTop: '1rem' }}>{error}</div>}
        </form>
      </div>
    );
  }

  // If we logged in via PIN, we have assignment data.
  // Otherwise, fallback to reading URL params or defaults if hot-reloaded
  const searchParams = new URLSearchParams(window?.location?.search || '');
  const matchId = assignment?.tournamentId ? `match_${assignment.tournamentId}_${assignment.ringId}` : (searchParams.get('matchId') || 'mock-match-123');
  const cornerId = assignment?.cornerId || (searchParams.get('cornerId') || 'corner1');

  return <ScorePad matchId={matchId} cornerId={cornerId} />;
}
