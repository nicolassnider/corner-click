import type { Competitor } from '@corner-click/types';

/**
 * Resolves a competitor's full name based on their ID and a provided map of competitors.
 * If the ID is 'BYE' or 'TBD', it returns the ID.
 */
export const getCompetitorFullName = (
  id: string | null | undefined, 
  competitorsMap: Record<string, Competitor> | Competitor[]
): string => {
  if (!id) return 'TBD';
  if (id === 'BYE') return 'BYE';
  
  let comp: Competitor | undefined;
  
  if (Array.isArray(competitorsMap)) {
    comp = competitorsMap.find(c => c.id === id);
  } else {
    comp = competitorsMap[id];
  }

  return comp ? `${comp.firstName} ${comp.lastName}` : id;
};
