## Context

See proposal.md — Why.

`LevelLeaderboard` is rendered in three places: the completion dialog in `GameScreen`, and
twice in `LevelSelect` (the narrow and wide arrangements of the detail panel). All three pass
the same two props and get the same seven-column row.

The response already carries every field either presentation needs, so this is a rendering
change with no data behind it.

## Goals / Non-Goals

**Goals:**

- The completion dialog shows position and result without truncating names.
- One component, so the two presentations cannot drift apart.
- Stars stay legible, because they decide the order.

**Non-Goals:**

- No change to ranking, to the API, or to what the server stores.
- No change to the level-select presentation.
- No redesign of the completion dialog around the leaderboard.

## Decisions

### 1. A presentation prop, not a second component

`LevelLeaderboard` takes a `compact` flag that the completion dialog sets. Copying the
component would mean two places to fix a leaderboard bug and two places to add a column,
which is how the four actor registries this codebase just deleted came about.

The flag is a presentation choice rather than a behaviour switch: fetching, the period
toggle, the viewer highlight and the outside-top-10 block are identical in both.

### 2. Stars become a count, not three glyphs

Three star glyphs cost roughly three times the width of the digit they encode, and the
compact row needs that width for the name. A single star with a count reads the same and
fits.

The alternative considered was dropping stars entirely, as first requested. It was rejected
because ranking is stars-first: two rows would routinely appear in an order that every
visible number contradicts, and the board would look broken rather than dense.

### 3. The outside-top-10 block is already compact

That block shows stars, moves and time with no ball or badge, so it needs only the star
count treatment for consistency. It is not otherwise part of this change.

## Risks / Trade-offs

- **Two presentations of one component can drift** → They share everything except which
  fields render, and the spec now states both, so a future column has a stated home in each.
- **A count reads less immediately than three stars** → True at a glance, and the reason the
  full-width view keeps the glyphs. The compact row is being read for comparison between
  rows, where a digit is easier to compare than counting marks.
