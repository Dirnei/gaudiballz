## MODIFIED Requirements

### Requirement: Achievements are visible in the account panel

A registered player SHALL be able to view their achievements from the account panel and from the badge shelf on the stats page.

The achievements view in the account panel SHALL group achievements by category and SHALL visually distinguish earned achievements from locked ones.

Locked achievements SHALL show their name and description so the player knows what to aim for. Progress toward threshold-based achievements SHALL be shown (e.g., "7 / 10 levels").

The achievements view SHALL NOT be accessible to anonymous players.

#### Scenario: A registered player opens achievements

- **WHEN** a registered player opens the account panel and navigates to achievements
- **THEN** they see achievements grouped by category, with earned ones visually distinct

#### Scenario: Achievements also appear in badge shelf

- **WHEN** a registered player opens the stats page
- **THEN** achievements appear as badges in the badge shelf alongside star milestones and colour mastery badges

#### Scenario: Locked achievements show what to do

- **WHEN** a player has not earned the 50-level milestone
- **THEN** it appears as locked with its description and their current progress (e.g., "23 / 50 levels")

#### Scenario: An anonymous player does not see achievements

- **WHEN** an anonymous player opens the account panel
- **THEN** no achievements section is shown
