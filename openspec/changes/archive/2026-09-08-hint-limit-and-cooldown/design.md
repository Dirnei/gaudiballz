## Context

See proposal.md — Why. Hints are currently unlimited and instant. The undo system
already follows a pure-module pattern (`attempt.ts`) that tracks a per-attempt budget
with reset semantics. The hint budget and cooldown adopt the same pattern.

The cooldown is a client-only UI gate — it does not affect the solver, the move engine,
or the server's completion verification. The server already records hints-used per
completion and needs no changes.

## Goals / Non-Goals

**Goals:**

- Add a 3-hint-per-attempt budget using the same pure-module pattern as undos.
- Add a 30-second cooldown timer that gates each hint request.
- Show remaining hints and cooldown progress on the hint button.
- Restore hint budget and restart cooldown on level load and reset.

**Non-Goals:**

- No server-side enforcement of hint budget (client-only, like the undo budget).
- No changes to the solver or hint-move computation.
- No visual redesign of the hint button beyond adding the badge and cooldown indicator.
- No Akka.NET actors — this is pure client-side state; actors are not warranted.

## Decisions

### 1. Extend `attempt.ts` with hint budget

**Choice:** Add `hintsRemaining` to the `Attempt` interface and export `HINTS_PER_ATTEMPT = 3`,
`canHint(attempt)`, `spendHint(attempt)` alongside the existing undo functions. `startLevel()`
and `restartLevel()` both return full hint budget.

**Why over a separate module:** The hint budget has identical lifecycle semantics to the undo
budget — per-attempt, restored on reset. Keeping them together in one `Attempt` type makes it
impossible for one to reset without the other.

**Alternative considered:** A separate `hintBudget.ts` module. Rejected because it duplicates
the attempt lifecycle and creates a risk of the two getting out of sync on reset.

### 2. Cooldown as a `useState` + `useEffect` timer in `useGame.ts`

**Choice:** Track `cooldownEnd: number | null` (a `Date.now()` target) in React state.
A `useEffect` sets a `setTimeout` for the remaining duration and clears `cooldownEnd` on
expiry. The hint button's disabled state combines `!canHint(attempt)` (budget check),
`cooldownEnd !== null` (timer active), and `!winnable` (position check).

**Why over `attempt.ts`:** The cooldown is wall-clock state, not pure game state. It
should not be in the pure module — it depends on `Date.now()` and cannot be meaningfully
tested without mocking time. The `Attempt` type stays pure and testable.

**Alternative considered:** Storing cooldown in `attempt.ts` with an injected clock.
Rejected as over-engineering for a UI-only timer that has no persistence or server
interaction.

### 3. Cooldown indicator as a radial sweep on the existing `IconButton`

**Choice:** Render the 30-second cooldown as a circular SVG progress arc, animated by CSS
with a negative `animation-delay` so a ring mounted part-way through starts part-way through.
When the cooldown expires, the arc disappears and the button becomes active.

**Not `requestAnimationFrame`, as first planned:** a per-frame update would re-render the
control roughly eighteen hundred times per wait. CSS costs nothing per frame and needs the
clock only at mount and on re-focus, which is also where the "snap on re-focus" mitigation
below is implemented — a `visibilitychange` listener re-reads the clock and remounts the arc.

**The arc is a sibling of the button, not a child of it.** A disabled button renders at 30%
opacity, and an arc inside it inherits that: measured at roughly a fifth of full alpha, which
is not legible. The arc has to stay readable exactly while the control is disabled, since
that is the state it explains.

**Why:** The undo button already uses a badge for its remaining count. Adding a radial
sweep to the hint button distinguishes the two types of limit visually — count (badge)
vs. time (sweep) — without introducing new UI components.

### 4. Constants are named exports, not config

**Choice:** `HINTS_PER_ATTEMPT = 3` and `HINT_COOLDOWN_MS = 30_000` as exported constants,
both in `attempt.ts` alongside `UNDOS_PER_ATTEMPT = 5`.

**Why:** The undo budget uses the same pattern. There is no runtime configuration system, and
adding one for three numbers is not warranted.

**Both in `attempt.ts`, not one in each:** the duration was originally planned for
`useGame.ts` on the grounds that the cooldown is wall-clock state. The running countdown is;
the number thirty thousand is not — it is a plain constant saying what an attempt costs, which
is what this module is for. Splitting them also made the view import a constant from the hook
module, which any test mocking that hook then has to know about.

## Risks / Trade-offs

- **[Timer drift on background tabs]** → Browsers throttle `setTimeout` in background
  tabs. Using a `Date.now()` target instead of an elapsed counter means the cooldown
  still expires correctly; only the visual animation may skip frames. Mitigation: on
  re-focus, snap the indicator to the correct position.

- **[Cooldown feels punishing on first load]** → The player has to wait 30 s before
  their first hint on a new level. This is intentional per the proposal — it encourages
  studying the board. If feedback shows it's too harsh, the constant is trivial to tune.

- **[Budget + cooldown interaction]** → When the budget is exhausted, the cooldown is
  irrelevant — the button stays disabled. No special handling needed; the `canHint`
  check short-circuits before the cooldown check.
