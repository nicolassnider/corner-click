export type TournamentType = 'WORLD_CHAMPIONSHIP' | 'WORLD_CUP' | 'LOCAL_OPEN';
export type Gender = 'MALE' | 'FEMALE';

export interface WeightClass {
  name: string; // e.g., "Hasta 40 kg", "Más de 40 a 45 kg", "Más de 65 kg"
  minWeight?: number;
  maxWeight?: number;
}

export interface AgeGroupDef {
  name: string;
  minAge: number;
  maxAge: number;
  maleWeights: WeightClass[];
  femaleWeights: WeightClass[];
}

export interface BeltGroupDef {
  name: string; // e.g. "Cinturones Negros", "4º – 1º Gup / 1º – 6º Dan"
}

export const WORLD_CHAMPIONSHIP_BELTS = [
  { name: 'Cinturones Negros' } // World Champ is usually only Black Belts, but we'll leave it generic or just specific to the rules provided
];

export const WORLD_CUP_BELTS_COLOR_LOWER = { name: '10º – 5º Gup' };
export const WORLD_CUP_BELTS_COLOR_UPPER = { name: '4º – 1º Gup' };
export const WORLD_CUP_BELTS_BLACK_JUNIOR = { name: '1º – 3º Dan' };
export const WORLD_CUP_BELTS_BLACK_ADULT = { name: '1º – 6º Dan' };

export const LOCAL_BELTS_10_9 = { name: '10º – 9º Gup' };
export const LOCAL_BELTS_8_7 = { name: '8º – 7º Gup' };
export const LOCAL_BELTS_6_5 = { name: '6º – 5º Gup' };
export const LOCAL_BELTS_4_1 = { name: '4º – 1º Gup' };

// Weights Definitions

const preJuniorMaleWeights: WeightClass[] = [
  { name: 'Hasta 40 kg', maxWeight: 40 },
  { name: 'Más de 40 a 45 kg', minWeight: 40, maxWeight: 45 },
  { name: 'Más de 45 a 50 kg', minWeight: 45, maxWeight: 50 },
  { name: 'Más de 50 a 55 kg', minWeight: 50, maxWeight: 55 },
  { name: 'Más de 55 a 60 kg', minWeight: 55, maxWeight: 60 },
  { name: 'Más de 60 a 65 kg', minWeight: 60, maxWeight: 65 },
  { name: 'Más de 65 kg', minWeight: 65 }
];

const preJuniorFemaleWeights: WeightClass[] = [
  { name: 'Hasta 40 kg', maxWeight: 40 },
  { name: 'Más de 40 a 44 kg', minWeight: 40, maxWeight: 44 },
  { name: 'Más de 44 a 48 kg', minWeight: 44, maxWeight: 48 },
  { name: 'Más de 48 a 52 kg', minWeight: 48, maxWeight: 52 },
  { name: 'Más de 52 a 56 kg', minWeight: 52, maxWeight: 56 },
  { name: 'Más de 56 a 60 kg', minWeight: 56, maxWeight: 60 },
  { name: 'Más de 60 kg', minWeight: 60 }
];

const juniorMaleWeights: WeightClass[] = [
  { name: 'Hasta 50 kg', maxWeight: 50 },
  { name: 'Más de 50 a 55 kg', minWeight: 50, maxWeight: 55 },
  { name: 'Más de 55 a 60 kg', minWeight: 55, maxWeight: 60 },
  { name: 'Más de 60 a 65 kg', minWeight: 60, maxWeight: 65 },
  { name: 'Más de 65 a 70 kg', minWeight: 65, maxWeight: 70 },
  { name: 'Más de 70 a 75 kg', minWeight: 70, maxWeight: 75 },
  { name: 'Más de 75 kg', minWeight: 75 }
];

const juniorFemaleWeights: WeightClass[] = [
  { name: 'Hasta 45 kg', maxWeight: 45 },
  { name: 'Más de 45 a 49 kg', minWeight: 45, maxWeight: 49 },
  { name: 'Más de 49 a 53 kg', minWeight: 49, maxWeight: 53 },
  { name: 'Más de 53 a 57 kg', minWeight: 53, maxWeight: 57 },
  { name: 'Más de 57 a 61 kg', minWeight: 57, maxWeight: 61 },
  { name: 'Más de 61 a 65 kg', minWeight: 61, maxWeight: 65 },
  { name: 'Más de 65 kg', minWeight: 65 }
];

const adultMaleWeights: WeightClass[] = [
  { name: 'Hasta 57 kg', maxWeight: 57 },
  { name: 'Más de 57 a 63 kg', minWeight: 57, maxWeight: 63 },
  { name: 'Más de 63 a 69 kg', minWeight: 63, maxWeight: 69 },
  { name: 'Más de 69 a 75 kg', minWeight: 69, maxWeight: 75 },
  { name: 'Más de 75 a 81 kg', minWeight: 75, maxWeight: 81 },
  { name: 'Más de 81 a 87 kg', minWeight: 81, maxWeight: 87 },
  { name: 'Más de 87 kg', minWeight: 87 }
];

const adultFemaleWeights: WeightClass[] = [
  { name: 'Hasta 50 kg', maxWeight: 50 },
  { name: 'Más de 50 a 55 kg', minWeight: 50, maxWeight: 55 },
  { name: 'Más de 55 a 60 kg', minWeight: 55, maxWeight: 60 },
  { name: 'Más de 60 a 65 kg', minWeight: 60, maxWeight: 65 },
  { name: 'Más de 65 a 70 kg', minWeight: 65, maxWeight: 70 },
  { name: 'Más de 70 a 75 kg', minWeight: 70, maxWeight: 75 },
  { name: 'Más de 75 kg', minWeight: 75 }
];

