import { useEffect, useMemo, useReducer } from 'react'
import { mathRng } from '../../engine'
import { createGameReducer, createInitialState, type GameAction, type GameState } from '../../state/gameReducer'

/** AI reply delay by what the player just did: misses move fast, hits get a beat to land, sinks get a moment. */
export const AI_THINK_MS = { miss: 500, hit: 750, sunk: 1300 } as const
export const LINE_VISIBLE_MS = 5500
export const TAUNT_IDLE_MS = 12000

export function useGame(): [GameState, React.Dispatch<GameAction>] {
  const reducer = useMemo(() => createGameReducer(mathRng), [])
  const [state, dispatch] = useReducer(reducer, mathRng, createInitialState)

  useEffect(() => {
    if (state.phase !== 'aiTurn') return
    const delay = AI_THINK_MS[state.lastPlayerShot?.kind ?? 'miss']
    const id = window.setTimeout(() => dispatch({ type: 'AI_FIRE' }), delay)
    return () => window.clearTimeout(id)
  }, [state.phase, state.aiShots, state.lastPlayerShot])

  useEffect(() => {
    if (!state.commander) return
    const id = window.setTimeout(() => dispatch({ type: 'DISMISS_LINE' }), LINE_VISIBLE_MS)
    return () => window.clearTimeout(id)
  }, [state.commander])

  useEffect(() => {
    if (state.phase !== 'playerTurn' || state.commanderMuted) return
    const id = window.setTimeout(() => dispatch({ type: 'TAUNT_TICK' }), TAUNT_IDLE_MS)
    return () => window.clearTimeout(id)
  }, [state.phase, state.turn, state.commanderMuted])

  return [state, dispatch]
}
