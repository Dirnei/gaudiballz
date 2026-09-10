## 1. i18n Infrastructure

- [x] 1.1 Install `i18next` and `react-i18next` in the client project
- [x] 1.2 Create `client/src/i18n/en.json` with the initial key structure (empty values are fine — filled in during extraction)
- [x] 1.3 Create `client/src/i18n/de.json` with the same key structure
- [x] 1.4 Create `client/src/i18n/i18n.ts` — initialise i18next with: bundled JSON resources, `lng` from localStorage falling back to `navigator.languages` detection, `fallbackLng: "en"`, interpolation escaping on
- [x] 1.5 Import `i18n.ts` in `main.tsx` so it initialises before the React tree renders
- [x] 1.6 Write a Vitest test that verifies `de.json` has every key present in `en.json` (key-parity check)

## 2. Server-Side API Adjustments

- [x] 2.1 Add an `id` field to achievement response DTOs in `AchievementsSlice.cs` (the catalogue already has string identifiers — expose them)
- [x] 2.2 Include achievement `id` in the completion response's newly-earned list
- [x] 2.3 Add a `noteKey` field to the level response in `LevelsSlice.cs` alongside the existing `chapterNote` text
- [x] 2.4 Add a `code` field to validation error responses in `PlayerIdentitySlice.cs` (e.g., `"username-taken"`, `"username-too-short"`, `"username-too-long"`, `"username-invalid-chars"`)
- [x] 2.5 Add a `code` field to the level-code validation error in `LevelsSlice.cs` (e.g., `"invalid-level-code"`)
- [x] 2.6 Refactor `ProgressionSlice.cs` to store new activity feed events as `{ kind, params }` structured data instead of pre-formatted English text
- [x] 2.7 Update the activity feed GET endpoint to return `kind` + `params` for structured events and `kind: "legacy"` + `text` for old pre-formatted entries
- [x] 2.8 Write integration tests for the new structured feed event format and the legacy fallback

## 3. Extract Client Strings — Navigation & Shell

- [x] 3.1 `AppShell.tsx` — replace all hardcoded strings (nav links, account button labels, footer links, aria labels) with `t()` calls using translation keys; populate `en.json`
- [x] 3.2 `MainMenu.tsx` — extract heading, tagline, button labels, points display, support link
- [x] 3.3 `PageHeader.tsx` — extract aria label
- [x] 3.4 `ErrorFallback.tsx` — extract heading, message, back link, dev detail summary label

## 4. Extract Client Strings — Gameplay

- [x] 4.1 `GameScreen.tsx` — extract all strings: brand name, loading/error states, level badge, control buttons, hint labels, restart dialog, stuck notice, solved overlay (including pluralised and interpolated strings)
- [x] 4.2 `TutorialScreen.tsx` — extract header, skip button, solved overlay text
- [x] 4.3 `tutorial.ts` — extract step prompt strings
- [x] 4.4 `Tube.tsx` — extract aria labels (interpolated)
- [x] 4.5 `LiveTimer.tsx` — extract seconds suffix and target time format

## 5. Extract Client Strings — Hub Screens

- [x] 5.1 `LevelSelect.tsx` — extract page title, input placeholder, button labels, error message
- [x] 5.2 `AccountPanel.tsx` — extract headings, button labels, busy state, error messages, ball picker heading
- [x] 5.3 `BallPicker.tsx` — extract empty state, hints, error text, aria labels
- [x] 5.4 `passkeys.ts` — extract blocker messages
- [x] 5.5 `AchievementsScreen.tsx` — extract page title, category labels, not-logged-in text, loading text, progress label; map achievement names/descriptions via `achievement.<id>.name` / `.description` keys, falling back to server-provided English
- [x] 5.6 `AchievementsSection.tsx` — extract heading, loading text, category labels (share keys with AchievementsScreen)
- [x] 5.7 `AchievementToast.tsx` — extract toast text

## 6. Extract Client Strings — Stats & Leaderboard

- [x] 6.1 `LeaderboardPage.tsx` — extract heading, period tabs, table headers, player marker, loading/empty states, rank text
- [x] 6.2 `StatsPage.tsx` — extract heading, not-registered text, loading text, stat labels, sub-text, progress section labels
- [x] 6.3 `ProgressTiles.tsx` — extract tile labels
- [x] 6.4 `StatsRibbon.tsx` — extract community stat chips (interpolated, pluralised)
- [x] 6.5 `RecentGames.tsx` — extract heading, status badges, detail strings
- [x] 6.6 `ActivityFeed.tsx` — extract heading; replace `relativeTime()` with `Intl.RelativeTimeFormat`; add translation keys for structured feed event kinds (`feed.level-cleared`, `feed.new-record`, `feed.achievement-earned`); render `legacy` kind events with their raw `text`

## 7. Language Switcher

- [x] 7.1 Create a `LanguageSwitcher` component (compact toggle: "EN" / "DE") that calls `i18next.changeLanguage()` and persists the choice to localStorage
- [x] 7.2 Add the language switcher to the `AppShell` footer area
- [x] 7.3 Verify the switcher re-renders all visible text immediately without page reload

## 8. German Translations

- [x] 8.1 Fill in all German translations in `de.json` — UI strings (nav, buttons, headings, dialogs, error messages, aria labels)
- [x] 8.2 Add German translations for all 20 achievement names and descriptions keyed by achievement ID
- [x] 8.3 Add German translations for chapter notes keyed by `noteKey`
- [x] 8.4 Add German translations for structured activity feed event templates
- [x] 8.5 Add German translations for validation error codes
- [x] 8.6 Verify pluralisation rules work for German (e.g., "1 Zug" vs. "3 Züge")

## 9. Verification

- [x] 9.1 Run `npm test` — all existing client tests pass
- [x] 9.2 Run `dotnet test` — all existing server tests pass (including conformance)
- [x] 9.3 Run the key-parity test from 1.6 — no missing keys in either locale file
- [x] 9.4 Build and run `docker compose up -d --build` — verify the game loads at http://localhost:8123
- [x] 9.5 Playtest in English: navigate all screens, play a level, check achievements, leaderboard, stats, activity feed, account panel, level select, tutorial
- [x] 9.6 Switch to German via the language switcher and repeat the playtest — verify all interactive text is German, legal pages stay German, no English strings leak through
- [x] 9.7 Verify browser language detection: visit in a fresh incognito window with browser language set to `de` — UI should default to German
- [x] 9.8 Verify localStorage persistence: select German, close and reopen — German should persist