const seniorMaleWeights: WeightClass[] = [
  { name: 'Hasta 63 kg', maxWeight: 63 },
  { name: 'Más de 63 a 70 kg', minWeight: 63, maxWeight: 70 },
  { name: 'Más de 70 a 77 kg', minWeight: 70, maxWeight: 77 },
  { name: 'Más de 77 a 84 kg', minWeight: 77, maxWeight: 84 },
  { name: 'Más de 84 kg', minWeight: 84 }
];

const seniorFemaleWeights: WeightClass[] = [
  { name: 'Hasta 57 kg', maxWeight: 57 },
  { name: 'Más de 57 a 63 kg', minWeight: 57, maxWeight: 63 },
  { name: 'Más de 63 a 69 kg', minWeight: 63, maxWeight: 69 },
  { name: 'Más de 69 a 75 kg', minWeight: 69, maxWeight: 75 },
  { name: 'Más de 75 kg', minWeight: 75 }
];

const veteranMaleWeights: WeightClass[] = [
  { name: 'Hasta 68 kg', maxWeight: 68 },
  { name: 'Más de 68 a 76 kg', minWeight: 68, maxWeight: 76 },
  { name: 'Más de 76 a 84 kg', minWeight: 76, maxWeight: 84 },
  { name: 'Más de 84 kg', minWeight: 84 }
];

const veteranFemaleWeights: WeightClass[] = [
  { name: 'Hasta 60 kg', maxWeight: 60 },
  { name: 'Más de 60 a 67 kg', minWeight: 60, maxWeight: 67 },
  { name: 'Más de 67 a 74 kg', minWeight: 67, maxWeight: 74 },
  { name: 'Más de 74 kg', minWeight: 74 }
];

// Age Groups & Tournament Structures

export const WORLD_CHAMPIONSHIP_AGES: AgeGroupDef[] = [
  { name: 'Pre-Junior', minAge: 12, maxAge: 14, maleWeights: preJuniorMaleWeights, femaleWeights: preJuniorFemaleWeights },
  { name: 'Junior', minAge: 15, maxAge: 17, maleWeights: juniorMaleWeights, femaleWeights: juniorFemaleWeights },
  { name: 'Adulto', minAge: 18, maxAge: 99, maleWeights: adultMaleWeights, femaleWeights: adultFemaleWeights },
];

export const WORLD_CUP_AGES: AgeGroupDef[] = [
  { name: 'Pre-Junior', minAge: 12, maxAge: 14, maleWeights: preJuniorMaleWeights, femaleWeights: preJuniorFemaleWeights },
  { name: 'Junior', minAge: 15, maxAge: 17, maleWeights: juniorMaleWeights, femaleWeights: juniorFemaleWeights },
  { name: 'Adulto', minAge: 18, maxAge: 35, maleWeights: adultMaleWeights, femaleWeights: adultFemaleWeights },
  { name: 'Senior', minAge: 36, maxAge: 45, maleWeights: seniorMaleWeights, femaleWeights: seniorFemaleWeights },
  { name: 'Veterano', minAge: 46, maxAge: 99, maleWeights: veteranMaleWeights, femaleWeights: veteranFemaleWeights },
];

const childrenWeights: WeightClass[] = [
  { name: 'Hasta 25 kg', maxWeight: 25 },
  { name: 'Más de 25 a 30 kg', minWeight: 25, maxWeight: 30 },
  { name: 'Más de 30 a 35 kg', minWeight: 30, maxWeight: 35 },
  { name: 'Más de 35 a 40 kg', minWeight: 35, maxWeight: 40 },
  { name: 'Más de 40 kg', minWeight: 40 }
];

export const LOCAL_AGES: AgeGroupDef[] = [
  { name: 'Micro', minAge: 4, maxAge: 5, maleWeights: childrenWeights, femaleWeights: childrenWeights },
  { name: 'Pre-Mini', minAge: 6, maxAge: 7, maleWeights: childrenWeights, femaleWeights: childrenWeights },
  { name: 'Mini', minAge: 8, maxAge: 9, maleWeights: childrenWeights, femaleWeights: childrenWeights },
  { name: 'Infantil', minAge: 10, maxAge: 11, maleWeights: childrenWeights, femaleWeights: childrenWeights },
  ...WORLD_CUP_AGES
];

// Helpers for Generation
export const getBeltsForAgeGroup = (tournamentType: TournamentType, ageGroupName: string): BeltGroupDef[] => {
  if (tournamentType === 'WORLD_CHAMPIONSHIP') {
    return [{ name: 'Cinturones Negros' }];
  }
  
  if (tournamentType === 'LOCAL_OPEN') {
    const belts = [LOCAL_BELTS_10_9, LOCAL_BELTS_8_7, LOCAL_BELTS_6_5, LOCAL_BELTS_4_1];
    if (ageGroupName !== 'Micro' && ageGroupName !== 'Pre-Mini' && ageGroupName !== 'Mini' && ageGroupName !== 'Infantil') {
      if (ageGroupName === 'Pre-Junior' || ageGroupName === 'Junior') {
        belts.push(WORLD_CUP_BELTS_BLACK_JUNIOR);
      } else {
        belts.push(WORLD_CUP_BELTS_BLACK_ADULT);
      }
    }
    return belts;
  }

  // WORLD_CUP
  const belts = [WORLD_CUP_BELTS_COLOR_LOWER, WORLD_CUP_BELTS_COLOR_UPPER];
  if (ageGroupName === 'Pre-Junior' || ageGroupName === 'Junior') {
    belts.push(WORLD_CUP_BELTS_BLACK_JUNIOR);
  } else {
    belts.push(WORLD_CUP_BELTS_BLACK_ADULT);
  }
  return belts;
};
