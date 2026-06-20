import { describe, it, expect } from 'vitest';
import { calculateNetScore } from '@corner-click/types';

describe('calculateNetScore', () => {
  it('should return raw score when there are no warnings or deductions', () => {
    expect(calculateNetScore(10, 0, 0)).toBe(10);
  });

  it('should not deduct for fewer than 3 warnings', () => {
    expect(calculateNetScore(10, 1, 0)).toBe(10);
    expect(calculateNetScore(10, 2, 0)).toBe(10);
  });

  it('should deduct 1 point for every 3 warnings', () => {
    expect(calculateNetScore(10, 3, 0)).toBe(9);
    expect(calculateNetScore(10, 5, 0)).toBe(9);
    expect(calculateNetScore(10, 6, 0)).toBe(8);
  });

  it('should subtract points for deductions directly', () => {
    expect(calculateNetScore(10, 0, 2)).toBe(8);
  });

  it('should subtract both warnings and deductions cumulatively', () => {
    expect(calculateNetScore(10, 4, 2)).toBe(7); // 10 - 1 (from 4 warnings) - 2 = 7
  });

  it('should never return a score less than 0', () => {
    expect(calculateNetScore(2, 9, 2)).toBe(0); // 2 - 3 - 2 = -3 -> clamped to 0
  });
});
