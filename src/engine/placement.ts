import { inBounds, sameCoord, shipCells } from './board'
import { randomInt, type Rng } from './rng'
import { BOARD_SIZE, FLEET, type Coord, type Orientation, type Ship, type ShipSpec } from './types'

export type PlacementError = 'out-of-bounds' | 'overlap'

export interface Footprint {
  bow: Coord
  length: number
  orientation: Orientation
}

export function validatePlacement(
  footprint: Footprint,
  otherShips: readonly Ship[],
): PlacementError | null {
  const cells = shipCells(footprint)
  if (!cells.every(inBounds)) return 'out-of-bounds'
  for (const other of otherShips) {
    const occupied = shipCells(other)
    if (cells.some((c) => occupied.some((o) => sameCoord(o, c)))) return 'overlap'
  }
  return null
}

export function canPlace(footprint: Footprint, otherShips: readonly Ship[]): boolean {
  return validatePlacement(footprint, otherShips) === null
}

export function createShip(spec: ShipSpec, bow: Coord, orientation: Orientation): Ship {
  return { id: spec.kind, kind: spec.kind, name: spec.name, length: spec.length, bow, orientation, hits: 0 }
}

/** Returns the ship list with `shipId` moved to `bow`/`orientation`, or null if the move is invalid. */
export function moveShip(
  ships: readonly Ship[],
  shipId: string,
  bow: Coord,
  orientation: Orientation,
): Ship[] | null {
  const ship = ships.find((s) => s.id === shipId)
  if (!ship) return null
  const others = ships.filter((s) => s.id !== shipId)
  if (!canPlace({ bow, length: ship.length, orientation }, others)) return null
  return ships.map((s) => (s.id === shipId ? { ...s, bow, orientation } : s))
}

/** Rotates a ship around its bow; if that goes off-board, slides it back on. Returns null if no legal spot exists. */
export function rotateShip(ships: readonly Ship[], shipId: string): Ship[] | null {
  const ship = ships.find((s) => s.id === shipId)
  if (!ship) return null
  const orientation: Orientation = ship.orientation === 'horizontal' ? 'vertical' : 'horizontal'
  const maxStart = BOARD_SIZE - ship.length
  const bow: Coord =
    orientation === 'horizontal'
      ? { row: ship.bow.row, col: Math.min(ship.bow.col, maxStart) }
      : { row: Math.min(ship.bow.row, maxStart), col: ship.bow.col }
  return moveShip(ships, shipId, bow, orientation)
}

export function randomFleet(rng: Rng, specs: readonly ShipSpec[] = FLEET): Ship[] {
  const placed: Ship[] = []
  for (const spec of specs) {
    let ship: Ship | null = null
    for (let attempt = 0; attempt < 1000 && !ship; attempt++) {
      const orientation: Orientation = rng.next() < 0.5 ? 'horizontal' : 'vertical'
      const maxStart = BOARD_SIZE - spec.length
      const bow: Coord =
        orientation === 'horizontal'
          ? { row: randomInt(rng, BOARD_SIZE), col: randomInt(rng, maxStart + 1) }
          : { row: randomInt(rng, maxStart + 1), col: randomInt(rng, BOARD_SIZE) }
      if (canPlace({ bow, length: spec.length, orientation }, placed)) ship = createShip(spec, bow, orientation)
    }
    if (!ship) throw new Error(`Could not place ${spec.name}`)
    placed.push(ship)
  }
  return placed
}

export function isFleetValid(ships: readonly Ship[], specs: readonly ShipSpec[] = FLEET): boolean {
  if (ships.length !== specs.length) return false
  if (!specs.every((spec) => ships.some((s) => s.kind === spec.kind && s.length === spec.length))) return false
  return ships.every((ship, index) => canPlace(ship, ships.filter((_, otherIndex) => otherIndex !== index)))
}
