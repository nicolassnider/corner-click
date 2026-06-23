import { ref, get, update, push, remove } from "firebase/database";
import { database } from "../lib/firebase";
import type {
  Category,
  TournamentType,
  Gender,
  AgeGroupDef,
  WeightClass,
  BeltGroupDef,
} from "@corner-click/types";
import {
  WORLD_CHAMPIONSHIP_AGES,
  WORLD_CUP_AGES,
  LOCAL_AGES,
  getBeltsForAgeGroup,
} from "@corner-click/types";
import { getCompetitors } from "./competitorService";

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

export const generateOfficialCategories = async (
  tournamentId: string,
  type: TournamentType,
): Promise<void> => {
  const categoriesRef = ref(database, `tournaments/${tournamentId}/categories`);

  // Clean existing categories for simplicity
  const existingCategories = await getCategories(tournamentId);
  for (const c of existingCategories) {
    await remove(
      ref(database, `tournaments/${tournamentId}/categories/${c.id}`),
    );
  }

  const ageGroups =
    type === "LOCAL_OPEN"
      ? LOCAL_AGES
      : type === "WORLD_CHAMPIONSHIP"
        ? WORLD_CHAMPIONSHIP_AGES
        : WORLD_CUP_AGES;
  const updates: Record<string, any> = {};

  const createCategoryNode = (
    ageGroup: AgeGroupDef,
    gender: Gender,
    weight: WeightClass,
    belt: BeltGroupDef,
  ) => {
    const id = push(categoriesRef).key as string;
    const catData: Omit<Category, "id"> = {
      tournamentId,
      name: `${ageGroup.name} ${gender === "MALE" ? "Masculino" : "Femenino"} - ${belt.name} - ${weight.name}`,
      gender,
      ageGroup: ageGroup.name,
      beltLevel: belt.name,
      weightClass: weight.name,
      matchDuration: 2, // Default
      rounds: 2, // Default
    };
    updates[id] = catData;
  };

  for (const age of ageGroups) {
    const belts = getBeltsForAgeGroup(type, age.name);

    for (const belt of belts) {
      // Male weights
      for (const weight of age.maleWeights) {
        createCategoryNode(age, "MALE", weight, belt);
      }

      // Female weights
      for (const weight of age.femaleWeights) {
        createCategoryNode(age, "FEMALE", weight, belt);
      }
    }
  }

  await update(categoriesRef, updates);
};

export const mergeCategoriesWithFewCompetitors = async (
  tournamentId: string,
): Promise<void> => {
  const categories = await getCategories(tournamentId);

  const competitorsRef = ref(
    database,
    `tournaments/${tournamentId}/competitors`,
  );
  const compsSnap = await get(competitorsRef);
  const allComps: any[] = [];
  if (compsSnap.exists()) {
    const data = compsSnap.val();
    Object.keys(data).forEach((k) => allComps.push({ id: k, ...data[k] }));
  }

  // Count competitors per category
  const counts: Record<string, number> = {};
  categories.forEach((c) => (counts[c.id] = 0));
  allComps.forEach((c) => {
    if (counts[c.categoryId] !== undefined) counts[c.categoryId]++;
  });

  // Group by ageGroup + gender + beltLevel to find adjacent weight classes
  const groups: Record<string, Category[]> = {};
  categories.forEach((c) => {
    const key = `${c.ageGroup}-${c.gender}-${c.beltLevel}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  const competitorUpdates: Record<string, any> = {};
  const categoriesToDelete: string[] = [];
  const categoryUpdates: Record<string, any> = {};

  for (const catsInGroup of Object.values(groups)) {
    for (let i = 0; i < catsInGroup.length; i++) {
      const c = catsInGroup[i];
      const count = counts[c.id] ?? 0;

      if (count === 0) {
        // No competitors at all — remove empty category
        categoriesToDelete.push(c.id);
        continue;
      }

      if (count < 4) {
        if (i + 1 < catsInGroup.length) {
          const nextC = catsInGroup[i + 1];
          // Move all competitors from c to nextC
          allComps
            .filter((comp) => comp.categoryId === c.id)
            .forEach((comp) => {
              competitorUpdates[
                `tournaments/${tournamentId}/competitors/${comp.id}/categoryId`
              ] = nextC.id;
              // Update local state so subsequent merges pick it up
              comp.categoryId = nextC.id;
            });
          // Update nextC count so it doesn't get incorrectly deleted if it was empty
          counts[nextC.id] = (counts[nextC.id] || 0) + count;
          
          // Update nextC name to reflect the merge
          categoryUpdates[
            `tournaments/${tournamentId}/categories/${nextC.id}/name`
          ] = `${nextC.name} + ${c.weightClass}`;
          // Delete the merged-away category
          categoriesToDelete.push(c.id);
        }
      }
    }
  }

  // Apply competitor and category name updates
  const allUpdates = { ...competitorUpdates, ...categoryUpdates };
  if (Object.keys(allUpdates).length > 0) {
    await update(ref(database), allUpdates);
  }

  // Delete merged/empty categories
  for (const categoryId of categoriesToDelete) {
    await remove(
      ref(database, `tournaments/${tournamentId}/categories/${categoryId}`),
    );
  }
};

export const updateCategoryBracketType = async (
  tournamentId: string,
  categoryId: string,
  bracketType: any,
): Promise<void> => {
  const categoryRef = ref(
    database,
    `tournaments/${tournamentId}/categories/${categoryId}`,
  );
  await update(categoryRef, { bracketType });
};
