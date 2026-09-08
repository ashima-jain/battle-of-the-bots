import { motion, useAnimate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import {
  BOARD_SIZE,
  coordKey,
  coordLabel,
  isSunk,
  shipCells,
  shotAt,
  type Board,
  type Coord,
  type Ship,
} from '../../engine'
import { ShipSilhouette } from './ShipSilhouette'

export interface GridProps {
  board: Board
  /** Own board reveals ships; enemy board hides them until sunk. */
  variant: 'own' | 'enemy'
  title?: string
  subtitle?: string
  disabled?: boolean
  onCellClick?: (coord: Coord) => void
  lastShot?: Coord | null
  /** Cell the player has queued to fire at once their turn comes back. */
  queued?: Coord | null
  /** Placement mode extras. */
  selectedShipId?: string | null
  onShipPointerDown?: (ship: Ship, coord: Coord, e: React.PointerEvent) => void
  previewCells?: { cells: Coord[]; valid: boolean } | null
  /** While a ship is being dragged, hulls must not intercept pointer hit-testing. */
  dragging?: boolean
  /** Wobble a ship whose move/rotate was rejected; bump `seq` to replay. */
  shakeShip?: { shipId: string; seq: number } | null
  /** Small read-only rendering (mobile mini-map). */
  compact?: boolean
  /** Cell size when not compact: the focal board is `lg`, secondary boards `md`. */
  size?: 'lg' | 'md'
  ariaLabel: string
  className?: string
}

const COLS = Array.from({ length: BOARD_SIZE }, (_, i) => i)

function cellButton(grid: ParentNode, coord: Coord): HTMLButtonElement | null {
  return grid.querySelector<HTMLButtonElement>(`[data-coord="${coordKey(coord)}"]`)
}

/** Firing disables the cell, which drops keyboard focus to <body>; hand it to the nearest live cell instead. */
function focusNearestLiveCell(grid: ParentNode, { row, col }: Coord) {
  const ring = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((d) => [
    { row, col: col + d },
    { row, col: col - d },
    { row: row + d, col },
    { row: row - d, col },
  ])
  for (const c of ring) {
    const el = cellButton(grid, c)
    if (el && !el.disabled) {
      el.focus()
      return
    }
  }
}

const ARROWS: Record<string, Coord> = {
  ArrowUp: { row: -1, col: 0 },
  ArrowDown: { row: 1, col: 0 },
  ArrowLeft: { row: 0, col: -1 },
  ArrowRight: { row: 0, col: 1 },
}

function moveFocusByArrow(e: React.KeyboardEvent<HTMLButtonElement>, from: Coord) {
  const delta = ARROWS[e.key]
  if (!delta) return
  const grid = e.currentTarget.closest('[role="grid"]')
  if (!grid) return
  e.preventDefault()
  let next = { row: from.row + delta.row, col: from.col + delta.col }
  while (next.row >= 0 && next.col >= 0 && next.row < BOARD_SIZE && next.col < BOARD_SIZE) {
    const el = cellButton(grid, next)
    if (el && !el.disabled) {
      el.focus()
      return
    }
    next = { row: next.row + delta.row, col: next.col + delta.col }
  }
}

export function Grid({
  board,
  variant,
  title,
  subtitle,
  disabled,
  onCellClick,
  lastShot,
  queued,
  selectedShipId,
  onShipPointerDown,
  previewCells,
  dragging,
  shakeShip,
  compact,
  size = 'lg',
  ariaLabel,
  className = '',
}: GridProps) {
  const shipByCell = new Map<string, Ship>()
  for (const ship of board.ships) for (const c of shipCells(ship)) shipByCell.set(coordKey(c), ship)
  const preview = new Set(previewCells?.cells.map(coordKey) ?? [])
  const cellSize = compact
    ? '[--cell:clamp(0.9rem,4vw,1.2rem)]'
    : size === 'lg'
      ? '[--cell:clamp(1.35rem,6.8vw,3rem)]'
      : '[--cell:clamp(1.35rem,6.8vw,2.25rem)]'
  const labelCol = compact ? '0.8rem' : '1.2rem'

  const gridRef = useRef<HTMLDivElement>(null)
  const keyboardFocus = useRef<Coord | null>(null)
  const lastPointerAt = useRef(0)
  const onCellFocus = (coord: Coord) => {
    keyboardFocus.current = performance.now() - lastPointerAt.current > 300 ? coord : null
  }
  useEffect(() => {
    // Framer Motion synthesises untrusted pointer events for keyboard presses; only real pointers count.
    const mark = (e: PointerEvent) => {
      if (!e.isTrusted) return
      lastPointerAt.current = performance.now()
      keyboardFocus.current = null
    }
    document.addEventListener('pointerdown', mark)
    return () => document.removeEventListener('pointerdown', mark)
  }, [])
  useEffect(() => {
    const last = keyboardFocus.current
    if (!last || !gridRef.current) return
    const active = document.activeElement
    const lost = active === document.body || (active instanceof HTMLButtonElement && active.disabled)
    if (lost) focusNearestLiveCell(gridRef.current, last)
  })

  return (
    <section className={`flex flex-col items-center gap-2 ${className}`}>
      {title && (
        <header className="text-center">
          <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </header>
      )}
      <div
        ref={gridRef}
        role="grid"
        aria-label={ariaLabel}
        className={`relative grid select-none touch-none gap-[3px] rounded-2xl bg-ocean-900/80 shadow-[0_0_0_1px_#1b3a7a,0_20px_60px_-20px_#2f6fd6aa] ${
          compact ? 'p-1' : 'p-2'
        } ${cellSize}`}
        style={{
          gridTemplateColumns: `${labelCol} repeat(${BOARD_SIZE}, var(--cell))`,
          gridAutoRows: 'var(--cell)',
        }}
      >
        {COLS.map((c) => (
          <div
            key={c}
            style={{ gridColumn: c + 2, gridRow: 1 }}
            className={`flex items-end justify-center text-slate-500 ${compact ? 'text-[7px]' : 'text-[10px]'}`}
          >
            {c + 1}
          </div>
        ))}
        {COLS.map((row) => (
          <RowCells
            key={row}
            row={row}
            board={board}
            variant={variant}
            disabled={disabled}
            compact={compact}
            onCellClick={onCellClick}
            lastShot={lastShot}
            queued={queued}
            shipByCell={shipByCell}
            preview={preview}
            previewValid={previewCells?.valid ?? true}
            onCellFocus={onCellFocus}
          />
        ))}
        {previewCells &&
          previewCells.cells.filter((c) => c.row >= 0 && c.col >= 0 && c.row < BOARD_SIZE && c.col < BOARD_SIZE).map((c) => (
            <span
              key={`pv-${coordKey(c)}`}
              aria-hidden
              style={{ gridColumn: c.col + 2, gridRow: c.row + 2 }}
              className={`pointer-events-none z-20 rounded-md ring-2 ${
                previewCells.valid ? 'bg-bot-400/60 ring-bot-400' : 'bg-hit-500/70 ring-hit-500'
              }`}
            />
          ))}
        {board.ships.map((ship) => {
          const sunk = isSunk(ship)
          if (variant === 'enemy' && !sunk) return null
          return (
            <Hull
              key={ship.id}
              ship={ship}
              board={board}
              sunk={sunk}
              selected={selectedShipId === ship.id}
              compact={compact}
              inert={dragging || !onShipPointerDown}
              onPointerDown={onShipPointerDown}
              revealAnimated={variant === 'enemy'}
              shakeSeq={shakeShip?.shipId === ship.id ? shakeShip.seq : 0}
            />
          )
        })}
      </div>
    </section>
  )
}

interface HullProps {
  ship: Ship
  board: Board
  sunk: boolean
  selected: boolean
  compact?: boolean
  inert: boolean
  onPointerDown?: (ship: Ship, coord: Coord, e: React.PointerEvent) => void
  revealAnimated: boolean
  shakeSeq: number
}

/** One continuous ship piece spanning its cells, overlaid on the grid. */
function Hull({ ship, board, sunk, selected, compact, inert, onPointerDown, revealAnimated, shakeSeq }: HullProps) {
  const horizontal = ship.orientation === 'horizontal'
  const cells = shipCells(ship)
  const showLabel = !compact
  const [scope, animate] = useAnimate()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!shakeSeq || !scope.current || reduceMotion) return
    animate(scope.current, { x: [0, -5, 5, -4, 4, 0] }, { duration: 0.35 })
  }, [shakeSeq, animate, scope, reduceMotion])

  const handleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onPointerDown) return
    const rect = e.currentTarget.getBoundingClientRect()
    const frac = horizontal ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height
    const idx = Math.min(ship.length - 1, Math.max(0, Math.floor(frac * ship.length)))
    onPointerDown(ship, cells[idx], e)
  }

  return (
    <motion.div
      role="img"
      aria-label={`${ship.name}${sunk ? ' (sunk)' : ''}`}
      title={ship.name}
      initial={revealAnimated ? { opacity: 0, scale: 0.85 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      ref={scope}
      onPointerDown={inert ? undefined : handleDown}
      style={{
        gridColumn: `${ship.bow.col + 2} / span ${horizontal ? ship.length : 1}`,
        gridRow: `${ship.bow.row + 2} / span ${horizontal ? 1 : ship.length}`,
      }}
      className={`relative z-10 flex ${horizontal ? 'flex-row' : 'flex-col'} items-stretch overflow-hidden ${
        compact ? 'rounded' : 'rounded-lg'
      } ${
        sunk
          ? 'bg-gradient-to-br from-sunk-500 to-sunk-500/70 shadow-[inset_0_0_0_1px_#0006]'
          : selected
            ? 'bg-gradient-to-br from-bot-400 to-bot-500 ring-2 ring-white'
            : 'bg-gradient-to-br from-slate-200 to-slate-400 shadow-[inset_0_1px_0_#fff8,inset_0_-2px_0_#0004]'
      } ${inert ? 'pointer-events-none' : 'cursor-grab touch-none active:cursor-grabbing'}`}
    >
      <ShipSilhouette
        kind={ship.kind}
        length={ship.length}
        orientation={ship.orientation}
        className={`pointer-events-none absolute ${
          showLabel ? (horizontal ? 'inset-x-0 top-0 h-[68%] w-full' : 'inset-y-0 left-0 h-full w-[68%]') : 'inset-0 h-full w-full'
        } ${sunk ? 'text-ocean-950/80' : 'text-ocean-900'}`}
      />
      {showLabel && (
        <span
          className={`pointer-events-none absolute flex items-center justify-center font-bold uppercase leading-none tracking-[0.12em] ${
            sunk ? 'bg-ocean-950/50 text-white/80' : 'bg-ocean-950/75 text-white'
          } ${horizontal ? 'inset-x-0 bottom-0 h-[32%] text-[7px]' : 'inset-y-0 right-0 w-[32%] text-[7px]'}`}
        >
          <span className={horizontal ? '' : 'rotate-90 whitespace-nowrap'}>{ship.name}</span>
        </span>
      )}
      {cells.map((c, i) => {
        const hit = shotAt(board, c) === 'hit'
        const last = i === cells.length - 1
        return (
          <span
            key={i}
            className={`relative flex flex-1 items-center justify-center ${
              last ? '' : horizontal ? 'border-r border-dashed border-ocean-900/40' : 'border-b border-dashed border-ocean-900/40'
            }`}
          >
            {hit && (
              <motion.span
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18, delay: sunk ? i * 0.06 : 0 }}
                className={`absolute flex items-center justify-center rounded-sm font-black ${
                  !showLabel ? 'inset-[12%]' : horizontal ? 'bottom-[36%] left-[14%] right-[14%] top-[6%]' : 'bottom-[14%] left-[6%] right-[36%] top-[14%]'
                } ${
                  sunk ? 'bg-ocean-950/40 text-white' : 'bg-hit-500 text-white shadow-[0_0_10px_#ff4d5f]'
                } ${compact ? 'text-[8px]' : 'text-xs'}`}
              >
                ✕
              </motion.span>
            )}
          </span>
        )
      })}
    </motion.div>
  )
}

