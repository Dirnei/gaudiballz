## Purpose

Collects all player badges — star-collection milestones, colour-mastery badges, and existing achievements — into a single visible shelf on the stats page, giving experienced players a gallery of earned accomplishments and clear targets for what remains.

## ADDED Requirements

### Requirement: Badge shelf displays all badge types

The stats page SHALL include a badge shelf section that displays all badges available to the player, grouped into three categories: star milestones, colour mastery, and achievements.

Each badge SHALL show its name, an icon, and its earned or locked state. Earned badges SHALL be visually distinct from locked badges (full colour vs greyed out).

#### Scenario: Badge shelf on stats page

- **WHEN** a registered player opens the stats page
- **THEN** a badge shelf section is visible showing badges grouped by category

#### Scenario: Earned vs locked distinction

- **WHEN** a player has earned some badges but not others
- **THEN** earned badges appear in full colour and locked badges appear greyed out

### Requirement: Star milestone badges

The system SHALL award star milestone badges when a player achieves 3 stars on every level within a defined range. The milestones SHALL be:

- 3-star all levels 1–50
- 3-star all levels 51–100
- 3-star all levels 101–150
- 3-star all levels (every level up to the player's highest completed)

Each milestone SHALL be evaluated against the player's best star rating per level.

A milestone badge SHALL be awarded at most once. Once earned, it SHALL NOT be revoked.

#### Scenario: Earning the 1–50 milestone

- **WHEN** a player's best rating on every level from 1 to 50 is 3 stars
- **THEN** they are awarded the "3-star levels 1–50" badge

#### Scenario: Partially complete milestone shows progress

- **WHEN** a player has 3-starred 38 of 50 levels in the 1–50 range
- **THEN** the badge appears locked with progress "38 / 50"

#### Scenario: The all-levels milestone covers up to highest completed

- **WHEN** a player has completed up to level 73 and has 3 stars on all 73
- **THEN** they are awarded the "3-star all levels" badge

#### Scenario: Losing the all-levels badge is impossible

- **WHEN** a player who has the "3-star all levels" badge completes a new level with 1 star
- **THEN** the badge remains earned (it was correct at the time of award)

### Requirement: Colour mastery badges

The system SHALL award a colour mastery badge for each colour band in the campaign. A colour band is the range of levels that share the same colour count (e.g., levels 6–14 use 4 colours).

A colour mastery badge SHALL be awarded when the player has 3-starred every level within that band.

The colour bands SHALL follow the campaign's colour introduction schedule.

#### Scenario: Earning a colour mastery badge

- **WHEN** a player has 3-starred every level in the 4-colour band (levels 6–14)
- **THEN** they are awarded the "Master of 4 colours" badge

#### Scenario: Progress on a colour mastery badge

- **WHEN** a player has 3-starred 5 of 9 levels in the 4-colour band
- **THEN** the badge appears locked with progress "5 / 9"

### Requirement: Existing achievements appear in the badge shelf

All achievements from the achievement catalogue SHALL also appear as badges in the badge shelf under the "Achievements" category.

The earned state, name, and description SHALL match the achievement data. This is a display integration — the achievement system remains the source of truth.

#### Scenario: An earned achievement shows as a badge

- **WHEN** a player has earned the "Double Digits" achievement
- **THEN** it appears as an earned badge in the achievements category of the badge shelf

#### Scenario: A locked achievement shows as a locked badge

- **WHEN** a player has not earned the "Marathon" achievement
- **THEN** it appears as a locked badge with its description and progress visible

### Requirement: Locked badges show progress hints

Every locked badge that has a numeric threshold SHALL display the player's current progress toward that threshold (e.g., "38 / 50").

Locked badges without a numeric threshold SHALL show their description text so the player knows what to aim for.

#### Scenario: Threshold badge shows progress

- **WHEN** a player has 3-starred 22 of 50 levels in the 1–50 range
- **THEN** the locked badge shows "22 / 50"

#### Scenario: Non-threshold badge shows description

- **WHEN** a locked badge has no numeric threshold
- **THEN** it shows its description text

### Requirement: Rare badges are visually distinguished

Badges that represent exceptional accomplishment SHALL be visually distinguished from standard badges. The "3-star all levels" badge and the final colour mastery badge SHALL be marked as rare.

#### Scenario: Rare badge stands out

- **WHEN** a player has earned the "3-star all levels" badge
- **THEN** the badge has a distinctive visual treatment compared to standard badges

### Requirement: Badge shelf is for registered players only

The badge shelf SHALL be visible only to registered players, since it appears on the stats page which requires registration.

#### Scenario: Anonymous player does not see badge shelf

- **WHEN** an anonymous player navigates to the stats URL
- **THEN** no badge shelf is shown (the stats page itself requires registration)

### Requirement: Badge evaluation is server-side

Star milestone and colour mastery badges SHALL be evaluated server-side on each completion, using the same notification mechanism as existing achievements.

Badge evaluation failure SHALL NOT cause the completion to fail.

#### Scenario: Badge awarded on completion

- **WHEN** a player completes a level that causes them to 3-star all levels 1–50
- **THEN** the "3-star levels 1–50" badge is awarded and included in the completion response

#### Scenario: Badge evaluation failure is non-blocking

- **WHEN** badge evaluation fails during a completion
- **THEN** the completion is recorded normally
