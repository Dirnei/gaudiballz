# Proposal

## Why

The game is silent. Sound is a large part of what makes a sorting game feel good: a pop when you
pick up, a clack as balls land, a small chord when a flask fills. Without it every move feels
lighter than it should. The player auditioned candidates and picked six generated sounds.

## What Changes

- Sounds on six board events, in every play mode (campaign, daily challenge, tutorial):
  - **Pick up** (soft pop): balls are picked up, added to a multi-selection, or a different flask
    is picked up instead.
  - **Drop** (marble clack): a pour lands. Its pitch rises with how full the receiving flask is
    afterwards, so filling a flask climbs a small scale.
  - **Flask full** (chord bloom): a pour completes a flask.
  - **Solved** (pentatonic run): the level is solved. It replaces the flask-full sound on the
    final pour.
  - **Not allowed** (double buzz): a tap or drop that can neither pour nor pick anything up, such
    as tapping a finished flask while holding balls, or dropping a drag onto a flask that can't
    take it.
  - **Undo** (tick down): a move is taken back.
- A **Sound button** on the game screen opens a small menu with an on/off switch and a volume
  slider. `M` turns sound on and off. Both settings are remembered on the device; the default is
  on at 80%.
- The sounds are generated in the browser, so there is nothing to download and nothing extra to
  cache for offline play.

## Capabilities

### New Capabilities

- `game-sounds`: which board events make a sound, how the drop pitch follows the fill level,
  and the sound menu (on/off and volume).

### Modified Capabilities

_None._ The shared board already guarantees identical interaction across modes, and sounds hang
off that shared board.

## Impact

- Client only: a new sound module, calls from the shared `GameBoard` next to the existing haptics,
  a Sound button and menu in the board's control row, the `M` shortcut, and `en`/`de` strings.
- No server, API, rules-engine or conformance change.
