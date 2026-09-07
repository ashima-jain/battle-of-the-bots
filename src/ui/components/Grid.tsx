import { motion } from 'framer-motion'
import { BOARD_SIZE, coordKey, coordLabel, isSunk, shipCells, shotAt, type Board, type Coord, type Ship } from '../../engine'

export interface GridProps {
  board: Board
  /** Own board reveals ships; enemy board hides them until sunk. */
  variant: 'own' | 'enemy'
  title: string
  subtitle?: string
  disabled?: boolean
  onCellClick?: (coord: Coord) => void
  lastShot?: Coord | null
  /** Placement mode extras. */
  selectedShipId?: string | null
  onShipPointerDown?: (ship: Ship, coord: Coord, e: React.PointerEvent) => void
  previewCells?: { cells: Coord[]; valid: boolean } | null
  ariaLabel: string
}

const COLS = Array.from({ length: BOARD_SIZE }, (_, i) => i)

export function Grid({
  board,
  variant,
  title,
  subtitle,
  disabled,
  onCellClick,
  lastShot,
  selectedShipId,
  onShipPointerDown,
  previewCells,
  ariaLabel,
}: GridProps) {
  const shipByCell = new Map<string, Ship>()
  for (const ship of board.ships) for (const c of shipCells(ship)) shipByCell.set(coordKey(c), ship)
  const preview = new Set(previewCells?.cells.map(coordKey) ?? [])

  return (
    <section className="flex flex-col items-center gap-2">
      <header className="text-center">
        <h2 className="text-lg font-semibold tracking-wide">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </header>
      <div
        role="grid"
        aria-label={ariaLabel}
        className="grid select-none touch-none gap-[3px] rounded-2xl bg-ocean-900/80 p-2 shadow-[0_0_0_1px_#1b3a7a,0_20px_60px_-20px_#2f6fd6aa]"
        style={{
          gridTemplateColumns: `1.2rem repeat(${BOARD_SIZE}, var(--cell))`,
          gridAutoRows: 'var(--cell)',
          ['--cell' as string]: 'clamp(1.6rem, 7.5vw, 2.6rem)',
        }}
      >
        <div />
        {COLS.map((c) => (
          <div key={c} className="flex items-end justify-center text-[10px] text-slate-500">
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
            onCellClick={onCellClick}
            lastShot={lastShot}
            shipByCell={shipByCell}
            selectedShipId={selectedShipId}
            onShipPointerDown={onShipPointerDown}
            preview={preview}
            previewValid={previewCells?.valid ?? true}
          />
        ))}
      </div>
    </section>
  )
}

interface RowProps {
  row: number
  board: Board
  variant: 'own' | 'enemy'
  disabled?: boolean
  onCellClick?: (coord: Coord) => void
  lastShot?: Coord | null
  shipByCell: Map<string, Ship>
  selectedShipId?: string | null
  onShipPointerDown?: (ship: Ship, coord: Coord, e: React.PointerEvent) => void
  preview: Set<string>
  previewValid: boolean
}

function RowCells({
  row,
  board,
  variant,
  disabled,
  onCellClick,
  lastShot,
  shipByCell,
  selectedShipId,
  onShipPointerDown,
  preview,
  previewValid,
}: RowProps) {
  return (
    <>
      <div className="flex items-center justify-center text-[10px] text-slate-500">{String.fromCharCode(65 + row)}</div>
      {COLS.map((col) => {
        const coord = { row, col }
        const key = coordKey(coord)
        const shot = shotAt(board, coord)
        const ship = shipByCell.get(key)
        const sunk = ship ? isSunk(ship) : false
        const revealShip = ship && (variant === 'own' || sunk)
        const isLast = lastShot ? lastShot.row === row && lastShot.col === col : false
        const clickable = !disabled && !!onCellClick && shot === 'empty'
        const inPreview = preview.has(key)

        let bg = 'bg-ocean-800/70 hover:bg-ocean-700/80'
        if (revealShip) bg = sunk ? 'bg-sunk-500/80' : selectedShipId === ship?.id ? 'bg-bot-400 ring-2 ring-white' : 'bg-slate-300'
        if (shot === 'miss') bg = 'bg-ocean-700/60'
        if (shot === 'hit' && !sunk) bg = 'bg-hit-500'
        if (inPreview) bg = previewValid ? 'bg-bot-400/70' : 'bg-hit-500/70'

        const label = `${coordLabel(coord)}: ${
          shot === 'empty' ? (revealShip ? `your ${ship!.name}` : 'unexplored') : shot === 'miss' ? 'miss' : sunk ? `sunk ${ship!.name}` : 'hit'
        }`

        return (
          <motion.button
            key={col}
            type="button"
            role="gridcell"
            aria-label={label}
            data-coord={key}
            disabled={!clickable && !onShipPointerDown}
            onClick={clickable ? () => onCellClick?.(coord) : undefined}
            onPointerDown={ship && onShipPointerDown ? (e) => onShipPointerDown(ship, coord, e) : undefined}
            whileTap={clickable ? { scale: 0.85 } : undefined}
            className={`relative rounded-md ${bg} ${
              clickable ? 'cursor-crosshair' : onShipPointerDown && ship ? 'cursor-grab active:cursor-grabbing' : ''
            } transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-bot-400 disabled:cursor-default`}
          >
            {shot === 'miss' && <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-ocean-300/70" />}
            {shot === 'hit' && (
              <motion.span
                key={`${key}-hit`}
                initial={isLast ? { scale: 0, rotate: -90 } : false}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                className="absolute inset-0 flex items-center justify-center text-sm font-black text-white drop-shadow"
              >
                ✕
              </motion.span>
            )}
            {isLast && shot !== 'empty' && (
              <motion.span
                key={`${key}-ring`}
                initial={{ scale: 0.4, opacity: 0.9 }}
                animate={{ scale: 2.4, opacity: 0 }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className={`pointer-events-none absolute inset-0 rounded-full border-2 ${
                  shot === 'hit' ? 'border-hit-500' : 'border-ocean-300'
                }`}
              />
            )}
          </motion.button>
        )
      })}
    </>
  )
}
