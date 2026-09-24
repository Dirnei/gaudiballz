# games-played-activity Specification

## Purpose

Counts how many games are played, per day and over the week, month and all time, for the whole
community and for each player, so that "games played" means every game a player started rather
than only the ones they finished.

## Requirements

### Requirement: A game counts as played when it starts

A game SHALL count as played at the moment it starts. A game starts with the player's first
move on a campaign level or on the daily challenge. Opening a board and leaving without moving
SHALL NOT count as a game.

Every started game SHALL count exactly once, whatever its outcome: completed, restarted or
abandoned. Restarting SHALL start a new game, which counts again once the player moves.
Moves, undos and hints within one game SHALL NOT add to the count.

Games played by anonymous and registered players SHALL both be counted.

#### Scenario: Opening a level without moving

- **WHEN** a player opens a level, makes no move, and leaves
- **THEN** no game is counted

#### Scenario: A cleared game

- **WHEN** a player starts a level and clears it
- **THEN** one game is counted

#### Scenario: Restarting and then clearing

- **WHEN** a player starts a level, restarts it twice (moving each time) and then clears it
- **THEN** three games are counted

#### Scenario: Walking away from a game

- **WHEN** a player makes a move on a level and then leaves it unfinished
- **THEN** one game is counted

#### Scenario: A daily challenge game that is not finished

- **WHEN** a player makes a move on the daily challenge, restarts it, moves again and then leaves
- **THEN** two games are counted

### Requirement: A game counts towards the day it started

Each game SHALL count towards the UTC day on which it started, even if it ends on a later day.

#### Scenario: A game that crosses midnight

- **WHEN** a player starts a game at 23:58 UTC and clears it at 00:03 UTC the next day
- **THEN** the game counts towards the day it started
- **AND** not towards the following day

### Requirement: Community games played on the home page

The home page SHALL show, for all players together, the number of games played on each of the
last 28 UTC days, and the totals for the current week (Monday to Sunday UTC), the current
calendar month (UTC), and all time.

#### Scenario: Restarts show up in the community totals

- **WHEN** a player restarts a level once and then clears it today
- **THEN** today's community games-played count and this week's total each rise by two

### Requirement: A player's own games played on the stats page

The stats page SHALL show, for the viewing player, their games played on each of the last 28 UTC
days and their totals for the current week, the current month and all time, counted in the
same way as the community figures.

#### Scenario: A player's unfinished games count

- **WHEN** a player starts three games today and clears only one
- **THEN** their games played today is three

### Requirement: Earlier days keep their recorded counts

Days before this capability was introduced SHALL keep showing the games recorded at the time,
which were completed games only. No history SHALL be reconstructed for them. From the day the
capability is introduced onwards, games SHALL be counted by start.

#### Scenario: A day from before the change

- **WHEN** a player cleared 5 levels on a day before the change
- **THEN** that day shows 5 games played

### Requirement: Starting a game does not count as solving or as being active

Starting a game without completing it SHALL NOT increase puzzles solved today and SHALL NOT make
a player count as active this week. It SHALL NOT extend a day streak, count towards a full week
of play, or use up the first-clear-of-the-day streak bonus. Those SHALL remain based on
completions.

#### Scenario: A day with only unfinished games

- **WHEN** a player with a 4-day streak starts games today but completes none
- **AND** the day ends
- **THEN** their streak does not include today

#### Scenario: First clear after an unfinished game

- **WHEN** a player restarts a level today before clearing anything, and then clears it
- **THEN** that clear still earns the first-clear-of-the-day streak bonus
