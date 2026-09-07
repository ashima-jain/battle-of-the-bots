export const BOARD_SIZE = 10

export interface Coord {
  row: number
  col: number
}

export type Orientation = 'horizontal' | 'vertical'

export type ShipKind = 'carrier' | 'battleship' | 'cruiser' | 'submarine' | 'destroyer'

export interface ShipSpec {
  kind: ShipKind
  name: string
  length: number
}

export const FLEET: readonly ShipSpec[] = [
  { kind: 'carrier', name: 'Carrier', length: 5 },
  { kind: 'battleship', name: 'Battleship', length: 4 },
  { kind: 'cruiser', name: 'Cruiser', length: 3 },
  { kind: 'submarine', name: 'Submarine', length: 3 },
  { kind: 'destroyer', name: 'Destroyer', length: 2 },
]

export interface Ship {
  id: string
  kind: ShipKind
  name: string
  length: number
  bow: Coord
  orientation: Orientation
  hits: number
}

export type CellState = 'empty' | 'miss' | 'hit'

export interface Board {
  ships: Ship[]
  /** Flat BOARD_SIZE*BOARD_SIZE array of shot states, indexed by row*BOARD_SIZE+col. */
  shots: CellState[]
}

export type ShotResult =
  | { kind: 'miss'; coord: Coord }
  | { kind: 'hit'; coord: Coord; shipId: string }
  | { kind: 'sunk'; coord: Coord; ship: Ship; fleetSunk: boolean }

export type FireError = 'out-of-bounds' | 'already-fired'

export type FireOutcome = { ok: true; board: Board; result: ShotResult } | { ok: false; error: FireError }
