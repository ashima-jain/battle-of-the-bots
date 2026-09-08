# Battle of the Bots

A browser Battleship game against Commander BOLT, a smug AI naval commander.

- **Play:** https://battle-of-the-bots.netlify.app
- **Bugs found and fixed:** [BUGS.md](./BUGS.md)

## How to play

Classic rules on a 10×10 board with five ships (5, 4, 3, 3, 2 squares). Drag your
ships to place them (or just hit *Start battle*), then take turns firing at the
enemy waters. Sink all five of BOLT's ships before he sinks yours. Ships may
touch but not overlap; firing at a square twice is rejected and doesn't cost a
turn. Keyboard play is supported (arrow keys, Enter, R to rotate).

BOLT does **not** cheat: his AI only sees the squares it has fired at and their
outcomes, never your board (see `src/ai/commander.ts`).

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Vitest (56 tests)
npm run lint       # oxlint
npm run typecheck  # tsc
npm run build      # production build in dist/
```

## Architecture

The game rules are kept out of React so they can be unit-tested on their own:

| Folder | Role | React? |
|---|---|---|
| `src/engine/` | Pure rules: board, placement validation, firing, sink/win detection, seeded RNG | no |
| `src/ai/` | BOLT's targeting: parity "hunt" search, then "target" mode extending lines of adjacent hits | no |
| `src/personality/` | BOLT's one-liners: event → line, with cooldowns and no-repeat pools | no |
| `src/state/` | `gameReducer` state machine (`setup → playerTurn → aiTurn → gameOver`) wiring the three above | no |
| `src/ui/` | React screens and components (Tailwind CSS, Framer Motion, Web Audio sounds) | yes |

The personality module is intentionally separate from the engine: deleting it
would not change a single game rule.

### AI strength

Over 500 simulated games BOLT sinks a full fleet in ~51 shots on average
(median 52, 90% of games under 62). Random firing needs ~95, so he is a
competent but beatable opponent.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Vitest · oxlint · Netlify
