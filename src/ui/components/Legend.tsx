export function Legend() {
  const items = [
    { swatch: 'bg-ocean-800/70', text: 'Unexplored — click to fire' },
    { swatch: 'bg-ocean-700/60', dot: true, text: 'Miss — just water' },
    { swatch: 'bg-hit-500', mark: '✕', text: 'Hit — part of a ship' },
    { swatch: 'bg-sunk-500/80', mark: '✕', text: 'Sunk — whole ship destroyed' },
  ]
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
      {items.map((item) => (
        <li key={item.text} className="flex items-center gap-1.5">
          <span className={`relative inline-flex h-4 w-4 items-center justify-center rounded ${item.swatch} text-[10px] font-black text-white`}>
            {item.mark}
            {item.dot && <span className="h-1 w-1 rounded-full bg-ocean-300/70" />}
          </span>
          {item.text}
        </li>
      ))}
    </ul>
  )
}
