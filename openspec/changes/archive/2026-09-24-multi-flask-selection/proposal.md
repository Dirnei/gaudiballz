# Proposal

## Why

Most flasks on an opening board are full, so the only useful first moves are into the empty
spare. Gathering one colour there takes a separate tap-tap pair for every flask that has it
on top. That is repetitive busywork, not puzzle-solving. Letting the player pick up several
matching flasks and pour them all with one tap removes the chore without changing the rules.

This change builds on `unify-game-board`. It is implemented once in the shared board and
behaves the same in campaign, daily and tutorial.

## What Changes

- The selection can hold more than one flask. When a flask is selected and the player taps a
  **full**, not-finished flask with the **same top colour**, that flask joins the selection
  instead of replacing it. A full flask cannot be poured into, so this tap had no use before.
- With two or more flasks selected, tapping an **empty** flask, or a flask with the same top
  colour and room for **every** selected ball, pours from each selected flask in the order
  they were picked.
- With two or more selected, tapping any other flask behaves like an illegal pour does today:
  the selection is replaced by that flask if it can be picked up, and cleared otherwise. Room
  for only some of the balls counts as illegal. Nothing is poured.
- With exactly one flask selected, pouring works exactly as before (a partial pour is still
  allowed).
- Tapping any selected flask, or pressing Escape, clears the whole selection.
- A multi-pour is recorded as one ordinary move per source flask, so move count, par, stars
  and server verification treat it as N moves. Undo reverts the whole multi-pour as one step
  and spends one undo.
- Keyboard activation (Enter/Space and digit keys) goes through the same path as a tap and
  gets the same behaviour. Drag stays single-flask. Starting a drag clears a multi-selection.
- Every selected flask shows the raised "picked up" state.
- No change to the rules engine, the C# engine, the server or the conformance fixtures.

## Capabilities

### New Capabilities
- `multi-flask-selection`: picking up several same-coloured full flasks and pouring them
  together into one destination. Covers the join rule, the destination rule, move
  accounting, grouped undo and input parity.

### Modified Capabilities
<!-- None: existing tap, keyboard and undo requirements still hold for a single selection;
     the multi-selection behaviour is specified in the new capability. -->

## Impact

- Client only: the shared board hook and selection logic introduced by `unify-game-board`,
  `client/src/engine/history.ts` (grouped undo step), and the `Tube` selected state.
- Tests: new Vitest coverage for the selection resolver, the grouped history and the hook.
- No API, server, Mongo or conformance impact. A multi-pour is submitted as plain moves.
- Depends on `unify-game-board` landing first.
