import { describe, it, expect } from 'vitest';
import { getCompetitorFullName } from '../utils/competitorUtils';
import type { Competitor } from '@corner-click/types';

describe('getCompetitorFullName', () => {
  const competitor1: Competitor = {
    id: 'c1',
    tournamentId: 't1',
    categoryId: 'cat1',
    firstName: 'Nicolas',
    lastName: 'Snider',
    club: 'Club A',
    country: 'Argentina',
  };

  const competitorsList = [competitor1];
  const competitorsMap = { c1: competitor1 };

  it('should return TBD when id is null, undefined or empty', () => {
    expect(getCompetitorFullName(null, competitorsList)).toBe('TBD');
    expect(getCompetitorFullName(undefined, competitorsList)).toBe('TBD');
    expect(getCompetitorFullName('', competitorsList)).toBe('TBD');
  });

  it('should return BYE when id is BYE', () => {
    expect(getCompetitorFullName('BYE', competitorsList)).toBe('BYE');
  });

  it('should resolve full name from array when competitor exists', () => {
    expect(getCompetitorFullName('c1', competitorsList)).toBe('Nicolas Snider');
  });

  it('should resolve full name from record/map when competitor exists', () => {
    expect(getCompetitorFullName('c1', competitorsMap)).toBe('Nicolas Snider');
  });

  it('should return the id if competitor is not found in array', () => {
    expect(getCompetitorFullName('c2', competitorsList)).toBe('c2');
  });

  it('should return the id if competitor is not found in record/map', () => {
    expect(getCompetitorFullName('c2', competitorsMap)).toBe('c2');
  });
});
