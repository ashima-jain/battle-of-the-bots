import { motion } from 'framer-motion'
import { isSunk, type Board } from '../../engine'

/** Ship silhouettes that fill red as they take damage — progress at a glance. */
export function FleetHud({
  board,
  label,
  hideDamageUntilSunk,
  horizontal,
}: {
  board: Board
  label: string
  hideDamageUntilSunk?: boolean
  horizontal?: boolean
}) {
  const remaining = board.ships.filter((s) => !isSunk(s)).length
  return (
    <div className="rounded-xl bg-ocean-900/60 p-3">
      <p className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-widest text-slate-400">
        <span>{label}</span>
        <motion.span key={remaining} initial={{ scale: 1.4, color: '#ffb347' }} animate={{ scale: 1, color: '#e2e8f0' }} className="font-bold">
          {remaining} left
        </motion.span>
      </p>
      <ul className={horizontal ? 'flex flex-wrap gap-x-4 gap-y-1.5' : 'flex flex-col gap-1.5'}>
        {board.ships.map((ship) => {
          const sunk = isSunk(ship)
          const hits = hideDamageUntilSunk && !sunk ? 0 : ship.hits
          return (
            <li key={ship.id} className={`flex items-center gap-2 text-xs ${sunk ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              <span className={horizontal ? '' : 'w-20 truncate'}>{ship.name}</span>
              <span className="flex gap-0.5" aria-label={`${ship.name}: ${sunk ? 'sunk' : `${hits}/${ship.length} hit`}`}>
                {Array.from({ length: ship.length }, (_, i) => {
                  const state = sunk ? 'sunk' : i < hits ? 'hit' : 'ok'
                  return (
                    <motion.span
                      key={`${i}-${state}`}
                      initial={state === 'ok' ? false : { scale: 1.8, opacity: 0.4 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20, delay: sunk ? i * 0.05 : 0 }}
                      className={`h-2.5 w-2.5 rounded-sm ${state === 'sunk' ? 'bg-sunk-500' : state === 'hit' ? 'bg-hit-500' : 'bg-slate-300'}`}
                    />
                  )
                })}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
