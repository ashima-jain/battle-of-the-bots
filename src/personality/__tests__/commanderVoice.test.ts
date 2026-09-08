import { describe, expect, it } from 'vitest'
import { seededRng, type Rng } from '../../engine'
import { createVoiceMemory, ROUTINE_COOLDOWN_TURNS, speak } from '../commanderVoice'
import type { CommanderContext } from '../events'
import { LINES } from '../lines'

const always: Rng = { next: () => 0 } // passes every chance check, picks first candidate
const never: Rng = { next: () => 0.999 }

function ctx(overrides: Partial<CommanderContext> = {}): CommanderContext {
  return { playerStreak: 0, aiStreak: 0, aiShipsRemaining: 5, playerShipsRemaining: 5, turn: 10, ...overrides }
}

describe('speak', () => {
  it('always speaks on mandatory events', () => {
    for (const event of ['GAME_START', 'PLAYER_SUNK_AI_SHIP', 'AI_SUNK_PLAYER_SHIP', 'PLAYER_WIN', 'AI_WIN'] as const) {
      expect(speak(event, ctx({ shipName: 'Cruiser' }), createVoiceMemory(), never).line).not.toBeNull()
    }
  })

  it('substitutes the ship name', () => {
    const { line } = speak('AI_SUNK_PLAYER_SHIP', ctx({ shipName: 'Destroyer' }), createVoiceMemory(), always)
    expect(line?.text).toContain('Destroyer')
    expect(line?.text).not.toContain('{ship}')
  })

  it('stays quiet on routine events when the dice say so', () => {
    expect(speak('PLAYER_MISS', ctx(), createVoiceMemory(), never).line).toBeNull()
  })

  it('respects the routine cooldown', () => {
    const first = speak('PLAYER_HIT', ctx({ turn: 5 }), createVoiceMemory(), always)
    expect(first.line).not.toBeNull()
    const tooSoon = speak('PLAYER_MISS', ctx({ turn: 5 + ROUTINE_COOLDOWN_TURNS - 1 }), first.memory, always)
    expect(tooSoon.line).toBeNull()
    const later = speak('PLAYER_MISS', ctx({ turn: 5 + ROUTINE_COOLDOWN_TURNS }), first.memory, always)
    expect(later.line).not.toBeNull()
  })

  it('mandatory lines do not reset the routine cooldown', () => {
    const first = speak('PLAYER_HIT', ctx({ turn: 5 }), createVoiceMemory(), always)
    const sunk = speak('PLAYER_SUNK_AI_SHIP', ctx({ turn: 6, shipName: 'x' }), first.memory, always)
    expect(sunk.memory.lastRoutineTurn).toBe(5)
  })

  it('never taunts twice in a row', () => {
    const first = speak('TAUNT', ctx({ turn: 0 }), createVoiceMemory(), always)
    expect(first.line).not.toBeNull()
    expect(speak('TAUNT', ctx({ turn: 100 }), first.memory, always).line).toBeNull()
  })

  it('does not repeat a line until the pool is exhausted', () => {
    let memory = createVoiceMemory()
    const rng = seededRng(3)
    const seen = new Set<string>()
    const pool = LINES.PLAYER_WIN
    for (let i = 0; i < pool.length; i++) {
      const { line, memory: next } = speak('PLAYER_WIN', ctx(), memory, rng)
      expect(seen.has(line!.text)).toBe(false)
      seen.add(line!.text)
      memory = next
    }
    // Pool exhausted: it may now repeat, but must still speak.
    expect(speak('PLAYER_WIN', ctx(), memory, rng).line).not.toBeNull()
  })

  it('prefers streak-specific lines when the player is on a streak', () => {
    const { line } = speak('PLAYER_HIT', ctx({ playerStreak: 4 }), createVoiceMemory(), always)
    expect(line?.text).toMatch(/stung|Stop doing|Recalculating/)
  })

  it('never uses streak lines when the streak is too low', () => {
    let memory = createVoiceMemory()
    const rng = seededRng(9)
    for (let i = 0; i < 40; i++) {
      const res = speak('PLAYER_HIT', ctx({ playerStreak: 1, turn: i * 10 }), memory, rng)
      if (res.line) expect(res.line.text).not.toMatch(/stung|Stop doing|Recalculating/)
      memory = res.memory
    }
  })

  it('uses the last-ship line only when one AI ship remains', () => {
    const { line } = speak('PLAYER_SUNK_AI_SHIP', ctx({ aiShipsRemaining: 1, shipName: 'Carrier' }), createVoiceMemory(), always)
    expect(line?.text).toContain('Last ship')
  })

  it('keeps every line short', () => {
    for (const pool of Object.values(LINES)) {
      for (const template of pool) expect(template.text.length).toBeLessThanOrEqual(80)
    }
  })
})
