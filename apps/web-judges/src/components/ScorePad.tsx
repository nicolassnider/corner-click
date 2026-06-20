import React, { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../lib/firebase';
import { MatchStatus, CornerRole } from '@corner-click/types';
import { submitScores } from '../services/scoreService';
import '../styles/global.css';

interface ScorePadProps {
  matchId: string;
  cornerId: string;
  onLogout?: () => void;
  isOffline?: boolean;
}

export default function ScorePad({ matchId, cornerId, onLogout, isOffline = false }: ScorePadProps) {
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  
  const [redWarnings, setRedWarnings] = useState(0);
  const [blueWarnings, setBlueWarnings] = useState(0);
  
  const [redDeductions, setRedDeductions] = useState(0);
  const [blueDeductions, setBlueDeductions] = useState(0);

  const [matchStatus, setMatchStatus] = useState<MatchStatus>(
    isOffline ? MatchStatus.ACTIVE : MatchStatus.PENDING
  );

  // Force window scroll back to top on mount to fix mobile keyboard layout offsets
  useEffect(() => {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
  }, []);

  useEffect(() => {
    if (isOffline) return;
    const statusRef = ref(database, `live_matches/${matchId}/status`);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        setMatchStatus(snapshot.val());
      }
    });
    return () => unsubscribe();
  }, [matchId, isOffline]);

  const displayRedScore = redScore - Math.floor(redWarnings / 3) - redDeductions;
  const displayBlueScore = blueScore - Math.floor(blueWarnings / 3) - blueDeductions;

  useEffect(() => {
    if (isOffline) return;
    if (matchStatus === MatchStatus.ENDED) {
      submitScores(matchId, {
        cornerId,
        redScore, 
        blueScore, 
        redWarnings, 
        blueWarnings, 
        redDeductions, 
        blueDeductions
      }).catch(err => console.error("Failed to submit scores:", err));
    }
  }, [matchStatus, isOffline]);

  // Sync scores in real-time to Firebase RTDB for Jury and Spectator view
  useEffect(() => {
    if (isOffline) return;
    if (matchStatus === MatchStatus.ACTIVE || matchStatus === MatchStatus.GOLDEN_POINT) {
      const scoreRef = ref(database, `live_matches/${matchId}/scores/${cornerId}`);
      set(scoreRef, {
        redScore,
        blueScore,
        redWarnings,
        blueWarnings,
        redDeductions,
        blueDeductions
      }).catch(err => console.error("Failed to sync live scores:", err));
    }
  }, [redScore, blueScore, redWarnings, blueWarnings, redDeductions, blueDeductions, matchStatus, isOffline]);

  const handleScore = (color: CornerRole, points: number) => {
    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) return;
    if (color === CornerRole.RED) setRedScore(prev => prev + points);
    if (color === CornerRole.BLUE) setBlueScore(prev => prev + points);
  };

  const handleWarning = (color: CornerRole) => {
    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) return;
    if (color === CornerRole.RED) setRedWarnings(prev => prev + 1);
    if (color === CornerRole.BLUE) setBlueWarnings(prev => prev + 1);
  };

  const handleDeduction = (color: CornerRole) => {
    if (matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT) return;
    if (color === CornerRole.RED) {
      setRedDeductions(prev => prev + 1);
    }
    if (color === CornerRole.BLUE) {
      setBlueDeductions(prev => prev + 1);
    }
  };

  return (
    <div 
      className="flex flex-col h-[100dvh] w-screen bg-gray-950 overflow-hidden text-white font-sans touch-manipulation select-none relative"
      onTouchStart={() => {}} /* Enables CSS :active styling on iOS Safari */
    >

      {/* Top Bar */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-950 border-b border-gray-800 z-30">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-black tracking-widest uppercase text-[10px]">CORNER CLICK</span>
          {isOffline && (
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
              OFFLINE
            </span>
          )}
        </div>
        {onLogout && (
          <button 
            onClick={onLogout}
            className="text-white text-[10px] font-black uppercase tracking-widest bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded shadow-lg active:scale-95 transition-transform"
          >
            Salir
          </button>
        )}
      </div>

      {/* Scoreboard Header */}
      <div className="flex-none bg-gray-900 border-b border-gray-800 shadow-xl z-20 pb-2 relative">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Red Score */}
          <div className="flex flex-col items-center w-1/3">
            <span className="text-rose-500 font-extrabold tracking-widest text-[10px] mb-1">ROJO</span>
            <span className="text-5xl font-black tabular-nums text-rose-500 drop-shadow-md">{displayRedScore}</span>
            <div className="flex gap-1 text-[9px] uppercase text-rose-300 font-bold mt-1 bg-rose-950/50 px-2 py-0.5 rounded-full">
              <span>W:{redWarnings}</span>
              <span>D:{redDeductions}</span>
            </div>
          </div>

          <div className="text-gray-700 font-black text-xl tracking-widest opacity-50 w-1/3 text-center">VS</div>

          {/* Blue Score */}
          <div className="flex flex-col items-center w-1/3">
            <span className="text-indigo-400 font-extrabold tracking-widest text-[10px] mb-1">AZUL</span>
            <span className="text-5xl font-black tabular-nums text-indigo-400 drop-shadow-md">{displayBlueScore}</span>
            <div className="flex gap-1 text-[9px] uppercase text-indigo-300 font-bold mt-1 bg-indigo-950/50 px-2 py-0.5 rounded-full">
              <span>W:{blueWarnings}</span>
              <span>D:{blueDeductions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controls Area (Side by Side) */}
      <div className="flex-1 flex w-full relative z-10">
        
        {/* Overlay when scoring is disabled */}
        {matchStatus !== MatchStatus.ACTIVE && matchStatus !== MatchStatus.GOLDEN_POINT && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-sm">
            <div className="bg-yellow-500 text-black px-6 py-4 rounded-2xl shadow-2xl flex flex-col items-center border-4 border-yellow-400 animate-pulse">
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <h2 className="text-2xl font-black uppercase tracking-widest text-center">Espera</h2>
              <p className="text-sm font-bold uppercase opacity-80 mt-1">Status: {matchStatus}</p>
            </div>
          </div>
        )}
        
        {/* RED CONTROLS (LEFT HALF) */}
        <div className="flex-1 flex flex-col p-1 gap-1 bg-gradient-to-br from-rose-950/40 to-gray-900/50 border-r-2 border-gray-900">
          <button 
            onClick={() => handleScore(CornerRole.RED, 1)}
            className="flex-[3] bg-rose-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 score-btn"
          >
            <span className="text-5xl font-black">+1</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Mano</span>
          </button>
          <button 
            onClick={() => handleScore(CornerRole.RED, 2)}
            className="flex-[3] bg-rose-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 score-btn"
          >
            <span className="text-5xl font-black">+2</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada M</span>
          </button>
          <button 
            onClick={() => handleScore(CornerRole.RED, 3)}
            className="flex-[3] bg-rose-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-rose-900/20 score-btn"
          >
            <span className="text-5xl font-black">+3</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada A</span>
          </button>
          
          <div className="flex gap-1 mt-1 flex-[1]">
            <button 
              onClick={() => handleWarning(CornerRole.RED)}
              className="flex-1 bg-yellow-600 text-yellow-50 rounded-lg font-bold uppercase tracking-wider shadow flex flex-col items-center justify-center text-[10px] score-btn"
            >
              Warn
            </button>
            <button 
              onClick={() => handleDeduction(CornerRole.RED)}
              className="flex-1 bg-gray-900 border border-rose-900/50 text-rose-400 rounded-lg font-bold uppercase tracking-wider shadow flex flex-col items-center justify-center text-[10px] score-btn"
            >
              Deduct
            </button>
          </div>
        </div>

        {/* BLUE CONTROLS (RIGHT HALF) */}
        <div className="flex-1 flex flex-col p-1 gap-1 bg-gradient-to-tr from-indigo-950/40 to-gray-900/50">
          <button 
            onClick={() => handleScore(CornerRole.BLUE, 1)}
            className="flex-[3] bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 score-btn"
          >
            <span className="text-5xl font-black">+1</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Mano</span>
          </button>
          <button 
            onClick={() => handleScore(CornerRole.BLUE, 2)}
            className="flex-[3] bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 score-btn"
          >
            <span className="text-5xl font-black">+2</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada M</span>
          </button>
          <button 
            onClick={() => handleScore(CornerRole.BLUE, 3)}
            className="flex-[3] bg-indigo-600 text-white rounded-xl flex flex-col items-center justify-center shadow-lg shadow-indigo-900/20 score-btn"
          >
            <span className="text-5xl font-black">+3</span>
            <span className="text-[10px] font-bold uppercase opacity-80 mt-1">Patada A</span>
          </button>
          
          <div className="flex gap-1 mt-1 flex-[1]">
            <button 
              onClick={() => handleWarning(CornerRole.BLUE)}
              className="flex-1 bg-yellow-600 text-yellow-50 rounded-lg font-bold uppercase tracking-wider shadow flex flex-col items-center justify-center text-[10px] score-btn"
            >
              Warn
            </button>
            <button 
              onClick={() => handleDeduction(CornerRole.BLUE)}
              className="flex-1 bg-gray-900 border border-indigo-900/50 text-indigo-400 rounded-lg font-bold uppercase tracking-wider shadow flex flex-col items-center justify-center text-[10px] score-btn"
            >
              Deduct
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
