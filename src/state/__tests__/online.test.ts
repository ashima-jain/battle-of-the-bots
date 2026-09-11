import { describe, expect, it } from 'vitest'
import { randomFleet, seededRng, shipCells, shotAt, type Coord } from '../../engine'
import { createGameReducer, createInitialState, type GameState } from '../gameReducer'
import { mirror, newRoomCode, parseNetMessage, redactForGuest, roomFromUrl, roomLink } from '../online'

function host(seed = 1) {
  const rng = seededRng(seed)
  const reduce = createGameReducer(rng)
  let state = createInitialState(rng)
  state = reduce(state, { type: 'START_ONLINE' })
  return { rng, reduce, state }
}

function shipCell(state: GameState, board: 'playerBoard' | 'aiBoard'): Coord {
  return shipCells(state[board].ships[0])[0]
}

function water(state: GameState, board: 'playerBoard' | 'aiBoard'): Coord {
  const occupied = new Set(state[board].ships.flatMap(shipCells).map((c) => `${c.row},${c.col}`))
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++)
      if (!occupied.has(`${row},${col}`) && shotAt(state[board], { row, col }) === 'empty') return { row, col }
  throw new Error('no water')
}

describe('online mode reducer', () => {
  it('waits for the opponent fleet when the host is ready first', () => {
    const { rng, reduce, state } = host()
    expect(state.mode).toBe('online')
    const waiting = reduce(state, { type: 'READY' })
    expect(waiting.phase).toBe('waiting')
    const started = reduce(waiting, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) })
    expect(started.phase).toBe('playerTurn')
    expect(started.opponentFleetReady).toBe(true)
  })

  it('starts immediately when the opponent fleet arrived during placement', () => {
    const { rng, reduce, state } = host()
    const withFleet = reduce(state, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) })
    expect(withFleet.phase).toBe('placement')
    expect(reduce(withFleet, { type: 'READY' }).phase).toBe('playerTurn')
  })

  it('rejects invalid or duplicate opponent fleets', () => {
    const { rng, reduce, state } = host()
    const fleet = randomFleet(rng)
    expect(reduce(state, { type: 'OPPONENT_FLEET', ships: fleet.slice(1) })).toBe(state)
    const accepted = reduce(state, { type: 'OPPONENT_FLEET', ships: fleet })
    expect(reduce(accepted, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) })).toBe(accepted)
  })

  it('uses the opponent fleet as the enemy board', () => {
    const { rng, reduce, state } = host()
    const fleet = randomFleet(rng)
    const started = reduce(reduce(state, { type: 'OPPONENT_FLEET', ships: fleet }), { type: 'READY' })
    expect(started.aiBoard.ships.map((s) => s.bow)).toEqual(fleet.map((s) => s.bow))
  })

  it('resolves remote shots only on the opponent turn and never fires the AI', () => {
    const { rng, reduce, state } = host()
    let s = reduce(reduce(state, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) }), { type: 'READY' })
    const early = reduce(s, { type: 'OPPONENT_FIRE', coord: { row: 0, col: 0 } })
    expect(early).toBe(s)
    s = reduce(s, { type: 'PLAYER_FIRE', coord: water(s, 'aiBoard') })
    expect(s.phase).toBe('aiTurn')
    expect(reduce(s, { type: 'AI_FIRE' })).toBe(s)
    const target = shipCell(s, 'playerBoard')
    s = reduce(s, { type: 'OPPONENT_FIRE', coord: target })
    expect(s.phase).toBe('playerTurn')
    expect(s.lastAiShot?.kind).toBe('hit')
    expect(s.aiShots).toBe(1)
    expect(reduce(s, { type: 'OPPONENT_FIRE', coord: target })).toBe(s)
  })

  it('never speaks as BOLT online and keeps mode across restarts', () => {
    const { rng, reduce, state } = host()
    let s = reduce(reduce(state, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) }), { type: 'READY' })
    s = reduce(s, { type: 'PLAYER_FIRE', coord: water(s, 'aiBoard') })
    expect(s.commander).toBeNull()
    const again = reduce(s, { type: 'RESTART' })
    expect(again.mode).toBe('online')
    expect(again.round).toBe(s.round + 1)
    expect(again.opponentFleetReady).toBe(false)
    expect(again.phase).toBe('placement')
  })

  it('ignores online-only actions in solo mode', () => {
    const rng = seededRng(3)
    const reduce = createGameReducer(rng)
    const s = reduce(reduce(createInitialState(rng), { type: 'START_SETUP' }), { type: 'READY' })
    expect(reduce(s, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) })).toBe(s)
    expect(reduce(s, { type: 'OPPONENT_FIRE', coord: { row: 0, col: 0 } })).toBe(s)
  })
})

