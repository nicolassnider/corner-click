import type { Judge } from '@corner-click/types';
import { fetchWithAuth } from '../utils/apiClient';

export const judgeService = {
  async fetchJudges(tournamentId: string): Promise<Judge[]> {
    const res = await fetchWithAuth(`/api/tournaments/${tournamentId}/judges`);
    if (!res.ok) throw new Error('Failed to fetch judges');
    return res.json();
  },

  async addJudge(tournamentId: string, name: string): Promise<Judge> {
    const res = await fetchWithAuth(`/api/tournaments/${tournamentId}/judges`, {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to add judge');
    return res.json();
  },

  async assignJudge(
    tournamentId: string, 
    judgeId: string, 
    assignment: { areaId: string, cornerId: string, matchId: string }
  ): Promise<void> {
    const res = await fetchWithAuth(`/api/tournaments/${tournamentId}/judges/${judgeId}/assign`, {
      method: 'PUT',
      body: JSON.stringify(assignment)
    });
    if (!res.ok) throw new Error('Failed to assign judge');
  },

  async disconnectJudge(tournamentId: string, judgeId: string): Promise<void> {
    const res = await fetchWithAuth(`/api/tournaments/${tournamentId}/judges/${judgeId}/disconnect`, {
      method: 'PUT'
    });
    if (!res.ok) throw new Error('Failed to disconnect judge');
  },

  async deleteJudge(tournamentId: string, judgeId: string): Promise<void> {
    const res = await fetchWithAuth(`/api/tournaments/${tournamentId}/judges/${judgeId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete judge');
  }
};

