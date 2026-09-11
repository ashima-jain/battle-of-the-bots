import { chooseShot, createAiMemory, observeShot, type AiMemory } from '../ai/commander'
import {
  createBoard,
  fire,
  isFleetValid,
  isSunk,
  moveShip,
  randomFleet,
  rotateShip,
  type Board,
  type Coord,
  type Orientation,
  type Rng,
  type Ship,
  type ShotResult,
} from '../engine'
import {
  createVoiceMemory,
  speak,
  type CommanderContext,
  type CommanderEvent,
  type CommanderLine,
  type VoiceMemory,
} from '../personality'

/** `waiting`: online only — our fleet is placed, the opponent's isn't yet. `aiTurn` is the opponent's turn in either mode. */
export type Phase = 'landing' | 'placement' | 'waiting' | 'playerTurn' | 'aiTurn' | 'gameOver'

/** `solo` plays BOLT; `online` plays a remote human whose shots arrive as OPPONENT_FIRE. */
export type Mode = 'solo' | 'online'

export interface SpokenLine extends CommanderLine {
  /** Monotonic id so the UI can animate each new line. */
  id: number
}

export interface GameState {
  mode: Mode
  opponentName: string
  /** Online: the opponent's fleet has arrived (aiBoard is theirs, not a random one). */
  opponentFleetReady: boolean
  /** Increments on every restart so a remote peer can tell a new match from the old one. */
  round: number
  phase: Phase
  playerBoard: Board
  aiBoard: Board
  aiMemory: AiMemory
  voice: VoiceMemory
  commander: SpokenLine | null
  lastPlayerShot: ShotResult | null
  lastAiShot: ShotResult | null
  playerStreak: number
  aiStreak: number
  /** Number of player shots taken; a "turn" is one player shot + one AI shot. */
  turn: number
  playerShots: number
  playerHits: number
  aiShots: number
  aiHits: number
  winner: 'player' | 'ai' | null
  commanderMuted: boolean
  soundEnabled: boolean
  lineCounter: number
}

export type GameAction =
  | { type: 'START_SETUP' }
  | { type: 'START_ONLINE' }
  | { type: 'OPPONENT_FLEET'; ships: Ship[] }
  | { type: 'OPPONENT_FIRE'; coord: Coord }
  | { type: 'SHUFFLE' }
  | { type: 'MOVE_SHIP'; shipId: string; bow: Coord; orientation: Orientation }
  | { type: 'ROTATE_SHIP'; shipId: string }
  | { type: 'READY' }
  | { type: 'PLAYER_FIRE'; coord: Coord }
  | { type: 'AI_FIRE' }
  | { type: 'TAUNT_TICK' }
  | { type: 'RESTART' }
  | { type: 'TOGGLE_COMMANDER' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'DISMISS_LINE' }

export function createInitialState(rng: Rng): GameState {
  return {
    mode: 'solo',
    opponentName: 'BOLT',
    opponentFleetReady: false,
    round: 0,
    phase: 'landing',
    playerBoard: createBoard(randomFleet(rng)),
    aiBoard: createBoard(randomFleet(rng)),
    aiMemory: createAiMemory(),
    voice: createVoiceMemory(),
    commander: null,
    lastPlayerShot: null,
    lastAiShot: null,
    playerStreak: 0,
    aiStreak: 0,
    turn: 0,
    playerShots: 0,
    playerHits: 0,
    aiShots: 0,
    aiHits: 0,
    winner: null,
    commanderMuted: false,
    soundEnabled: true,
    lineCounter: 0,
  }
}

export function shipsRemaining(board: Board): number {
  return board.ships.filter((s) => !isSunk(s)).length
}

function context(state: GameState, shipName?: string): CommanderContext {
  return {
    playerStreak: state.playerStreak,
    aiStreak: state.aiStreak,
    aiShipsRemaining: shipsRemaining(state.aiBoard),
    playerShipsRemaining: shipsRemaining(state.playerBoard),
    shipName,
    turn: state.turn,
  }
}

function withLine(state: GameState, event: CommanderEvent, rng: Rng, shipName?: string): GameState {
  if (state.mode === 'online') return state
  const { line, memory } = speak(event, context(state, shipName), state.voice, rng)
  if (!line) return { ...state, voice: memory }
  return {
    ...state,
    voice: memory,
    commander: { ...line, id: state.lineCounter + 1 },
    lineCounter: state.lineCounter + 1,
  }
}

function fresh(state: GameState, rng: Rng, phase: Phase): GameState {
  const next = createInitialState(rng)
  return {
    ...next,
    phase,
    mode: state.mode,
    opponentName: state.opponentName,
    round: state.round + 1,
    commanderMuted: state.commanderMuted,
    soundEnabled: state.soundEnabled,
  }
}

