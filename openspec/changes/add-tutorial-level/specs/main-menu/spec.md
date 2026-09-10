## MODIFIED Requirements

### Requirement: Main menu offers play

The main menu SHALL provide a prominent action to start playing. For a first-time player who has not completed or skipped the tutorial, activating the play action SHALL navigate to the tutorial instead of the gameplay screen. For all other players, it SHALL load the player's current level and transition to the gameplay screen as before.

#### Scenario: Tapping play loads the current level

- **WHEN** a player who was last on level 12 taps play
- **AND** they have previously completed or skipped the tutorial
- **THEN** the game transitions to the gameplay screen with level 12 loaded

#### Scenario: A new player starts at level 1

- **WHEN** a player with no history taps play
- **AND** they have previously completed or skipped the tutorial
- **THEN** the game transitions to the gameplay screen with level 1 loaded

#### Scenario: First-time player is routed to tutorial

- **WHEN** a first-time player taps play
- **AND** they have not completed or skipped the tutorial
- **THEN** the game navigates to the tutorial screen
