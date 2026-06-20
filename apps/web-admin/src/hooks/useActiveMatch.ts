import { useState, useEffect } from 'react';
import { ref, get, set, onValue } from 'firebase/database';
import { database } from '../lib/firebase';
import { fetchWithAuth } from '../utils/apiClient';
import { getMatches, advanceWinner } from '../services/bracketService';
import type { Match, Competitor } from '@corner-click/types';
import { MatchStatus } from '@corner-click/types';

interface ScoreData {
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

export const useActiveMatch = (
  selectedMatch: Match | null,
  selectedTournamentId: string,
  selectedCategoryId: string,
  onMatchesRefreshed: (matches: Match[], currentMatch: Match) => void,
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void
) => {
  const [status, setStatus] = useState<MatchStatus>(MatchStatus.PENDING);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const [judgesData, setJudgesData] = useState<Record<string, ScoreData>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Consolidate Judge votes (calculated on every render from state)
  let redVotes = 0;
  let blueVotes = 0;
  let tieVotes = 0;
  let totalRed = 0;
  let totalBlue = 0;

  Object.values(judgesData).forEach((curr: ScoreData) => {
    const r = (curr.redScore || 0) - Math.floor((curr.redWarnings || 0) / 3) - (curr.redDeductions || 0);
    const b = (curr.blueScore || 0) - Math.floor((curr.blueWarnings || 0) / 3) - (curr.blueDeductions || 0);
    totalRed += r;
    totalBlue += b;
    if (r > b) redVotes++;
    else if (b > r) blueVotes++;
    else tieVotes++;
  });

  const isMatchStartable = !!(
    selectedMatch && 
    selectedMatch.redCompetitorId && selectedMatch.redCompetitorId !== 'BYE' &&
    selectedMatch.blueCompetitorId && selectedMatch.blueCompetitorId !== 'BYE'
  );

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const updateMatchStatus = async (newStatus: MatchStatus) => {
    if (!selectedMatch) return;
    try {
      await fetchWithAuth(`/api/matches/${selectedMatch.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      setStatus(newStatus);
      showToast?.(`Estado del combate actualizado a: ${newStatus}`, 'info');
    } catch (err) {
      console.error("Failed to update status", err);
      showToast?.('Error al cambiar el estado del combate', 'error');
    }
  };

  const handleStart = () => updateMatchStatus(MatchStatus.ACTIVE);
  const handlePause = () => updateMatchStatus(MatchStatus.PAUSED);
  const handleEnd = () => updateMatchStatus(MatchStatus.ENDED);
  const handleExtraTime = () => {
    setTimeRemaining(60);
    updateMatchStatus(MatchStatus.ACTIVE);
    showToast?.('Tiempo extra iniciado (1 Minuto)', 'warning');
  };
  const handleGoldenPoint = () => {
    updateMatchStatus(MatchStatus.GOLDEN_POINT);
    showToast?.('¡Punto de Oro iniciado! Muerte súbita activa.', 'warning');
  };

  const handleDeclareWinner = async (winnerId: string) => {
    if (!selectedMatch) return;
    try {
      await advanceWinner(selectedTournamentId, selectedMatch.id, winnerId, selectedMatch.nextMatchId || undefined);
      const updatedMatches = await getMatches(selectedTournamentId, selectedCategoryId);
      
      const updatedSelectedMatch = updatedMatches.find(m => m.id === selectedMatch.id);
      if (updatedSelectedMatch) {
        onMatchesRefreshed(updatedMatches, updatedSelectedMatch);
        setStatus(MatchStatus.ENDED);
      }
      
      showToast?.('¡Ganador declarado y llave actualizada!', 'success');
    } catch (err) {
      console.error(err);
      showToast?.('Error al declarar el ganador y avanzar llave.', 'error');
    }
  };

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

  // Sync Active Match ID for this Area to RTDB for Public TV View
  useEffect(() => {
    if (!selectedMatch) return;
    const areaMatchRef = ref(database, `live_matches_by_area/${selectedMatch.areaId}`);
    set(areaMatchRef, {
      matchId: selectedMatch.id,
      tournamentId: selectedMatch.tournamentId,
      categoryId: selectedMatch.categoryId,
      redCompetitorId: selectedMatch.redCompetitorId,
      blueCompetitorId: selectedMatch.blueCompetitorId,
      round: selectedMatch.round || 1
    });
  }, [selectedMatch?.id]);

  // Listen to live scores in RTDB (real-time during match and at the end)
  useEffect(() => {
    if (!selectedMatch) return;
    const scoresRef = ref(database, `live_matches/${selectedMatch.id}/scores`);
    const unsubscribe = onValue(scoresRef, (snapshot) => {
      if (snapshot.exists()) {
        setJudgesData(snapshot.val());
      } else {
        setJudgesData({});
      }
    });
    return () => unsubscribe();
  }, [selectedMatch?.id]);

  // Auto-declare winner during Golden Point when consensus is reached
  useEffect(() => {
    if (status !== MatchStatus.GOLDEN_POINT || !selectedMatch) return;
    
    const numJudges = Object.keys(judgesData).length;
    const consensusThreshold = numJudges > 0 ? Math.ceil((numJudges + 1) / 2) : 3;

    if (redVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.redCompetitorId);
    } else if (blueVotes >= consensusThreshold) {
      handleDeclareWinner(selectedMatch.blueCompetitorId);
    }
  }, [redVotes, blueVotes, status, judgesData, selectedMatch]);

  // Countdown timer interval
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

  return {
    status,
    setStatus,
    timeRemaining,
    setTimeRemaining,
    judgesData,
    isLoaded,
    formatTime,
    handleStart,
    handlePause,
    handleEnd,
    handleExtraTime,
    handleGoldenPoint,
    handleDeclareWinner,
    redVotes,
    blueVotes,
    tieVotes,
    totalRed,
    totalBlue,
    isMatchStartable
  };
};
