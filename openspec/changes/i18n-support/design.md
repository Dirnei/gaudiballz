## Context

All ~150-180 user-facing strings are hardcoded inline across ~25 TSX/TS files and several C# server files. No i18n infrastructure exists. The Impressum and Datenschutz pages are already German-only (legal requirement). See proposal.md — Why for motivation.

Server-side strings that reach the UI:
- **Achievement catalogue** (`AchievementCatalogue.cs`): 20 achievements with English `Name` and `Description`, each already has a unique string `Id`.
- **Chapter notes** (`LevelCatalogue.cs`): ~5 English strings returned per level range.
- **Activity feed** (`ProgressionSlice.cs`): pre-formatted English sentences stored in MongoDB.
- **Validation errors** (`PlayerIdentitySlice.cs`, `LevelsSlice.cs`, etc.): English error strings returned in API responses.

## Goals / Non-Goals

**Goals:**
- Every interactive UI string is sourced from locale files, not hardcoded.
- English and German locale files ship with the client.
- Browser language detection on first visit, manual override persisted in localStorage.
- Language switcher in the app shell.
- Server-provided content (achievements, chapter notes) localisable via client-side key mapping.
- Activity feed events stored as structured data going forward; legacy entries degrade gracefully.

**Non-Goals:**
- Server-side locale negotiation via `Accept-Language` header (all translation happens client-side).
- Translating Impressum/Datenschutz (legally required in German).
- Right-to-left layout support.
- Locale-specific level generation or game rule changes.
- User-generated content translation (usernames, etc.).
- Translating the activity feed's legacy pre-formatted strings retroactively.

## Decisions

### 1. Client-side only translation with `react-i18next`

**Choice:** `react-i18next` + `i18next` with JSON locale files bundled in the client.

**Why over server-side localisation:** The game's architecture is "client plays, server verifies." All rendering happens in the browser. Keeping translations client-side means one source of truth for all display text, no API changes for locale negotiation, and the translation works offline. The server continues to return English plus stable identifiers; the client overrides display text from its locale files.

**Why over `react-intl` / FormatJS:** `react-i18next` has a simpler API for the hook-based React 19 codebase (`useTranslation` hook), built-in pluralisation via ICU-like syntax, and namespace support for organising ~180 keys. Both libraries are mature; this is a preference call.

**Alternatives considered:**
- Server-side resource files (`.resx`) with `Accept-Language`: would require every API endpoint to locale-negotiate, adds complexity to the server for content that's purely presentational.
- Custom context-based solution (no library): not worth building pluralisation and interpolation from scratch.

### 2. Flat namespace with a single JSON file per locale

**Choice:** `client/src/i18n/en.json` and `client/src/i18n/de.json`. One file per locale, flat key hierarchy with dot-separated logical groups (e.g., `"game.hint.showMove"`, `"menu.play"`, `"achievements.title"`).

**Why not multiple namespace files:** With ~180 keys total, splitting into namespace files adds indirection without meaningful code-splitting benefit. Vite bundles the active locale's JSON statically. A single file per locale keeps translation review simple — one diff, one file.

**Key naming convention:** `<screen>.<element>` for screen-specific strings, `<domain>.<item>` for shared concepts. Examples:
- `game.restart.title` → "Restart this level?"
- `game.restart.confirm` → "Restart"
- `game.restart.cancel` → "Cancel"
- `nav.home` → "Home"
- `achievements.category.milestone` → "Milestones"
- `achievement.first-steps.name` → "Erste Schritte" (keyed by achievement ID)

### 3. Achievement localisation via client-side key mapping

**Choice:** The achievement API already returns a unique `id` string per achievement. The client maps `achievement.<id>.name` and `achievement.<id>.description` in the locale file. If the key is missing (future achievements not yet translated), the server-provided English `name` / `description` is used as fallback.

**Why not server-side resource files:** Keeps all German translations in one place (the `de.json` file). Avoids a second translation pipeline on the server.

### 4. Chapter notes localised by key

**Choice:** The `ChapterNote()` method returns a note string for level ranges. Add a `noteKey` field to the level response (e.g., `"chapter.spare-tube"`, `"chapter.shorter-tubes"`). The client looks up `chapterNote.<key>` in the locale file; missing keys fall back to the server-provided English text.

### 5. Activity feed transitions to structured events

**Choice:** New activity feed entries store `{ kind, params }` instead of a pre-formatted English string:
- `{ kind: "level-cleared", params: { level: 45, moves: 19 } }`
- `{ kind: "new-record", params: { level: 38 } }`
- `{ kind: "achievement-earned", params: { achievementId: "first-steps" } }`

The client formats these using translation keys like `feed.level-cleared` → `"cleared Level {{level}} in {{moves}} moves"` / `"Level {{level}} in {{moves}} Zügen gelöst"`.

Legacy entries (pre-migration) are returned with `kind: "legacy"` and a `text` field containing the original English string, rendered as-is regardless of locale.

**Migration:** No backfill. Only new events use the structured format. Legacy events degrade to English display.

### 6. Validation error codes

**Choice:** API validation errors gain a `code` field alongside the existing `error`/`reason` text field. Example: `{ "error": "That name is taken.", "code": "username-taken" }`. The client maps `error.<code>` to a locale string. The English text field remains for backward compatibility and as fallback.

### 7. Language detection and persistence

**Choice:** On first visit, read `navigator.languages` and match the first entry's primary subtag against `["en", "de"]`. Store the result in `localStorage` under a key like `gaudi-locale`. On subsequent visits, read from localStorage first. The language switcher updates localStorage and calls `i18next.changeLanguage()` — no page reload needed.

### 8. Language switcher placement

**Choice:** A compact toggle or dropdown in the app shell footer, next to the legal links. The footer is visible on all shell pages and is the conventional location for locale controls in small apps. The switcher shows the current locale's code or flag and offers the alternative.

On the gameplay screen (immersive layout, no shell), language switching is accessible from the same header controls that already host the account button — or the player can return to a shell page. This keeps the gameplay UI uncluttered.

### 9. Number and time formatting

**Choice:** Replace the hand-rolled `relativeTime()` function in `ActivityFeed.tsx` with `Intl.RelativeTimeFormat`. Use `Intl.NumberFormat` for point totals and counts. Both APIs accept a locale string and are supported in all target browsers.

### 10. No Akka.NET involvement

The translation system is entirely client-side rendering logic plus minor API response shape changes. No actor state, no distributed coordination, no new Akka.NET actors. The server changes are additive fields on existing endpoint responses and a structural change to how the `ProgressionSlice` stores new feed events.

## Risks / Trade-offs

- **Translation quality:** German translations are authored alongside code, not by a professional translator. [Risk] Awkward phrasing. → Mitigation: Keep strings short and functional; the game has no narrative prose.
- **Key drift:** Adding a UI string and forgetting the German translation silently falls back to English. [Risk] Untranslated strings go unnoticed. → Mitigation: A build-time or test-time check can compare key sets between `en.json` and `de.json` and warn on mismatches.
- **Legacy activity feed entries:** Old feed entries stay English regardless of locale. [Risk] Mixed-language feed for German users initially. → Mitigation: Feed entries expire after the retention period, so legacy entries naturally age out.
- **Bundle size:** Two JSON files of ~180 keys each add negligible weight (~5-10 KB uncompressed per file). Only the active locale is loaded at runtime.

## Open Questions

- **Flag or text for the language switcher?** A flag icon (🇬🇧/🇩🇪) is visually compact but can be politically loaded. A text label ("EN"/"DE") is neutral. Deferring to implementation — either works, no spec impact.
