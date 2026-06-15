import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc as firestoreDoc, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import ScorePad from './ScorePad';
import '../styles/global.css';

interface AssignedData {
  tournamentId: string;
  ringId: string;
  cornerId: string;
  matchId: string;
}

export default function JudgeApp() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [assignment, setAssignment] = useState<AssignedData | null>(null);
  const [judgeName, setJudgeName] = useState<string>('');

  useEffect(() => {
    let unsubFirestore: () => void;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        const tournamentId = tokenResult.claims.tournamentId as string;
        const judgeId = tokenResult.claims.judgeId as string;
        const jName = tokenResult.claims.judgeName as string;
        
        if (!tournamentId || !judgeId) {
          // If we have a user but no claims, it's an old or invalid session (like an Anonymous one).
          // We must sign them out to force a clean login with the PIN.
          await auth.signOut();
          setUser(null);
          setLoading(false);
          return;
        }

        setJudgeName(jName);

        const judgeRef = firestoreDoc(db, 'tournaments', tournamentId, 'judges', judgeId);
        unsubFirestore = firestoreOnSnapshot(judgeRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setAssignment(data.currentAssignment || null);
          }
        });

        setLoading(false);
      } else {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`${import.meta.env.PUBLIC_API_URL}/api/auth/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      await signInWithCustomToken(auth, data.token);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-950 text-white font-bold text-2xl">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950">
        <form onSubmit={handleLogin} className="flex flex-col gap-6 w-80 max-w-sm bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
          <h1 className="text-3xl font-extrabold text-white text-center tracking-wide">
            Corner <span className="text-blue-500">Click</span>
          </h1>
          <p className="text-gray-400 text-center font-medium">Ingresa tu PIN Personal</p>
          
          <input 
            type="number" 
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="****"
            maxLength={6}
            required
            autoFocus
            className="p-4 text-3xl text-center rounded-xl border border-gray-700 bg-gray-950 text-white focus:outline-none focus:ring-4 focus:ring-blue-500 transition-all font-bold tracking-widest"
          />
          
          {error && <div className="text-red-500 text-center font-bold bg-red-500/10 py-2 rounded-lg">{error}</div>}
          
          <button type="submit" className="mt-4 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xl py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            INGRESAR
          </button>
        </form>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 px-6 text-center">
        <h1 className="text-4xl font-extrabold text-blue-500 mb-2">Hola, {judgeName}</h1>
        <p className="text-xl text-gray-400 font-medium">
          Has iniciado sesión correctamente.
        </p>
        <div className="mt-12 p-8 bg-gray-900 rounded-2xl border border-gray-800 shadow-xl max-w-lg w-full animate-pulse">
          <p className="text-2xl font-bold text-white leading-relaxed">Esperando asignación desde la Mesa Central...</p>
          <div className="mt-6 flex justify-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]"></div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ScorePad 
      matchId={assignment.matchId} 
      cornerId={assignment.cornerId} 
    />
  );
}
