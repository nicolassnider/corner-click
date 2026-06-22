import { ref, get } from "firebase/database";
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