/** Resolve a shot on the player's board by whoever the opponent is (BOLT or a remote human). */
function opponentFire(state: GameState, coord: Coord, rng: Rng): GameState {
  const out = fire(state.playerBoard, coord)
  if (!out.ok) return state
  const { result } = out
  const hit = result.kind !== 'miss'
  let next: GameState = {
    ...state,
    playerBoard: out.board,
    aiMemory: observeShot(state.aiMemory, result),
    lastAiShot: result,
    aiShots: state.aiShots + 1,
    aiHits: state.aiHits + (hit ? 1 : 0),
    aiStreak: hit ? state.aiStreak + 1 : 0,
  }
  if (result.kind === 'sunk' && result.fleetSunk) {
    next = { ...next, phase: 'gameOver', winner: 'ai' }
    return withLine(next, 'AI_WIN', rng, result.ship.name)
  }
  next = { ...next, phase: 'playerTurn' }
  if (result.kind === 'sunk') return withLine(next, 'AI_SUNK_PLAYER_SHIP', rng, result.ship.name)
  return withLine(next, hit ? 'AI_HIT' : 'AI_MISS', rng)
}

export function createGameReducer(rng: Rng) {
  return function gameReducer(state: GameState, action: GameAction): GameState {
    switch (action.type) {
      case 'START_SETUP':
        return state.phase === 'landing' ? { ...state, phase: 'placement' } : state

      case 'START_ONLINE':
        return state.phase === 'landing'
          ? { ...state, phase: 'placement', mode: 'online', opponentName: 'Your friend', opponentFleetReady: false }
          : state

      case 'OPPONENT_FLEET': {
        if (state.mode !== 'online' || state.opponentFleetReady || !isFleetValid(action.ships)) return state
        if (state.phase !== 'placement' && state.phase !== 'waiting') return state
        const next: GameState = { ...state, aiBoard: createBoard(action.ships), opponentFleetReady: true }
        return state.phase === 'waiting' ? { ...next, phase: 'playerTurn' } : next
      }

      case 'OPPONENT_FIRE':
        if (state.mode !== 'online' || state.phase !== 'aiTurn') return state
        return opponentFire(state, action.coord, rng)

      case 'SHUFFLE': {
        if (state.phase !== 'placement') return state
        return { ...state, playerBoard: createBoard(randomFleet(rng)) }
      }

      case 'MOVE_SHIP': {
        if (state.phase !== 'placement') return state
        const ships = moveShip(state.playerBoard.ships, action.shipId, action.bow, action.orientation)
        return ships ? { ...state, playerBoard: { ...state.playerBoard, ships } } : state
      }

      case 'ROTATE_SHIP': {
        if (state.phase !== 'placement') return state
        const ships = rotateShip(state.playerBoard.ships, action.shipId)
        return ships ? { ...state, playerBoard: { ...state.playerBoard, ships } } : state
      }

      case 'READY': {
        if (state.phase !== 'placement') return state
        if (state.mode === 'online' && !state.opponentFleetReady) return { ...state, phase: 'waiting' }
        return withLine({ ...state, phase: 'playerTurn' }, 'GAME_START', rng)
      }

      case 'PLAYER_FIRE': {
        if (state.phase !== 'playerTurn') return state
        const out = fire(state.aiBoard, action.coord)
        if (!out.ok) return state
        const { result } = out
        const hit = result.kind !== 'miss'
        let next: GameState = {
          ...state,
          aiBoard: out.board,
          lastPlayerShot: result,
          playerShots: state.playerShots + 1,
          playerHits: state.playerHits + (hit ? 1 : 0),
          playerStreak: hit ? state.playerStreak + 1 : 0,
          turn: state.turn + 1,
        }
        if (result.kind === 'sunk' && result.fleetSunk) {
          next = { ...next, phase: 'gameOver', winner: 'player' }
          return withLine(next, 'PLAYER_WIN', rng, result.ship.name)
        }
        next = { ...next, phase: 'aiTurn' }
        if (result.kind === 'sunk') return withLine(next, 'PLAYER_SUNK_AI_SHIP', rng, result.ship.name)
        return withLine(next, hit ? 'PLAYER_HIT' : 'PLAYER_MISS', rng)
      }

      case 'AI_FIRE': {
        if (state.mode !== 'solo' || state.phase !== 'aiTurn') return state
        return opponentFire(state, chooseShot(state.aiMemory, rng), rng)
      }

      case 'TAUNT_TICK':
        return state.phase === 'playerTurn' ? withLine(state, 'TAUNT', rng) : state

      case 'RESTART':
        return fresh(state, rng, 'placement')

      case 'TOGGLE_COMMANDER':
        return { ...state, commanderMuted: !state.commanderMuted, commander: null }

      case 'TOGGLE_SOUND':
        return { ...state, soundEnabled: !state.soundEnabled }

      case 'DISMISS_LINE':
        return state.commander ? { ...state, commander: null } : state
    }
  }
}
