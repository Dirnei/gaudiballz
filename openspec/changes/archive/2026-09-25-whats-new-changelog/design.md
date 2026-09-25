# Design

## Context

See proposal.md for motivation. Relevant current state:

- The app shell (`AppShell.tsx`) owns the header, footer and every non-immersive route
  (`/`, `/levels`, `/leaderboard`, `/stats`, `/impressum`, …). Gameplay, tutorial and
  daily run under `ImmersiveLayout`, which has no footer. "Screens that show the footer"
  in the spec is exactly the set of `AppShell` children.
- The footer already shows `APP_VERSION`, a build-time constant set from the image tag;
  the changelog follows the same "baked into the bundle" model so it works offline.
- Releases are hand-pushed `vX.Y.Z` tags (latest `v0.6.0`). `.github/workflows/release.yml`
  builds and pushes the image to GHCR on a `v*` tag push.
- Commit subjects are one line, 74 chars max, no body, and not yet conventional.
- i18n is `react-i18next` with `en.json` / `de.json` and a locale-parity test.
- Identity is created silently on first launch and stored under `puzzle.playerId` in
  localStorage — the only signal distinguishing a returning player from a first visit.
- Content pages use `PageLayout` (title + back-to-menu header).

## Goals / Non-Goals

**Goals:**
- The changelog writes itself from commit subjects; there is no separate file to edit.
- Zero server involvement; zero cost to the game when storage is blocked.

**Non-Goals:**
- No translated release text. Labels are translated; release text is English.
- No per-account "seen" sync across devices; a second device may show a notice again.
- No unread badge/dot in the header or footer; the one-time notice is the nudge.
- No commit-message linting in CI for now; the convention lives in CLAUDE.md.

## Decisions

### release-please owns versions, tags and `CHANGELOG.md`

Manifest mode with `release-type: simple` (no package manifest to bump; it keeps
`version.txt` and `CHANGELOG.md`). `.release-please-manifest.json` starts at `0.6.0`, the
latest existing tag, so release-please picks up from there; older non-conventional
commits are simply not parsed. Tags stay `vX.Y.Z` (`include-component-in-tag: false`), so
existing tags and `release.yml` semver patterns keep working.

`changelog-sections` shows `feat` → "Features" and `fix` → "Bug Fixes"; every other type
is `hidden`. The release PR title (`chore(main): release X.Y.Z`) is itself a hidden type.

Release PRs are merged with squash or rebase to keep history linear.

- *Tags created by `GITHUB_TOKEN` don't trigger other workflows.* So `release.yml` gains a
  `workflow_call` trigger with a `tag` input, and the release-please workflow calls it
  when `release_created` is true. The `push: tags` trigger stays for manual tags. The tag
  used for checkout, semver image tags and `APP_VERSION` is `inputs.tag || github.ref_name`.
- *Repository setting:* "Allow GitHub Actions to create and approve pull requests" must
  be enabled for release-please to open its PR. This is a one-time manual step.

### The game parses release-please's `CHANGELOG.md` at build time

A small Vite plugin loads root `CHANGELOG.md`, parses it, and hands the client a plain
JSON module of `{ version, date, features: string[], fixes: string[] }[]`, newest first.
The client ships no Markdown parser, and the list is a build-time constant (offline-safe).

The parser (pure, no imports, shared by plugin and tests) reads release-please's format:

```markdown
## [0.7.0](https://github.com/…/compare/v0.6.0...v0.7.0) (2026-09-25)

### Features

* **daily:** Show your rank outside the top ten ([abc1234](https://github.com/…))

### Bug Fixes

* Keep move count stable across undo ([def5678](…)), closes [#12](…)
```

- Release headings: `##` or `###` (older release-please used `###` for patches), version
  with or without link, date in parentheses. First releases (`## 0.1.0 (date)`) parse too.
