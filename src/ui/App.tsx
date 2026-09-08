import { MotionConfig } from 'framer-motion'
import { useGame } from './hooks/useGame'
import { Battle } from './screens/Battle'
import { Landing } from './screens/Landing'
import { Placement } from './screens/Placement'
import { Result } from './screens/Result'

export default function App() {
  const [state, dispatch] = useGame()

  let screen: React.ReactNode
  if (state.phase === 'landing') screen = <Landing onStart={() => dispatch({ type: 'START_SETUP' })} />
  else if (state.phase === 'placement') screen = <Placement board={state.playerBoard} dispatch={dispatch} />
  else {
    const gameOver = state.phase === 'gameOver'
    screen = (
      <>
        <div inert={gameOver} aria-hidden={gameOver}>
          <Battle state={state} dispatch={dispatch} />
        </div>
        {gameOver && <Result state={state} onRestart={() => dispatch({ type: 'RESTART' })} />}
      </>
    )
  }

  return <MotionConfig reducedMotion="user">{screen}</MotionConfig>
}
