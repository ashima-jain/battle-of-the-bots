import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { coordLabel, type Coord } from '../../engine'
import type { GameAction, GameState } from '../../state/gameReducer'
import { shipsRemaining } from '../../state/gameReducer'
import { CommanderBubble } from '../components/CommanderBubble'
import { FleetHud } from '../components/FleetHud'
import { Grid } from '../components/Grid'
import { Legend } from '../components/Legend'
import { useSound } from '../hooks/useSound'

interface QueuedShot {
  coord: Coord
  /** Player turn number the shot was queued during; fires when that AI turn ends. */
  turn: number
}

function hint(state: GameState, queued: QueuedShot | null): string {
  if (state.phase === 'aiTurn') {
    return queued ? `Locked on ${coordLabel(queued.coord)} — firing as soon as BOLT is done.` : 'BOLT is aiming… (tap a square to queue your next shot)'
  }
  const shot = state.lastPlayerShot
  if (!shot) return 'Your turn. Tap any square on the enemy grid to fire.'
  if (shot.kind === 'miss') return `${coordLabel(shot.coord)} was water. Try somewhere else.`
  if (shot.kind === 'hit') return `Hit at ${coordLabel(shot.coord)}! Ships are straight lines — try the squares next to it.`
  return `You sank the ${shot.ship.name}! ${shipsRemaining(state.aiBoard)} enemy ships left.`
}

const BANNER_MS = 1800

