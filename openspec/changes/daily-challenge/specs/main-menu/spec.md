## ADDED Requirements

### Requirement: Main menu offers the daily challenge

The main menu SHALL provide an action to start the daily challenge, positioned alongside the existing Play and Level Select actions. The daily challenge action SHALL be visible to all players regardless of campaign progress.

#### Scenario: Daily challenge button visible on menu

- **WHEN** a player visits the main menu
- **THEN** a daily challenge action is visible alongside Play and Level Select

#### Scenario: Tapping daily challenge navigates to the daily screen

- **WHEN** a player taps the daily challenge action
- **THEN** the browser URL changes to the daily challenge route
- **AND** the daily challenge screen is displayed with today's puzzle
