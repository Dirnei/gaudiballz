## Why

The per-level leaderboard already has a requirement for narrow presentation: where it is
shown in a constrained space, the profile ball and rank badge are omitted and the star
rating collapses to a count. Only the completion dialog honours it. The level-select detail
panel carries all seven columns at every width, and on a 320px phone that leaves about four
characters for the player's name — `grad…`, `flas…`, `nim…`. The panel is a full-height
sheet on a phone, so it is a constrained space by any reading, and the requirement already
applies to it.

Underneath sits a second defect. The rank badge is asked to hide on small screens with
`hidden sm:inline-flex`, but the badge component hardcodes `inline-flex` in its own class
list. Both land on the element with equal specificity, so which one wins is decided by the
order Tailwind happens to emit them, and `inline-flex` does. The badge has never hidden at
any width, and the code reads as though it does.

## What Changes

- The leaderboard drops the profile ball and rank badge, and shows the star rating as a
  count, whenever it is rendered narrow — not only when the caller asks for it.
- The completion dialog keeps asking for the compact form outright, because it is narrow at
  every viewport rather than only on a phone.
- The rank badge stops carrying visibility classes it cannot honour; whether it renders is
  decided where the decision is actually made.
- No change to which entries appear, their order, or the API.

## Capabilities

### Modified Capabilities

- `level-leaderboard`: The entry-contents requirement already covers constrained space but
  offers only the completion dialog as an example, which the implementation read as the
  whole rule. It gains a scenario pinning the narrow-viewport case so the requirement cannot
  be satisfied in one place and missed in another.

## Impact

- **Client**: `LevelLeaderboard` decides the compact presentation from its own rendered
  width as well as the `compact` prop. `RankBadge` loses its inert responsive classes. A
  viewport hook is introduced, the first in this codebase, so the test setup gains a
  `matchMedia` stub that jsdom does not provide.
- **Server**: No change.
- **Risk**: The breakpoint is a guess at where the columns stop fitting. It is verified at
  320px and at desktop width, but sits untested between those points.
