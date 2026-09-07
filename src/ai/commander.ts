import {
  BOARD_SIZE,
  allCoords,
  coordKey,
  inBounds,
  neighbors,
  pick,
  shipCells,
  type Coord,
  type Rng,
  type ShotResult,
} from '../engine'

/**
 * What the AI knows: only the cells it has fired at and the outcomes, never the
 * player's hidden ship positions. Sunk ships are revealed by the engine result.
 */
export interface AiMemory {
  fired: Set<string>
  /** Hits on ships that have not been sunk yet. */
  openHits: Coord[]
}

export function createAiMemory(): AiMemory {
  return { fired: new Set(), openHits: [] }
}

export function observeShot(memory: AiMemory, result: ShotResult): AiMemory {
  const fired = new Set(memory.fired).add(coordKey(result.coord))
  if (result.kind === 'miss') return { fired, openHits: memory.openHits }
  if (result.kind === 'hit') return { fired, openHits: [...memory.openHits, result.coord] }
  const sunkKeys = new Set(shipCells(result.ship).map(coordKey))
  return { fired, openHits: memory.openHits.filter((c) => !sunkKeys.has(coordKey(c))) }
}

function unfired(memory: AiMemory, coords: Coord[]): Coord[] {
  return coords.filter((c) => inBounds(c) && !memory.fired.has(coordKey(c)))
}

/** Candidate cells when we have open hits: extend lines first, otherwise probe neighbours. */
export function targetCandidates(memory: AiMemory): Coord[] {
  const hits = memory.openHits
  if (hits.length === 0) return []

  const lineCandidates: Coord[] = []
  const rows = new Set(hits.map((h) => h.row))
  const cols = new Set(hits.map((h) => h.col))

  if (hits.length >= 2 && rows.size === 1) {
    const row = hits[0].row
    const sortedCols = hits.map((h) => h.col).sort((a, b) => a - b)
    lineCandidates.push({ row, col: sortedCols[0] - 1 }, { row, col: sortedCols[sortedCols.length - 1] + 1 })
  } else if (hits.length >= 2 && cols.size === 1) {
    const col = hits[0].col
    const sortedRows = hits.map((h) => h.row).sort((a, b) => a - b)
    lineCandidates.push({ row: sortedRows[0] - 1, col }, { row: sortedRows[sortedRows.length - 1] + 1, col })
  } else if (hits.length >= 2) {
    // Hits on multiple ships that aren't collinear: work on each contiguous line separately.
    for (const h of hits) {
      const inRow = hits.filter((o) => o.row === h.row && Math.abs(o.col - h.col) === 1)
      const inCol = hits.filter((o) => o.col === h.col && Math.abs(o.row - h.row) === 1)
      if (inRow.length > 0) lineCandidates.push({ row: h.row, col: h.col - 1 }, { row: h.row, col: h.col + 1 })
      if (inCol.length > 0) lineCandidates.push({ row: h.row - 1, col: h.col }, { row: h.row + 1, col: h.col })
    }
  }

  const line = unfired(memory, lineCandidates)
  if (line.length > 0) return line
  return unfired(memory, hits.flatMap(neighbors))
}

export function huntCandidates(memory: AiMemory): Coord[] {
  const open = unfired(memory, allCoords())
  const parity = open.filter((c) => (c.row + c.col) % 2 === 0)
  return parity.length > 0 ? parity : open
}

/** Chooses the next shot. Throws only if the board is completely fired upon (game should be over). */
export function chooseShot(memory: AiMemory, rng: Rng): Coord {
  const targets = targetCandidates(memory)
  if (targets.length > 0) return pick(rng, targets)
  const hunt = huntCandidates(memory)
  if (hunt.length === 0) throw new Error('No cells left to fire at')
  return pick(rng, hunt)
}

export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE
