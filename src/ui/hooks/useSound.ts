import { useCallback, useEffect, useRef } from 'react'
import type { ShotResult } from '../../engine'

type SoundName = 'miss' | 'hit' | 'sunk' | 'win' | 'lose' | 'click'

/** Tiny synthesised sound effects via Web Audio — no asset files needed. */
export function useSound(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null)

  const context = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext()
    if (ctxRef.current.state === 'suspended') void ctxRef.current.resume()
    return ctxRef.current
  }, [])

  useEffect(() => () => void ctxRef.current?.close(), [])

  const tone = useCallback(
    (ctx: AudioContext, freq: number, start: number, duration: number, type: OscillatorType, gain = 0.15) => {
      const osc = ctx.createOscillator()
      const amp = ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
      amp.gain.setValueAtTime(gain, ctx.currentTime + start)
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration)
      osc.connect(amp).connect(ctx.destination)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    },
    [],
  )

  const noise = useCallback((ctx: AudioContext, duration: number, gain = 0.25) => {
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 900
    const amp = ctx.createGain()
    amp.gain.value = gain
    src.connect(filter).connect(amp).connect(ctx.destination)
    src.start()
  }, [])

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return
      let ctx: AudioContext
      try {
        ctx = context()
      } catch {
        return
      }
      switch (name) {
        case 'click':
          tone(ctx, 600, 0, 0.05, 'square', 0.05)
          break
        case 'miss':
          tone(ctx, 320, 0, 0.18, 'sine', 0.12)
          tone(ctx, 180, 0.04, 0.25, 'sine', 0.08)
          break
        case 'hit':
          noise(ctx, 0.35)
          tone(ctx, 110, 0, 0.3, 'sawtooth', 0.12)
          break
        case 'sunk':
          noise(ctx, 0.6, 0.3)
          tone(ctx, 220, 0, 0.25, 'square', 0.1)
          tone(ctx, 165, 0.2, 0.25, 'square', 0.1)
          tone(ctx, 110, 0.4, 0.4, 'square', 0.1)
          break
        case 'win':
          ;[523, 659, 784, 1047].forEach((f, i) => tone(ctx, f, i * 0.12, 0.3, 'triangle', 0.12))
          break
        case 'lose':
          ;[392, 349, 311, 233].forEach((f, i) => tone(ctx, f, i * 0.18, 0.35, 'sawtooth', 0.08))
          break
      }
    },
    [enabled, context, tone, noise],
  )

  const playShot = useCallback(
    (result: ShotResult | null) => {
      if (!result) return
      if (result.kind === 'miss') play('miss')
      else if (result.kind === 'hit') play('hit')
      else play('sunk')
    },
    [play],
  )

  return { play, playShot }
}
