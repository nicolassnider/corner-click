import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AudioService } from './index'

describe('AudioService in SSR/Node environment', () => {
  it('should not throw errors when playing sounds in server environment (where window is undefined)', () => {
    expect(() => AudioService.playGong()).not.toThrow()
    expect(() => AudioService.playBuzzer()).not.toThrow()
    expect(() => AudioService.playBeep()).not.toThrow()
    expect(() => AudioService.playClick()).not.toThrow()
  })
})

describe('AudioService in simulated Browser environment', () => {
  let mockAudioContext: any
  let mockGainNode: any
  let mockOscillatorNode: any

  beforeEach(() => {
    // Setup mocks for Web Audio API
    mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }

    mockOscillatorNode = {
      type: 'sine',
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }

    mockAudioContext = {
      currentTime: 10,
      state: 'suspended',
      resume: vi.fn().mockResolvedValue(undefined),
      createGain: vi.fn().mockReturnValue(mockGainNode),
      createOscillator: vi.fn().mockReturnValue(mockOscillatorNode),
      destination: {},
    }

    // Define window and AudioContext globally for this block
    const MockAudioContext = vi.fn().mockImplementation(function (this: any) {
      return mockAudioContext
    })

    vi.stubGlobal('window', {
      AudioContext: MockAudioContext,
    })

    // Reset AudioService internal static context reference
    ;(AudioService as any).ctx = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should create and resume AudioContext upon playing a sound', () => {
    AudioService.playBeep()
    expect(window.AudioContext).toHaveBeenCalled()
    expect(mockAudioContext.resume).toHaveBeenCalled()
  })

  it('should play a beep with expected configuration', () => {
    AudioService.playBeep()

    expect(mockAudioContext.createGain).toHaveBeenCalled()
    expect(mockAudioContext.createOscillator).toHaveBeenCalled()
    expect(mockOscillatorNode.type).toBe('sine')
    expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(880, 10)
    expect(mockOscillatorNode.start).toHaveBeenCalledWith(10)
    expect(mockOscillatorNode.stop).toHaveBeenCalledWith(10.12)
  })

  it('should play a gong with multiple oscillators', () => {
    AudioService.playGong()

    // Gong uses 4 frequencies, so it should create 4 oscillators
    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(4)
    expect(mockOscillatorNode.start).toHaveBeenCalledTimes(4)
  })

  it('should play a buzzer with square and sawtooth oscillators', () => {
    AudioService.playBuzzer()

    expect(mockAudioContext.createOscillator).toHaveBeenCalledTimes(2)
  })

  it('should play a click with rapid pitch decay', () => {
    AudioService.playClick()

    expect(mockOscillatorNode.frequency.setValueAtTime).toHaveBeenCalledWith(1500, 10)
    expect(mockOscillatorNode.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
      150,
      10.03
    )
  })
})
