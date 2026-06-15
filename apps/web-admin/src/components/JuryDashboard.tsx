import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../lib/firebase';
import '../styles/global.css';

interface MatchState {
  status: string;
  red: { score: number; warnings: number; deductions: number };
  blue: { score: number; warnings: number; deductions: number };
}

const MOCK_MATCHES = [
  { id: 'match-1', title: 'Final - Black Belt - 70kg', red: 'John Doe', blue: 'Jane Smith', status: 'PENDING' },
  { id: 'match-2', title: 'Semi-Final - Black Belt - 70kg', red: 'Mike T.', blue: 'Alex B.', status: 'ENDED' },
];

export default function JuryDashboard() {
  const [selectedMatch, setSelectedMatch] = useState(MOCK_MATCHES[0]);
  const [status, setStatus] = useState('PENDING'); // PENDING, ACTIVE, PAUSED, ENDED
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [judgesData, setJudgesData] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

  // Load state from Firebase when switching matches
  useEffect(() => {
    setIsLoaded(false);
    const fetchState = async () => {
      const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
      const snapshot = await get(matchRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStatus(data.status || 'PENDING');
        setTimeRemaining(data.timeRemaining !== undefined ? data.timeRemaining : 120);
      } else {
        setStatus(selectedMatch.status || 'PENDING');
        setTimeRemaining(120);
      }
      setIsLoaded(true);
    };
    fetchState();
    setJudgesData({});
  }, [selectedMatch.id]);

  // Sync Timer to Firebase
  useEffect(() => {
    if (!isLoaded) return;
    const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
    set(matchRef, {
      timeRemaining,
      status 
    });
  }, [timeRemaining, status, selectedMatch.id, isLoaded]);

  // Fetch Final Scores from API when match ends
  useEffect(() => {
    if (status === 'ENDED') {
      // Simulate fetching final scores from API (Firestore) since Judges submit via REST
      fetch(`${API_URL}/api/matches/${selectedMatch.id}/scores`)
        .then(res => res.json())
        .then(data => {
           if (data.scores) setJudgesData(data.scores);
        })
        .catch(err => console.error("Failed to fetch final scores:", err));
    }
  }, [status, selectedMatch.id]);

  useEffect(() => {
    let interval = null;
    if (status === 'ACTIVE' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && status === 'ACTIVE') {
      updateMatchStatus('ENDED');
    }
    return () => clearInterval(interval);
  }, [status, timeRemaining]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateMatchStatus = async (newStatus: string) => {
    try {
      await fetch(`${API_URL}/api/matches/${selectedMatch.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setStatus(newStatus);
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const handleStart = () => updateMatchStatus('ACTIVE');
  const handlePause = () => updateMatchStatus('PAUSED');
  const handleEnd = () => updateMatchStatus('ENDED');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-gray-900 text-white shadow-xl py-4 px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center cursor-pointer">
            <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span className="text-2xl font-black tracking-tight">CORNER<span className="text-blue-500">CLICK</span></span>
            <span className="ml-4 pl-4 border-l border-gray-700 text-gray-400 font-semibold tracking-widest text-sm">LIVE MATCH CONTROL</span>
          </div>
          <div>
            <span className="bg-gray-800 text-gray-300 py-2 px-4 rounded-full text-sm font-bold border border-gray-700">Ring 1 - Jury Table</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Match Queue */}
        <aside className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
            <h2 className="text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Upcoming Matches</h2>
            <div className="space-y-4">
              {MOCK_MATCHES.map(match => (
                <div 
                  key={match.id} 
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedMatch.id === match.id 
                      ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' 
                      : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                  }`}
                  onClick={() => setSelectedMatch(match)}
                >
                  <div className={`text-sm font-bold mb-1 ${selectedMatch.id === match.id ? 'text-blue-700' : 'text-gray-600'}`}>
                    {match.title}
                  </div>
                  <div className="font-semibold text-lg flex items-center justify-between">
                    <span className="text-red-600 truncate max-w-[45%]">{match.red}</span>
                    <span className="text-gray-400 text-xs uppercase tracking-widest px-2">vs</span>
                    <span className="text-blue-600 truncate max-w-[45%] text-right">{match.blue}</span>
                  </div>
                  <div className="mt-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                      match.status === 'ENDED' ? 'bg-gray-200 text-gray-600' : 
                      match.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {match.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Area: Timer & Controls */}
        <section className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-full">
            
            {/* Match Header */}
            <div className="bg-gray-900 p-8 text-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              
              {/* Status Badge */}
              <div className="absolute top-4 left-4">
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                  status === 'ACTIVE' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse' :
                  status === 'PAUSED' ? 'bg-yellow-500 text-white' :
                  status === 'ENDED' ? 'bg-gray-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  {status}
                </span>
              </div>

              <div className="relative z-10 flex justify-center items-center space-x-8 mt-4">
                <div className="text-right">
                  <h3 className="text-4xl font-black text-red-500 tracking-tight">{selectedMatch.red}</h3>
                </div>
                <div className="text-gray-500 font-black italic text-2xl">VS</div>
                <div className="text-left">
                  <h3 className="text-4xl font-black text-blue-500 tracking-tight">{selectedMatch.blue}</h3>
                </div>
              </div>

              {/* Timer Display */}
              <div className="mt-12 mb-4">
                <div className={`font-mono text-8xl font-black tracking-tighter ${status === 'ACTIVE' ? 'text-white' : 'text-gray-400'}`}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
            </div>

            {/* Live Scores (If available) */}
            <div className="grid grid-cols-2 gap-px bg-gray-200 border-y border-gray-200">
              <div className="bg-red-50 p-8 flex flex-col items-center justify-center">
                <span className="text-red-800 font-bold uppercase tracking-widest mb-2">Red Score</span>
                <span className="text-6xl font-black text-red-600">
                  {Object.values(judgesData).reduce((acc: number, curr: any) => acc + (curr.redScore || 0), 0)}
                </span>
              </div>
              <div className="bg-blue-50 p-8 flex flex-col items-center justify-center">
                <span className="text-blue-800 font-bold uppercase tracking-widest mb-2">Blue Score</span>
                <span className="text-6xl font-black text-blue-600">
                  {Object.values(judgesData).reduce((acc: number, curr: any) => acc + (curr.blueScore || 0), 0)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-8 bg-gray-50 flex justify-center space-x-6 mt-auto">
              <button 
                className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                  status === 'ACTIVE' || status === 'ENDED' 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-green-500 hover:bg-green-400 text-white hover:-translate-y-1 hover:shadow-green-500/30'
                }`}
                onClick={handleStart}
                disabled={status === 'ACTIVE' || status === 'ENDED'}
              >
                {status === 'PAUSED' ? 'Resume' : 'Start'}
              </button>
              
              <button 
                className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                  status !== 'ACTIVE' 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-yellow-500 hover:bg-yellow-400 text-white hover:-translate-y-1 hover:shadow-yellow-500/30'
                }`}
                onClick={handlePause}
                disabled={status !== 'ACTIVE'}
              >
                Pause
              </button>

              <button 
                className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                  status === 'ENDED' 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                    : 'bg-gray-900 hover:bg-gray-800 text-white hover:-translate-y-1 hover:shadow-gray-900/30'
                }`}
                onClick={handleEnd}
                disabled={status === 'ENDED'}
              >
                End Match
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
