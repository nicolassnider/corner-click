export const AudioService = {
  ctx: null as AudioContext | null,

  getContext(): AudioContext | null {
    if (typeof window === 'undefined') {
      return null
    }

    if (!AudioService.ctx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioContextClass) {
        AudioService.ctx = new AudioContextClass()
      }
    }
    return AudioService.ctx
  },

  /**
   * Helper to resume audio context if suspended (needed for some browsers)
   */
  async ensureContextRunning(): Promise<void> {
    const ctx = AudioService.getContext()
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume()
    }
  },

  /**
   * Synthesizes a gong/bell metallic sound for the match start.
   */
  playGong(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const oscs = [
      ctx.createOscillator(),
      ctx.createOscillator(),
      ctx.createOscillator(),
      ctx.createOscillator(),
    ]

    const gainNode = ctx.createGain()

    // Frequencies that somewhat mimic a metallic gong
    const freqs = [300, 520, 780, 1040]
    oscs.forEach((osc, idx) => {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freqs[idx]!, ctx.currentTime)
      osc.connect(gainNode)
    })

    // Envelope
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.05)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2)

    gainNode.connect(ctx.destination)

    oscs.forEach((osc) => {
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 2)
    })

    // Clean up
    setTimeout(() => {
      oscs.forEach((osc) => {
        osc.disconnect()
      })
      gainNode.disconnect()
    }, 2100)
  },

  /**
   * Synthesizes a low-frequency buzzer/chicharra sound for the match end.
   */
  playBuzzer(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()

    // Sawtooth waves at low frequencies for a harsh buzzer sound
    osc1.type = 'sawtooth'
    osc1.frequency.setValueAtTime(120, ctx.currentTime) // ~B2
    osc2.type = 'square'
    osc2.frequency.setValueAtTime(123, ctx.currentTime) // Slightly detuned

    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(ctx.destination)

    // Envelope: quick attack, sustain, quick release
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.8, ctx.currentTime + 0.05)
    gainNode.gain.setValueAtTime(0.8, ctx.currentTime + 0.95)
    gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.0)

    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 1.0)
    osc2.stop(ctx.currentTime + 1.0)

    setTimeout(() => {
      osc1.disconnect()
      osc2.disconnect()
      gainNode.disconnect()
    }, 1100)
  },

  /**
   * Synthesizes a standard short beep sound for Jury control actions.
   */
  playBeep(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(800, ctx.currentTime) // High pitch beep

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.02)
    gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)

    setTimeout(() => {
      osc.disconnect()
      gainNode.disconnect()
    }, 200)
  },

  /**
   * Synthesizes a subtle tick/click sound for the judge scoring pads.
   */
  playClick(): void {
    const ctx = AudioService.getContext()
    if (!ctx) {
      return
    }

    const osc = ctx.createOscillator()
    const gainNode = ctx.createGain()

    // A very short high frequency pop
    osc.type = 'square'
    osc.frequency.setValueAtTime(1500, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.02)

    osc.connect(gainNode)
    gainNode.connect(ctx.destination)

    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.005)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)

    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.03)

    setTimeout(() => {
      osc.disconnect()
      gainNode.disconnect()
    }, 100)
  },
}
