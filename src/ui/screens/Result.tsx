import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { BOARD_SIZE, type Board } from '../../engine'
import type { GameState } from '../../state/gameReducer'
import { Button } from '../components/Button'

function shareText(state: GameState): string {
  const accuracy = state.playerShots ? Math.round((state.playerHits / state.playerShots) * 100) : 0
  const outcome = state.winner === 'player' ? 'I beat Commander BOLT' : 'Commander BOLT beat me'
  return `Battle of the Bots — ${outcome} in ${state.playerShots} shots (${accuracy}% accuracy)\n\n${emojiGrid(state.aiBoard)}`
}

function emojiGrid(board: Board): string {
  const rows: string[] = []
  for (let r = 0; r < BOARD_SIZE; r++) {
    let row = ''
    for (let c = 0; c < BOARD_SIZE; c++) {
      const s = board.shots[r * BOARD_SIZE + c]
      row += s === 'hit' ? '🟥' : s === 'miss' ? '🟦' : '⬛'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

const CONFETTI = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.6,
  rotate: Math.random() * 360,
  color: ['#38f2c8', '#ffb24a', '#7fb3ff', '#ff5c5c', '#ffffff'][i % 5],
}))

export function Result({ state, onRestart }: { state: GameState; onRestart: () => void }) {
  const won = state.winner === 'player'
  const accuracy = state.playerShots ? Math.round((state.playerHits / state.playerShots) * 100) : 0
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(id)
  }, [copied])

  const share = async () => {
    try {
      await navigator.clipboard.writeText(shareText(state))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="fixed inset-0 z-20 flex items-center justify-center bg-ocean-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-title"
    >
      {won &&
        CONFETTI.map((p) => (
          <motion.span
            key={p.id}
            initial={{ y: -40, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
            animate={{ y: '110vh', rotate: p.rotate + 720, opacity: [1, 1, 0] }}
            transition={{ duration: 2.8, delay: 0.8 + p.delay, ease: 'easeIn' }}
            className="pointer-events-none absolute top-0 left-0 h-3 w-2 rounded-sm"
            style={{ background: p.color }}
          />
        ))}
      <motion.div
        initial={{ scale: 0.7, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 260, damping: 20 }}
        className="w-full max-w-md rounded-3xl bg-ocean-900 p-8 text-center shadow-[0_0_0_1px_#1b3a7a,0_30px_80px_-20px_#000]"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{won ? 'Fleet destroyed' : 'Fleet lost'}</p>
        <h1 id="result-title" className={`mt-2 text-5xl font-black ${won ? 'text-bot-400' : 'text-hit-500'}`}>
          {won ? 'Victory!' : 'Sunk.'}
        </h1>
        {state.commander && <p className="mt-3 text-sm italic text-slate-300">“{state.commander.text}” — Commander BOLT</p>}

        <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
          {[
            ['Shots', state.playerShots],
            ['Hits', state.playerHits],
            ['Accuracy', `${accuracy}%`],
          ].map(([k, v]) => (
            <div key={String(k)} className="rounded-xl bg-ocean-800/70 p-3">
              <dt className="text-[10px] uppercase tracking-widest text-slate-500">{k}</dt>
              <dd className="mt-1 text-xl font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={onRestart} className="px-8">
            Play again
          </Button>
          <Button variant="ghost" onClick={share}>
            {copied ? 'Copied!' : 'Copy result'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
