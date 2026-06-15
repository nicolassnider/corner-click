import { useState, useEffect, useCallback } from 'react';
import type { Judge } from '@corner-click/types';
import { judgeService } from '../services/judgeService';

export function useJudges(tournamentId: string) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJudges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await judgeService.fetchJudges(tournamentId);
      setJudges(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch judges');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchJudges();
  }, [fetchJudges]);

  const addJudge = async (name: string) => {
    try {
      setError(null);
      await judgeService.addJudge(tournamentId, name);
      await fetchJudges(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to add judge');
      throw err;
    }
  };

  const assignJudge = async (judgeId: string, assignment: { ringId: string, cornerId: string, matchId: string }) => {
    try {
      setError(null);
      await judgeService.assignJudge(tournamentId, judgeId, assignment);
      await fetchJudges(); // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to assign judge');
      throw err;
    }
  };

  return {
    judges,
    loading,
    error,
    addJudge,
    assignJudge,
    refresh: fetchJudges
  };
}
