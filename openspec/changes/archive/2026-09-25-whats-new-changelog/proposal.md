# Proposal

## Why

The game ships changes several times a week (multi-flask pouring, daily ranks, per-level
leaderboards), but players only discover them by accident. A player-facing "What's new"
changelog tells returning players what changed since they last played. Versions are
tagged by hand today, and nothing records what a version contains; generating both from
the commit history removes that manual step and gives the in-game list a single source.

## What Changes

- Adopt Conventional Commits (`feat:`, `fix:`, `chore:`, …) and release-please. On every
  push to `main`, release-please keeps a release PR up to date; merging it bumps the
  version, prepends a section to the root `CHANGELOG.md`, tags `vX.Y.Z`, and the existing
  image pipeline publishes that tag.
- The game reads that `CHANGELOG.md` at build time and shows each release's features
  and fixes to players. Everything else (chores, refactors, docs, tests) stays hidden.
  Release text is English only; the surrounding labels stay translated.
- Add a "What's new" page at `/changelog`, listing every release newest first, reachable
  from a new footer link on every screen that has the footer.
- Show a dismissable "What's new" popup once, the first time a returning player opens
  the game after a new release. It lists only the releases they have not yet seen and
  links to the full page.
- The popup never appears on a player's very first visit, and never appears over
  gameplay, the tutorial, or the daily challenge — it waits until the player is on a
  regular page.
- Which release a player has seen is remembered locally in the browser; no account,
  server call, or tracking is involved.

## Capabilities

### New Capabilities
- `changelog`: the player-facing list of releases, the `/changelog` page, the footer link
  to it, and the one-time "What's new" popup after an update.

### Modified Capabilities
<!-- None: the footer gains a link, but no existing requirement's behaviour changes. -->

## Impact

- **Process**: commit subjects get a Conventional Commits prefix. `feat:` and `fix:`
  subjects are shown to players verbatim, so they must be written for players. Releases
  happen by merging the release-please PR instead of pushing a tag by hand.
- **CI**: new release-please workflow; the image workflow becomes callable from it,
  because tags created with the default token do not trigger other workflows.
- **Client**: a build-time parser for the release-please `CHANGELOG.md`, a `/changelog`
  route, a footer link, a popup mounted in the app shell, a local "last seen version"
  marker, and new i18n keys (locale parity test must stay green).
- **Server**: none. The changelog is shipped in the bundle and works offline.
- **Privacy**: one more localStorage key, covered by the existing Datenschutz wording.
