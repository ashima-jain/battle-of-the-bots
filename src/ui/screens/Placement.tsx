import { useCallback, useEffect, useRef, useState } from 'react'
import { canPlace, moveShip, rotateShip, shipCells, type Board, type Coord, type Orientation, type Ship } from '../../engine'
import type { GameAction } from '../../state/gameReducer'
import { Button } from '../components/Button'
import { Grid } from '../components/Grid'
import { ShipSilhouette } from '../components/ShipSilhouette'

interface Preview {
  bow: Coord
  cells: Coord[]
  valid: boolean
}

interface Drag {
  ship: Ship
  /** Index of the grabbed cell along the ship, so it doesn't jump under the finger. */
  grabOffset: number
  startedAt: Coord
  moved: boolean
  preview: Preview | null
}

function coordFromPoint(x: number, y: number): Coord | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-coord]')
  if (!el?.dataset.coord) return null
  const [row, col] = el.dataset.coord.split(',').map(Number)
  return { row, col }
}

export function Placement({
  board,
  dispatch,
  opponentName = 'Commander BOLT',
}: {
  board: Board
  dispatch: React.Dispatch<GameAction>
  opponentName?: string
}) {
  const dragRef = useRef<Drag | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [blocked, setBlocked] = useState<{ shipId: string; reason: string; seq: number } | null>(null)

  useEffect(() => {
    if (!blocked) return
    const id = window.setTimeout(() => setBlocked(null), 1600)
    return () => window.clearTimeout(id)
  }, [blocked])

  const rotate = useCallback(
    (shipId: string) => {
      setSelected(shipId)
      if (rotateShip(board.ships, shipId)) dispatch({ type: 'ROTATE_SHIP', shipId })
      else setBlocked((b) => ({ shipId, reason: 'No room to rotate here — move the ship first.', seq: (b?.seq ?? 0) + 1 }))
    },
    [board.ships, dispatch],
  )

  const nudge = useCallback(
    (shipId: string, dRow: number, dCol: number) => {
      const ship = board.ships.find((s) => s.id === shipId)
      if (!ship) return
      const bow = { row: ship.bow.row + dRow, col: ship.bow.col + dCol }
      if (moveShip(board.ships, shipId, bow, ship.orientation)) dispatch({ type: 'MOVE_SHIP', shipId, bow, orientation: ship.orientation })
      else setBlocked((b) => ({ shipId, reason: 'Blocked — ships can’t overlap or leave the board.', seq: (b?.seq ?? 0) + 1 }))
    },
    [board.ships, dispatch],
  )

  const previewFor = useCallback(
    (ship: Ship, grabOffset: number, over: Coord, orientation: Orientation) => {
      const bow: Coord =
        orientation === 'horizontal' ? { row: over.row, col: over.col - grabOffset } : { row: over.row - grabOffset, col: over.col }
      const footprint = { bow, length: ship.length, orientation }
      const others = board.ships.filter((s) => s.id !== ship.id)
      return { bow, cells: shipCells(footprint), valid: canPlace(footprint, others) }
    },
    [board.ships],
  )

  const onShipPointerDown = useCallback((ship: Ship, coord: Coord, e: React.PointerEvent) => {
    e.preventDefault()
    const cells = shipCells(ship)
    const grabOffset = cells.findIndex((c) => c.row === coord.row && c.col === coord.col)
    dragRef.current = { ship, grabOffset, startedAt: coord, moved: false, preview: null }
    setDraggingId(ship.id)
    setSelected(ship.id)
  }, [])

  useEffect(() => {
    if (!draggingId) return
    const onMove = (e: PointerEvent) => {
      const current = dragRef.current
      if (!current) return
      const over = coordFromPoint(e.clientX, e.clientY)
      if (!over) {
        dragRef.current = { ...current, moved: true, preview: null }
        setPreview(null)
        return
      }
      const moved = current.moved || over.row !== current.startedAt.row || over.col !== current.startedAt.col
      const next = previewFor(current.ship, current.grabOffset, over, current.ship.orientation)
      dragRef.current = { ...current, moved, preview: next }
      setPreview(moved ? next : null)
    }
    const onUp = () => {
      const current = dragRef.current
      if (!current) return
      if (!current.moved) {
        rotate(current.ship.id)
      } else if (current.preview?.valid) {
        dispatch({ type: 'MOVE_SHIP', shipId: current.ship.id, bow: current.preview.bow, orientation: current.ship.orientation })
      }
      dragRef.current = null
      setDraggingId(null)
      setPreview(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [draggingId, dispatch, previewFor, rotate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected) return
      if (e.key === 'r' || e.key === 'R') rotate(selected)
      else if (e.key === 'ArrowUp') nudge(selected, -1, 0)
      else if (e.key === 'ArrowDown') nudge(selected, 1, 0)
      else if (e.key === 'ArrowLeft') nudge(selected, 0, -1)
      else if (e.key === 'ArrowRight') nudge(selected, 0, 1)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, rotate, nudge])

  const displayBoard: Board =
    preview && draggingId ? { ...board, ships: board.ships.filter((s) => s.id !== draggingId) } : board

  return (
    <main className="mx-auto flex min-h-full max-w-5xl flex-col items-center gap-6 px-4 py-8">
      <header className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-bot-400">Step 1 of 2</p>
        <h1 className="mt-1 text-3xl font-black">Position your fleet</h1>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          We’ve placed your 5 ships randomly. Happy with it? Hit <b className="text-slate-200">Start battle</b>. Or{' '}
          <b className="text-slate-200">drag</b> a ship to move it and <b className="text-slate-200">tap</b> it to rotate.
        </p>
        <p role="status" aria-live="polite" className="mt-2 h-5 text-sm font-medium text-hit-500">
          {blocked?.reason}
        </p>
      </header>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <Grid
          board={displayBoard}
          variant="own"
          title="Your waters"
          subtitle={`${opponentName} can’t see this`}
          ariaLabel="Your board. Drag ships to move, tap to rotate."
          selectedShipId={selected}
          onShipPointerDown={onShipPointerDown}
          previewCells={preview}
          dragging={!!draggingId}
          shakeShip={blocked ? { shipId: blocked.shipId, seq: blocked.seq } : null}
        />
        <aside className="flex w-full max-w-xs flex-col gap-3 rounded-2xl bg-ocean-900/60 p-4 text-sm">
          <h2 className="text-xs uppercase tracking-widest text-slate-400">Your fleet</h2>
          <ul className="flex flex-col gap-1.5">
            {board.ships.map((ship) => (
              <li key={ship.id}>
                <button
                  type="button"
                  onClick={() => rotate(ship.id)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left hover:bg-ocean-800 ${
                    selected === ship.id ? 'bg-ocean-800 ring-1 ring-bot-400' : ''
                  }`}
                  aria-label={`Select and rotate ${ship.name}`}
                >
                  <span>
                    {ship.name} <span className="text-slate-500">· {ship.length} squares</span>
                  </span>
                  <span className="h-4 rounded-sm bg-slate-300 text-ocean-900" style={{ width: `${ship.length}rem` }}>
                    <ShipSilhouette kind={ship.kind} length={ship.length} dividers className="h-full w-full" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">
            Ships can touch but not overlap. Keyboard: pick a ship above, then <kbd>arrow keys</kbd> move it and <kbd>R</kbd> rotates.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            <Button onClick={() => dispatch({ type: 'READY' })} className="py-3 text-base">
              Start battle →
            </Button>
            <Button variant="ghost" onClick={() => dispatch({ type: 'SHUFFLE' })}>
              Shuffle fleet
            </Button>
          </div>
        </aside>
      </div>
    </main>
  )
}
