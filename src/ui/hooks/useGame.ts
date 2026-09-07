import { useEffect, useMemo, useReducer } from 'react'
import { mathRng } from '../../engine'
import { createGameReducer, createInitialState, type GameAction, type GameState } from '../../state/gameReducer'

export const AI_THINK_MS = 900
export const LINE_VISIBLE_MS = 3800
export const TAUNT_IDLE_MS = 12000

export function useGame(): [GameState, React.Dispatch<GameAction>] {
  const reducer = useMemo(() => createGameReducer(mathRng), [])
  const [state, dispatch] = useReducer(reducer, mathRng, createInitialState)

  useEffect(() => {
    if (state.phase !== 'aiTurn') return
    const id = window.setTimeout(() => dispatch({ type: 'AI_FIRE' }), AI_THINK_MS)
    return () => window.clearTimeout(id)
  }, [state.phase, state.aiShots])

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
