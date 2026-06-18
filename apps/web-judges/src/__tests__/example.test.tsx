import { describe, it, expect } from 'vitest';

describe('Web Judges Example Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should test async function', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
