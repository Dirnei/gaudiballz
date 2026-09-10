## ADDED Requirements

### Requirement: Language switcher in the shell

The shared shell SHALL include a language switcher that allows the player to change the active locale. The switcher SHALL be accessible from every page rendered inside the shell. It SHALL display the currently active locale and offer the other supported locales as options.

#### Scenario: Language switcher is visible on the home page

- **WHEN** a player visits the home page
- **THEN** a language switcher is visible in the shell (header or footer area)
- **AND** it indicates the currently active locale

#### Scenario: Switching language via the shell

- **WHEN** a player selects a different locale from the language switcher
- **THEN** the UI re-renders in the chosen locale immediately
- **AND** the switcher updates to reflect the new active locale

#### Scenario: Language switcher is available on all shell pages

- **WHEN** a player is on the stats page, leaderboard, or a legal page
- **THEN** the language switcher is visible and functional