export function Battle({ state, dispatch }: { state: GameState; dispatch: React.Dispatch<GameAction> }) {
  const { playShot, play } = useSound(state.soundEnabled)
  const lastPlayerRef = useRef(state.playerShots)
  const lastAiRef = useRef(state.aiShots)

  useEffect(() => {
    if (state.playerShots !== lastPlayerRef.current) {
      lastPlayerRef.current = state.playerShots
      playShot(state.lastPlayerShot)
    }
  }, [state.playerShots, state.lastPlayerShot, playShot])

  useEffect(() => {
    if (state.aiShots !== lastAiRef.current) {
      lastAiRef.current = state.aiShots
      playShot(state.lastAiShot)
    }
  }, [state.aiShots, state.lastAiShot, playShot])

  const playerTurn = state.phase === 'playerTurn'
  const aiTurn = state.phase === 'aiTurn'
  const gameOver = state.phase === 'gameOver'

  const [queuedRaw, setQueued] = useState<QueuedShot | null>(null)
  const queued = queuedRaw && queuedRaw.turn === state.turn && !gameOver ? queuedRaw : null

  useEffect(() => {
    if (playerTurn && queued) dispatch({ type: 'PLAYER_FIRE', coord: queued.coord })
  }, [playerTurn, queued, dispatch])

  const onEnemyCell = (coord: Coord) => {
    if (playerTurn) dispatch({ type: 'PLAYER_FIRE', coord })
    else if (aiTurn) setQueued({ coord, turn: state.turn })
  }

  const [ownExpanded, setOwnExpanded] = useState(false)

  // Newest sink wins: player's nth shot precedes the AI's nth shot.
  const playerSink = state.lastPlayerShot?.kind === 'sunk' ? { seq: state.playerShots * 2 - 1, ship: state.lastPlayerShot.ship } : null
  const aiSink = state.lastAiShot?.kind === 'sunk' ? { seq: state.aiShots * 2, ship: state.lastAiShot.ship } : null
  const newest = playerSink && (!aiSink || playerSink.seq > aiSink.seq) ? 'player' : aiSink ? 'ai' : null
  const sunkBanner =
    gameOver || !newest
      ? null
      : newest === 'player'
        ? { key: `p-${playerSink!.seq}`, text: `You sank the ${playerSink!.ship.name}!`, tone: 'good' as const }
        : { key: `a-${aiSink!.seq}`, text: `BOLT sank your ${aiSink!.ship.name}`, tone: 'bad' as const }
  const bannerKey = sunkBanner?.key
  const [dismissedBanner, setDismissedBanner] = useState<string | undefined>()

  useEffect(() => {
    if (!bannerKey) return
    const id = window.setTimeout(() => setDismissedBanner(bannerKey), BANNER_MS)
    return () => window.clearTimeout(id)
  }, [bannerKey])

  const playerHitFlash = state.lastPlayerShot && state.lastPlayerShot.kind !== 'miss'
  const aiHit = state.lastAiShot?.kind === 'hit' || state.lastAiShot?.kind === 'sunk'

  const ownBoard = (compact: boolean) => (
    <div className="relative">
      <Grid
        board={state.playerBoard}
        variant="own"
        compact={compact}
        size="md"
        ariaLabel="Your board, showing your ships and the enemy's shots."
        disabled
        lastShot={state.lastAiShot?.coord ?? null}
      />
      <AnimatePresence>
        {aiTurn && (
          <motion.div
            key="scan"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-2 overflow-hidden rounded-xl"
          >
            <motion.div
              initial={{ y: '-10%' }}
              animate={{ y: '110%' }}
              transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
              className="h-[12%] w-full bg-gradient-to-b from-transparent via-hit-500/35 to-transparent"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-4 px-4 pb-28 pt-4 lg:gap-6 lg:pb-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-black tracking-tight">
          Battle of the <span className="text-bot-400">Bots</span>
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => {
              dispatch({ type: 'TOGGLE_SOUND' })
              play('click')
            }}
            className="rounded-full border border-ocean-700 px-3 py-1 text-slate-300 hover:border-bot-400"
            aria-pressed={state.soundEnabled}
          >
            Sound {state.soundEnabled ? 'on' : 'off'}
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESTART' })}
            className="rounded-full border border-ocean-700 px-3 py-1 text-slate-300 hover:border-hit-500"
          >
            Restart
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start">
        {/* Enemy waters — the focal point */}
        <section className="flex flex-col items-center gap-3">
          <header className="text-center">
            <h2 className="text-lg font-semibold tracking-wide">Enemy waters</h2>
            <p className="text-xs text-slate-400">Commander BOLT’s hidden fleet</p>
          </header>

          <motion.div
            key={hint(state, queued)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className={`max-w-md rounded-full px-4 py-1.5 text-center text-sm font-medium ${
              playerTurn ? 'bg-bot-500/15 text-bot-400 ring-1 ring-bot-500/40' : 'bg-ocean-800 text-slate-300'
            }`}
          >
            {hint(state, queued)}
          </motion.div>

          <motion.div
            animate={
              playerTurn
                ? { scale: 1, boxShadow: '0 0 0 3px #19e0b0, 0 0 40px -6px #19e0b0aa' }
                : { scale: 0.99, boxShadow: '0 0 0 3px #1b3a7a00, 0 0 0px 0px #19e0b000' }
            }
            transition={{ duration: 0.3 }}
            className="relative rounded-2xl"
          >
            <Grid
              board={state.aiBoard}
              variant="enemy"
              ariaLabel="Enemy board. Tap a square to fire."
              disabled={gameOver}
              onCellClick={onEnemyCell}
              lastShot={state.lastPlayerShot?.coord ?? null}
              queued={aiTurn ? queued?.coord ?? null : null}
            />
            <AnimatePresence>
              {playerHitFlash && (
                <motion.div
                  key={`flash-${state.playerShots}`}
                  initial={{ opacity: 0.35 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  className={`pointer-events-none absolute inset-0 rounded-2xl ${
                    state.lastPlayerShot?.kind === 'sunk' ? 'bg-sunk-500' : 'bg-hit-500'
                  }`}
                />
              )}
            </AnimatePresence>
          </motion.div>

          <div className="hidden w-full max-w-md lg:block">
            <CommanderBubble
              line={state.commander}
              muted={state.commanderMuted}
              thinking={aiTurn}
              onToggleMute={() => dispatch({ type: 'TOGGLE_COMMANDER' })}
            />
          </div>

          <div className="w-full max-w-md">
            <FleetHud board={state.aiBoard} label="Enemy fleet" hideDamageUntilSunk horizontal />
          </div>
        </section>

        {/* Your waters — secondary; mini-map on small screens */}
        <motion.section
          animate={aiHit ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          key={`shake-${state.aiShots}`}
          className="flex flex-col items-center gap-3"
        >
          <header className="text-center">
            <h2 className="text-base font-semibold tracking-wide text-slate-300 lg:text-lg lg:text-slate-100">Your waters</h2>
            <p className={`text-xs ${aiTurn ? 'text-hit-500' : 'text-slate-400'}`}>{aiTurn ? 'BOLT is aiming here…' : 'BOLT fires here'}</p>
          </header>

          <div className="hidden lg:block">{ownBoard(false)}</div>
          <div className="flex flex-col items-center gap-2 lg:hidden">
            {ownBoard(!ownExpanded)}
            <button
              type="button"
              onClick={() => setOwnExpanded((v) => !v)}
              className="text-xs text-slate-400 underline-offset-2 hover:text-bot-400 hover:underline"
            >
              {ownExpanded ? 'Shrink your board' : 'Expand your board'}
            </button>
          </div>

          <div className="w-full max-w-md">
            <FleetHud board={state.playerBoard} label="Your fleet" horizontal />
          </div>
        </motion.section>
      </div>

      <Legend />

      {/* Commander docked at the bottom on small screens so lines are readable while playing */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ocean-800 bg-ocean-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          <CommanderBubble
            line={state.commander}
            muted={state.commanderMuted}
            thinking={aiTurn}
            onToggleMute={() => dispatch({ type: 'TOGGLE_COMMANDER' })}
          />
        </div>
      </div>

      <AnimatePresence>
        {sunkBanner && dismissedBanner !== sunkBanner.key && (
          <motion.div
            key={sunkBanner.key}
            initial={{ opacity: 0, scale: 0.6, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`pointer-events-none fixed inset-x-0 top-1/3 z-40 mx-auto w-max max-w-[90vw] rounded-2xl px-8 py-4 text-center text-2xl font-black shadow-2xl sm:text-3xl ${
              sunkBanner.tone === 'good' ? 'bg-sunk-500 text-ocean-950' : 'bg-hit-700 text-white'
            }`}
          >
            {sunkBanner.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
