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

function hint(state: GameState): string {
  if (state.phase === 'aiTurn') return 'Commander BOLT is choosing a target…'
  const shot = state.lastPlayerShot
  if (!shot) return 'Your turn. Click any square on the enemy grid to fire.'
  if (shot.kind === 'miss') return `${coordLabel(shot.coord)} was water. Try somewhere else.`
  if (shot.kind === 'hit') return `Hit at ${coordLabel(shot.coord)}! Ships are straight lines — try the squares next to it.`
  return `You sank the ${shot.ship.name}! ${shipsRemaining(state.aiBoard)} enemy ships left.`
}

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

  const fire = (coord: Coord) => dispatch({ type: 'PLAYER_FIRE', coord })
  const playerTurn = state.phase === 'playerTurn'
  const [dismissedBanner, setDismissedBanner] = useState<string | undefined>()
  const sunkBanner =
    state.lastPlayerShot?.kind === 'sunk' && state.phase !== 'gameOver'
      ? { key: `p-${state.playerShots}`, text: `You sank the ${state.lastPlayerShot.ship.name}!`, tone: 'good' as const }
      : state.lastAiShot?.kind === 'sunk' && state.phase !== 'gameOver'
        ? { key: `a-${state.aiShots}`, text: `BOLT sank your ${state.lastAiShot.ship.name}`, tone: 'bad' as const }
        : null
  const bannerKey = sunkBanner?.key

  useEffect(() => {
    if (!bannerKey) return
    const id = window.setTimeout(() => setDismissedBanner(bannerKey), 2200)
    return () => window.clearTimeout(id)
  }, [bannerKey])

  return (
    <main className="mx-auto flex min-h-full max-w-6xl flex-col gap-5 px-4 py-6">
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

      <div className="rounded-2xl bg-ocean-900/60 p-4">
        <CommanderBubble line={state.commander} muted={state.commanderMuted} onToggleMute={() => dispatch({ type: 'TOGGLE_COMMANDER' })} />
      </div>

      <motion.div
        key={hint(state)}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        role="status"
        className={`mx-auto rounded-full px-4 py-1.5 text-center text-sm font-medium ${
          playerTurn ? 'bg-bot-500/15 text-bot-400 ring-1 ring-bot-500/40' : 'bg-ocean-800 text-slate-300'
        }`}
      >
        {hint(state)}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <motion.div
          animate={playerTurn ? { scale: 1, opacity: 1 } : { scale: 0.98, opacity: 0.7 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col items-center gap-3"
        >
          <Grid
            board={state.aiBoard}
            variant="enemy"
            title="Enemy waters"
            subtitle={playerTurn ? 'Click a square to fire' : 'Wait for your turn'}
            ariaLabel="Enemy board. Click a square to fire."
            disabled={!playerTurn}
            onCellClick={fire}
            lastShot={state.lastPlayerShot?.coord ?? null}
          />
          <FleetHud board={state.aiBoard} label="Enemy fleet" hideDamageUntilSunk />
        </motion.div>

        <div className="hidden text-center text-xs uppercase tracking-widest text-slate-600 lg:block lg:pt-40">vs</div>

        <motion.div
          animate={state.lastAiShot?.kind === 'hit' || state.lastAiShot?.kind === 'sunk' ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          key={`shake-${state.aiShots}`}
          className="flex flex-col items-center gap-3"
        >
          <Grid
            board={state.playerBoard}
            variant="own"
            title="Your waters"
            subtitle="BOLT fires here"
            ariaLabel="Your board, showing your ships and the enemy's shots."
            disabled
            lastShot={state.lastAiShot?.coord ?? null}
          />
          <FleetHud board={state.playerBoard} label="Your fleet" />
        </motion.div>
      </div>

      <Legend />

      <AnimatePresence>
        {sunkBanner && dismissedBanner !== sunkBanner.key && (
          <motion.div
            key={sunkBanner.key}
            initial={{ opacity: 0, scale: 0.6, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={`pointer-events-none fixed inset-x-0 top-1/3 mx-auto w-max rounded-2xl px-8 py-4 text-3xl font-black shadow-2xl ${
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
