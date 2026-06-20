import React, { useState, useEffect } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../lib/firebase';
import { MatchStatus, AUTHOR_NAME, APP_MOTTO } from '@corner-click/types';
import '../styles/global.css';

interface PublicScoreboardProps {
  areaId: string;
}

interface AreaMatchData {
  matchId: string;
  tournamentId: string;
  categoryId: string;
  redCompetitorId: string;
  blueCompetitorId: string;
  round: number;
}

interface ScoreData {
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

export default function PublicScoreboard({ areaId }: PublicScoreboardProps) {
  const [activeMatch, setActiveMatch] = useState<AreaMatchData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(120);
  const [matchStatus, setMatchStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  
  const [competitors, setCompetitors] = useState<Record<string, { name: string; club: string }>>({});
  const [categoryName, setCategoryName] = useState<string>('');
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({});

  // 1. Listen to active match of the Area
  useEffect(() => {
    const areaMatchRef = ref(database, `live_matches_by_area/${areaId}`);
    
    const unsubscribe = onValue(areaMatchRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val() as AreaMatchData;
        setActiveMatch(data);

        // Fetch category details
        const categoryRef = ref(database, `tournaments/${data.tournamentId}/categories/${data.categoryId}`);
        const catSnap = await get(categoryRef);
        if (catSnap.exists()) {
          setCategoryName(catSnap.val().name || '');
        }

        // Fetch all competitors of the tournament for mapping
        const competitorsRef = ref(database, `tournaments/${data.tournamentId}/competitors`);
        const compsSnap = await get(competitorsRef);
        if (compsSnap.exists()) {
          const compsData = compsSnap.val();
          const mapped: Record<string, { name: string; club: string }> = {};
          Object.keys(compsData).forEach(key => {
            const c = compsData[key];
            mapped[key] = {
              name: `${c.firstName} ${c.lastName}`,
              club: c.club || ''
            };
          });
          setCompetitors(mapped);
        }
      } else {
        setActiveMatch(null);
      }
    });

    return () => unsubscribe();
  }, [areaId]);

  // 2. Listen to live match status and timer from Firebase RTDB
  useEffect(() => {
    if (!activeMatch) return;

    const liveMatchRef = ref(database, `live_matches/${activeMatch.matchId}`);
    
    const unsubscribe = onValue(liveMatchRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setTimeRemaining(data.timeRemaining !== undefined ? data.timeRemaining : 120);
        setMatchStatus(data.status || MatchStatus.PENDING);
      }
    });

