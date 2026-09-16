## Context

See proposal.md — Why.

`LevelLeaderboard` already renders two presentations, chosen by a `compact` prop the caller
sets. The completion dialog sets it; the two level-select usages do not, and so keep all
seven columns on a phone.

The codebase has no media-query hook, no `matchMedia` call anywhere, and no `matchMedia`
stub in the vitest setup — jsdom does not implement it.

## Goals / Non-Goals

**Goals:**

- One rule deciding the presentation, applied wherever the leaderboard renders.
- Existing tests keep asserting what is in the document rather than what CSS would hide.
- The dialog stays compact regardless of viewport.

**Non-Goals:**

- No change to the columns themselves, their order, or the table layout.
- No responsive work elsewhere in level select; only the leaderboard is in scope.
- No container-query migration, tempting though it is — see below.

## Decisions

### 1. A viewport hook, not CSS visibility

The presentation is chosen in JavaScript and only the chosen one is rendered.

The alternative is Tailwind's responsive variants: render both and let `hidden sm:table-cell`
decide. It needs no hook and no stub, and it would resize for free. It was rejected because
every existing test asserts what is *in the document* — that no rank badge is present, that
the ring is absent, that there are exactly two star glyphs for two rows. Under CSS
visibility all of that is still in the DOM, jsdom applies no stylesheet, and those
assertions would have to be rewritten to inspect class names instead. That trades behaviour
tests for implementation tests, on the part of this component most likely to regress.

Keeping the decision in JavaScript also keeps the spec's word literal: the ball and badge are
omitted, not merely hidden.

### 2. Container queries would be the better tool, and are still not it

"Show fewer columns when *this component* is narrow" is the definition of a container query,
and Tailwind 4 supports them. They would collapse the prop and the hook into one rule that
is correct for a narrow dialog on a wide screen without anyone passing anything.

They are not used here for the same reason as above: they are CSS, so jsdom sees both
presentations and the test suite loses its grip on this component. Worth revisiting if the
tests move to a real browser.

### 3. `compact` becomes a floor, not the whole answer

The prop keeps its meaning — the caller insisting on the compact form — and the hook adds
the case the caller cannot know about. The dialog passes it because it is narrow at every
viewport; level select passes nothing and is compact only when the viewport is.

### 4. The breakpoint matches the one already in the markup

640px, Tailwind's `sm`, which is the width the now-inert `hidden sm:inline-flex` was already
reaching for. Reusing it keeps one number in play rather than introducing a second.

### 5. The badge stops claiming to hide itself

`RankBadge` hardcodes `inline-flex` and callers pass `hidden sm:inline-flex`; both apply and
emission order decides, so the `hidden` never takes effect. Rather than fix the specificity
and leave two mechanisms deciding the same thing, the classes come off and the caller's
conditional render is the only thing that decides.

## Risks / Trade-offs

- **The hook runs on the viewport, not the component** → A narrow panel on a wide screen
  still needs the prop. That is exactly what the dialog passes, so no caller is wrong today,
  but a future narrow placement will need the same.
- **A `matchMedia` stub in the shared setup affects every test** → It is the standard jsdom
  gap and the stub is inert for tests that never call it.
- **First render before the listener attaches** → The hook reads the current match during
  initialisation rather than defaulting and correcting, so there is no flash of the wrong
  presentation.
