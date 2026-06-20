import { fetchWithAuth } from '../utils/apiClient';

interface ScorePayload {
  cornerId: string;
  redScore: number;
  blueScore: number;
  redWarnings: number;
  blueWarnings: number;
  redDeductions: number;
  blueDeductions: number;
}

export const submitScores = async (matchId: string, scores: ScorePayload): Promise<void> => {
  const response = await fetchWithAuth(`/api/matches/${matchId}/scores`, {
    method: 'POST',
    body: JSON.stringify(scores)
  });

  if (!response.ok) {
    throw new Error('Failed to submit scores');
  }
};

