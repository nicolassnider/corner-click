import { ref, get, set, remove, push, update } from "firebase/database";
import { database } from "../lib/firebase";
import { fetchWithAuth } from "../utils/apiClient";
import type { Match, Competitor } from "@corner-click/types";
import { MatchStatus, BracketType } from "@corner-click/types";
import { BracketFactory } from "./brackets/bracketGenerators";

/**
 * Shuffles an array randomly using Fisher-Yates algorithm.
 */
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

/**
 * Generates a bracket for a list of competitors depending on the category's configured modal.
 */
export const generateBracket = async (
  tournamentId: string,
  categoryId: string,
  areaId: string,
  competitors: Competitor[],
): Promise<Match[]> => {
  if (competitors.length < 2) {
    throw new Error("Not enough competitors to generate a bracket");
  }

  // Clean existing matches for category
  const existingMatches = await getMatches(tournamentId, categoryId);
  for (const em of existingMatches) {
    await remove(ref(database, `tournaments/${tournamentId}/matches/${em.id}`));
  }

  // Get category to read bracketType
  const categoryRef = ref(database, `tournaments/${tournamentId}/categories/${categoryId}`);
  const catSnap = await get(categoryRef);
  const categoryData = catSnap.exists() ? catSnap.val() : {};
  const bracketType = categoryData.bracketType || BracketType.SINGLE_ELIMINATION;

  const matchesRef = ref(database, `tournaments/${tournamentId}/matches`);

  // Instanciar generador usando la fábrica
  const generator = BracketFactory.getGenerator(bracketType);

  // Generar llaves de forma pura delegando la asignación de IDs de Firebase a un callback
  const finalMatches = generator.generate(
    tournamentId,
    categoryId,
    areaId,
    competitors,
    () => {
      const matchRef = push(matchesRef);
      return matchRef.key as string;
    }
  );

  // Guardar en la base de datos
  const updates: Record<string, any> = {};
  for (const m of finalMatches) {
    const { id, ...matchData } = m;
    if (matchData.nextMatchId === undefined) {
      delete matchData.nextMatchId;
    }
    if (matchData.losersMatchId === undefined) {
      delete matchData.losersMatchId;
    }
    updates[id] = matchData;
  }

  await update(matchesRef, updates);

  return finalMatches;
};

export const getMatches = async (
  tournamentId: string,
  categoryId?: string,
): Promise<Match[]> => {
  const matchesRef = ref(database, `tournaments/${tournamentId}/matches`);
  const snapshot = await get(matchesRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const matches: Match[] = Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }));

  if (categoryId) {
    return matches.filter((m) => m.categoryId === categoryId);
  }

  return matches;
};

export const advanceWinner = async (
  tournamentId: string,
  matchId: string,
  winnerId: string,
  nextMatchId?: string,
  losersMatchId?: string,
  loserId?: string,
): Promise<void> => {
  const res = await fetchWithAuth(`/api/matches/${matchId}/winner`, {
    method: "POST",
    body: JSON.stringify({ winnerId, tournamentId, nextMatchId, losersMatchId, loserId }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as any;
    throw new Error(err.error || "Failed to advance winner");
  }
};
