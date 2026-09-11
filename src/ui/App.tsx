import { MotionConfig } from 'framer-motion'
import { useState } from 'react'
import { newRoomCode, roomFromUrl } from '../state/online'
import { useGame } from './hooks/useGame'
import { Battle } from './screens/Battle'
import { Landing } from './screens/Landing'
import { Online } from './screens/Online'
import { Placement } from './screens/Placement'
import { Result } from './screens/Result'

type Screen = { kind: 'solo' } | { kind: 'online'; role: 'host' | 'guest'; code: string }

function initialScreen(): Screen {
  const code = roomFromUrl(window.location.search)
  return code ? { kind: 'online', role: 'guest', code } : { kind: 'solo' }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen)

  const leave = () => {
    window.history.replaceState(null, '', '/')
    setScreen({ kind: 'solo' })
  }

  return (
    <MotionConfig reducedMotion="user">
      {screen.kind === 'online' ? (
        <Online key={screen.code} role={screen.role} code={screen.code} onLeave={leave} />
      ) : (
        <Solo onFriend={() => setScreen({ kind: 'online', role: 'host', code: newRoomCode() })} />
      )}
    </MotionConfig>
  )
}

function Solo({ onFriend }: { onFriend: () => void }) {
  const [state, dispatch] = useGame()

  if (state.phase === 'landing') return <Landing onStart={() => dispatch({ type: 'START_SETUP' })} onFriend={onFriend} />
  if (state.phase === 'placement') return <Placement board={state.playerBoard} dispatch={dispatch} />
  const gameOver = state.phase === 'gameOver'
  return (
    <>
      <div inert={gameOver} aria-hidden={gameOver}>
        <Battle state={state} dispatch={dispatch} />
      </div>
      {gameOver && <Result state={state} onRestart={() => dispatch({ type: 'RESTART' })} />}
    </>
  )
}
