## MODIFIED Requirements

### Requirement: Player stats view shows achievements summary

The stats view SHALL show the player's achievements grouped by category, displaying each achievement's name, description, icon, and earned/locked state. Earned achievements SHALL be visually distinct from locked ones. The count of earned vs total achievements SHALL be displayed.

For locked achievements that have a defined threshold, the stats view SHALL display a progress indicator showing the player's current progress toward earning the achievement.

#### Scenario: Achievements summary

- **WHEN** a player has earned 8 of 20 achievements
- **THEN** the stats view shows "8 / 20 unlocked" and all 20 achievements with earned ones visually distinct

#### Scenario: Achievement descriptions visible

- **WHEN** a player views the achievements section on the stats page
- **THEN** each achievement shows its description text explaining how to earn it

#### Scenario: Progress shown for locked threshold achievement

- **WHEN** a player has completed 3 levels and has not yet earned the "Complete 5 levels" achievement
- **THEN** the achievement shows a progress indicator displaying "3 / 5"

#### Scenario: No progress for non-threshold achievement

- **WHEN** a locked achievement has no defined threshold
- **THEN** no progress indicator is shown for that achievement
