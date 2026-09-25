# Tasks

## 1. Changelog data

- [x] 1.1 Write `client/src/changelog/entries.test.ts` asserting every entry has a valid ISO date, dates are strictly descending, and `en`/`de` each have the same non-zero number of non-empty bullets; verify it fails (module missing)
- [x] 1.2 Create `client/src/changelog/entries.ts` with the entry type and a seed entry (EN + DE) summarising recent player-visible highlights; verify `npm test -- entries` passes

## 2. Seen-marker

- [x] 2.1 Write `client/src/changelog/seen.test.ts` covering: first visit (no `puzzle.playerId`) → no unseen entries; existing player without marker → only newest entry unseen; marker older than two entries → both unseen, newest first; `markAllSeen` clears unseen and persists across re-init; storage that throws → no unseen entries and no crash; verify it fails
- [x] 2.2 Implement `client/src/changelog/seen.ts` (marker key `gaudi-changelog-seen`, one-time initialisation captured at module load, `unseenEntries()`, `markAllSeen()`, all storage access in try/catch); verify `npm test -- seen` passes
- [x] 2.3 Import the changelog seen module in `client/src/main.tsx` before `./game/App` so initialisation runs before identity bootstrap; verify with a test or by reasoning in review that `puzzle.playerId` is read before any identity write

## 3. UI strings

- [x] 3.1 Add `changelog.*` keys (page title, footer link "What's new" / "Was ist neu", dialog heading, "Got it", "See all changes") to `en.json` and `de.json`; verify the locale-parity test passes

## 4. Changelog page and footer link

- [x] 4.1 Write `ChangelogPage.test.tsx`: renders every entry newest first with localized date and bullets in the active locale (`de` shows German), and mounting it marks all entries seen; verify it fails
- [x] 4.2 Implement a shared `ChangelogEntryList` and `ChangelogPage` (using `PageLayout`), add the `changelog` route under `AppShell` in `App.tsx`; verify the page test passes
- [x] 4.3 Add a test in `App.test.tsx` that the footer shows a "What's new" link navigating to `/changelog`, then add the link to the `AppShell` footer styled like the other links; verify the test passes

## 5. What's new notice

- [x] 5.1 Write `WhatsNewDialog.test.tsx`: shows unseen entries only (capped at 5, newest first) as an accessible modal; "Got it", Escape and backdrop close it and mark entries seen; "See all changes" closes it and navigates to `/changelog`; renders nothing when there are no unseen entries; verify it fails
- [x] 5.2 Implement `WhatsNewDialog` with Motion enter/exit, focus on open, scrollable body; verify the dialog test passes
- [x] 5.3 Add `App.test.tsx` cases: dialog appears on `/` for a returning player with unseen entries, does not appear on `/play` and then appears after navigating to `/`, does not appear on a first visit; mount the dialog in `AppShell`; verify the tests pass

## 6. Wrap-up

- [x] 6.1 Add a "Changelog" line to CLAUDE.md Key Conventions: player-visible changes add an entry to `CHANGELOG.md` (EN + DE, one entry per day); verify it reads correctly
- [x] 6.2 Run `cd client && npm test && npm run build` and `openspec validate whats-new-changelog --strict`; verify all pass
- [x] 6.3 Rebuild and redeploy with `docker compose up -d --build`, then on http://localhost:8123 verify: footer link opens the page; a fresh browser profile shows no notice; setting `gaudi-changelog-seen` to an older date shows the notice once, which does not reappear after reload

## 7. Author the changelog in root `CHANGELOG.md`

- [x] 7.1 Write `client/src/changelog/parse.test.ts` covering a valid file (title and comments ignored, continuation lines, newest first) and each rejection with its line number (bad date, dates out of order or repeated, unknown language, bullet outside a language, stray text, missing `en`, bullet count mismatch); verify it fails
- [x] 7.2 Implement the pure parser `client/src/changelog/parse.ts`; verify `parse.test.ts` passes
- [x] 7.3 Add a Vite plugin in `vite.config.ts` that turns `CHANGELOG.md` into a JSON module and fails the build on parse errors, allow the file in `server.fs.allow`, move the existing entries into root `CHANGELOG.md`, and make `entries.ts` re-export the parsed list; verify `npm test` passes and a deliberately broken file fails `npm run build`
- [x] 7.4 Add `!CHANGELOG.md` to `.dockerignore` and copy it in the Dockerfile client stage; update the CLAUDE.md convention to point at `CHANGELOG.md`; verify `docker compose up -d --build` succeeds and `/changelog` shows the entries from the file

## 8. Switch the source to release-please

- [x] 8.1 Rewrite `parse.test.ts` for the release-please format: linked and first-release headings, `##`/`###` release levels, only Features and Bug Fixes kept, scope prefix / commit link / closes refs stripped, first letter capitalised, releases without features or fixes dropped, errors for unreal dates and non-descending versions (numeric: 0.10.0 > 0.9.0); verify it fails
- [x] 8.2 Rewrite `parse.ts` to the `{ version, date, features, fixes }` model; verify `parse.test.ts` passes
- [x] 8.3 Switch the seen-marker to versions with numeric comparison; update `seen.test.ts` (including 0.9.0 → 0.10.0) first, then `seen.ts`; verify it passes
- [x] 8.4 Render "Version X.Y.Z" + localized date with translated "New"/"Fixed" sub-lists and English bullets marked `lang="en"`; update `ChangelogPage`, `WhatsNewDialog`, `App` tests and `entries.test.ts` first, then the components and i18n keys; verify `npm test` passes
- [x] 8.5 Rewrite root `CHANGELOG.md` in release-please format with 0.5.1, 0.5.2 and 0.6.0 sections from the tag history; verify `npm run build` passes and a broken date still fails it
- [x] 8.6 Add `release-please-config.json` (simple, `v` tags, only feat/fix visible), `.release-please-manifest.json` at 0.6.0, and `.github/workflows/release-please.yml` calling `release.yml` via `workflow_call` on `release_created`; make `release.yml` callable with a `tag` input; verify both YAML files parse and the config matches the release-please schema keys
- [x] 8.7 Update CLAUDE.md: Conventional Commits prefix on the one-line subject, `feat:`/`fix:` are player-facing, internal work uses other types, releases happen by merging the release-please PR; replace the old changelog convention; verify it reads correctly
- [x] 8.8 Run `npm test`, `npm run build`, `openspec validate whats-new-changelog --strict`, rebuild Docker and verify `/changelog` shows the seeded releases with New/Fixed labels in EN and DE
