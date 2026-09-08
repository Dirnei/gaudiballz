## MODIFIED Requirements

### Requirement: Code entry is accessible without an account

The code entry flow SHALL be available to all players, including those who have never created an account. No sign-in or account creation SHALL be required to enter a code.

The code entry interface SHALL be located on the main menu screen. It SHALL NOT be located inside the account panel.

#### Scenario: An anonymous player enters a code

- **WHEN** a player with no account enters a valid code
- **THEN** the levels are unlocked the same as for any other player

#### Scenario: Code entry is on the main menu

- **WHEN** a player opens the game
- **THEN** the code entry option is visible on the main menu without opening any overlay or panel

#### Scenario: Code entry is not in the account panel

- **WHEN** a player opens the account panel
- **THEN** there is no code entry option in the panel
