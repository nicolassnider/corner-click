import type { Judge } from '@corner-click/types';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

export const judgeService = {
  async fetchJudges(tournamentId: string): Promise<Judge[]> {
    const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/judges`);
    if (!res.ok) throw new Error('Failed to fetch judges');
    return res.json();
  },

  async addJudge(tournamentId: string, name: string): Promise<Judge> {
    const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/judges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) throw new Error('Failed to add judge');
    return res.json();
  },

  async assignJudge(
    tournamentId: string, 
    judgeId: string, 
    assignment: { ringId: string, cornerId: string, matchId: string }
  ): Promise<void> {
    const res = await fetch(`${API_URL}/api/tournaments/${tournamentId}/judges/${judgeId}/assign`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(assignment)
    });
    if (!res.ok) throw new Error('Failed to assign judge');
  }
};