interface RowProps {
  row: number
  board: Board
  variant: 'own' | 'enemy'
  disabled?: boolean
  compact?: boolean
  onCellClick?: (coord: Coord) => void
  lastShot?: Coord | null
  queued?: Coord | null
  shipByCell: Map<string, Ship>
  preview: Set<string>
  previewValid: boolean
  onCellFocus?: (coord: Coord) => void
}

function RowCells({
  row,
  board,
  variant,
  disabled,
  compact,
  onCellClick,
  lastShot,
  queued,
  shipByCell,
  preview,
  previewValid,
  onCellFocus,
}: RowProps) {
  const reduceMotion = useReducedMotion()
  return (
    <>
      <div
        style={{ gridColumn: 1, gridRow: row + 2 }}
        className={`flex items-center justify-center text-slate-500 ${compact ? 'text-[7px]' : 'text-[10px]'}`}
      >
        {String.fromCharCode(65 + row)}
      </div>
      {COLS.map((col) => {
        const coord = { row, col }
        const key = coordKey(coord)
        const shot = shotAt(board, coord)
        const ship = shipByCell.get(key)
        const sunk = ship ? isSunk(ship) : false
        const underHull = ship && (variant === 'own' || sunk)
        const isLast = lastShot ? lastShot.row === row && lastShot.col === col : false
        const isQueued = queued ? queued.row === row && queued.col === col : false
        const clickable = !disabled && !!onCellClick && shot === 'empty'
        const inPreview = preview.has(key)

        let bg = 'bg-ocean-800/70'
        if (clickable) bg += ' hover:bg-ocean-700/80'
        if (shot === 'miss') bg = 'bg-ocean-700/60'
        if (shot === 'hit' && !underHull) bg = 'bg-hit-500'
        if (inPreview) bg = previewValid ? 'bg-bot-400/40' : 'bg-hit-500/40'

        const label = `${coordLabel(coord)}: ${
          shot === 'empty' ? (underHull ? `your ${ship!.name}` : 'unexplored') : shot === 'miss' ? 'miss' : sunk ? `sunk ${ship!.name}` : 'hit'
        }`

        return (
          <motion.button
            key={col}
            type="button"
            role="gridcell"
            aria-label={label}
            data-coord={key}
            style={{ gridColumn: col + 2, gridRow: row + 2 }}
            disabled={!clickable}
            onClick={clickable ? () => onCellClick?.(coord) : undefined}
            onKeyDown={clickable ? (e) => moveFocusByArrow(e, coord) : undefined}
            onFocus={() => onCellFocus?.(coord)}
            whileTap={clickable ? { scale: 0.85 } : undefined}
            className={`relative ${compact ? 'rounded-sm' : 'rounded-md'} ${bg} ${
              clickable ? 'cursor-crosshair' : ''
            } transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-bot-400 disabled:cursor-default`}
          >
            {shot === 'miss' && (
              <span className={`absolute inset-0 m-auto rounded-full bg-ocean-300/70 ${compact ? 'h-1 w-1' : 'h-1.5 w-1.5'}`} />
            )}
            {shot === 'hit' && !underHull && (
              <motion.span
                key={`${key}-hit`}
                initial={isLast ? { scale: 0, rotate: -90 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className={`absolute inset-0 flex items-center justify-center font-black text-white drop-shadow ${
                  compact ? 'text-[8px]' : 'text-sm'
                }`}
              >
                ✕
              </motion.span>
            )}
            {isQueued && shot === 'empty' && (
              <motion.span
                key={`${key}-queued`}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                transition={{ scale: { repeat: Infinity, duration: 1 } }}
                className="pointer-events-none absolute inset-[15%] rounded-full border-2 border-dashed border-bot-400"
              />
            )}
            {isLast && shot !== 'empty' && !reduceMotion && (
              <>
                <motion.span
                  key={`${key}-ring`}
                  initial={{ scale: 0.4, opacity: 0.9 }}
                  animate={{ scale: shot === 'hit' ? 3.2 : 2.2, opacity: 0 }}
                  transition={{ duration: shot === 'hit' ? 0.6 : 0.9, ease: 'easeOut' }}
                  className={`pointer-events-none absolute inset-0 z-20 rounded-full border-2 ${
                    shot === 'hit' ? 'border-hit-500' : 'border-ocean-300'
                  }`}
                />
                <motion.span
                  key={`${key}-ring2`}
                  initial={{ scale: 0.4, opacity: 0.6 }}
                  animate={{ scale: shot === 'hit' ? 2 : 1.6, opacity: 0 }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                  className={`pointer-events-none absolute inset-0 z-20 rounded-full border ${
                    shot === 'hit' ? 'border-sunk-500' : 'border-ocean-300/60'
                  }`}
                />
                {shot === 'hit' && (
                  <motion.span
                    key={`${key}-flash`}
                    initial={{ opacity: 0.9 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="pointer-events-none absolute inset-0 z-20 rounded-md bg-white"
                  />
                )}
              </>
            )}
          </motion.button>
        )
      })}
    </>
  )
}