- Only `### Features` and `### Bug Fixes` bullets are kept. For each bullet the parser
  drops the `**scope:**` prefix, the trailing commit link and `closes`/issue references,
  unwraps any remaining Markdown links to their text, and capitalises the first letter.
- Releases with no kept bullets are dropped.
- It still fails the build (with line number) on an unreal date or versions that are not
  strictly descending — cheap guards against a bad hand edit or a merge accident.
- Docker: `.dockerignore` excludes `*.md`, so `!CHANGELOG.md` is added and the client stage
  copies it to `/CHANGELOG.md`, the same position relative to `client/` as in the repo.
- Vite dev server: `server.fs.allow` includes the file so dev mode can load it.

### Seen-marker is the newest seen version

localStorage key `gaudi-changelog-seen` holds the version of the newest release the player
has seen. Unseen = releases whose version is numerically greater (major, minor, patch
compared as numbers, so `0.10.0 > 0.9.0`). Editing old release text never re-triggers the
notice.

Initialisation when the key is absent is decided once, synchronously, at module load,
before identity bootstrap can write `puzzle.playerId`:

- `puzzle.playerId` absent → first visit → marker := newest version (nothing shown).
- `puzzle.playerId` present → existing player → marker := second-newest version (or empty
  if there is only one), so only the newest release is shown.

Reading `puzzle.playerId` directly (not via `identity.ts`) is deliberate: its state is
needed before identity may create it. If any storage access throws, nothing counts as
unseen and writes are no-ops.

### Notice lives in AppShell, so immersive routes get it for free

`WhatsNewDialog` is rendered by `AppShell`, so it can never cover gameplay, tutorial or
daily and appears the first time the player lands on a footer screen. It is hidden on
`/changelog` itself. Modal dialog (`role="dialog"`, `aria-modal`, labelled heading, focus
moved in, Escape and backdrop close it), Motion-animated. It lists up to 5 unseen
releases; "See all changes" links to the page. Every close path marks everything seen.

### Rendering releases

Shared `ChangelogEntryList`: heading "Version X.Y.Z" plus the date formatted with
`Intl.DateTimeFormat(i18n.language)`, then "New" and "Fixed" sub-lists (labels translated,
bullets English, wrapped in `lang="en"` so screen readers pronounce them correctly in the
German UI). `ChangelogPage` (under `AppShell`, using `PageLayout`) lists all releases and
marks all seen on mount. Footer gets a "What's new" link.

### No Akka.NET, no server

Nothing touches the backend; there is no per-player server state, so actors (or a plain
service) have no role. No determinism concerns: nothing is seeded or generated.

## Risks / Trade-offs

- [A developer-worded `feat:` reaches players] → CLAUDE.md states that `feat:`/`fix:`
  subjects are player-facing; internal work uses `refactor:`/`chore:`. The release PR is a
  review point: its `CHANGELOG.md` diff can be edited before merging.
- [Non-conventional commit slips in] → release-please ignores it; the change just doesn't
  appear. Acceptable; commit linting can be added later.
- [Changes since v0.6.0 were committed without prefixes] → They won't appear in 0.7.0
  automatically; add them by hand in the first release PR's `CHANGELOG.md`.
- [Notice feels like a nag] → Once per release, never on first visit, never mid-game, one
  click to dismiss, nothing about accounts.
- [Player clears storage] → Treated as a first visit (no notice). Harmless.

## Migration Plan

1. Seed `CHANGELOG.md` in release-please format with hand-written 0.5.1, 0.5.2 and 0.6.0
   sections, so the page has history before the first automated release.
2. Add release-please config, manifest (`0.6.0`) and workflow; make `release.yml` callable.
3. Enable "Allow GitHub Actions to create and approve pull requests" in repo settings.
4. From now on, commit with conventional prefixes. The first release PR (0.7.0) collects
   them; merge it (squash/rebase) to tag and publish.

Rollback: delete the workflow and config; tags and `CHANGELOG.md` stay valid, and the
orphaned localStorage key is ignored.
