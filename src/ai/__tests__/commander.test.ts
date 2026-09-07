import { describe, expect, it } from 'vitest'
import {
  coordKey,
  createBoard,
  createShip,
  fire,
  isFleetSunk,
  randomFleet,
  seededRng,
  FLEET,
  type Board,
  type Coord,
} from '../../engine'
import { chooseShot, createAiMemory, observeShot, targetCandidates, TOTAL_CELLS } from '../commander'

function playOut(board: Board, seed: number): { shots: number; fired: Coord[] } {
  let memory = createAiMemory()
  const rng = seededRng(seed)
  const fired: Coord[] = []
  let shots = 0
  while (!isFleetSunk(board)) {
    const coord = chooseShot(memory, rng)
    const out = fire(board, coord)
    if (!out.ok) throw new Error(`AI fired illegally at ${coordKey(coord)}: ${out.error}`)
    fired.push(coord)
    board = out.board
    memory = observeShot(memory, out.result)
    shots++
    if (shots > TOTAL_CELLS) throw new Error('AI did not finish')
  }
  return { shots, fired }
}

describe('chooseShot', () => {
  it('never fires at the same cell twice and always sinks the fleet', () => {
    for (let seed = 0; seed < 50; seed++) {
      const board = createBoard(randomFleet(seededRng(seed + 1000)))
      const { fired } = playOut(board, seed)
      expect(new Set(fired.map(coordKey)).size).toBe(fired.length)
    }
  })

  it('is noticeably better than random (average well under 100 shots)', () => {
    let total = 0
    const games = 40
    for (let seed = 0; seed < games; seed++) {
      total += playOut(createBoard(randomFleet(seededRng(seed + 500))), seed).shots
    }
    expect(total / games).toBeLessThan(70)
  })

  it('finishes a ship once it has been hit', () => {
    const destroyer = createShip(FLEET[4], { row: 4, col: 4 }, 'horizontal')
    let board = createBoard([destroyer])
    let memory = createAiMemory()
    const first = fire(board, { row: 4, col: 4 })
    if (!first.ok) throw new Error()
    board = first.board
    memory = observeShot(memory, first.result)

    const rng = seededRng(7)
    let shots = 0
    while (!isFleetSunk(board)) {
      const coord = chooseShot(memory, rng)
      // Every follow-up must be adjacent to a known hit.
      expect(Math.abs(coord.row - 4) + Math.abs(coord.col - 4) <= 2).toBe(true)
      const out = fire(board, coord)
      if (!out.ok) throw new Error()
      board = out.board
      memory = observeShot(memory, out.result)
      shots++
    }
    expect(shots).toBeLessThanOrEqual(4)
  })

  it('extends along a line after two collinear hits', () => {
    let memory = createAiMemory()
    memory = observeShot(memory, { kind: 'hit', coord: { row: 2, col: 3 }, shipId: 'x' })
    memory = observeShot(memory, { kind: 'hit', coord: { row: 2, col: 4 }, shipId: 'x' })
    expect(targetCandidates(memory)).toEqual([
      { row: 2, col: 2 },
      { row: 2, col: 5 },
    ])
  })

  it('handles two adjacent ships (hits that are not one ship)', () => {
    const a = createShip(FLEET[4], { row: 0, col: 0 }, 'horizontal') // (0,0)(0,1)
    const b = createShip(FLEET[2], { row: 1, col: 0 }, 'horizontal') // (1,0)(1,1)(1,2)
    const board = createBoard([a, b])
    expect(() => playOut(board, 3)).not.toThrow()
  })

  it('clears open hits when a ship is sunk', () => {
    const ship = createShip(FLEET[4], { row: 0, col: 0 }, 'horizontal')
    let memory = createAiMemory()
    memory = observeShot(memory, { kind: 'hit', coord: { row: 0, col: 0 }, shipId: ship.id })
    memory = observeShot(memory, { kind: 'sunk', coord: { row: 0, col: 1 }, ship: { ...ship, hits: 2 }, fleetSunk: false })
    expect(memory.openHits).toEqual([])
    expect(targetCandidates(memory)).toEqual([])
  })

  it('throws once every cell has been fired at', () => {
    let memory = createAiMemory()
    for (let row = 0; row < 10; row++)
      for (let col = 0; col < 10; col++)
        memory = observeShot(memory, { kind: 'miss', coord: { row, col } })
    expect(() => chooseShot(memory, seededRng(1))).toThrow()
  })
})
