import { ref, get, set, remove, push, update } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import type { Match, Competitor } from '@corner-click/types';
import { MatchStatus } from '@corner-click/types';

/**
 * Shuffles an array randomly using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

/**
 * Generates a single elimination bracket for a list of competitors.
 * Seeds (isSeeded = true) are placed at extreme ends.
 * Byes are distributed as needed to make the number of competitors a power of 2.
 */
export const generateBracket = async (tournamentId: string, categoryId: string, areaId: string, competitors: Competitor[]): Promise<Match[]> => {
  if (competitors.length < 2) {
    throw new Error('Not enough competitors to generate a bracket');
  }

  // Separate seeds from regular competitors
  const seeds = competitors.filter(c => c.isSeeded);
  let unseeded = shuffle(competitors.filter(c => !c.isSeeded));

  // Determine power of 2 for bracket size (2, 4, 8, 16, 32...)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(competitors.length)));
  
  // Create bracket array initialized to null
  const orderedCompetitors: (Competitor | null)[] = new Array(bracketSize).fill(null);

  // Position seeds: Top 3 logic
  if (seeds.length > 0) orderedCompetitors[0] = seeds[0];
  if (seeds.length > 1) orderedCompetitors[bracketSize - 1] = seeds[1];
  if (seeds.length > 2) orderedCompetitors[Math.floor(bracketSize / 2) - 1] = seeds[2]; // Bottom of top half

  // Fill remaining spots with unseeded
  for (let i = 0; i < bracketSize; i++) {
    if (orderedCompetitors[i] === null) {
      if (unseeded.length > 0) {
        orderedCompetitors[i] = unseeded.pop() || null;
      }
    }
  }

  // Create matches
  const matches: Omit<Match, 'id'>[] = [];
  
  // Helper to calculate total rounds
  const totalRounds = Math.log2(bracketSize);

  let currentRoundMatchIds: string[] = [];
  let nextRoundMatchIds: string[] = [];

  const matchesRef = ref(database, `tournaments/${tournamentId}/matches`);

  // First round
  for (let i = 0; i < bracketSize; i += 2) {
    const comp1 = orderedCompetitors[i];
    const comp2 = orderedCompetitors[i + 1];

    const matchRef = push(matchesRef);
    const matchId = matchRef.key as string;
    currentRoundMatchIds.push(matchId);

    const isBye = comp1 === null || comp2 === null;

    matches.push({
      tournamentId,
      categoryId,
      areaId,
      status: isBye ? MatchStatus.COMPLETED : MatchStatus.PENDING,
      round: 1,
      redCompetitorId: comp1 ? comp1.id : 'BYE',
      blueCompetitorId: comp2 ? comp2.id : 'BYE',
      winnerId: isBye ? (comp1 ? comp1.id : (comp2 ? comp2.id : null)) : null,
      score: { red: 0, blue: 0 },
      warnings: { red: 0, blue: 0 },
      deductions: { red: 0, blue: 0 },
    });
  }

  // Subsequent rounds
  for (let r = 2; r <= totalRounds; r++) {
    const roundMatchesCount = bracketSize / Math.pow(2, r);
    for (let i = 0; i < roundMatchesCount; i++) {
      const matchRef = push(matchesRef);
      const matchId = matchRef.key as string;
      nextRoundMatchIds.push(matchId);

      matches.push({
        tournamentId,
        categoryId,
        areaId,
        status: MatchStatus.PENDING,
        round: r,
        redCompetitorId: '',
        blueCompetitorId: '',
        winnerId: null,
        score: { red: 0, blue: 0 },
        warnings: { red: 0, blue: 0 },
        deductions: { red: 0, blue: 0 },
      });

      // Update previous round matches to point to this next match
      const prevMatch1Index = (matches.length - 1 - roundMatchesCount) - (roundMatchesCount * 2 - 1) + (i * 2);
      const prevMatch2Index = prevMatch1Index + 1;
      
      // Need a more reliable way to link matches. We will link them after creating all.
    }
  }

  // A simpler way to link matches is bottom-up or just saving them and then linking.
  // For simplicity, let's just clear existing category matches and rewrite them all.
  
  // Clean existing matches for category
  const existingMatches = await getMatches(tournamentId, categoryId);
  for (const em of existingMatches) {
     await remove(ref(database, `tournaments/${tournamentId}/matches/${em.id}`));
  }

  // Let's rewrite the match creation with explicit parent/child linking
  const finalMatches: Match[] = [];
  
  const createNodes = (round: number, matchCount: number, nextMatchIds: string[] = []): string[] => {
    if (round < 1) return [];
    
    const currentIds: string[] = [];
    for(let i=0; i<matchCount; i++) {
      const matchRef = push(matchesRef);
      currentIds.push(matchRef.key as string);
    }

    const prevIds = createNodes(round - 1, matchCount * 2, currentIds);

    for (let i = 0; i < matchCount; i++) {
      const matchId = currentIds[i];
      let redId = '';
      let blueId = '';
      let status: MatchStatus = MatchStatus.PENDING;
      let winnerId = null;

      if (round === 1) {
        const comp1 = orderedCompetitors[i * 2];
        const comp2 = orderedCompetitors[i * 2 + 1];
        redId = comp1 ? comp1.id : 'BYE';
        blueId = comp2 ? comp2.id : 'BYE';
        
        const isBye = comp1 === null || comp2 === null;
        if (isBye) {
          status = MatchStatus.COMPLETED;
          winnerId = comp1 ? comp1.id : (comp2 ? comp2.id : null);
        }
      }

      finalMatches.push({
        id: matchId,
        tournamentId,
        categoryId,
        areaId,
        status,
        round,
        nextMatchId: nextMatchIds[Math.floor(i / 2)] || null,
        redCompetitorId: redId,
        blueCompetitorId: blueId,
        winnerId,
        score: { red: 0, blue: 0 },
        warnings: { red: 0, blue: 0 },
        deductions: { red: 0, blue: 0 },
      });
    }

    return currentIds;
  };

  createNodes(totalRounds, 1);

  // Save to database
  const updates: Record<string, any> = {};
  for (const m of finalMatches) {
    const { id, ...matchData } = m;
    updates[id] = matchData;
  }
  
  await update(matchesRef, updates);

  return finalMatches;
};


export const getMatches = async (tournamentId: string, categoryId?: string): Promise<Match[]> => {
  const matchesRef = ref(database, `tournaments/${tournamentId}/matches`);
  const snapshot = await get(matchesRef);
  
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const matches: Match[] = Object.keys(data).map(key => ({
    id: key,
    ...data[key]
  }));

  if (categoryId) {
    return matches.filter(m => m.categoryId === categoryId);
  }

  return matches;
};

export const advanceWinner = async (tournamentId: string, matchId: string, winnerId: string, nextMatchId?: string): Promise<void> => {
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;

  const res = await fetch(`${API_URL}/api/matches/${matchId}/winner`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ winnerId, tournamentId, nextMatchId })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw new Error(err.error || 'Failed to advance winner');
  }
};
