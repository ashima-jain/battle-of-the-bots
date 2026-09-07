import { useGame } from './hooks/useGame'
import { Battle } from './screens/Battle'
import { Landing } from './screens/Landing'
import { Placement } from './screens/Placement'
import { Result } from './screens/Result'

export default function App() {
  const [state, dispatch] = useGame()

  if (state.phase === 'landing') return <Landing onStart={() => dispatch({ type: 'START_SETUP' })} />
  if (state.phase === 'placement') return <Placement board={state.playerBoard} dispatch={dispatch} />

  return (
    <>
      <Battle state={state} dispatch={dispatch} />
      {state.phase === 'gameOver' && <Result state={state} onRestart={() => dispatch({ type: 'RESTART' })} />}
    </>
  )
}
