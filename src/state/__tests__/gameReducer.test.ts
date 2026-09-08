import { describe, expect, it } from 'vitest'
import { seededRng, shipCells, shotAt, type Coord } from '../../engine'
import { createGameReducer, createInitialState, type GameState } from '../gameReducer'

function setup(seed = 1) {
  const rng = seededRng(seed)
  const reduce = createGameReducer(rng)
  let state = createInitialState(rng)
  state = reduce(state, { type: 'START_SETUP' })
  state = reduce(state, { type: 'READY' })
  return { reduce, state }
}

function firstEmptyWater(state: GameState): Coord {
  const occupied = new Set(state.aiBoard.ships.flatMap(shipCells).map((c) => `${c.row},${c.col}`))
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++)
      if (!occupied.has(`${row},${col}`) && shotAt(state.aiBoard, { row, col }) === 'empty') return { row, col }
  throw new Error('no water')
}

describe('gameReducer phases', () => {
  it('starts on the landing screen with both fleets placed', () => {
    const state = createInitialState(seededRng(1))
    expect(state.phase).toBe('landing')
    expect(state.playerBoard.ships).toHaveLength(5)
    expect(state.aiBoard.ships).toHaveLength(5)
  })

  it('moves landing → placement → playerTurn and greets the player', () => {
    const { state } = setup()
    expect(state.phase).toBe('playerTurn')
    expect(state.commander?.text).toBeTruthy()
  })

  it('ignores placement actions once the battle started', () => {
    const { reduce, state } = setup()
    expect(reduce(state, { type: 'SHUFFLE' })).toBe(state)
    expect(reduce(state, { type: 'ROTATE_SHIP', shipId: 'carrier' })).toBe(state)
  })

  it('a player shot hands the turn to the AI, and AI_FIRE hands it back', () => {
    const { reduce, state } = setup()
    const afterPlayer = reduce(state, { type: 'PLAYER_FIRE', coord: firstEmptyWater(state) })
    expect(afterPlayer.phase).toBe('aiTurn')
    expect(afterPlayer.playerShots).toBe(1)
    const afterAi = reduce(afterPlayer, { type: 'AI_FIRE' })
    expect(afterAi.phase).toBe('playerTurn')
    expect(afterAi.aiShots).toBe(1)
  })

  it('player cannot fire during the AI turn', () => {
    const { reduce, state } = setup()
    const afterPlayer = reduce(state, { type: 'PLAYER_FIRE', coord: firstEmptyWater(state) })
    const again = reduce(afterPlayer, { type: 'PLAYER_FIRE', coord: firstEmptyWater(afterPlayer) })
    expect(again).toBe(afterPlayer)
  })

  it('firing at an already-shot cell is a no-op and does not consume the turn', () => {
    const { reduce, state } = setup()
    const coord = firstEmptyWater(state)
    const s1 = reduce(state, { type: 'PLAYER_FIRE', coord })
    const s2 = reduce(s1, { type: 'AI_FIRE' })
    const s3 = reduce(s2, { type: 'PLAYER_FIRE', coord })
    expect(s3).toBe(s2)
    expect(s3.phase).toBe('playerTurn')
  })

  it('AI_FIRE during the player turn is ignored', () => {
    const { reduce, state } = setup()
    expect(reduce(state, { type: 'AI_FIRE' })).toBe(state)
  })
})

describe('gameReducer win conditions', () => {
  it('player wins by sinking every AI ship, and further shots are ignored', () => {
    const { reduce, state } = setup()
    let s = state
    for (const ship of state.aiBoard.ships) {
      for (const cell of shipCells(ship)) {
        s = reduce(s, { type: 'PLAYER_FIRE', coord: cell })
        if (s.phase === 'aiTurn') s = reduce(s, { type: 'AI_FIRE' })
      }
    }
    expect(s.phase).toBe('gameOver')
    expect(s.winner).toBe('player')
    expect(s.commander?.mood).toBe('defeated')
    expect(reduce(s, { type: 'PLAYER_FIRE', coord: firstEmptyWater(s) })).toBe(s)
    expect(reduce(s, { type: 'AI_FIRE' })).toBe(s)
  })

  it('AI wins if it sinks the fleet first', () => {
    const { reduce, state } = setup(5)
    let s = state
    let guard = 0
    while (s.phase !== 'gameOver' && guard++ < 400) {
      // Player only ever shoots water so the AI must win.
      s = reduce(s, { type: 'PLAYER_FIRE', coord: firstEmptyWater(s) })
      if (s.phase === 'aiTurn') s = reduce(s, { type: 'AI_FIRE' })
    }
    expect(s.winner).toBe('ai')
    expect(s.commander?.mood).toBe('gloating')
  })

  it('tracks streaks and sunk-ship lines', () => {
    const { reduce, state } = setup()
    const destroyer = state.aiBoard.ships.find((s) => s.id === 'destroyer')!
    const [a, b] = shipCells(destroyer)
    let s = reduce(state, { type: 'PLAYER_FIRE', coord: a })
    expect(s.playerStreak).toBe(1)
    s = reduce(s, { type: 'AI_FIRE' })
    s = reduce(s, { type: 'PLAYER_FIRE', coord: b })
    expect(s.playerStreak).toBe(2)
    expect(s.lastPlayerShot?.kind).toBe('sunk')
    expect(s.commander?.text).toBeTruthy()
  })
})

describe('gameReducer misc', () => {
  it('RESTART resets boards and stats but keeps settings', () => {
    const { reduce, state } = setup()
    let s = reduce(state, { type: 'TOGGLE_SOUND' })
    s = reduce(s, { type: 'PLAYER_FIRE', coord: firstEmptyWater(s) })
    s = reduce(s, { type: 'RESTART' })
    expect(s.phase).toBe('placement')
    expect(s.playerShots).toBe(0)
    expect(s.soundEnabled).toBe(false)
    expect(s.aiBoard.shots.every((c) => c === 'empty')).toBe(true)
  })

  it('placement actions move and rotate the player fleet', () => {
    const rng = seededRng(2)
    const reduce = createGameReducer(rng)
    let s = reduce(createInitialState(rng), { type: 'START_SETUP' })
    const before = s.playerBoard.ships
    s = reduce(s, { type: 'SHUFFLE' })
    expect(s.playerBoard.ships).not.toEqual(before)
    const destroyer = s.playerBoard.ships.find((x) => x.id === 'destroyer')!
    const moved = reduce(s, { type: 'MOVE_SHIP', shipId: 'destroyer', bow: destroyer.bow, orientation: destroyer.orientation })
    expect(moved.playerBoard.ships).toEqual(s.playerBoard.ships)
  })

  it('TOGGLE_COMMANDER clears the current line', () => {
    const { reduce, state } = setup()
    const s = reduce(state, { type: 'TOGGLE_COMMANDER' })
    expect(s.commanderMuted).toBe(true)
    expect(s.commander).toBeNull()
  })
})
