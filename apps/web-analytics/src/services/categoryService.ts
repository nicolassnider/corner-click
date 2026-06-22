import { ref, get } from "firebase/database";
import { database } from "../lib/firebase";
import type { Category } from "@corner-click/types";

export const getCategories = async (
  tournamentId: string,
): Promise<Category[]> => {
  const categoriesRef = ref(database, `tournaments/${tournamentId}/categories`);
  const snapshot = await get(categoriesRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.keys(data).map((key) => ({
    id: key,
    ...data[key],
  }));
};
