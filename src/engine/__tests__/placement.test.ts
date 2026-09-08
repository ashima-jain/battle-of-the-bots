import { describe, expect, it } from 'vitest'
import { shipCells } from '../board'
import {
  canPlace,
  createShip,
  isFleetValid,
  moveShip,
  randomFleet,
  rotateShip,
  validatePlacement,
} from '../placement'
import { seededRng } from '../rng'
import { FLEET, type Ship } from '../types'

const destroyer = FLEET[4]
const carrier = FLEET[0]

describe('validatePlacement', () => {
  it('accepts an in-bounds, non-overlapping ship', () => {
    expect(validatePlacement({ bow: { row: 0, col: 0 }, length: 5, orientation: 'horizontal' }, [])).toBeNull()
  })

  it('rejects ships that run off the right edge', () => {
    expect(validatePlacement({ bow: { row: 0, col: 6 }, length: 5, orientation: 'horizontal' }, [])).toBe(
      'out-of-bounds',
    )
  })

  it('rejects ships that run off the bottom edge', () => {
    expect(validatePlacement({ bow: { row: 8, col: 0 }, length: 3, orientation: 'vertical' }, [])).toBe(
      'out-of-bounds',
    )
  })

  it('rejects negative coordinates', () => {
    expect(validatePlacement({ bow: { row: -1, col: 0 }, length: 2, orientation: 'vertical' }, [])).toBe(
      'out-of-bounds',
    )
  })

  it('rejects overlap with another ship', () => {
    const other = createShip(carrier, { row: 3, col: 0 }, 'horizontal')
    expect(validatePlacement({ bow: { row: 1, col: 2 }, length: 3, orientation: 'vertical' }, [other])).toBe(
      'overlap',
    )
  })

  it('allows ships to touch (no adjacency rule)', () => {
    const other = createShip(carrier, { row: 3, col: 0 }, 'horizontal')
    expect(canPlace({ bow: { row: 4, col: 0 }, length: 2, orientation: 'horizontal' }, [other])).toBe(true)
  })
})

describe('moveShip', () => {
  const ships: Ship[] = [
    createShip(carrier, { row: 0, col: 0 }, 'horizontal'),
    createShip(destroyer, { row: 5, col: 5 }, 'vertical'),
  ]

  it('moves a ship to a legal spot', () => {
    const next = moveShip(ships, 'destroyer', { row: 9, col: 0 }, 'horizontal')
    expect(next?.find((s) => s.id === 'destroyer')?.bow).toEqual({ row: 9, col: 0 })
  })

  it('returns null for an overlapping move and leaves input untouched', () => {
    expect(moveShip(ships, 'destroyer', { row: 0, col: 1 }, 'horizontal')).toBeNull()
    expect(ships[1].bow).toEqual({ row: 5, col: 5 })
  })

  it('returns null for unknown ship', () => {
    expect(moveShip(ships, 'nope', { row: 0, col: 0 }, 'horizontal')).toBeNull()
  })
})

describe('rotateShip', () => {
  it('rotates around the bow when there is room', () => {
    const ships = [createShip(destroyer, { row: 2, col: 2 }, 'horizontal')]
    const next = rotateShip(ships, 'destroyer')!
    expect(next[0].orientation).toBe('vertical')
    expect(shipCells(next[0])).toEqual([
      { row: 2, col: 2 },
      { row: 3, col: 2 },
    ])
  })

  it('slides the ship back on-board when rotating near an edge', () => {
    const ships = [createShip(carrier, { row: 8, col: 0 }, 'horizontal')]
    const next = rotateShip(ships, 'carrier')!
    expect(next[0].orientation).toBe('vertical')
    expect(next[0].bow).toEqual({ row: 5, col: 0 })
  })

  it('returns null when rotation collides with another ship', () => {
    const ships = [
      createShip(destroyer, { row: 0, col: 0 }, 'horizontal'),
      createShip(carrier, { row: 1, col: 0 }, 'horizontal'),
    ]
    expect(rotateShip(ships, 'destroyer')).toBeNull()
  })
})

describe('randomFleet', () => {
  it('always produces a valid standard fleet', () => {
    for (let seed = 0; seed < 200; seed++) {
      const fleet = randomFleet(seededRng(seed))
      expect(fleet).toHaveLength(FLEET.length)
      expect(isFleetValid(fleet)).toBe(true)
    }
  })

  it('is deterministic for a given seed', () => {
    expect(randomFleet(seededRng(42))).toEqual(randomFleet(seededRng(42)))
  })
})

describe('isFleetValid', () => {
  it('rejects an incomplete fleet', () => {
    expect(isFleetValid([createShip(carrier, { row: 0, col: 0 }, 'horizontal')])).toBe(false)
  })
})
