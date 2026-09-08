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

  // Only hits that touch another hit form a line; isolated hits (possibly a
  // different ship in the same row/column) are probed via their neighbours.
  const lineCandidates: Coord[] = []
  for (const h of hits) {
    const rowMate = hits.some((o) => o.row === h.row && Math.abs(o.col - h.col) === 1)
    const colMate = hits.some((o) => o.col === h.col && Math.abs(o.row - h.row) === 1)
    if (rowMate) lineCandidates.push({ row: h.row, col: h.col - 1 }, { row: h.row, col: h.col + 1 })
    if (colMate) lineCandidates.push({ row: h.row - 1, col: h.col }, { row: h.row + 1, col: h.col })
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
