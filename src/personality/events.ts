export type CommanderEvent =
  | 'GAME_START'
  | 'PLAYER_MISS'
  | 'PLAYER_HIT'
  | 'PLAYER_SUNK_AI_SHIP'
  | 'AI_MISS'
  | 'AI_HIT'
  | 'AI_SUNK_PLAYER_SHIP'
  | 'TAUNT'
  | 'PLAYER_WIN'
  | 'AI_WIN'

export type Mood = 'neutral' | 'smug' | 'annoyed' | 'panicked' | 'gloating' | 'defeated'

export interface CommanderContext {
  /** Consecutive player hits (including this one). */
  playerStreak: number
  /** Consecutive AI hits (including this one). */
  aiStreak: number
  aiShipsRemaining: number
  playerShipsRemaining: number
  /** Name of the ship involved, if any. */
  shipName?: string
  turn: number
}

export interface CommanderLine {
  text: string
  mood: Mood
}
