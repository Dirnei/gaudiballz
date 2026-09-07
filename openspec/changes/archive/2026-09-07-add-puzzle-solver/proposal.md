# Add puzzle solver

## Why

A player can reach a position that cannot be solved, and nothing tells them. The rules
allow it — burying a colour under three others with no spare room is a legal sequence of
legal moves — and the game currently responds by doing nothing at all. You keep tapping,
nothing is illegal, and the level is already over. That reads as the game being broken
rather than as a mistake you made.

There is also no way to ask for help. Undo and Restart exist, but a player who is stuck in
the ordinary sense — the position is fine, they just cannot see the move — has nothing.

Both wants come from the same machinery: something that can look at a board and say whether
it is still winnable, and if so, what to play next.

## What Changes

- Add a solver that searches for a solution from any position, under a strict budget so it
  can never hang the interface.
- Tell the player when the position can no longer be won, as soon as it happens, with the
  way out offered rather than implied.
- Add a hint that plays the next move on a winning path.
- Distinguish three answers honestly: **winnable** (here is a move), **dead** (proved no
  solution exists), and **unknown** (the search ran out of budget). Unknown must never be
  reported as dead.
- Make hints free and unlimited. There is no monetization here, so the only reason to meter
  them would be to manufacture frustration.
- Track hints used per level, so a later stats capability has the number and so a hinted
  clear can be distinguished from an unaided one.

## Capabilities

**New Capabilities**:

- `puzzle-solver` — deciding whether a position is still winnable, and choosing the next
  move when it is.

**Modified Capabilities**: none. The solver only reads boards and moves; it does not change
what a move does or when a board is solved.

## Impact

- Adds a solver to `client/src/engine`, which is where hints belong: the rules engine is
  already there, the answer arrives in one frame instead of a round trip, and it keeps
  working with no connection — which the PWA needs anyway.
- No server involvement, no new endpoint, no CPU cost on the host. An earlier design put
  hints on the server and identified free unlimited hints as the easiest way for an idle
  browser tab to burn the host's CPU; running them on the client removes that entirely.
- Adds UI: a hint control, and a notice when the position is dead.
- The solver is deliberately **not** on the correctness path. Level solvability is
  guaranteed by construction at generation time, so a solver bug can make a hint wrong or
  absent but can never produce an unsolvable level.

## Decisions

- **Bounded, and honest about it.** The search stops at a node and time budget. Running out
  is reported as unknown, never as dead, because falsely telling a player their winnable
  position is lost is far worse than staying quiet.
- **Dead positions are announced, not enforced.** The game does not block further moves or
  auto-restart. It says the position cannot be won and offers Undo and Restart; carrying on
  is the player's business.