describe('mirror and redaction', () => {
  it('swaps sides so the guest sees itself as the player', () => {
    const { rng, reduce, state } = host()
    let s = reduce(reduce(state, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) }), { type: 'READY' })
    s = reduce(s, { type: 'PLAYER_FIRE', coord: shipCell(s, 'aiBoard') })
    const m = mirror(s, { soundEnabled: false, opponentName: 'Ash' })
    expect(m.phase).toBe('playerTurn')
    expect(m.playerBoard).toBe(s.aiBoard)
    expect(m.aiBoard).toBe(s.playerBoard)
    expect(m.lastAiShot).toBe(s.lastPlayerShot)
    expect(m.aiShots).toBe(1)
    expect(m.playerShots).toBe(0)
    expect(m.opponentName).toBe('Ash')
    expect(m.soundEnabled).toBe(false)
  })

  it('flips the winner', () => {
    const { state } = host()
    expect(mirror({ ...state, winner: 'player' }, { soundEnabled: true, opponentName: 'x' }).winner).toBe('ai')
    expect(mirror({ ...state, winner: 'ai' }, { soundEnabled: true, opponentName: 'x' }).winner).toBe('player')
  })

  it('hides unsunk host ship positions but keeps sunk ones', () => {
    const { rng, reduce, state } = host()
    let s = reduce(reduce(state, { type: 'OPPONENT_FLEET', ships: randomFleet(rng) }), { type: 'READY' })
    const destroyer = s.playerBoard.ships.find((x) => x.length === 2)!
    for (const c of shipCells(destroyer)) {
      s = reduce(s, { type: 'PLAYER_FIRE', coord: water(s, 'aiBoard') })
      s = reduce(s, { type: 'OPPONENT_FIRE', coord: c })
    }
    const r = redactForGuest(s)
    const sunk = r.playerBoard.ships.find((x) => x.id === destroyer.id)!
    expect(sunk.bow).toEqual(destroyer.bow)
    for (const ship of r.playerBoard.ships.filter((x) => x.id !== destroyer.id)) {
      expect(ship.bow).toEqual({ row: -1, col: -1 })
      expect(ship.hits).toBe(0)
    }
    expect(r.playerBoard.shots).toBe(s.playerBoard.shots)
    expect(r.aiBoard).toBe(s.aiBoard)
  })
})

describe('room links', () => {
  it('generates 6-char codes and round-trips them through the URL', () => {
    const code = newRoomCode(seededRng(7).next)
    expect(code).toMatch(/^[A-Z2-9]{6}$/)
    const link = roomLink('https://example.test', code)
    expect(roomFromUrl(new URL(link).search)).toBe(code)
  })

  it('rejects malformed room codes', () => {
    expect(roomFromUrl('?room=abc')).toBeNull()
    expect(roomFromUrl('?room=ABCDE0')).toBeNull()
    expect(roomFromUrl('')).toBeNull()
  })
})

describe('parseNetMessage', () => {
  it('rejects junk and unknown shapes', () => {
    expect(parseNetMessage(null)).toBeNull()
    expect(parseNetMessage('fire')).toBeNull()
    expect(parseNetMessage({ type: 'ping' })).toBeNull()
    expect(parseNetMessage({ type: 'fire', coord: { row: 10, col: 0 } })).toBeNull()
    expect(parseNetMessage({ type: 'fire', coord: { row: 1.5, col: 0 } })).toBeNull()
    expect(parseNetMessage({ type: 'fleet', ships: [{ kind: 'carrier' }] })).toBeNull()
    expect(parseNetMessage({ type: 'hello', name: 3 })).toBeNull()
  })

  it('rebuilds ships from kind/bow/orientation so forged hits, lengths and ids are discarded', () => {
    const forged = randomFleet(seededRng(3)).map((s) => ({ ...s, hits: s.length, length: 1, id: 'x', name: 'Boat' }))
    const msg = parseNetMessage({ type: 'fleet', ships: forged })
    expect(msg?.type).toBe('fleet')
    if (msg?.type !== 'fleet') return
    for (const [i, ship] of msg.ships.entries()) {
      expect(ship.hits).toBe(0)
      expect(ship.id).toBe(forged[i].kind)
      expect(ship.length).toBe(randomFleet(seededRng(3))[i].length)
    }
  })

  it('reducer zeroes hits on an incoming fleet regardless', () => {
    const { reduce, state } = host()
    const ships = randomFleet(seededRng(5)).map((s) => ({ ...s, hits: s.length }))
    const next = reduce(state, { type: 'OPPONENT_FLEET', ships })
    expect(next.opponentFleetReady).toBe(true)
    expect(next.aiBoard.ships.every((s) => s.hits === 0)).toBe(true)
  })
})
