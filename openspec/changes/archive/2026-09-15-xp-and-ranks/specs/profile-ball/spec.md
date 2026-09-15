## ADDED Requirements

### Requirement: Profile ball shows rank ring

Wherever the profile ball is displayed for a registered player, the system SHALL render a coloured ring around it corresponding to the player's rank tier.

The ring colour SHALL match the tier: copper for Bronze, silver for Silver, gold for Gold, teal/cyan for Platinum, violet/purple for Diamond.

The ring SHALL update automatically when the player's rank tier changes.

The ring SHALL NOT be shown for anonymous players, since anonymous players have no profile ball.

#### Scenario: A Gold player's ball has a gold ring

- **WHEN** a Gold-tier player's profile ball is displayed
- **THEN** it is surrounded by a gold-coloured ring

#### Scenario: Ring updates on tier promotion

- **WHEN** a player promotes from Bronze to Silver
- **THEN** the ring colour changes from copper to silver everywhere the profile ball is shown

#### Scenario: No ring for anonymous players

- **WHEN** an anonymous player's profile area is displayed
- **THEN** no profile ball or rank ring is shown
