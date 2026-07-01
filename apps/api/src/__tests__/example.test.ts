import { describe, expect, it } from 'vitest'

describe('API Example Test', () => {
  it('should pass a simple test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should test async function', async () => {
    const result = await Promise.resolve(42)
    expect(result).toBe(42)
  })
})
