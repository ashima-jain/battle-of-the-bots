import { createAiMemory } from '../ai/commander'
import { isSunk, type Board, type Coord, type Ship } from '../engine'
import { createVoiceMemory } from '../personality'
import type { GameState } from './gameReducer'

/**
 * Online play is host-authoritative: the host runs the reducer and streams its state
 * to the guest, who renders it from the opposite side via `mirror`. The guest only
 * ever sends intents (fleet, fire, restart); the host validates them like any action.
 */
export type NetMessage =
  | { type: 'hello'; name: string }
  | { type: 'fleet'; ships: Ship[] }
  | { type: 'fire'; coord: Coord }
  | { type: 'restart' }
  | { type: 'state'; state: WireState }

/** Host state minus host-only memory (the AI's `Set` can't be serialised and the guest never needs it). */
export type WireState = Omit<GameState, 'aiMemory' | 'voice'>

/** Hide where the host's unsunk ships are before the state leaves the host's machine. */
export function redactForGuest(state: GameState): WireState {
  const { aiMemory: _memory, voice: _voice, ...rest } = state
  return { ...rest, playerBoard: redactBoard(state.playerBoard), commander: null }
}

function redactBoard(board: Board): Board {
  return {
    ...board,
    ships: board.ships.map((s) => (isSunk(s) ? s : { ...s, bow: { row: -1, col: -1 }, hits: 0 })),
  }
}

/** The host's state seen from the guest's chair: boards, shots, turns and winner swapped. */
export function mirror(host: WireState, local: { soundEnabled: boolean; opponentName: string }): GameState {
  return {
    ...host,
    aiMemory: createAiMemory(),
    voice: createVoiceMemory(),
    opponentName: local.opponentName,
    soundEnabled: local.soundEnabled,
    phase: host.phase === 'playerTurn' ? 'aiTurn' : host.phase === 'aiTurn' ? 'playerTurn' : host.phase,
    playerBoard: host.aiBoard,
    aiBoard: host.playerBoard,
    lastPlayerShot: host.lastAiShot,
    lastAiShot: host.lastPlayerShot,
    playerStreak: host.aiStreak,
    aiStreak: host.playerStreak,
    playerShots: host.aiShots,
    playerHits: host.aiHits,
    aiShots: host.playerShots,
    aiHits: host.playerHits,
    winner: host.winner === 'player' ? 'ai' : host.winner === 'ai' ? 'player' : null,
    commander: null,
  }
}

export const ROOM_PREFIX = 'battle-of-the-bots-'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function newRoomCode(random: () => number = Math.random): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]
  return code
}

export function roomFromUrl(search: string): string | null {
  const code = new URLSearchParams(search).get('room')
  return code && /^[A-Z2-9]{6}$/.test(code) ? code : null
}

export function roomLink(origin: string, code: string): string {
  return `${origin}/?room=${code}`
}