    return () => unsubscribe();
  }, [activeMatch?.matchId]);

  // 3. Listen to score streams when match ends
  useEffect(() => {
    let eventSource: EventSource | null = null;
    setJudgesData({});

    if (activeMatch && (matchStatus === MatchStatus.ENDED || matchStatus === MatchStatus.COMPLETED)) {
      eventSource = new EventSource(`/api/matches/${activeMatch.matchId}/stream-scores`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.scores) {
            setJudgesData(data.scores);
          }
        } catch (err) {
          console.error("Failed to parse SSE scores:", err);
        }
      };
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [activeMatch?.matchId, matchStatus]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Consolidate Judge votes and scores
  let redVotes = 0;
  let blueVotes = 0;
  let tieVotes = 0;
  let totalRed = 0;
  let totalBlue = 0;

  Object.values(judgesData).forEach((curr) => {
    const r = (curr.redScore || 0) - Math.floor((curr.redWarnings || 0) / 3) - (curr.redDeductions || 0);
    const b = (curr.blueScore || 0) - Math.floor((curr.blueWarnings || 0) / 3) - (curr.blueDeductions || 0);
    totalRed += r;
    totalBlue += b;
    if (r > b) redVotes++;
    else if (b > r) blueVotes++;
    else tieVotes++;
  });

  const getCompName = (id: string) => {
    if (!id || id === '' || id.toUpperCase().includes('TBD')) return 'TBD';
    if (id === 'BYE') return 'BYE (Pase Directo)';
    return competitors[id]?.name || 'Cargando...';
  };

  const getCompClub = (id: string) => {
    if (!id || id === '' || id.toUpperCase().includes('TBD') || id === 'BYE') return '';
    return competitors[id]?.club || '';
  };

  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="text-center p-8 bg-gray-900/60 rounded-3xl border border-gray-800 backdrop-blur max-w-lg shadow-2xl">
          <svg className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-3xl font-black uppercase tracking-wider mb-2">ÁREA {areaId}</h2>
          <p className="text-gray-400 text-lg">Esperando inicio de combate. La pantalla se actualizará automáticamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex flex-col justify-between p-8 relative overflow-hidden select-none">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600 rounded-full filter blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600 rounded-full filter blur-[150px] opacity-10 pointer-events-none"></div>

      {/* Top Header */}
      <header className="flex justify-between items-center bg-gray-900/40 border border-gray-800/80 px-8 py-4 rounded-2xl backdrop-blur-md z-10">
        <div>
          <span className="text-blue-500 font-extrabold tracking-widest text-xs uppercase">ITF TAEKWONDO CHAMPIONSHIP</span>
          <h1 className="text-xl font-black uppercase tracking-tight mt-0.5">{categoryName || 'Cargando categoría...'}</h1>
        </div>
        <div className="text-right">
          <span className="bg-gray-800 text-gray-300 font-black px-5 py-2 rounded-full border border-gray-700 uppercase tracking-widest text-sm">
            ÁREA {areaId}
          </span>
          <div className="text-xs text-gray-500 mt-1.5 font-semibold">Ronda {activeMatch.round}</div>
        </div>
      </header>

      {/* Main Scoreboard Layout */}
      <main className="flex-1 my-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Red Corner */}
        <div className="md:col-span-4 bg-gradient-to-br from-red-950/40 to-red-900/10 border border-red-500/20 p-8 rounded-3xl backdrop-blur text-center flex flex-col justify-between h-full min-h-[350px]">
          <div>
            <span className="bg-red-500 text-white font-black text-xs px-4 py-1.5 rounded-full tracking-widest uppercase">CORNER ROJO</span>
            <h2 className="text-4xl font-extrabold text-red-500 mt-6 tracking-tight">{getCompName(activeMatch.redCompetitorId)}</h2>
            <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider mt-2">{getCompClub(activeMatch.redCompetitorId)}</p>
          </div>
          {matchStatus === MatchStatus.ENDED && Object.keys(judgesData).length > 0 && (
            <div className="mt-8">
              <span className="text-red-400 font-bold uppercase tracking-wider text-xs block mb-1">Votos de Jueces</span>
              <span className="text-5xl font-black text-red-500">{redVotes}</span>
            </div>
          )}
        </div>

        {/* Center: Timer and Status */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4">
          <div className={`font-mono text-9xl font-black tracking-tighter ${matchStatus === MatchStatus.ACTIVE ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-gray-600'}`}>
            {formatTime(timeRemaining)}
          </div>
          
          <div className="mt-6">
            <span className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border ${
              matchStatus === MatchStatus.ACTIVE ? 'bg-green-500/10 border-green-500 text-green-400 animate-pulse' :
              matchStatus === MatchStatus.PAUSED ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' :
              matchStatus === MatchStatus.ENDED ? 'bg-red-500/10 border-red-500 text-red-400' :
              'bg-gray-800 border-gray-700 text-gray-400'
            }`}>
              {matchStatus}
            </span>
          </div>

          {matchStatus === MatchStatus.ENDED && (
            <div className="mt-12 text-gray-400 font-semibold uppercase tracking-wider animate-bounce">
              Esperando declaración oficial del Jury
            </div>
          )}
        </div>

        {/* Blue Corner */}
        <div className="md:col-span-4 bg-gradient-to-br from-blue-950/40 to-blue-900/10 border border-blue-500/20 p-8 rounded-3xl backdrop-blur text-center flex flex-col justify-between h-full min-h-[350px]">
          <div>
            <span className="bg-blue-500 text-white font-black text-xs px-4 py-1.5 rounded-full tracking-widest uppercase">CORNER AZUL</span>
            <h2 className="text-4xl font-extrabold text-blue-400 mt-6 tracking-tight">{getCompName(activeMatch.blueCompetitorId)}</h2>
            <p className="text-gray-400 text-sm font-semibold uppercase tracking-wider mt-2">{getCompClub(activeMatch.blueCompetitorId)}</p>
          </div>
          {matchStatus === MatchStatus.ENDED && Object.keys(judgesData).length > 0 && (
            <div className="mt-8">
              <span className="text-blue-400 font-bold uppercase tracking-wider text-xs block mb-1">Votos de Jueces</span>
              <span className="text-5xl font-black text-blue-400">{blueVotes}</span>
            </div>
          )}
        </div>

      </main>

      {/* Footer / Status Log */}
      <footer className="text-center bg-gray-900/20 border border-gray-800/40 py-4 rounded-xl z-10 text-gray-500 text-xs font-semibold tracking-wider flex flex-col md:flex-row justify-between px-6 gap-2">
        <span>CORNER CLICK © 2026 - By {AUTHOR_NAME}</span>
        <span className="italic text-gray-600 font-bold">"{APP_MOTTO}"</span>
        <span>SISTEMA OFICIAL DE CALIFICACIÓN DE LA ITF</span>
      </footer>
    </div>
  );
}
