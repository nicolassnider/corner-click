import { auth } from '../lib/firebase';

const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

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
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated: please sign in before submitting scores');
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/api/matches/${matchId}/scores`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(scores)
  });

  if (!response.ok) {
    throw new Error('Failed to submit scores');
  }
};
