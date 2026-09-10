## Why

The entire UI is hardcoded English, with no infrastructure for alternative languages. The game targets German-speaking players (Impressum and Datenschutz pages are already German) but every interactive element is English-only. Adding i18n support for English and German removes the language mismatch and opens the door for future locales without further architectural work.

## What Changes

- Introduce client-side translation infrastructure (`react-i18next`) with JSON locale files for English (`en`) and German (`de`).
- Extract ~150-180 hardcoded UI strings from TSX/TS files into translation keys.
- Add a language switcher accessible from the app shell (header or footer).
- Detect the preferred language from the browser on first visit; persist the choice in localStorage.
- Map server-provided content (achievement names/descriptions, chapter notes) to client-side translations keyed by stable identifiers, falling back to the server-returned English text.
- Adapt error and validation messages returned by the API to use short error codes so the client can show locale-appropriate messages.
- Use `Intl.RelativeTimeFormat` for the activity feed's relative timestamps instead of the hand-rolled English-only helper.
- Impressum and Datenschutz stay German-only (legal requirement under TMG/DSGVO). They are not translated.
- Activity feed detail text (`"cleared Level 5 in 12 moves"`) is stored pre-formatted in the database by the server. Legacy entries remain English. New entries will store structured event data so the client can format them in the active locale.

## Capabilities

### New Capabilities
- `i18n`: Language detection, locale persistence, translation loading, language switching, and the contract between server identifiers and client translation keys.

### Modified Capabilities
- `app-shell`: Language switcher added to the shell UI.
- `player-achievements`: Achievement names and descriptions are localised client-side; the server exposes a stable identifier per achievement so the client can look up translations.
- `activity-feed`: Feed events transition from pre-formatted English strings to structured payloads the client renders in the active locale. Legacy entries degrade to the stored English text.

## Impact

- **Client**: Every component with user-facing text gains translation-key lookups. New dependency: `react-i18next` + `i18next`. Two JSON locale files (`en.json`, `de.json`) added under `client/src/i18n/`.
- **Server**: `AchievementCatalogue` exposes a stable string key per achievement. `ProgressionSlice` stores structured event data instead of formatted strings for new activity entries. Validation endpoints return error codes alongside (or instead of) English messages.
- **API surface**: Achievement responses gain an `id` field. Activity feed entries gain a `kind` + `params` structure. Validation error responses gain a `code` field. All additive — existing fields remain for backward compatibility.
- **Conformance**: No impact — the rules engine contains no user-facing text.
- **Dependencies**: `react-i18next` and `i18next` added to client `package.json`.
- **Legal pages**: Unchanged — Impressum and Datenschutz remain German-only static content.
