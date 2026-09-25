# Spec Delta

## Purpose

Gives each meaningful board action its own short sound, so moves feel physical and progress is
audible, with remembered controls for turning game sound off and setting its volume.

## ADDED Requirements

### Requirement: Board events make sounds

While sound is on, the board SHALL play a distinct sound for each of these events, in every play
mode:

- **Pick up**: a tap selects balls from a flask, adds a flask to a multi-selection, or selects a
  different flask in place of the current selection.
- **Drop**: a pour is made, by tap, drag, keyboard or hint. A pour from several flasks at once
  plays the drop sound once.
- **Flask full**: a pour leaves a flask holding one colour to capacity that was not complete
  before, unless the same pour solves the level.
- **Solved**: a pour solves the level.
- **Not allowed**: a tap with balls picked up lands on a flask that can neither take the pour nor
  be picked up, or a dragged pour is released over a flask that cannot take it.
- **Undo**: a move is taken back.

Putting balls back down (tapping the picked-up flask again) SHALL make no sound. Restarting a
level SHALL make no sound.

#### Scenario: Picking up

- **WHEN** sound is on and the player taps a flask with balls on top and nothing picked up
- **THEN** the pick-up sound plays

#### Scenario: Pouring

- **WHEN** sound is on and the player pours two balls into a flask
- **THEN** the drop sound plays once

#### Scenario: Completing a flask

- **WHEN** a pour fills a flask to capacity with one colour and other flasks are still unsorted
- **THEN** the drop sound plays, followed by the flask-full sound

#### Scenario: Solving the level

- **WHEN** a pour completes the last unsorted flask
- **THEN** the solved sound plays instead of the flask-full sound

#### Scenario: Tapping a finished flask while holding balls

- **WHEN** the player has balls picked up and taps a flask that is already finished
- **THEN** the not-allowed sound plays

#### Scenario: A mis-tap that picks up instead is not an error

- **WHEN** the player has balls picked up and taps a flask that cannot take them but has balls of
  its own
- **THEN** that flask is picked up and the pick-up sound plays, not the not-allowed sound

#### Scenario: Undoing

- **WHEN** sound is on and the player undoes a move
- **THEN** the undo sound plays

### Requirement: Drop pitch follows the fill level

The drop sound's pitch SHALL rise with the number of balls in the receiving flask after the pour:
the fuller the flask, the higher the sound. Two pours that leave the receiving flask equally full
SHALL sound at the same pitch.

#### Scenario: Filling a flask climbs

- **WHEN** the player pours one ball each into an empty flask, then a flask holding one ball, then
  a flask holding two
- **THEN** each of the three drop sounds is higher than the one before

### Requirement: Sound settings menu

The board's controls SHALL include a Sound button that opens a sound menu. The menu SHALL offer:

- a switch that turns game sound on and off,
- a volume control from 0% to 100%, showing the current level as a percentage.

Changing the volume SHALL play a short sample at the new level so the player hears the result,
unless sound is off. While sound is off, no game sound SHALL play, whatever the volume. The
Sound button SHALL show whether sound is off, and SHALL be labelled with that state for
assistive technology.

The menu SHALL close on a tap outside it, on the Sound button again, or on Escape. Escape while
the menu is open SHALL only close the menu and SHALL NOT trigger any other board shortcut.

Pressing `M` SHALL turn sound on or off, under the same conditions as the other keyboard
shortcuts, whether or not the menu is open.

The on/off choice and the volume SHALL be remembered on the device across visits and SHALL apply
in every play mode. A player who has never chosen SHALL have sound on at 80% volume.

#### Scenario: Opening the menu

- **WHEN** the player taps the Sound button
- **THEN** a menu opens with a sound on/off switch and a volume control

#### Scenario: Muting from the menu

- **WHEN** the player turns sound off in the menu and then pours
- **THEN** no sound plays

#### Scenario: Setting the volume

- **WHEN** the player sets the volume to 40%
- **THEN** a short sample plays at the new level
- **AND** every later game sound plays at 40%

#### Scenario: Remembered across visits

- **WHEN** the player turns sound off and sets the volume to 40%, closes the game and opens it
  again later
- **THEN** sound is still off and the volume is still 40%

#### Scenario: Keyboard toggle

- **WHEN** the player presses `M` on the game screen
- **THEN** sound switches between on and off

#### Scenario: Escape only closes the menu

- **WHEN** the sound menu is open and the player presses Escape
- **THEN** the menu closes and nothing else happens

#### Scenario: Defaults

- **WHEN** a player opens the game for the first time
- **THEN** sound is on at 80% volume

### Requirement: Sound never gets in the way of play

A sound failing to play (for example, a browser that blocks audio, or no audio device) SHALL NOT
affect play in any way. Sounds SHALL work offline and SHALL NOT require downloading any file.

#### Scenario: Audio unavailable

- **WHEN** the browser refuses to play audio
- **THEN** every move still works exactly as it does with sound
