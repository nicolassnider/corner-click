import { ref, get, set, push, remove, update } from "firebase/database";
import { database } from "../lib/firebase";
import type { Competitor } from "@corner-click/types";

export const getCompetitors = async (
  tournamentId: string,
  categoryId?: string,
): Promise<Competitor[]> => {
  const competitorsRef = ref(
    database,
    `tournaments/${tournamentId}/competitors`,
  );
  const snapshot = await get(competitorsRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  const competitors: Competitor[] = Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }));

  if (categoryId) {
    return competitors.filter((c) => c.categoryId === categoryId);
  }

  return competitors;
};

export const addCompetitor = async (
  tournamentId: string,
  competitor: Omit<Competitor, "id" | "tournamentId">,
): Promise<Competitor> => {
  const competitorsRef = ref(
    database,
    `tournaments/${tournamentId}/competitors`,
  );
  const newCompetitorRef = push(competitorsRef);

  const newCompetitor = {
    ...competitor,
    tournamentId,
  };

  await set(newCompetitorRef, newCompetitor);

  return {
    id: newCompetitorRef.key as string,
    ...newCompetitor,
  };
};

export const updateCompetitor = async (
  tournamentId: string,
  competitorId: string,
  updates: Partial<Omit<Competitor, "id" | "tournamentId">>,
): Promise<void> => {
  const competitorRef = ref(
    database,
    `tournaments/${tournamentId}/competitors/${competitorId}`,
  );
  await update(competitorRef, updates);
};

export const deleteCompetitor = async (
  tournamentId: string,
  competitorId: string,
): Promise<void> => {
  const competitorRef = ref(
    database,
    `tournaments/${tournamentId}/competitors/${competitorId}`,
  );
  await remove(competitorRef);
};
