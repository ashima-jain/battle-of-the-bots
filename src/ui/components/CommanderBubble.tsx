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

const AVATAR_ANIM: Partial<Record<Mood, Record<string, number[]>>> = {
  panicked: { x: [0, -4, 4, -4, 4, 0], rotate: [0, -6, 6, -6, 0] },
  annoyed: { y: [0, -3, 0] },
  gloating: { scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] },
  smug: { rotate: [0, 4, 0] },
}

export function CommanderBubble({
  line,
  muted,
  thinking,
  onToggleMute,
}: {
  line: SpokenLine | null
  muted: boolean
  /** AI is choosing a target — show a "scanning" indicator when silent. */
  thinking?: boolean
  onToggleMute: () => void
}) {
  const mood: Mood = line?.mood ?? 'neutral'
  const speaking = !!line && !muted
  return (
    <div className="flex w-full max-w-md items-center gap-3" aria-live="polite">
      <motion.div
        key={line?.id ?? 'idle'}
        animate={AVATAR_ANIM[mood] ?? { x: 0 }}
        transition={{ duration: 0.5 }}
        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ocean-800 shadow-lg ${GLOW[mood]}`}
        title="Commander BOLT"
      >
        <span className="absolute -top-2 h-2 w-7 rounded-t-md bg-bot-500" />
        <span className="font-mono text-sm text-bot-400">{FACES[mood]}</span>
        <span
          className={`absolute -bottom-1 right-1 h-2 w-2 rounded-full ${thinking ? 'animate-ping bg-hit-500' : 'animate-pulse bg-bot-400'}`}
        />
      </motion.div>
      <div className="relative min-w-0 flex-1">
        <AnimatePresence mode="wait">
          {speaking ? (
            <motion.p
              key={line.id}
              initial={{ opacity: 0, x: -8, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
              className="relative rounded-2xl rounded-bl-sm bg-ocean-800 px-4 py-2.5 text-base font-medium leading-snug text-slate-50 shadow-lg ring-1 ring-ocean-700"
            >
              <span className="absolute -left-1.5 bottom-2 h-3 w-3 rotate-45 bg-ocean-800 ring-1 ring-ocean-700 [clip-path:polygon(0_0,0_100%,100%_100%)]" />
              {line.text}
            </motion.p>
          ) : (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-slate-500">
              {muted ? 'Commander BOLT (muted)' : thinking ? 'BOLT is scanning your waters…' : 'Commander BOLT'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={onToggleMute}
        className="shrink-0 rounded-full border border-ocean-700 px-2.5 py-1 text-[11px] text-slate-300 hover:border-bot-400"
        aria-pressed={muted}
        aria-label={muted ? 'Unmute Commander BOLT' : 'Mute Commander BOLT'}
      >
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  )
}
