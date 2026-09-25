# reduced-motion Specification

## Purpose

Makes the whole game honour the player's system request for reduced motion: nothing slides,
grows or bounces, while everything the motion used to show is still shown.

## Requirements

### Requirement: No movement under reduced motion

When the player's system asks for reduced motion, the game SHALL NOT move, scale, rotate or bounce
any element as an animation. This covers screens and page transitions, dialogs, overlays, menus,
toasts, the solved card, flasks being picked up, balls entering and leaving a flask, a flask being
completed, and the tap feedback on buttons. Elements MAY fade in and out.

Motion the player drives directly, such as a ball following their finger or pointer while
dragging, is not an animation and SHALL keep working.

#### Scenario: Picking up a flask

- **WHEN** reduced motion is on and the player picks up a flask
- **THEN** the flask does not lift
- **AND** it is still shown as picked up

#### Scenario: Pouring

- **WHEN** reduced motion is on and the player pours
- **THEN** the balls appear in the receiving flask without dropping in

#### Scenario: Solving a level

- **WHEN** reduced motion is on and the player solves a level
- **THEN** the solved card appears without sliding or springing in

#### Scenario: Dragging still follows the pointer

- **WHEN** reduced motion is on and the player drags balls
- **THEN** the dragged balls still follow the pointer

### Requirement: Nothing flashes or loops under reduced motion

When the player's system asks for reduced motion, no animation SHALL repeat, and nothing on screen
SHALL change position, size, brightness or colour from one frame to the next unless the player
caused it or it is a progress indicator. In particular, the background SHALL stand still.

#### Scenario: The background stands still

- **WHEN** reduced motion is on and the player leaves the main menu open on a desktop
- **THEN** consecutive frames of the screen are identical

#### Scenario: No endless animation anywhere

- **WHEN** reduced motion is on
- **THEN** no animation on any screen is set to repeat

### Requirement: Reduced motion loses no information

Everything an animation communicates SHALL still be communicated under reduced motion, without the
movement: which flasks are picked up, which flasks are complete, that the level is solved, that an
achievement was earned, and which dialog or menu is open.

#### Scenario: A completed flask is still marked

- **WHEN** reduced motion is on and a pour completes a flask
- **THEN** the flask is shown as complete, the same as with motion on

### Requirement: Progress indicators keep progressing

An indicator whose movement shows how much time is left SHALL keep showing it under reduced motion.
The hint cooldown ring SHALL fill steadily over the cooldown, and SHALL NOT appear full before the
hint is available.

#### Scenario: Hint cooldown under reduced motion

- **WHEN** reduced motion is on and a hint cooldown has 20 of 30 seconds left
- **THEN** the cooldown ring shows about a third of its way round

### Requirement: The setting is followed live

The game SHALL follow the system's reduced-motion setting as it changes, without a reload.

#### Scenario: Turning reduced motion on mid-game

- **WHEN** the player turns on reduced motion in their system while a level is open
- **THEN** the next pour happens without balls dropping in
