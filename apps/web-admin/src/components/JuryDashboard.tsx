import React, { useState, useEffect } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../lib/firebase';
import '../styles/global.css';
import { getCategories } from '../services/categoryService';
import { getMatches, advanceWinner } from '../services/bracketService';
import { getCompetitors } from '../services/competitorService';
import type { Tournament, Category, Match, Competitor } from '@corner-click/types';
import { MatchStatus } from '@corner-click/types';
import { getCompetitorFullName } from '../utils/competitorUtils';
import Footer from './Footer';

interface ScoreData {
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

export default function JuryDashboard() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [competitors, setCompetitors] = useState<Record<string, Competitor>>({});

  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

  // Load URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tId = params.get('tournament');
    const cId = params.get('category');
    if (tId) setSelectedTournamentId(tId);
    if (cId) setSelectedCategoryId(cId);

    // Fetch tournaments
    fetch(`${API_URL}/api/tournaments`)
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error(err));
  }, []);

  // Update URL params when selection changes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedTournamentId) url.searchParams.set('tournament', selectedTournamentId);
    else url.searchParams.delete('tournament');
    
    if (selectedCategoryId) url.searchParams.set('category', selectedCategoryId);
    else url.searchParams.delete('category');
    
    window.history.replaceState({}, '', url.toString());
  }, [selectedTournamentId, selectedCategoryId]);

  // Fetch categories and competitors when tournament changes
  useEffect(() => {
    if (selectedTournamentId) {
      Promise.all([
        getCategories(selectedTournamentId),
        getMatches(selectedTournamentId), // Fetch all matches to see which categories are active
        getCompetitors(selectedTournamentId)
      ])
      .then(([fetchedCategories, allMatches, fetchedCompetitors]) => {
        const activeCategoryIds = new Set(allMatches.map(m => m.categoryId));
        const populatedCategories = fetchedCategories.filter(c => activeCategoryIds.has(c.id));
        setCategories(populatedCategories);
        
        const compMap: Record<string, Competitor> = {};
        fetchedCompetitors.forEach(c => compMap[c.id] = c);
        setCompetitors(compMap);
      })
      .catch(console.error);
    } else {
      setCategories([]);
      setCompetitors({});
    }
  }, [selectedTournamentId]);

  // Fetch matches when category changes
  useEffect(() => {
    if (selectedTournamentId && selectedCategoryId) {
      getMatches(selectedTournamentId, selectedCategoryId)
        .then(fetchedMatches => {
          setMatches(fetchedMatches);
          setSelectedMatch(fetchedMatches[0] ?? null);
        })
        .catch(console.error);
    } else {
      setMatches([]);
      setSelectedMatch(null);
    }
  }, [selectedTournamentId, selectedCategoryId]);

  // Load state from Firebase when switching matches
  useEffect(() => {
    if (!selectedMatch) return;
    setIsLoaded(false);
    const fetchState = async () => {
      const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
      const snapshot = await get(matchRef);
      if (snapshot.exists()) {
        const data = snapshot.val();
        setStatus(data.status || MatchStatus.PENDING);
        setTimeRemaining(data.timeRemaining !== undefined ? data.timeRemaining : 120);
      } else {
        setStatus(selectedMatch.status || MatchStatus.PENDING);
        setTimeRemaining(120);
      }
      setIsLoaded(true);
    };
    fetchState();
    setJudgesData({});
  }, [selectedMatch?.id]);

  // Sync Timer to Firebase
  useEffect(() => {
    if (!isLoaded || !selectedMatch) return;
    const matchRef = ref(database, `live_matches/${selectedMatch.id}`);
    set(matchRef, {
      timeRemaining,
      status 
    });
  }, [timeRemaining, status, selectedMatch?.id, isLoaded]);

  // Fetch Final Scores from API when match ends
  useEffect(() => {
    if (status === MatchStatus.ENDED && selectedMatch) {
      fetch(`${API_URL}/api/matches/${selectedMatch.id}/scores`)
        .then(res => res.json())
        .then(data => {
           if (data.scores) setJudgesData(data.scores);
        })
        .catch(err => console.error("Failed to fetch final scores:", err));
    }
  }, [status, selectedMatch?.id]);

  useEffect(() => {
    let interval: any = null;
    if (status === MatchStatus.ACTIVE && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && status === MatchStatus.ACTIVE) {
      updateMatchStatus(MatchStatus.ENDED);
    }
    return () => clearInterval(interval);
  }, [status, timeRemaining]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateMatchStatus = async (newStatus: MatchStatus) => {
    if (!selectedMatch) return;
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

  const handleStart = () => updateMatchStatus(MatchStatus.ACTIVE);
  const handlePause = () => updateMatchStatus(MatchStatus.PAUSED);
  const handleEnd = () => updateMatchStatus(MatchStatus.ENDED);
  const handleExtraTime = () => {
    setTimeRemaining(60);
    updateMatchStatus(MatchStatus.ACTIVE);
  };

  const handleDeclareWinner = async (winnerId: string) => {
    if (!selectedMatch) return;
    try {
      await advanceWinner(selectedTournamentId, selectedMatch.id, winnerId, selectedMatch.nextMatchId || undefined);
      // Refresh matches
      const updatedMatches = await getMatches(selectedTournamentId, selectedCategoryId);
      setMatches(updatedMatches);
      
      // Update selected match to reflect the winner locally
      const updatedSelectedMatch = updatedMatches.find(m => m.id === selectedMatch.id);
      if (updatedSelectedMatch) {
        setSelectedMatch(updatedSelectedMatch);
        setStatus(MatchStatus.ENDED); // Force ENDED status view on top instead of ACTIVE
      }
      
      alert('Winner declared and bracket updated!');
    } catch (err) {
      console.error(err);
      alert('Failed to advance winner');
    }
  };

  const totalRed = Object.values(judgesData).reduce((acc: number, curr: ScoreData) => acc + (curr.redScore || 0), 0);
  const totalBlue = Object.values(judgesData).reduce((acc: number, curr: ScoreData) => acc + (curr.blueScore || 0), 0);

  // Determine if a match is "startable". Both competitors must be known and not BYE.
  const isMatchStartable = selectedMatch && 
    selectedMatch.redCompetitorId && selectedMatch.redCompetitorId !== 'BYE' &&
    selectedMatch.blueCompetitorId && selectedMatch.blueCompetitorId !== 'BYE';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-gray-900 text-white shadow-xl py-4 px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <a href="/" className="flex items-center cursor-pointer hover:opacity-80 transition-opacity" title="Volver al inicio">
            <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            <span className="text-2xl font-black tracking-tight">CORNER<span className="text-blue-500">CLICK</span></span>
            <span className="ml-4 pl-4 border-l border-gray-700 text-gray-400 font-semibold tracking-widest text-sm hidden sm:inline">LIVE MATCH CONTROL</span>
          </a>
          <div className="flex space-x-4">
            <select 
              value={selectedTournamentId}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700"
            >
              <option value="">Select Tournament...</option>
              {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select 
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded-md border border-gray-700"
              disabled={!selectedTournamentId}
            >
              <option value="">Select Category...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <span className="bg-gray-800 text-gray-300 py-2 px-4 rounded-full text-sm font-bold border border-gray-700">Ring 1 - Jury</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Sidebar: Match Queue */}
        <aside className="lg:col-span-1 space-y-6 order-2 lg:order-1">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-full">
            <h2 className="text-xl font-extrabold text-gray-800 mb-6 tracking-tight">Matches</h2>
            {!selectedCategoryId ? (
              <p className="text-gray-500">Select a tournament and category to load matches.</p>
            ) : matches.length === 0 ? (
              <p className="text-gray-500">No matches found for this category.</p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {matches.map(match => (
                  <div 
                    key={match.id} 
                    className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                      selectedMatch?.id === match.id 
                        ? 'border-blue-500 bg-blue-50 shadow-md transform scale-105' 
                        : 'border-transparent bg-gray-50 hover:bg-gray-100 hover:border-gray-200'
                    }`}
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className={`text-sm font-bold ${selectedMatch?.id === match.id ? 'text-blue-700' : 'text-gray-600'}`}>
                        Round {match.round} {match.winnerId ? '(Completed)' : ''}
                      </div>
                      <div className="text-xs text-gray-400 font-mono tracking-tighter" title="Match ID">
                        {match.id}
                      </div>
                    </div>
                    <div className="font-semibold text-lg flex items-center justify-between">
                      <span className={`text-red-600 truncate max-w-[45%] ${match.winnerId === match.redCompetitorId ? 'font-black underline' : ''}`}>
                        {getCompetitorFullName(match.redCompetitorId, competitors)}
                      </span>
                      <span className="text-gray-400 text-xs uppercase tracking-widest px-2">vs</span>
                      <span className={`text-blue-600 truncate max-w-[45%] text-right ${match.winnerId === match.blueCompetitorId ? 'font-black underline' : ''}`}>
                        {getCompetitorFullName(match.blueCompetitorId, competitors)}
                      </span>
                    </div>
                    <div className="mt-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        match.status === MatchStatus.COMPLETED ? 'bg-gray-200 text-gray-600' : 
                        match.status === MatchStatus.ACTIVE ? 'bg-green-100 text-green-700' : 
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {match.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Area: Timer & Controls */}
        <section className="lg:col-span-2 order-1 lg:order-2">
          {!selectedMatch ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl flex items-center justify-center h-full min-h-[400px]">
              <p className="text-gray-400 text-xl font-bold">Select a match to control</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden flex flex-col h-full">
              
              {/* Match Header */}
              <div className="bg-gray-900 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${
                    status === MatchStatus.ACTIVE ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-pulse' :
                    status === MatchStatus.PAUSED ? 'bg-yellow-500 text-white' :
                    status === MatchStatus.ENDED || selectedMatch.status === MatchStatus.COMPLETED ? 'bg-gray-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {selectedMatch.status === MatchStatus.COMPLETED ? 'COMPLETED' : status}
                  </span>
                </div>

                <div className="relative z-10 flex justify-center items-center space-x-8 mt-4">
                  <div className="text-right flex-1">
                    <h3 className="text-4xl font-black text-red-500 tracking-tight">{getCompetitorFullName(selectedMatch.redCompetitorId, competitors)}</h3>
                  </div>
                  <div className="text-gray-500 font-black italic flex flex-col items-center mx-4">
                    <span className="text-2xl">VS</span>
                    <span className="text-xs font-normal mt-2 text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700 tracking-widest font-mono">
                      ID: {selectedMatch.id}
                    </span>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-4xl font-black text-blue-500 tracking-tight">{getCompetitorFullName(selectedMatch.blueCompetitorId, competitors)}</h3>
                  </div>
                </div>

                {/* Timer Display */}
                <div className="mt-12 mb-4">
                  <div className={`font-mono text-8xl font-black tracking-tighter ${status === MatchStatus.ACTIVE ? 'text-white' : 'text-gray-400'}`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>
              </div>

              {/* Live Scores (If available) */}
              <div className="grid grid-cols-2 gap-px bg-gray-200 border-y border-gray-200">
                <div className="bg-red-50 p-8 flex flex-col items-center justify-center">
                  <span className="text-red-800 font-bold uppercase tracking-widest mb-2">Red Score</span>
                  <span className="text-6xl font-black text-red-600">{totalRed}</span>
                </div>
                <div className="bg-blue-50 p-8 flex flex-col items-center justify-center">
                  <span className="text-blue-800 font-bold uppercase tracking-widest mb-2">Blue Score</span>
                  <span className="text-6xl font-black text-blue-600">{totalBlue}</span>
                </div>
              </div>

              {/* Match Complete / Tie Breaker Controls */}
              {status === MatchStatus.ENDED && selectedMatch.status !== MatchStatus.COMPLETED && (
                <div className="p-6 bg-yellow-50 border-b border-yellow-200 flex flex-col items-center">
                  <h4 className="text-lg font-black text-yellow-800 mb-4 uppercase tracking-widest">Match Ended - Action Required</h4>
                  <div className="flex space-x-4 w-full max-w-lg">
                    <button 
                      onClick={() => handleDeclareWinner(selectedMatch.redCompetitorId)}
                      className={`flex-1 py-3 rounded-lg font-bold text-white transition-all shadow-md ${totalRed > totalBlue ? 'bg-red-600 hover:bg-red-500 scale-105 ring-4 ring-red-300' : 'bg-red-400 hover:bg-red-500'}`}
                      disabled={!selectedMatch.redCompetitorId || selectedMatch.redCompetitorId === 'BYE'}
                    >
                      Red Wins
                    </button>
                    <button 
                      onClick={handleExtraTime}
                      className="flex-1 py-3 rounded-lg font-bold bg-yellow-500 hover:bg-yellow-400 text-white transition-all shadow-md"
                    >
                      Extra Time (1m)
                    </button>
                    <button 
                      onClick={() => handleDeclareWinner(selectedMatch.blueCompetitorId)}
                      className={`flex-1 py-3 rounded-lg font-bold text-white transition-all shadow-md ${totalBlue > totalRed ? 'bg-blue-600 hover:bg-blue-500 scale-105 ring-4 ring-blue-300' : 'bg-blue-400 hover:bg-blue-500'}`}
                      disabled={!selectedMatch.blueCompetitorId || selectedMatch.blueCompetitorId === 'BYE'}
                    >
                      Blue Wins
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="p-8 bg-gray-50 flex justify-center space-x-6 mt-auto">
                <button 
                  className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                    status === MatchStatus.ACTIVE || status === MatchStatus.ENDED || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                      : 'bg-green-500 hover:bg-green-400 text-white hover:-translate-y-1 hover:shadow-green-500/30'
                  }`}
                  onClick={handleStart}
                  disabled={status === MatchStatus.ACTIVE || status === MatchStatus.ENDED || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable}
                  title={!isMatchStartable ? 'Cannot start a match with TBD or BYE' : ''}
                >
                  {status === MatchStatus.PAUSED ? 'Resume' : 'Start'}
                </button>
                
                <button 
                  className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                    status !== MatchStatus.ACTIVE || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                      : 'bg-yellow-500 hover:bg-yellow-400 text-white hover:-translate-y-1 hover:shadow-yellow-500/30'
                  }`}
                  onClick={handlePause}
                  disabled={status !== MatchStatus.ACTIVE || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable}
                >
                  Pause
                </button>

                <button 
                  className={`px-8 py-4 rounded-xl font-black text-xl tracking-wide uppercase transition-all shadow-lg flex-1 max-w-xs ${
                    status === MatchStatus.ENDED || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                      : 'bg-gray-900 hover:bg-gray-800 text-white hover:-translate-y-1 hover:shadow-gray-900/30'
                  }`}
                  onClick={handleEnd}
                  disabled={status === MatchStatus.ENDED || selectedMatch.status === MatchStatus.COMPLETED || !isMatchStartable}
                >
                  End Match
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
