import { inBounds, shipAt, shotAt, toIndex } from './board'
import type { Board, Coord, FireOutcome, Ship } from './types'

export function isSunk(ship: Ship): boolean {
  return ship.hits >= ship.length
}

export function isFleetSunk(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every(isSunk)
}

export function canFire(board: Board, coord: Coord): boolean {
  return inBounds(coord) && shotAt(board, coord) === 'empty'
}

/** Pure: returns a new board plus the shot result. Never mutates the input. */
export function fire(board: Board, coord: Coord): FireOutcome {
  if (!inBounds(coord)) return { ok: false, error: 'out-of-bounds' }
  if (shotAt(board, coord) !== 'empty') return { ok: false, error: 'already-fired' }

  const target = shipAt(board, coord)
  const shots = [...board.shots]
  shots[toIndex(coord)] = target ? 'hit' : 'miss'

  if (!target) {
    return { ok: true, board: { ...board, shots }, result: { kind: 'miss', coord } }
  }

  const updated: Ship = { ...target, hits: target.hits + 1 }
  const ships = board.ships.map((s) => (s.id === target.id ? updated : s))
  const next: Board = { ships, shots }

  if (isSunk(updated)) {
    return { ok: true, board: next, result: { kind: 'sunk', coord, ship: updated, fleetSunk: isFleetSunk(next) } }
  }
  return { ok: true, board: next, result: { kind: 'hit', coord, shipId: updated.id } }
}
