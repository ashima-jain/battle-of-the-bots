import { AnimatePresence, motion } from 'framer-motion'
import type { Mood } from '../../personality'
import type { SpokenLine } from '../../state/gameReducer'

const FACES: Record<Mood, string> = {
  neutral: '•_•',
  smug: '¬‿¬',
  annoyed: '>_<',
  panicked: '°o°',
  gloating: '^‿^',
  defeated: 'x_x',
}

const GLOW: Record<Mood, string> = {
  neutral: 'shadow-bot-400/30',
  smug: 'shadow-bot-400/50',
  annoyed: 'shadow-hit-500/50',
  panicked: 'shadow-hit-500/70',
  gloating: 'shadow-sunk-500/60',
  defeated: 'shadow-slate-500/40',
}

export function CommanderBubble({ line, muted, onToggleMute }: { line: SpokenLine | null; muted: boolean; onToggleMute: () => void }) {
  const mood: Mood = line?.mood ?? 'neutral'
  return (
    <div className="flex items-start gap-3" aria-live="polite">
      <motion.div
        animate={mood === 'panicked' ? { x: [0, -3, 3, -3, 3, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ocean-800 shadow-lg ${GLOW[mood]}`}
        title="Commander BOLT"
      >
        <span className="absolute -top-2 h-2 w-8 rounded-t-md bg-bot-500" />
        <span className="font-mono text-base text-bot-400">{FACES[mood]}</span>
        <span className="absolute -bottom-1 right-1 h-2 w-2 animate-pulse rounded-full bg-bot-400" />
      </motion.div>
      <div className="min-h-14 flex-1">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
          Commander BOLT
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-full border border-ocean-700 px-2 py-0.5 text-[10px] normal-case tracking-normal text-slate-300 hover:border-bot-400"
            aria-pressed={muted}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <AnimatePresence mode="wait">
          {line && !muted ? (
            <motion.p
              key={line.id}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="mt-1 inline-block rounded-2xl rounded-tl-sm bg-ocean-800 px-3 py-2 text-sm text-slate-100 shadow"
            >
              {line.text}
            </motion.p>
          ) : (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-sm text-slate-600">
              {muted ? '(muted)' : '…'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
