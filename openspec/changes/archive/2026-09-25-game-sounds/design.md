# Design

## Context

Board interaction lives in one shared place: `GameBoard` renders every mode and already fires
`haptics` on move, flask complete, win and blocked; `useBoardPlay` owns the state and
`resolveTap` decides what a tap means. A tap on a flask that can't take the pour picks that flask
up instead (`redirect`), so a real "not allowed" only happens when the redirect finds nothing to
pick up, or when a drag is released over an illegal target.

The six sounds were chosen on an audition page, where they were written as Web Audio code. That
code is the starting point here.

## Goals / Non-Goals

**Goals:**
- The sounds exactly as auditioned, played from one module with one master gain.
- Events derived in one place, so every mode gets them identically.

**Non-Goals:**
- Music, or per-sound volume. One master volume and an on/off switch are enough.
- Sounds on the shared result page's replay (the ghost-replay change can add them later).
- Haptics changes. The existing vibrations stay as they are.

## Decisions

**Synthesised with the Web Audio API, no files.** `client/src/sound/sounds.ts` holds the six
generators copied from the audition page (`strike` for glass-like partials, `noise` for the clack,
`sweep` for the buzz) on a lazily created `AudioContext` and one master `GainNode`. There are no
assets to cache for the PWA or to fail offline, and the code is about 100 lines.
- *Alternative*: render the picks to MP3 and play files. Rejected: the pitch rise works per fill
  level at runtime, which is exact with synthesis and needs `playbackRate` tricks with files.

**The clack rises as the samples did in the audition.** The auditioned marble clack ignored the
fill level (only the rising tink and the samples used it), even though the player chose "rise =
on". Here the clack's strike frequency and the noise band centre are both multiplied by
`2^(2·level/12)` (two semitones per ball), where `level` is the number of balls in the receiving
flask after the pour, minus one. That matches how the samples rose in the audition.

**Unlocking audio.** Browsers only start an `AudioContext` from a user gesture. The context is
created and `resume()`d on the first sound request, which always comes from a tap, click or key.
Every call is wrapped so a missing or blocked `AudioContext` is a silent no-op, like `haptics`.

**Where events are detected.**
- Pick up, not allowed: a pure `tapSound(board, selected, index)` in `board/tapSound.ts` asks
  `resolveTap` what the tap is about to do, before it is applied. A `select` outcome with flasks
  in it is a pick-up. An empty one while something was held is not allowed, unless it was the held
  flask being put down. `GameBoard` calls it on every tap path (pointer, Enter/Space, number
  keys). `useBoardPlay` stays untouched: classifying from the same pure decision the tap uses
  keeps the two from disagreeing, without widening the hook's API. Drag release over an illegal
  target (the existing `validate(...) !== 'None'` branch) plays not-allowed there.
- Drop, flask full, solved, undo: `GameBoard` watches the board the way the haptics effects already
  do. When the move count goes up, it plays drop (level taken from the destination of the last move
  in `state.moves`), then solved if `game.solved`, else flask full if the completed count rose.
  Undo plays from the undo button and key handlers directly. Hints pour through `play()`, so they
  get the drop sound for free.

**Settings.** `sounds.ts` keeps two values, each in `localStorage` inside try/catch:
`gaudi-sound` (`'on' | 'off'`, default on) and `gaudi-sound-volume` (0-1, default 0.8). A tiny
module-level store publishes changes, so every mounted board agrees, and `useSoundSetting()`
reads it with `useSyncExternalStore`. Volume is the master `GainNode`'s gain, applied live;
off is checked before any voice is built, so a muted game creates no audio nodes at all.

**Menu.** `SoundMenu` is a small popover anchored above the Sound control button in the existing
control row. It has a switch (`role="switch"`) and a native `<input type="range">` (0-100, step 5)
with the percentage beside it. The range plays the pick-up sound on `change` (release), not on
every `input`, so dragging the thumb doesn't machine-gun pops. It closes on an outside pointer
down, a second tap on the button, or Escape. `GameBoard` owns the open state and returns early
from its document keydown handler while the menu is open (except for `M`), so Escape can't also
clear the selection or leave the level. The icon on the button shows a crossed speaker when off.
- *Alternative*: a separate settings page. Rejected: a player changes volume mid-level, and
  leaving the board to do it would interrupt the attempt.

No server, Akka, persistence or determinism concerns: this is client-only presentation.

## Risks / Trade-offs

- [iOS mutes Web Audio when the ring/silent switch is on] → expected platform behaviour. It
  matches what players get from other web games, and the toggle still works.
- [Rapid taps stack many voices] → each sound is under 0.6 s with fast decays, and voices are
  garbage-collected after `stop()`. Nothing to pool at this scale.
- [jsdom has no AudioContext] → tests stub the sound module and assert which sound was requested,
  not audio output. The generators themselves are only checked on the live build by ear.
