# finished-column-lock Specification

## Purpose

Prevents players from selecting a finished column as a pour source, removing a pointless interaction and reinforcing the visual completion state across tap, drag, and keyboard input.

## Requirements

### Requirement: Finished column definition

A column SHALL be considered finished when it holds exactly `capacity` items and every item is the same colour. This matches the existing win-condition definition of a solved tube.

#### Scenario: Full single-colour column is finished

- **WHEN** a column holds `capacity` items and all items are the same colour
- **THEN** that column is finished

#### Scenario: Partial single-colour column is not finished

- **WHEN** a column holds fewer than `capacity` items of one colour
- **THEN** that column is not finished

#### Scenario: Full mixed-colour column is not finished

- **WHEN** a column holds `capacity` items but more than one colour
- **THEN** that column is not finished

### Requirement: Tap source lock

Tapping a finished column when no other column is selected SHALL NOT select it as a pour source. The tap SHALL be silently ignored with no error feedback.

When another column is already selected as a source, tapping a finished column SHALL attempt a pour *to* the finished column as a destination, following existing move legality rules.

#### Scenario: Tap on finished column with nothing selected

- **WHEN** no column is currently selected
- **AND** the player taps a finished column
- **THEN** the finished column is not selected
- **AND** no error or feedback is shown

#### Scenario: Tap on finished column with a source selected

- **WHEN** column A is selected as a pour source
- **AND** the player taps a finished column B
- **THEN** the system attempts a pour from A to B using existing move rules

#### Scenario: Tap on non-finished column still selects it

- **WHEN** no column is currently selected
- **AND** the player taps a non-empty, non-finished column
- **THEN** that column is selected as a pour source

### Requirement: Drag source lock

A drag gesture SHALL NOT initiate from a finished column. Pressing and holding on a finished column SHALL NOT begin a drag, regardless of pointer movement.

#### Scenario: Drag attempt from finished column

- **WHEN** the player presses and holds on a finished column and moves the pointer
- **THEN** no drag gesture begins

#### Scenario: Drag from non-finished column still works

- **WHEN** the player presses and holds on a non-empty, non-finished column and moves the pointer beyond the threshold
- **THEN** a drag gesture begins normally

### Requirement: Keyboard activation lock

Keyboard navigation SHALL still allow focusing a finished column. Activating a focused finished column (via the key bound to selection) SHALL NOT select it as a pour source.

When another column is already selected, activating a finished column SHALL attempt a pour *to* the finished column as a destination.

#### Scenario: Keyboard activate on finished column with nothing selected

- **WHEN** no column is currently selected
- **AND** the player activates a focused finished column via keyboard
- **THEN** the finished column is not selected

#### Scenario: Keyboard activate on finished column with a source selected

- **WHEN** column A is selected as a pour source
- **AND** the player activates a focused finished column B via keyboard
- **THEN** the system attempts a pour from A to B using existing move rules

### Requirement: Finished columns remain valid destinations

A finished column SHALL remain a valid pour destination when the rules engine permits the move. The source lock applies only to sourcing from a finished column, never to pouring into one.

#### Scenario: Pour into a nearly-finished column completes it

- **WHEN** a column holds `capacity - 1` items of one colour
- **AND** the selected source has a matching-colour item on top
- **THEN** the pour is executed and the destination becomes finished

### Requirement: Rules engine unchanged

The source lock SHALL be enforced in the interaction layer only. The underlying rules engine SHALL continue to accept any move that satisfies move legality, including moves sourced from a finished column. No conformance fixtures SHALL change.

#### Scenario: Engine still accepts move from finished column

- **WHEN** the rules engine is called directly with a move sourcing from a finished column to a valid destination
- **THEN** the engine accepts and applies the move
