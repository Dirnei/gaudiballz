# animated-background Specification

## Purpose
Adds a subtle looping animation to the background colour blooms so the game feels alive without distracting from gameplay.

## Requirements

### Requirement: Background blooms animate continuously

The colour bloom elements behind the game content SHALL animate in a continuous loop, shifting their position slowly enough that the motion registers as atmosphere rather than movement. This animation MUST apply only on devices with a fine pointer; on touch-only devices the blooms SHALL remain static.

#### Scenario: Animation is visible on the landing page

- **WHEN** a player opens the game on a device with a fine pointer and the landing page is displayed
- **THEN** the background colour blooms drift gradually over time rather than remaining static

#### Scenario: Animation is visible during gameplay

- **WHEN** a player is playing a level on a device with a fine pointer
- **THEN** the same background bloom animation is visible behind the game board

### Requirement: Bloom animation and blur are disabled on mobile devices

The background bloom animation, blur filter, and GPU compositing hints SHALL be disabled on devices with a coarse or absent pointer (touch-only devices). The static radial gradient SHALL remain visible so the screen retains its colour wash.

#### Scenario: Mobile device shows static gradient without animation or blur

- **WHEN** a player opens the game on a device with no fine pointer (e.g. a phone or tablet)
- **THEN** the background displays the radial colour gradient without any animation, blur, or drift

#### Scenario: Desktop device shows full animated bloom

- **WHEN** a player opens the game on a device with a fine pointer (mouse or trackpad)
- **THEN** the background bloom animates and blurs identically to the current behaviour

### Requirement: Animation respects reduced-motion preference

The background animation SHALL be suppressed entirely when the user's system indicates a preference for reduced motion.

#### Scenario: Reduced motion disables the animation

- **WHEN** a player has enabled the reduced-motion accessibility setting in their operating system
- **THEN** the background blooms remain static with no animation

### Requirement: Animation does not interfere with gameplay interaction

The background animation SHALL NOT cause dropped frames, delayed tap responses, or any perceptible degradation of gameplay interaction performance.

#### Scenario: Gameplay remains responsive while the animation runs

- **WHEN** a player taps a tube during an active game while the background animation is running
- **THEN** the tap registers and the game responds with the same latency as without the animation
