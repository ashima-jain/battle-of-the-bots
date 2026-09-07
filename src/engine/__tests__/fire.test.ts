import { describe, expect, it } from 'vitest'
import { coordLabel, createBoard, shotAt } from '../board'
import { canFire, fire, isFleetSunk } from '../fire'
import { createShip } from '../placement'
import { FLEET, type Board } from '../types'

const destroyer = createShip(FLEET[4], { row: 0, col: 0 }, 'horizontal')
const cruiser = createShip(FLEET[2], { row: 5, col: 5 }, 'vertical')

function board(): Board {
  return createBoard([destroyer, cruiser])
}

describe('fire', () => {
  it('records a miss on empty water', () => {
    const out = fire(board(), { row: 9, col: 9 })
    expect(out.ok && out.result.kind).toBe('miss')
    if (out.ok) expect(shotAt(out.board, { row: 9, col: 9 })).toBe('miss')
  })

  it('records a hit and increments the ship hit count', () => {
    const out = fire(board(), { row: 0, col: 0 })
    expect(out.ok && out.result).toEqual({ kind: 'hit', coord: { row: 0, col: 0 }, shipId: 'destroyer' })
    if (out.ok) expect(out.board.ships.find((s) => s.id === 'destroyer')?.hits).toBe(1)
  })

  it('does not mutate the input board', () => {
    const b = board()
    fire(b, { row: 0, col: 0 })
    expect(b.ships[0].hits).toBe(0)
    expect(shotAt(b, { row: 0, col: 0 })).toBe('empty')
  })

  it('reports sunk only when all cells are hit', () => {
    const first = fire(board(), { row: 0, col: 0 })
    if (!first.ok) throw new Error('expected ok')
    const second = fire(first.board, { row: 0, col: 1 })
    if (!second.ok) throw new Error('expected ok')
    expect(second.result.kind).toBe('sunk')
    if (second.result.kind === 'sunk') {
      expect(second.result.ship.id).toBe('destroyer')
      expect(second.result.fleetSunk).toBe(false)
    }
  })

  it('flags fleetSunk on the final sinking shot', () => {
    let b = board()
    const shots = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 5, col: 5 },
      { row: 6, col: 5 },
    ]
    for (const c of shots) {
      const out = fire(b, c)
      if (!out.ok) throw new Error('expected ok')
      b = out.board
    }
    expect(isFleetSunk(b)).toBe(false)
    const last = fire(b, { row: 7, col: 5 })
    expect(last.ok && last.result.kind === 'sunk' && last.result.fleetSunk).toBe(true)
    if (last.ok) expect(isFleetSunk(last.board)).toBe(true)
  })

  it('rejects firing at the same cell twice', () => {
    const first = fire(board(), { row: 3, col: 3 })
    if (!first.ok) throw new Error('expected ok')
    const second = fire(first.board, { row: 3, col: 3 })
    expect(second).toEqual({ ok: false, error: 'already-fired' })
    expect(canFire(first.board, { row: 3, col: 3 })).toBe(false)
  })

  it('rejects out-of-bounds shots', () => {
    expect(fire(board(), { row: 10, col: 0 })).toEqual({ ok: false, error: 'out-of-bounds' })
    expect(fire(board(), { row: 0, col: -1 })).toEqual({ ok: false, error: 'out-of-bounds' })
  })
})

describe('isFleetSunk', () => {
  it('is false for an empty board (no ships to sink)', () => {
    expect(isFleetSunk(createBoard())).toBe(false)
  })
})

describe('coordLabel', () => {
  it('formats coordinates like a classic board', () => {
    expect(coordLabel({ row: 0, col: 0 })).toBe('A1')
    expect(coordLabel({ row: 9, col: 9 })).toBe('J10')
  })
})
