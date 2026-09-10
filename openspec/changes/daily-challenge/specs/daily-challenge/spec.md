## Purpose

Gives every player the same puzzle each day, scored and ranked on a shared daily leaderboard, creating a social hook and a reason to return daily without affecting the campaign.

## ADDED Requirements

### Requirement: One puzzle per day for everyone

The system SHALL generate exactly one daily challenge puzzle per calendar day (UTC). All players who request the daily challenge on the same UTC date SHALL receive the same board. The puzzle SHALL be deterministically derived from the date so that no manual curation is needed.

#### Scenario: Two players on the same day see the same board

- **WHEN** two players request the daily challenge on 2026-09-15 UTC
- **THEN** both receive identical boards (same tubes, same colours, same capacity)

#### Scenario: Different days produce different boards

- **WHEN** a player requests the daily challenge on 2026-09-15 and again on 2026-09-16
- **THEN** the two boards are different

### Requirement: Daily challenge difficulty is mid-range

The daily challenge puzzle SHALL use a fixed mid-range difficulty accessible to most players — not a trivial early-game puzzle and not the hardest late-game configuration. The difficulty parameters SHALL remain constant across days so that daily scores are comparable.

#### Scenario: Daily challenge board size is consistent

- **WHEN** a player requests the daily challenge on any date
- **THEN** the board has the same number of colours, tube capacity, and spare tubes as every other daily challenge

### Requirement: Daily challenge is available to all players

The daily challenge SHALL be playable by any player — anonymous or registered. No account, no minimum campaign progress, and no unlock is required.

#### Scenario: Anonymous player plays the daily challenge

- **WHEN** an anonymous player navigates to the daily challenge
- **THEN** the puzzle loads and is fully playable

### Requirement: Daily challenge results are separate from campaign

Completing the daily challenge SHALL NOT advance the player's campaign progress, raise the campaign ceiling, or contribute to campaign statistics. Daily challenge results SHALL be tracked in their own storage, separate from the campaign's level progression.

#### Scenario: Daily completion does not advance campaign

- **WHEN** a player on campaign level 12 completes the daily challenge
- **THEN** their campaign level remains 12 and their campaign highest-completed is unchanged

### Requirement: Daily challenge is scored

The daily challenge completion SHALL be scored using the same star and point formula as campaign levels: stars based on moves relative to par and elapsed time relative to the time target, points from the star tier.

#### Scenario: Under-par daily completion earns full marks

- **WHEN** a player completes the daily challenge at or below par and within the time target
- **THEN** they receive 3 stars and the corresponding point value

### Requirement: Players can replay the daily challenge

A player SHALL be able to replay the current day's daily challenge to improve their score. The system SHALL keep only the best result per player per day (highest stars, then fewest moves, then fastest time as tiebreakers).

#### Scenario: Replay with a better score replaces the previous result

- **WHEN** a player scored 1 star on the daily challenge and replays it scoring 3 stars
- **THEN** their daily result is updated to 3 stars

#### Scenario: Replay with a worse score is ignored

- **WHEN** a player scored 3 stars and replays with 2 stars
- **THEN** their daily result remains 3 stars

### Requirement: Daily leaderboard

The system SHALL maintain a leaderboard for each day's challenge, ranked by stars (descending), then moves (ascending), then elapsed time (ascending). The daily leaderboard SHALL be available to all players after they have submitted at least one attempt.

Only registered players SHALL appear on the daily leaderboard. Anonymous players can see the leaderboard after playing but their results are not listed.

#### Scenario: Leaderboard ranks by stars then moves

- **WHEN** player A has 3 stars in 14 moves and player B has 3 stars in 16 moves
- **THEN** player A ranks above player B on the daily leaderboard

#### Scenario: Anonymous player sees but is not listed

- **WHEN** an anonymous player completes the daily challenge and views the leaderboard
- **THEN** the leaderboard is visible but the anonymous player's result does not appear in it

### Requirement: Daily challenge screen

The daily challenge SHALL render in the immersive layout (no site header or footer), with the same tube grid and controls (undo, hint, restart) as the campaign gameplay screen. The screen SHALL show the date of the challenge and indicate that it is a daily challenge, not a campaign level.

#### Scenario: Daily challenge screen shows daily identity

- **WHEN** a player is on the daily challenge screen
- **THEN** the screen shows the date (e.g., "Sep 15") instead of a level number
- **AND** indicates that this is the daily challenge

### Requirement: Solved overlay shows daily-specific results

After solving the daily challenge, the solved overlay SHALL show the player's stars, points, moves, and elapsed time. It SHALL offer a "View Leaderboard" action to see the daily leaderboard and a "Play Again" action to replay for a better score. It SHALL NOT show "Next level" since there is no next daily challenge.

#### Scenario: Solved daily challenge overlay

- **WHEN** a player solves the daily challenge
- **THEN** the overlay shows stars, points, moves, and time
- **AND** offers "View Leaderboard" and "Play Again"
- **AND** does not offer "Next level"

### Requirement: Next challenge countdown

After solving the daily challenge, the screen SHALL display a countdown showing the time remaining until the next daily challenge (midnight UTC). This gives the player a reason to come back.

#### Scenario: Countdown displayed after solving

- **WHEN** a player solves the daily challenge at 18:30 UTC
- **THEN** a countdown shows approximately "5h 30m" until the next challenge

### Requirement: Past daily challenges are not playable

A daily challenge SHALL only be playable on its calendar day. Once the day has passed, the puzzle is no longer available. The daily challenge screen SHALL not allow navigating to previous days.

#### Scenario: Yesterday's challenge is not accessible

- **WHEN** a player tries to access yesterday's daily challenge
- **THEN** they are shown today's challenge instead

### Requirement: Daily challenge achievements integration

Completing a daily challenge SHALL count toward the existing streak achievements (consecutive calendar days with at least one completion) and the marathon achievement (10 levels in a session). It SHALL NOT count toward milestone achievements (which track distinct campaign levels).

#### Scenario: Daily challenge counts toward streak

- **WHEN** a registered player's only completion today is the daily challenge
- **THEN** the day counts toward their streak
