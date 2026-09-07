import type { Orientation, ShipKind } from '../../engine'

/** Per-cell unit in the horizontal drawing space; hull height is 20. */
const U = 20

interface Shape {
  hull: string
  details: string[]
}

/** Horizontal drawings, bow on the left, in a `length*U × 20` box. */
const SHAPES: Record<ShipKind, (w: number) => Shape> = {
  carrier: (w) => ({
    hull: `M2 10 L8 3 H${w - 4} Q${w - 1} 3 ${w - 1} 10 Q${w - 1} 17 ${w - 4} 17 H8 Z`,
    details: [
      `M${w * 0.55} 5 h${w * 0.16} v4 h-${w * 0.16} Z`,
      `M12 10 H${w - 8}`,
      `M14 13 h4 M22 13 h4 M30 13 h4 M38 13 h4 M46 13 h4 M54 13 h4 M62 13 h4 M70 13 h4 M78 13 h4`,
    ],
  }),
  battleship: (w) => ({
    hull: `M1 10 L9 4 H${w - 5} Q${w - 1} 4 ${w - 1} 10 Q${w - 1} 16 ${w - 5} 16 H9 Z`,
    details: [
      `M${w * 0.42} 6 h${w * 0.18} v8 h-${w * 0.18} Z`,
      `M${w * 0.5} 3 h2 v3 h-2 Z`,
      circle(w * 0.22, 10, 3),
      circle(w * 0.32, 10, 3),
      circle(w * 0.75, 10, 3),
      circle(w * 0.86, 10, 2.5),
    ],
  }),
  cruiser: (w) => ({
    hull: `M1 10 L10 5 H${w - 6} Q${w - 1} 5 ${w - 1} 10 Q${w - 1} 15 ${w - 6} 15 H10 Z`,
    details: [`M${w * 0.4} 7 h${w * 0.24} v6 h-${w * 0.24} Z`, `M${w * 0.5} 3 h2 v4 h-2 Z`, circle(w * 0.24, 10, 2.5), circle(w * 0.8, 10, 2.5)],
  }),
  submarine: (w) => ({
    hull: `M2 10 Q2 5 12 5 H${w - 10} Q${w - 1} 5 ${w - 1} 10 Q${w - 1} 15 ${w - 10} 15 H12 Q2 15 2 10 Z`,
    details: [`M${w * 0.4} 2 h${w * 0.18} v4 h-${w * 0.18} Z`, `M${w * 0.47} 0 h1.5 v3 h-1.5 Z`, `M${w - 3} 8 l3 -3 v10 l-3 -3 Z`],
  }),
  destroyer: (w) => ({
    hull: `M1 10 L10 5 H${w - 6} Q${w - 1} 5 ${w - 1} 10 Q${w - 1} 15 ${w - 6} 15 H10 Z`,
    details: [`M${w * 0.42} 6 h${w * 0.22} v8 h-${w * 0.22} Z`, `M${w * 0.5} 3 h2 v4 h-2 Z`, circle(w * 0.24, 10, 2.5)],
  }),
}

function circle(cx: number, cy: number, r: number): string {
  return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 -${r * 2} 0 Z`
}

export interface ShipSilhouetteProps {
  kind: ShipKind
  length: number
  orientation?: Orientation
  /** Draw the per-square dividers inside the SVG (used where the ship isn't laid over a grid). */
  dividers?: boolean
  className?: string
}

/**
 * Top-down outline of a ship, drawn in `currentColor`, stretched to fill its box.
 * Vertical ships are the horizontal drawing rotated 90° so the bow points up.
 */
export function ShipSilhouette({ kind, length, orientation = 'horizontal', dividers, className = '' }: ShipSilhouetteProps) {
  const w = length * U
  const { hull, details } = SHAPES[kind](w)
  const horizontal = orientation === 'horizontal'
  return (
    <svg
      viewBox={horizontal ? `0 0 ${w} ${U}` : `0 0 ${U} ${w}`}
      preserveAspectRatio="none"
      aria-hidden
      className={className}
    >
      <g transform={horizontal ? undefined : `translate(${U} 0) rotate(90)`}>
        <path d={hull} fill="currentColor" fillOpacity={0.22} stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" />
        {details.map((d, i) => (
          <path key={i} d={d} fill="currentColor" fillOpacity={0.55} stroke="currentColor" strokeWidth={0.8} />
        ))}
        {dividers &&
          Array.from({ length: length - 1 }, (_, i) => (
            <path key={`d${i}`} d={`M${(i + 1) * U} 1 V${U - 1}`} stroke="currentColor" strokeWidth={0.8} strokeDasharray="2 2" strokeOpacity={0.7} />
          ))}
      </g>
    </svg>
  )
}
