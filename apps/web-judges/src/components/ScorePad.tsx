import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../lib/firebase';
import '../styles/global.css';

interface ScorePadProps {
  matchId: string;
  cornerId: string;
}

export default function ScorePad({ matchId, cornerId }: ScorePadProps) {
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  
  const [redWarnings, setRedWarnings] = useState(0);
  const [blueWarnings, setBlueWarnings] = useState(0);
  
  const [redDeductions, setRedDeductions] = useState(0);
  const [blueDeductions, setBlueDeductions] = useState(0);

  const [matchStatus, setMatchStatus] = useState('PENDING');

  const [flash, setFlash] = useState<'red' | 'blue' | null>(null);

  const triggerFlash = (color: 'red' | 'blue') => {
    setFlash(color);
    setTimeout(() => setFlash(null), 150);
  };

  useEffect(() => {
    const statusRef = ref(database, `live_matches/${matchId}/status`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setMatchStatus(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, [matchId]);

  useEffect(() => {
    const cornerRef = ref(database, `live_matches/${matchId}/judges/${cornerId}`);
    set(cornerRef, {
      redScore, blueScore, redWarnings, blueWarnings, redDeductions, blueDeductions
    });
  }, [redScore, blueScore, redWarnings, blueWarnings, redDeductions, blueDeductions, matchId, cornerId]);

  useEffect(() => {
    if (redWarnings >= 3) {
      setRedDeductions(prev => prev + 1);
      setRedWarnings(0);
      setRedScore(prev => prev - 1);
      triggerFlash('blue'); // Opponent benefits or just flash red to indicate deduction
    }
  }, [redWarnings]);

  useEffect(() => {
    if (blueWarnings >= 3) {
      setBlueDeductions(prev => prev + 1);
      setBlueWarnings(0);
      setBlueScore(prev => prev - 1);
    }
  }, [blueWarnings]);

  const handleScore = (e: React.MouseEvent<HTMLButtonElement>, color: 'red' | 'blue', points: number) => {
    e.currentTarget.blur();
    if (matchStatus !== 'ACTIVE') return;
    if (color === 'red') setRedScore(prev => prev + points);
    if (color === 'blue') setBlueScore(prev => prev + points);
    triggerFlash(color);
  };

  const handleWarning = (e: React.MouseEvent<HTMLButtonElement>, color: 'red' | 'blue') => {
    e.currentTarget.blur();
    if (matchStatus !== 'ACTIVE') return;
    if (color === 'red') setRedWarnings(prev => prev + 1);
    if (color === 'blue') setBlueWarnings(prev => prev + 1);
  };

  const handleDeduction = (e: React.MouseEvent<HTMLButtonElement>, color: 'red' | 'blue') => {
    e.currentTarget.blur();
    if (matchStatus !== 'ACTIVE') return;
    if (color === 'red') {
      setRedDeductions(prev => prev + 1);
      setRedScore(prev => prev - 1);
    }
    if (color === 'blue') {
      setBlueDeductions(prev => prev + 1);
      setBlueScore(prev => prev - 1);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen bg-gray-950 overflow-hidden text-white font-sans touch-manipulation select-none relative">
      
      {/* Screen Flash Overlay */}
      <div className={`absolute inset-0 z-50 pointer-events-none transition-opacity duration-150 ${flash === 'red' ? 'bg-rose-500/30 opacity-100' : flash === 'blue' ? 'bg-indigo-500/30 opacity-100' : 'opacity-0'}`} />

      {/* Scoreboard Header */}
      <div className="flex-none bg-gray-900 border-b border-gray-800 shadow-xl z-20 pb-2">
        {/* Status Bar */}
        {matchStatus !== 'ACTIVE' && (
          <div className="bg-yellow-500 text-black text-xs font-black text-center py-1 uppercase tracking-widest animate-pulse">
            Scoring Disabled ({matchStatus})
          </div>
        )}
        
        {/* Scores */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Red Score */}
          <div className="flex flex-col items-center w-1/3">
            <span className="text-rose-500 font-extrabold tracking-widest text-[10px] mb-1">ROJO</span>
            <span className="text-5xl font-black tabular-nums text-rose-500 drop-shadow-md">{redScore}</span>
            <div className="flex gap-1 text-[9px] uppercase text-rose-300 font-bold mt-1 bg-rose-950/50 px-2 py-0.5 rounded-full">
              <span>W:{redWarnings}</span>
              <span>D:{redDeductions}</span>
            </div>
          </div>

          <div className="text-gray-700 font-black text-xl tracking-widest opacity-50 w-1/3 text-center">VS</div>

          {/* Blue Score */}
          <div className="flex flex-col items-center w-1/3">
            <span className="text-indigo-400 font-extrabold tracking-widest text-[10px] mb-1">AZUL</span>
            <span className="text-5xl font-black tabular-nums text-indigo-400 drop-shadow-md">{blueScore}</span>
            <div className="flex gap-1 text-[9px] uppercase text-indigo-300 font-bold mt-1 bg-indigo-950/50 px-2 py-0.5 rounded-full">
              <span>W:{blueWarnings}</span>
              <span>D:{blueDeductions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Area (Side by Side) */}
      <div className="flex-1 flex w-full relative z-10">
        
        {/* RED CONTROLS (LEFT HALF) */}
        <div className="flex-1 flex flex-col p-1 gap-1 bg-gradient-to-br from-rose-950/40 to-gray-900/50 border-r-2 border-gray-900">
          <button onClick={(e) => handleScore(e, 'red', 1)} className="flex-[3] bg-rose-600 active:bg-rose-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+1</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Mano</span>
          </button>
          <button onClick={(e) => handleScore(e, 'red', 2)} className="flex-[3] bg-rose-600 active:bg-rose-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+2</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada M</span>
          </button>
          <button onClick={(e) => handleScore(e, 'red', 3)} className="flex-[3] bg-rose-600 active:bg-rose-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+3</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada A</span>
          </button>
          
          <div className="flex gap-1 mt-1 flex-[1]">
            <button onClick={(e) => handleWarning(e, 'red')} className="flex-1 bg-yellow-600 active:bg-yellow-500 text-yellow-50 rounded-lg font-bold uppercase tracking-wider shadow active:scale-95 transition-transform flex flex-col items-center justify-center text-[10px]">
              Warn
            </button>
            <button onClick={(e) => handleDeduction(e, 'red')} className="flex-1 bg-gray-900 active:bg-rose-900 border border-rose-900/50 text-rose-400 rounded-lg font-bold uppercase tracking-wider shadow active:scale-95 transition-transform flex flex-col items-center justify-center text-[10px]">
              Deduct
            </button>
          </div>
        </div>

        {/* BLUE CONTROLS (RIGHT HALF) */}
        <div className="flex-1 flex flex-col p-1 gap-1 bg-gradient-to-tr from-indigo-950/40 to-gray-900/50">
          <button onClick={(e) => handleScore(e, 'blue', 1)} className="flex-[3] bg-indigo-600 active:bg-indigo-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+1</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Mano</span>
          </button>
          <button onClick={(e) => handleScore(e, 'blue', 2)} className="flex-[3] bg-indigo-600 active:bg-indigo-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+2</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada M</span>
          </button>
          <button onClick={(e) => handleScore(e, 'blue', 3)} className="flex-[3] bg-indigo-600 active:bg-indigo-500 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">
            <span className="text-5xl font-black">+3</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada A</span>
          </button>
          
          <div className="flex gap-1 mt-1 flex-[1]">
            <button onClick={(e) => handleWarning(e, 'blue')} className="flex-1 bg-yellow-600 active:bg-yellow-500 text-yellow-50 rounded-lg font-bold uppercase tracking-wider shadow active:scale-95 transition-transform flex flex-col items-center justify-center text-[10px]">
              Warn
            </button>
            <button onClick={(e) => handleDeduction(e, 'blue')} className="flex-1 bg-gray-900 active:bg-indigo-900 border border-indigo-900/50 text-indigo-400 rounded-lg font-bold uppercase tracking-wider shadow active:scale-95 transition-transform flex flex-col items-center justify-center text-[10px]">
              Deduct
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
