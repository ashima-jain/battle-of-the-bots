# Bugs found and fixed

Plain-English log of every bug we hit, in two halves: things that broke while
building the game, and things a deliberate "try to break it" QA pass found
afterwards. Each entry is symptom → cause → fix.

## Part 1 — Bugs during development

**1. The page had no styling at all.** First launch was black text on white.
Tailwind v4 was wired in through the wrong plugin, so its styles were never
compiled. Fix: switched to Tailwind's PostCSS plugin (`postcss.config.js`).

**2. Board squares had unpredictable sizes.** Square size was computed from the
container's width, which the browser only knows *after* laying out the grid.
Fix: every square gets one explicit size (a CSS variable with min/max).

**3. Dragging a ship off the board "teleported" it.** Drag over a legal spot,
keep going off the edge, release: the ship landed on the last legal spot instead
of snapping back — or rotated, because a drag ending off-board looked like a
tap. Fix: leaving the board clears the preview and marks the drag as "moved".

**4. Board overflowed on a 375 px phone.** Ten squares + labels + gaps were
wider than the screen at our minimum square size. Fix: smaller minimum, tighter
gaps.

**5. "SUNK" banner named the wrong ship.** Sink a ship, BOLT sinks yours next
turn: the banner still celebrated *your* sink. The banner always preferred the
player's shot. Fix: each sink carries a turn number; the newest wins.

**6. Vertical ships were drawn upside-down.** The SVG rotation used the wrong
angle/anchor. Fix: rotate +90° from the correct corner.

**7. Ship names and silhouettes overlapped.** Abbreviations ("BTLSHP") sat on
top of the drawing. Fix: full name in its own dark strip along the stern,
silhouette in the remaining space; the Destroyer finally got a label.

**8. Our own browser test hung.** The script clicked an already-fired square,
which the game correctly disables, so the click waited forever. Not a game bug —
the test now skips disabled squares.

## Part 2 — Bugs from the QA pass (all fixed)

Rules, overlaps, edges, repeat shots, sinking, game-over, restart cleanliness
and "AI never repeats a shot" all held up under attack. These didn't:

**1. Result screen wasn't locked.** Tab could reach Sound/Restart hidden behind
the game-over card. Fix: focus moves into the card, Tab is trapped inside it,
and the battle screen behind is marked `inert`.

**2. BOLT's speech dock covered "Play again" on phones.** Fix: the dock hides on
game over and the result card sits above it.

**3. Sideways scrollbar at 320 px.** Fix: minimum square size lowered so the
board + labels fit in 305 px.

**4. BOLT's dock hid the legend on tiny phones.** Bottom padding was a fixed
guess smaller than a two-line dock. Fix: padding is measured from the dock's
real height (`ResizeObserver`).

**5. Ships could only be moved with a mouse/finger.** Fix: arrow keys move the
selected ship one square; `R` still rotates.

**6. Keyboard focus fell off the board after firing.** The fired square becomes
disabled, so the browser dropped focus to the page body. Fix: focus jumps to the
nearest live square. (Gotcha: Framer Motion fires *synthetic* pointer events for
Enter presses, so we only treat trusted pointer events as "mouse use".)

**7. Red "can't drop here" preview was hidden.** It rendered underneath the
parked ship. Fix: the preview is drawn on a layer above the hulls.

**8. Blocked rotation did nothing.** Fix: the ship wobbles and a short message
explains why ("No room to rotate here — move the ship first").

**9. BOLT's final quote vanished after 5 s.** It shared the in-game chatter
timer. Fix: the timer doesn't run once the game is over.

**10. Two fast clicks fired two shots.** The second click landed in BOLT's turn
and was silently queued. Fix: a queued square is marked and tapping it again
cancels; clicks within 250 ms of your own shot are ignored.

**11. Win/lose jingles never played.** They existed but nothing called them.
Fix: played once when the game ends.

**12. OS "reduce motion" setting was ignored.** Fix: Framer Motion's
`reducedMotion="user"`; shakes, flashes and confetti are skipped.

**13. AI wasted shots on two ships in the same row.** Two separate hits in one
row were treated as one long ship, so it fired at the far ends first. Fix: only
*adjacent* hits form a line; isolated hits get their neighbours probed first.
Benchmark unchanged (≈51 shots per game over 500 games).

**14. Restart had no "are you sure?".** Fix: mid-game restart asks
"Abandon this battle?"; skipped when no shots have been fired or on the result
screen.

Also from automated code review: `isFleetValid` filtered ships by ID, which
would misbehave if two ships ever shared one. Now filters by array index.

### Found by re-testing the fixes
A second browser pass on the fixed build caught three leftovers, now fixed:
the restart confirmation could be Tabbed out of (fix: the battle screen is
`inert` while it's open, Tab wraps, Escape closes from anywhere); the per-square
white hit flash and expanding rings still played under "reduce motion"; and
those rings, when a column-10 square was hit, poked past the right edge on a
320 px screen (fix: `overflow-x-clip` on the page).

## How it's verified

- **56 Vitest unit tests** on the rules engine, AI (incl. a regression test for
  QA #13), commander personality and game state machine.
- `npm run typecheck`, `npm run lint`, `npm run build` clean.
- **AI benchmark:** 500 simulated games, ≈51 shots to sink a fleet (random
  firing needs ≈95).
- **Browser testing** (Playwright against Chrome): full games on desktop,
  375 px and 320 px portrait, 667×375 landscape, keyboard-only play,
  reduced-motion emulation; result-dialog focus trap, queue cancel,
  double-click guard and restart confirm each checked; no console errors.
