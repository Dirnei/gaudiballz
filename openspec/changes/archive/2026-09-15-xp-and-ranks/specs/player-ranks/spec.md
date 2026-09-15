## Purpose

Gives every player a visible rank derived from their cumulative XP, structured as named tiers with sub-levels, so that progression feels continuous and status is immediately readable from a coloured ring around the profile ball.

## ADDED Requirements

### Requirement: Player rank is computed from cumulative XP

The system SHALL assign every player a rank consisting of a tier and a sub-level, computed purely from their cumulative XP (the sum of best points plus bonus points across all completed levels, plus any additional XP bonuses).

The rank SHALL be a deterministic function of XP alone — no persisted rank field, no manual promotion, no decay. Two players with the same XP SHALL have the same rank.

The tier thresholds SHALL be:

| Tier     | Sub-levels | XP per sub-level | Cumulative XP to enter | Tier ceiling  |
|----------|-----------|------------------|------------------------|---------------|
| Bronze   | 1–10      | 8,000            | 0                      | 80,000        |
| Silver   | 1–10      | 40,000           | 80,000                 | 480,000       |
| Gold     | 1–10      | 52,000           | 480,000                | 1,000,000     |
| Platinum | 1–10      | 60,000           | 1,000,000              | 1,600,000     |
| Diamond  | 1–5       | 80,000           | 1,600,000              | 2,000,000     |

A player at or above 2,000,000 XP SHALL be Diamond 5. There SHALL be no rank above Diamond 5.

#### Scenario: A new player starts at Bronze 1

- **WHEN** a player has 0 XP
- **THEN** their rank is Bronze 1

#### Scenario: Crossing a sub-level boundary

- **WHEN** a player's cumulative XP reaches 8,000
- **THEN** their rank is Bronze 2

#### Scenario: Crossing a tier boundary

- **WHEN** a player's cumulative XP reaches 80,000
- **THEN** their rank is Silver 1

#### Scenario: Maximum rank

- **WHEN** a player's cumulative XP is 2,000,000 or more
- **THEN** their rank is Diamond 5

#### Scenario: Rank is the same on any device

- **WHEN** a player with 500,000 XP checks their rank on a different device
- **THEN** their rank is Gold 1, the same as on any other device

### Requirement: Rank ring around the profile ball

Wherever the profile ball is displayed for a registered player, the system SHALL render a coloured ring around it whose colour corresponds to the player's tier.

The ring colours SHALL be:
- Bronze: copper/bronze
- Silver: silver
- Gold: gold
- Platinum: teal/cyan
- Diamond: violet/purple

The ring SHALL be visible on all surfaces where the profile ball appears, including the stats page, leaderboard entries, and activity feed.

#### Scenario: A Silver player's profile ball has a silver ring

- **WHEN** a Silver-tier player's profile ball is shown on the leaderboard
- **THEN** it is surrounded by a silver-coloured ring

#### Scenario: Promoting to a new tier changes the ring colour

- **WHEN** a player promotes from Silver to Gold
- **THEN** the ring colour changes from silver to gold on all surfaces

#### Scenario: Anonymous players have no rank ring

- **WHEN** an anonymous player's profile area is shown
- **THEN** no rank ring is displayed

### Requirement: Rank-up events are reported on completion

When a level completion causes the player's rank to increase (either a sub-level up or a tier promotion), the completion response SHALL include the rank-up event indicating the previous rank and the new rank.

A tier promotion (e.g., Silver 10 → Gold 1) SHALL be distinguishable from a sub-level up (e.g., Silver 3 → Silver 4) in the response.

#### Scenario: Sub-level rank-up on completion

- **WHEN** a player at Bronze 3 completes a level and their new XP total puts them at Bronze 4
- **THEN** the completion response includes a rank-up event from Bronze 3 to Bronze 4, indicated as a sub-level up

#### Scenario: Tier promotion on completion

- **WHEN** a player at Silver 10 completes a level and their new XP total puts them at Gold 1
- **THEN** the completion response includes a rank-up event from Silver 10 to Gold 1, indicated as a tier promotion

#### Scenario: No rank change

- **WHEN** a player completes a level and their XP total does not cross a rank boundary
- **THEN** the completion response includes no rank-up event

### Requirement: Rank-up celebration on the solved screen

When a completion triggers a rank-up, the solved screen SHALL display a rank-up celebration after the star animation.

A sub-level up SHALL display the new rank briefly (e.g., "Silver 3").

A tier promotion SHALL display a more prominent celebration that includes the new tier name and colour.

Neither celebration SHALL block the player from proceeding — the "Next Level" and "Play Again" actions SHALL remain accessible.

#### Scenario: Sub-level up shown on solved screen

- **WHEN** a player ranks up from Bronze 3 to Bronze 4 on completion
- **THEN** the solved screen shows a brief "Bronze 4" rank-up indicator

#### Scenario: Tier promotion shown on solved screen

- **WHEN** a player promotes from Silver to Gold on completion
- **THEN** the solved screen shows a prominent Gold tier celebration

#### Scenario: Rank-up does not block play

- **WHEN** a rank-up celebration is displayed
- **THEN** the player can tap "Next Level" or "Play Again" without waiting for the celebration to finish

### Requirement: Rank is available in the progress response

The progress API response SHALL include the player's current rank (tier and sub-level), the XP threshold for the next rank boundary, and the player's current cumulative XP.

#### Scenario: Progress response includes rank

- **WHEN** a player with 90,000 XP requests their progress
- **THEN** the response includes rank Silver 1, current XP 90,000, and the XP threshold for Silver 2 (120,000)

#### Scenario: At maximum rank

- **WHEN** a Diamond 5 player requests their progress
- **THEN** the response includes rank Diamond 5, current XP, and no next threshold

### Requirement: Rank works for all players

Rank SHALL be computed and displayed for both anonymous and registered players. No account is required to have a rank.

The rank ring SHALL only be shown for registered players (since anonymous players have no profile ball).

#### Scenario: Anonymous player has a rank

- **WHEN** an anonymous player has accumulated 100,000 XP
- **THEN** their rank is Silver 1 and is shown in their progress tiles

#### Scenario: Anonymous player has no ring

- **WHEN** an anonymous player's rank is computed
- **THEN** no rank ring is rendered because there is no profile ball
