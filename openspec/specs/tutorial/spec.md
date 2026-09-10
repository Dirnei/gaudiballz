# tutorial Specification

## Purpose

A guided first-play experience that teaches the core pour mechanic before the player's first real level, using a hand-crafted board simpler than any generated one.

## Requirements

### Requirement: Tutorial uses a fixed board

The tutorial SHALL use a hand-crafted board with 2 colours, 3 tubes, and a capacity of 3. One tube SHALL be empty to serve as the spare. The board SHALL NOT be fetched from the server; it SHALL be defined entirely on the client. The board SHALL follow the same rules as any other board (same move validation, same win condition).

#### Scenario: Tutorial board structure

- **WHEN** a player enters the tutorial
- **THEN** the board has exactly 3 tubes with capacity 3 and 2 distinct colours
- **AND** exactly one tube is empty

#### Scenario: Tutorial board is not already solved

- **WHEN** a player enters the tutorial
- **THEN** the board is not in a solved state

### Requirement: Tutorial guides the player through the pour mechanic

The tutorial SHALL display overlay prompts that walk the player through the two-tap interaction step by step. The first prompt SHALL instruct the player to tap a tube to pick up balls. After the player selects a tube, the second prompt SHALL instruct them to tap another tube to pour. After the first pour completes, a third prompt SHALL tell the player to sort all the colours to win. The player SHALL then complete the board without further guided prompts.

#### Scenario: Step-by-step guided prompts

- **WHEN** a player enters the tutorial
- **THEN** a prompt is displayed instructing them to tap a tube

#### Scenario: Prompt advances after first selection

- **WHEN** the player taps a non-empty tube for the first time
- **THEN** the prompt updates to instruct them to tap another tube to pour

#### Scenario: Prompt advances to free play after first pour

- **WHEN** the player completes their first pour
- **THEN** the prompt updates to tell them to sort all the colours

#### Scenario: No further guided prompts after free play begins

- **WHEN** the player is in free play
- **AND** they make additional moves
- **THEN** the free-play prompt remains and no new guided steps appear

### Requirement: Tutorial detects first-time players

The tutorial SHALL be shown automatically to players who have never completed or skipped it. Detection SHALL use client-side storage. If client-side storage is unavailable or cleared, the player SHALL NOT be blocked from playing; they SHALL proceed to level 1 as if the tutorial were already seen.

#### Scenario: First launch shows tutorial

- **WHEN** a player launches the game for the first time
- **AND** they tap Play on the main menu
- **THEN** they are taken to the tutorial instead of level 1

#### Scenario: Returning player skips tutorial

- **WHEN** a player who has previously completed or skipped the tutorial taps Play
- **THEN** they go directly to the gameplay screen with their current level

#### Scenario: Storage unavailable

- **WHEN** client-side storage is unavailable
- **AND** a player taps Play
- **THEN** they go directly to the gameplay screen (tutorial is not forced)

### Requirement: Tutorial can be skipped

The tutorial SHALL provide a visible skip action. Activating it SHALL mark the tutorial as seen and navigate the player to level 1. The skip action SHALL be available at any point during the tutorial.

#### Scenario: Skipping the tutorial

- **WHEN** a player activates the skip action during the tutorial
- **THEN** the tutorial is marked as seen
- **AND** the player is taken to level 1

### Requirement: Tutorial completion proceeds to level 1

When the player solves the tutorial board, the tutorial SHALL be marked as seen and the player SHALL be taken to level 1.

#### Scenario: Completing the tutorial

- **WHEN** a player solves the tutorial board
- **THEN** the tutorial is marked as seen
- **AND** the player is taken to level 1

### Requirement: Tutorial is excluded from progression

The tutorial SHALL NOT appear in the level select screen, SHALL NOT count toward the player's completed-levels total, SHALL NOT award points or stars, and SHALL NOT be submitted to the server.

#### Scenario: Tutorial absent from level select

- **WHEN** a player opens the level select screen
- **THEN** the tutorial is not listed among the levels

#### Scenario: Tutorial does not affect stats

- **WHEN** a player completes the tutorial
- **THEN** their total points, completed levels count, and streak are unchanged
