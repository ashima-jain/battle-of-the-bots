import { BOARD_SIZE, type Board, type CellState, type Coord, type Ship } from './types'

export function createBoard(ships: Ship[] = []): Board {
  return { ships, shots: Array<CellState>(BOARD_SIZE * BOARD_SIZE).fill('empty') }
}

export function inBounds({ row, col }: Coord): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE
}

export function toIndex({ row, col }: Coord): number {
  return row * BOARD_SIZE + col
}

export function fromIndex(index: number): Coord {
  return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE }
}

export function coordKey({ row, col }: Coord): string {
  return `${row},${col}`
}

export function sameCoord(a: Coord, b: Coord): boolean {
  return a.row === b.row && a.col === b.col
}

export function shipCells(ship: Pick<Ship, 'bow' | 'length' | 'orientation'>): Coord[] {
  const cells: Coord[] = []
  for (let i = 0; i < ship.length; i++) {
    cells.push(
      ship.orientation === 'horizontal'
        ? { row: ship.bow.row, col: ship.bow.col + i }
        : { row: ship.bow.row + i, col: ship.bow.col },
    )
  }
  return cells
}

export function shipAt(board: Board, coord: Coord): Ship | undefined {
  return board.ships.find((ship) => shipCells(ship).some((c) => sameCoord(c, coord)))
}

export function shotAt(board: Board, coord: Coord): CellState {
  return board.shots[toIndex(coord)]
}

export function allCoords(): Coord[] {
  const coords: Coord[] = []
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) coords.push(fromIndex(i))
  return coords
}

export function neighbors(coord: Coord): Coord[] {
  return [
    { row: coord.row - 1, col: coord.col },
    { row: coord.row + 1, col: coord.col },
    { row: coord.row, col: coord.col - 1 },
    { row: coord.row, col: coord.col + 1 },
  ].filter(inBounds)
}

/** Human-friendly label like "B7". */
export function coordLabel({ row, col }: Coord): string {
  return `${String.fromCharCode(65 + row)}${col + 1}`
}
