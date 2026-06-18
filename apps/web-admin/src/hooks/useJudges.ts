import { useState, useEffect } from 'react';
import type { Judge } from '@corner-click/types';
import { judgeService } from '../services/judgeService';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export function useJudges(tournamentId: string) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    
    setLoading(true);
    const eventSource = new EventSource(`${API_URL}/api/tournaments/${tournamentId}/judges/stream`);
    
    eventSource.onmessage = (event) => {
      try {
        const judgesData = JSON.parse(event.data);
        setJudges(judgesData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setError('Failed to sync judges');
      setLoading(false);
    };

    return () => {
      eventSource.close();
    };
  }, [tournamentId]);

  const addJudge = async (name: string) => {
    try {
      setError(null);
      await judgeService.addJudge(tournamentId, name);
    } catch (err: any) {
      setError(err.message || 'Failed to add judge');
      throw err;
    }
  };

  const assignJudge = async (judgeId: string, assignment: { areaId: string, cornerId: string, matchId: string }) => {
    try {
      setError(null);
      await judgeService.assignJudge(tournamentId, judgeId, assignment);
    } catch (err: any) {
      setError(err.message || 'Failed to assign judge');
      throw err;
    }
  };

  const disconnectJudge = async (judgeId: string) => {
    try {
      setError(null);
      await judgeService.disconnectJudge(tournamentId, judgeId);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect judge');
      throw err;
    }
  };

  const deleteJudge = async (judgeId: string) => {
    try {
      setError(null);
      await judgeService.deleteJudge(tournamentId, judgeId);
    } catch (err: any) {
      setError(err.message || 'Failed to delete judge');
      throw err;
    }
  };

  return {
    judges,
    loading,
    error,
    addJudge,
    assignJudge,
    disconnectJudge,
    deleteJudge
  };
}
