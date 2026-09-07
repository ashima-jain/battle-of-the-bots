import type { Rng } from '../engine'
import type { CommanderContext, CommanderEvent, CommanderLine } from './events'
import { LINES, type LineTemplate } from './lines'

/**
 * Tracks what the commander has said so it doesn't repeat itself or talk too much.
 * Kept separate from the game engine: deleting this module would not affect play.
 */
export interface VoiceMemory {
  /** Indices already used per event, cleared when a pool is exhausted. */
  used: Partial<Record<CommanderEvent, number[]>>
  /** Turn number of the last routine (non-mandatory) line. */
  lastRoutineTurn: number
  lastEvent?: CommanderEvent
}

export function createVoiceMemory(): VoiceMemory {
  return { used: {}, lastRoutineTurn: -Infinity }
}

/** Events that always produce a line. */
const MANDATORY: ReadonlySet<CommanderEvent> = new Set([
  'GAME_START',
  'PLAYER_SUNK_AI_SHIP',
  'AI_SUNK_PLAYER_SHIP',
  'PLAYER_WIN',
  'AI_WIN',
])

/** Probability a routine event produces a line at all. */
const CHANCE: Partial<Record<CommanderEvent, number>> = {
  PLAYER_MISS: 0.3,
  PLAYER_HIT: 0.5,
  AI_MISS: 0.15,
  AI_HIT: 0.4,
  TAUNT: 0.1,
}

/** Minimum turns between routine lines so the commander doesn't chatter. */
export const ROUTINE_COOLDOWN_TURNS = 3

function eligible(template: LineTemplate, ctx: CommanderContext): boolean {
  if (template.minPlayerStreak !== undefined && ctx.playerStreak < template.minPlayerStreak) return false
  if (template.minAiStreak !== undefined && ctx.aiStreak < template.minAiStreak) return false
  if (template.maxAiShips !== undefined && ctx.aiShipsRemaining > template.maxAiShips) return false
  return true
}

function render(template: LineTemplate, ctx: CommanderContext): CommanderLine {
  return { text: template.text.replace('{ship}', ctx.shipName ?? 'ship'), mood: template.mood }
}

export interface VoiceResult {
  line: CommanderLine | null
  memory: VoiceMemory
}

export function speak(
  event: CommanderEvent,
  ctx: CommanderContext,
  memory: VoiceMemory,
  rng: Rng,
): VoiceResult {
  const mandatory = MANDATORY.has(event)

  if (!mandatory) {
    if (ctx.turn - memory.lastRoutineTurn < ROUTINE_COOLDOWN_TURNS) return { line: null, memory }
    if (event === 'TAUNT' && memory.lastEvent === 'TAUNT') return { line: null, memory }
    if (rng.next() >= (CHANCE[event] ?? 0)) return { line: null, memory }
  }

  const pool = LINES[event]
  const candidates = pool
    .map((template, index) => ({ template, index }))
    .filter(({ template }) => eligible(template, ctx))
  if (candidates.length === 0) return { line: null, memory }

  // Prefer the most specific (streak/ship-gated) lines when they apply.
  const specific = candidates.filter(
    ({ template }) =>
      template.minPlayerStreak !== undefined ||
      template.minAiStreak !== undefined ||
      template.maxAiShips !== undefined,
  )
  const preferred = specific.length > 0 ? specific : candidates

  const used = memory.used[event] ?? []
  let fresh = preferred.filter(({ index }) => !used.includes(index))
  let nextUsed = used
  if (fresh.length === 0) {
    fresh = preferred
    nextUsed = []
  }

  const choice = fresh[Math.floor(rng.next() * fresh.length)]
  return {
    line: render(choice.template, ctx),
    memory: {
      used: { ...memory.used, [event]: [...nextUsed, choice.index] },
      lastRoutineTurn: mandatory ? memory.lastRoutineTurn : ctx.turn,
      lastEvent: event,
    },
  }
}
