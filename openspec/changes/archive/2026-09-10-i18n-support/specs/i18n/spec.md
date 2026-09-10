## Purpose

Enables the game UI to render in multiple languages, starting with English and German, by detecting the player's preferred language, persisting the choice, and resolving every user-facing string through a translation layer.

## ADDED Requirements

### Requirement: Supported locales

The system SHALL support English (`en`) and German (`de`) as selectable locales. English SHALL be the fallback locale: any translation key missing from the active locale SHALL resolve to its English value.

#### Scenario: German locale renders German text

- **WHEN** the active locale is `de`
- **THEN** all UI strings for which a German translation exists are rendered in German

#### Scenario: Missing German translation falls back to English

- **WHEN** the active locale is `de` and a translation key has no German entry
- **THEN** the English value for that key is displayed

### Requirement: Language detection on first visit

On first visit, the system SHALL detect the player's preferred language from the browser's language settings. If the browser's primary language matches a supported locale, that locale SHALL be activated. Otherwise English SHALL be used.

#### Scenario: German browser gets German UI

- **WHEN** a player visits for the first time with browser language set to `de-DE`
- **THEN** the UI renders in German

#### Scenario: Unsupported browser language defaults to English

- **WHEN** a player visits for the first time with browser language set to `fr-FR`
- **THEN** the UI renders in English

### Requirement: Language preference persistence

The player's language choice SHALL be persisted locally so that returning to the game activates the same locale without re-detection. The persistence mechanism SHALL NOT require a user account.

#### Scenario: Returning player keeps their language

- **WHEN** a player selects German and later returns to the game in the same browser
- **THEN** the UI renders in German without prompting

### Requirement: Language switching

The player SHALL be able to switch between supported locales at any time. The switch SHALL take effect immediately without a page reload. The new choice SHALL be persisted.

#### Scenario: Switching from English to German

- **WHEN** a player using English selects German via the language switcher
- **THEN** the entire UI re-renders in German immediately
- **AND** the choice is persisted for future visits

#### Scenario: Switching during gameplay

- **WHEN** a player switches language while on the gameplay screen
- **THEN** all visible UI strings update to the new locale without interrupting the game state

### Requirement: All interactive UI text is translatable

Every user-facing string in the interactive UI SHALL be sourced from the translation layer. This includes button labels, headings, navigation items, tooltips, error messages, dialog text, status messages, and accessibility labels.

#### Scenario: Button labels are translated

- **WHEN** the active locale is `de`
- **THEN** buttons like Play, Restart, Undo, and Hint display their German equivalents

#### Scenario: Error messages are translated

- **WHEN** the active locale is `de` and a validation error occurs (e.g., invalid level code)
- **THEN** the error message is displayed in German

### Requirement: Dynamic text supports interpolation

Translated strings that contain variable parts (player names, counts, level numbers) SHALL support interpolation so the dynamic values appear at the correct position for each locale.

#### Scenario: Interpolated level reference

- **WHEN** the active locale is `de` and a message references level 42
- **THEN** the message reads naturally in German with "42" inserted at the grammatically correct position

### Requirement: Pluralisation follows locale rules

Translated strings that vary by count (e.g., "1 move" vs. "3 moves") SHALL use the locale's pluralisation rules rather than a hardcoded English singular/plural split.

#### Scenario: German plural for moves

- **WHEN** the active locale is `de` and a player completed a level in 1 move
- **THEN** the text uses the German singular form
- **WHEN** the count is 3
- **THEN** the text uses the German plural form

### Requirement: Number and date formatting respects locale

Numbers and relative timestamps SHALL be formatted according to the active locale's conventions using the browser's built-in internationalisation APIs.

#### Scenario: German number formatting

- **WHEN** the active locale is `de` and a point total of 1500 is displayed
- **THEN** it is formatted as "1.500" (period as thousands separator)

#### Scenario: Relative time in German

- **WHEN** the active locale is `de` and an event occurred 5 minutes ago
- **THEN** the relative time reads "vor 5 Min." or equivalent German phrasing

### Requirement: Legal pages are exempt from translation

The Impressum and Datenschutz pages SHALL remain in German regardless of the active locale. These pages satisfy legal requirements that mandate German-language content.

#### Scenario: Impressum stays German in English locale

- **WHEN** the active locale is `en`
- **THEN** the Impressum page content is displayed in German
- **AND** the navigation link to the page reads "Impressum"

### Requirement: Server-provided content is localisable by identifier

Content returned by the server (achievement names, achievement descriptions, chapter notes) SHALL include a stable string identifier so the client can look up a locale-specific translation. If no translation exists for the active locale, the server-provided English text SHALL be used as the fallback.

#### Scenario: Achievement name in German

- **WHEN** the active locale is `de` and the client receives an achievement with identifier `first-steps`
- **THEN** the client displays the German translation "Erste Schritte" instead of the server-provided "First Steps"

#### Scenario: Untranslated achievement falls back

- **WHEN** the active locale is `de` and no German translation exists for achievement `some-future-achievement`
- **THEN** the server-provided English name and description are displayed
