## Purpose

Provides a drag-and-drop input method for pouring balls between tubes, giving players a direct-manipulation alternative to the tap-tap gesture.

## ADDED Requirements

### Requirement: Drag initiation

A drag gesture SHALL begin when the player presses and holds on a non-empty tube and moves the pointer beyond a small movement threshold. Pressing on an empty tube SHALL NOT initiate a drag. The movement threshold SHALL be small enough to feel responsive but large enough to distinguish an intentional drag from an imprecise tap.

#### Scenario: Drag starts from a non-empty tube

- **WHEN** the player presses on a non-empty tube and moves the pointer beyond the threshold
- **THEN** a drag gesture begins from that tube

#### Scenario: Empty tube does not start a drag

- **WHEN** the player presses on an empty tube and moves the pointer
- **THEN** no drag gesture begins

#### Scenario: Movement below threshold is a tap

- **WHEN** the player presses on a tube and releases without moving beyond the threshold
- **THEN** the interaction is treated as a tap, not a drag

### Requirement: Drag visual feedback

While a drag is active, the top run of same-coloured balls from the source tube SHALL be shown following the pointer or finger position. The visual SHALL move in real time with the pointer. The source tube SHALL appear as though those balls have been lifted out of it.

#### Scenario: Balls follow the pointer during drag

- **WHEN** a drag is active from a tube containing a top run of 2 red balls
- **THEN** 2 red balls are shown following the pointer position
- **AND** the source tube appears without those 2 balls at the top

#### Scenario: Visual tracks pointer movement

- **WHEN** the player moves the pointer during an active drag
- **THEN** the floating balls move to stay at the pointer position

### Requirement: Drop target highlighting

While a drag is active, every tube that is a valid pour destination for the dragged balls SHALL be visually highlighted. Tubes that are not valid destinations (full, colour mismatch, or the source tube itself) SHALL NOT be highlighted. The highlighting SHALL update immediately if the board state changes.

#### Scenario: Valid destinations are highlighted

- **WHEN** a drag is active from a tube with red balls on top
- **AND** tubes 2 and 4 can accept red balls
- **THEN** tubes 2 and 4 are visually highlighted as valid drop targets

#### Scenario: Invalid destinations are not highlighted

- **WHEN** a drag is active from a tube with red balls on top
- **AND** tube 3 is full
- **THEN** tube 3 is not highlighted

#### Scenario: Source tube is not highlighted

- **WHEN** a drag is active from tube 0
- **THEN** tube 0 is not highlighted as a drop target

### Requirement: Drop execution

Releasing the pointer over a valid drop target SHALL execute the pour, moving the top run of balls from the source tube to the destination tube. The result SHALL be identical to performing the same pour via tap-tap. After a successful drop, the drag state SHALL be cleared.

#### Scenario: Drop on a valid target pours

- **WHEN** a drag is active from tube 0 with red balls
- **AND** the player releases over tube 2, which can accept red balls
- **THEN** the balls are poured from tube 0 to tube 2
- **AND** the drag state is cleared

#### Scenario: Drop result matches tap-tap

- **WHEN** a pour from tube 0 to tube 2 is executed via drag-and-drop
- **THEN** the resulting board state is identical to executing the same pour via tap-tap

### Requirement: Drop cancellation

Releasing the pointer over an invalid target, over the source tube, or over empty space (not over any tube) SHALL cancel the drag without making a move. The board SHALL remain unchanged and the dragged balls SHALL return to the source tube.

#### Scenario: Drop on an invalid target cancels

- **WHEN** a drag is active from tube 0 with red balls
- **AND** the player releases over tube 3, which cannot accept red balls
- **THEN** no move is made and the board is unchanged

#### Scenario: Drop on empty space cancels

- **WHEN** a drag is active
- **AND** the player releases over empty space (not over any tube)
- **THEN** no move is made and the board is unchanged

#### Scenario: Drop on the source tube cancels

- **WHEN** a drag is active from tube 0
- **AND** the player releases over tube 0
- **THEN** no move is made and the board is unchanged

### Requirement: Coexistence with tap-tap

Drag-and-drop SHALL coexist with the existing tap-tap mechanic. A press-and-release without exceeding the movement threshold SHALL be handled as a tap, preserving the existing two-tap pour flow. Both input methods SHALL be available at all times with no mode switch or setting required.

#### Scenario: Tap still works alongside drag

- **WHEN** the player taps tube 0 (press and release without drag)
- **THEN** tube 0 is selected as in the existing tap-tap flow

#### Scenario: Tap-tap pour still works

- **WHEN** tube 0 is selected via tap
- **AND** the player taps tube 2
- **THEN** the pour is attempted exactly as before

#### Scenario: Drag after a tap clears the tap selection

- **WHEN** tube 0 is selected via tap
- **AND** the player initiates a drag from tube 1
- **THEN** the tap selection on tube 0 is cleared and the drag takes over

### Requirement: Touch device support

Drag-and-drop SHALL work with touch input on mobile devices. A touch-and-drag gesture SHALL behave identically to a mouse drag. The browser's default touch behaviours (scrolling, zooming) SHALL be suppressed during an active drag to prevent interference.

#### Scenario: Touch drag executes a pour

- **WHEN** a player on a touch device presses a tube and drags to another valid tube
- **THEN** the pour is executed on release

#### Scenario: Browser scroll is suppressed during drag

- **WHEN** a drag gesture is active on a touch device
- **THEN** the page does not scroll or zoom in response to the touch movement

### Requirement: Keyboard control independence

Drag-and-drop SHALL NOT interfere with keyboard controls. Keyboard navigation, selection, and shortcuts SHALL continue to work exactly as specified regardless of whether drag-and-drop is available.

#### Scenario: Keyboard controls unaffected

- **WHEN** the player uses keyboard navigation during or after a drag-and-drop interaction
- **THEN** keyboard controls behave exactly as specified in the keyboard controls capability
