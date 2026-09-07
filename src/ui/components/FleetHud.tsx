import { isSunk, type Board } from '../../engine'

/** Ship silhouettes that fill red as they take damage — progress at a glance. */
export function FleetHud({ board, label, hideDamageUntilSunk }: { board: Board; label: string; hideDamageUntilSunk?: boolean }) {
  return (
    <div className="rounded-xl bg-ocean-900/60 p-3">
      <p className="mb-2 text-xs uppercase tracking-widest text-slate-400">{label}</p>
      <ul className="flex flex-col gap-1.5">
        {board.ships.map((ship) => {
          const sunk = isSunk(ship)
          const hits = hideDamageUntilSunk && !sunk ? 0 : ship.hits
          return (
            <li key={ship.id} className={`flex items-center gap-2 text-xs ${sunk ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              <span className="w-20 truncate">{ship.name}</span>
              <span className="flex gap-0.5" aria-label={`${ship.name}: ${sunk ? 'sunk' : `${hits}/${ship.length} hit`}`}>
                {Array.from({ length: ship.length }, (_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 w-2.5 rounded-sm ${sunk ? 'bg-sunk-500' : i < hits ? 'bg-hit-500' : 'bg-slate-300'}`}
                  />
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
