export class AudioService {
  private static ctx: AudioContext | null = null

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null
    }

    if (!AudioService.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        AudioService.ctx = new AudioContextClass()
      }
    }

    if (AudioService.ctx && AudioService.ctx.state === 'suspended') {
      AudioService.ctx.resume().catch((err) => {
        console.warn('Failed to resume AudioContext:', err)
      })
    }

    return AudioService.ctx
  }

  /**
   * Synthesizes a gong/bell metallic sound for the match start.
   */
  public static playGong(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const now = ctx.currentTime
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.0)

    // Combination of frequencies for metallic timbre
    const freqs = [330, 440, 550, 660]
    const oscs: OscillatorNode[] = []

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator()
      // Mix sine and triangle waves
      osc.type = index % 2 === 0 ? 'sine' : 'triangle'
      osc.frequency.setValueAtTime(freq, now)
      osc.connect(gainNode)
      osc.start(now)
      osc.stop(now + 2.0)
      oscs.push(osc)
    })

    gainNode.connect(ctx.destination)

    // Clean up
    setTimeout(() => {
      oscs.forEach((osc) => osc.disconnect())
      gainNode.disconnect()
    }, 2100)
  }

  /**
   * Synthesizes a low-frequency buzzer/chicharra sound for the match end.
   */
  public static playBuzzer(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const now = ctx.currentTime
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.7, now + 0.05)
    gainNode.gain.setValueAtTime(0.7, now + 1.4)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5)

    // Detuned square waves for high-impact buzzing sound
    const osc1 = ctx.createOscillator()
    osc1.type = 'square'
    osc1.frequency.setValueAtTime(110, now)

    const osc2 = ctx.createOscillator()
    osc2.type = 'sawtooth'
    osc2.frequency.setValueAtTime(110.5, now)

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 1.5)
    osc2.stop(now + 1.5)

    setTimeout(() => {
      osc1.disconnect()
      osc2.disconnect()
      gainNode.disconnect()
    }, 1600)
  }

  /**
   * Synthesizes a standard short beep sound for Jury control actions.
   */
  public static playBeep(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const now = ctx.currentTime
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, now)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.12)

    setTimeout(() => {
      osc.disconnect()
      gainNode.disconnect()
    }, 200)
  }

  /**
   * Synthesizes a subtle tick/click sound for the judge scoring pads.
   */
  public static playClick(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const now = ctx.currentTime
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.002)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

    const osc = ctx.createOscillator()
    osc.type = 'sine'
    // Pitch slide downwards creates a pleasant tactile click
    osc.frequency.setValueAtTime(1500, now)
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.03)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.03)

    setTimeout(() => {
      osc.disconnect()
      gainNode.disconnect()
    }, 100)
  }
}
