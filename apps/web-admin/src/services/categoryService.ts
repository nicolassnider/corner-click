import { ref, get, update, push, remove } from 'firebase/database';
import { database } from '../lib/firebase';
import type { Category, TournamentType, Gender, AgeGroupDef, WeightClass, BeltGroupDef } from '@corner-click/types';
import { WORLD_CHAMPIONSHIP_AGES, WORLD_CUP_AGES, getBeltsForAgeGroup } from '@corner-click/types';
import { getCompetitors } from './competitorService';

export const getCategories = async (tournamentId: string): Promise<Category[]> => {
  const categoriesRef = ref(database, `tournaments/${tournamentId}/categories`);
  const snapshot = await get(categoriesRef);
  
  if (!snapshot.exists()) return [];

  const data = snapshot.val();
  return Object.keys(data).map(key => ({
    id: key,
    ...data[key]
  }));
};

export const generateOfficialCategories = async (tournamentId: string, type: TournamentType): Promise<void> => {
  const categoriesRef = ref(database, `tournaments/${tournamentId}/categories`);
  
  // Clean existing categories for simplicity
  const existingCategories = await getCategories(tournamentId);
  for (const c of existingCategories) {
     await remove(ref(database, `tournaments/${tournamentId}/categories/${c.id}`));
  }

  const ageGroups = type === 'WORLD_CHAMPIONSHIP' ? WORLD_CHAMPIONSHIP_AGES : WORLD_CUP_AGES;
  const updates: Record<string, any> = {};

  const createCategoryNode = (ageGroup: AgeGroupDef, gender: Gender, weight: WeightClass, belt: BeltGroupDef) => {
    const id = push(categoriesRef).key as string;
    const catData: Omit<Category, 'id'> = {
      tournamentId,
      name: `${ageGroup.name} ${gender === 'MALE' ? 'Masculino' : 'Femenino'} - ${belt.name} - ${weight.name}`,
      gender,
      ageGroup: ageGroup.name,
      beltLevel: belt.name,
      weightClass: weight.name,
      matchDuration: 2, // Default
      rounds: 2 // Default
    };
    updates[id] = catData;
  };

  for (const age of ageGroups) {
    const belts = getBeltsForAgeGroup(type, age.name);
    
    for (const belt of belts) {
      // Male weights
      for (const weight of age.maleWeights) {
        createCategoryNode(age, 'MALE', weight, belt);
      }
      
      // Female weights
      for (const weight of age.femaleWeights) {
        createCategoryNode(age, 'FEMALE', weight, belt);
      }
    }
  }

  await update(categoriesRef, updates);
};

export const mergeCategoriesWithFewCompetitors = async (tournamentId: string): Promise<void> => {
  // Logic: categories with < 4 competitors should be merged.
  // The rules say "will be merged with another category". Usually this means merging with the next heavier weight class.
  const categories = await getCategories(tournamentId);
  
  const updates: Record<string, any> = {};
  
  // We need to fetch competitors for all categories to count them
  // For this implementation, we will just simulate finding categories with < 4
  // and merging them into the next weight class up if possible.
  
  // 1. Get all competitors
  const competitorsRef = ref(database, `tournaments/${tournamentId}/competitors`);
  const compsSnap = await get(competitorsRef);
  const allComps: any[] = [];
  if (compsSnap.exists()) {
    const data = compsSnap.val();
    Object.keys(data).forEach(k => allComps.push({ id: k, ...data[k] }));
  }

  // Count per category
  const counts: Record<string, number> = {};
  categories.forEach(c => counts[c.id] = 0);
  allComps.forEach(c => {
    if (counts[c.categoryId] !== undefined) counts[c.categoryId]++;
  });

  // Group categories by ageGroup + gender + beltLevel to find adjacent weight classes
  const groups: Record<string, Category[]> = {};
  categories.forEach(c => {
    const key = `${c.ageGroup}-${c.gender}-${c.beltLevel}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  for (const key of Object.keys(groups)) {
    const catsInGroup = groups[key];
    // Sort logic would ideally be based on maxWeight, but here we just rely on creation order
    // which aligns with weight progression in our generator.
    
    for (let i = 0; i < catsInGroup.length; i++) {
      const c = catsInGroup[i];
      if (counts[c.id] < 4 && counts[c.id] > 0) {
        // Find next category to merge into
        if (i + 1 < catsInGroup.length) {
          const nextC = catsInGroup[i + 1];
          // Move all competitors from c to nextC
          const compsToMove = allComps.filter(comp => comp.categoryId === c.id);
          for (const comp of compsToMove) {
            updates[`tournaments/${tournamentId}/competitors/${comp.id}/categoryId`] = nextC.id;
          }
          // Update the nextC name to reflect the merge
          updates[`tournaments/${tournamentId}/categories/${nextC.id}/name`] = nextC.name + ' (Merged with ' + c.weightClass + ')';
          // Mark original as empty or remove it
          // Wait, removing it might break references if matches are already generated, 
          // but we shouldn't merge after matches are generated.
        }
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
};
