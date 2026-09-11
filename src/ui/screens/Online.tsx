import { motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRoom } from '../../net/useRoom'
import type { GameAction, GameState } from '../../state/gameReducer'
import { mirror, redactForGuest, roomLink, type NetMessage, type WireState } from '../../state/online'
import { Button } from '../components/Button'
import { useGame } from '../hooks/useGame'
import { Battle } from './Battle'
import { Placement } from './Placement'
import { Result } from './Result'

const BATTLE_PHASES = new Set<GameState['phase']>(['playerTurn', 'aiTurn', 'gameOver'])

interface Props {
  role: 'host' | 'guest'
  code: string
  onLeave: () => void
}

/**
 * Two-player flow over one peer connection. The host owns the game (its reducer is the
 * referee); the guest places its own fleet locally, then plays against a mirrored copy of
 * the host's state, sending only intents.
 */
export function Online({ role, code, onLeave }: Props) {
  const [state, dispatch] = useGame()
  const [myName, setMyName] = useState(role === 'host' ? 'Player 1' : 'Player 2')
  const [theirName, setTheirName] = useState<string | null>(null)
  const [entered, setEntered] = useState(false)
  const [hostState, setHostState] = useState<WireState | null>(null)
  const seenRound = useRef<number | null>(null)

  const onMessage = useCallback(
    (msg: NetMessage) => {
      switch (msg.type) {
        case 'hello':
          setTheirName(msg.name.trim().slice(0, 24) || null)
          break
        case 'fleet':
          if (role === 'host') dispatch({ type: 'OPPONENT_FLEET', ships: msg.ships })
          break
        case 'fire':
          if (role === 'host') dispatch({ type: 'OPPONENT_FIRE', coord: msg.coord })
          break
        case 'restart':
          if (role === 'host') dispatch({ type: 'RESTART' })
          break
        case 'state':
          if (role === 'guest') setHostState(msg.state)
          break
      }
    },
    [role, dispatch],
  )

  const room = useRoom(role, code, onMessage)
  const { send } = room
  const connected = room.status === 'connected'

  useEffect(() => {
    if (connected) dispatch({ type: 'START_ONLINE' })
  }, [connected, dispatch])

  useEffect(() => {
    if (connected) send({ type: 'hello', name: myName })
  }, [connected, myName, send])

  useEffect(() => {
    if (role === 'host' && connected && state.mode === 'online') send({ type: 'state', state: redactForGuest(state) })
  }, [role, connected, state, send])

  // A new round on the host means both fleets are wiped: reset the guest's local placement too.
  useEffect(() => {
    if (role !== 'guest' || !hostState) return
    if (seenRound.current !== null && hostState.round !== seenRound.current) dispatch({ type: 'RESTART' })
    seenRound.current = hostState.round
  }, [role, hostState, dispatch])

  const guestDispatch = useCallback(
    (action: GameAction) => {
      switch (action.type) {
        case 'READY':
          send({ type: 'fleet', ships: state.playerBoard.ships })
          dispatch(action)
          break
        case 'PLAYER_FIRE':
          send({ type: 'fire', coord: action.coord })
          break
        case 'RESTART':
          send({ type: 'restart' })
          break
        default:
          dispatch(action)
      }
    },
    [send, state.playerBoard.ships, dispatch],
  )

  const opponentName = theirName ?? 'Your friend'
  const gameDispatch = role === 'host' ? dispatch : guestDispatch

  let view: GameState = { ...state, opponentName }
  if (role === 'guest' && hostState && BATTLE_PHASES.has(hostState.phase)) {
    view = mirror(hostState, { soundEnabled: state.soundEnabled, opponentName })
  }

  let screen: React.ReactNode
  if (!(connected && entered) && room.status !== 'closed' && room.status !== 'error') {
    screen = (
      <Lobby
        role={role}
        code={code}
        status={room.status}
        name={myName}
        onName={setMyName}
        entered={entered}
        onEnter={() => setEntered(true)}
        onLeave={onLeave}
      />
    )
  } else if (view.phase === 'landing' || view.phase === 'placement') {
    screen = <Placement board={view.playerBoard} dispatch={gameDispatch} opponentName={opponentName} />
  } else if (view.phase === 'waiting') {
    screen = <Waiting name={opponentName} />
  } else {
    const gameOver = view.phase === 'gameOver'
    screen = (
      <>
        <div inert={gameOver} aria-hidden={gameOver}>
          <Battle state={view} dispatch={gameDispatch} />
        </div>
        {gameOver && <Result state={view} onRestart={() => gameDispatch({ type: 'RESTART' })} />}
      </>
    )
  }

  const dropped = room.status === 'closed' || room.status === 'error'
  return (
    <>
      <div inert={dropped} aria-hidden={dropped}>
        {screen}
      </div>
      {dropped && (
        <div role="alertdialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-ocean-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-ocean-900 p-6 text-center shadow-[0_0_0_1px_#1b3a7a,0_30px_80px_-20px_#000]">
            <h2 className="text-lg font-bold">{room.status === 'closed' ? `${opponentName} left the battle` : 'Couldn’t connect'}</h2>
            <p className="mt-2 text-sm text-slate-400">{room.error ?? 'The connection was closed.'}</p>
            <Button autoFocus className="mt-5" onClick={onLeave}>
              Back to menu
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function Lobby({
  role,
  code,
  status,
  name,
  onName,
  entered,
  onEnter,
  onLeave,
}: {
  role: 'host' | 'guest'
  code: string
  status: string
  name: string
  onName: (n: string) => void
  entered: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const link = roomLink(window.location.origin, code)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-bot-400">Play with a friend</p>
        <h1 className="text-3xl font-black tracking-tight">{role === 'host' ? 'Invite your friend' : 'Joining the battle'}</h1>

        <form
          className="mt-6 flex items-end gap-2 text-left"
          onSubmit={(e) => {
            e.preventDefault()
            onEnter()
          }}
        >
          <label className="block flex-1 text-xs text-slate-400">
            Your name
            <input
              value={name}
              onChange={(e) => onName(e.target.value)}
              maxLength={24}
              disabled={entered}
              className="mt-1 w-full rounded-xl border border-ocean-700 bg-ocean-900 px-3 py-2 text-base text-slate-100 outline-none focus:border-bot-400 disabled:opacity-60"
            />
          </label>
          <Button type="submit" disabled={entered}>
            {entered ? 'Saved' : 'Continue'}
          </Button>
        </form>

        {role === 'host' && (
          <div className="mt-5 rounded-2xl bg-ocean-900/70 p-4 text-left shadow-[0_0_0_1px_#1b3a7a]">
            <p className="text-xs text-slate-400">Send this link to your friend. Room code {code}.</p>
            <div className="mt-2 flex gap-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl bg-ocean-950 px-3 py-2 text-sm text-slate-200" />
              <Button onClick={copy}>{copied ? 'Copied!' : 'Copy'}</Button>
            </div>
          </div>
        )}

        <p role="status" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-300">
          <Pulse />
          {status === 'connecting'
            ? 'Connecting…'
            : status === 'connected'
              ? 'Connected — hit Continue to place your ships.'
              : role === 'host'
                ? 'Waiting for your friend to open the link…'
                : 'Waiting for the host…'}
        </p>
        <p className="mt-2 text-xs text-slate-500">Keep this tab open. You’ll both place ships once you’re both in; the host fires first.</p>

        <Button variant="ghost" className="mt-6" onClick={onLeave}>
          Back
        </Button>
      </motion.div>
    </main>
  )
}

function Waiting({ name }: { name: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-bot-400">Fleet locked in</p>
      <h1 className="text-3xl font-black tracking-tight">Waiting for {name}…</h1>
      <p role="status" className="flex items-center gap-2 text-sm text-slate-300">
        <Pulse />
        They’re still placing their ships.
      </p>
    </main>
  )
}

function Pulse() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.3, 1] }}
      transition={{ duration: 1.2, repeat: Infinity }}
      className="inline-block h-2 w-2 rounded-full bg-bot-400"
    />
  )
}
