## MODIFIED Requirements

### Requirement: Drag initiation

A drag gesture SHALL begin when the player presses and holds on a non-empty, non-finished tube and moves the pointer beyond a small movement threshold. Pressing on an empty tube or a finished tube SHALL NOT initiate a drag. The movement threshold SHALL be small enough to feel responsive but large enough to distinguish an intentional drag from an imprecise tap.

#### Scenario: Drag starts from a non-empty, non-finished tube

- **WHEN** the player presses on a non-empty, non-finished tube and moves the pointer beyond the threshold
- **THEN** a drag gesture begins from that tube

#### Scenario: Empty tube does not start a drag

- **WHEN** the player presses on an empty tube and moves the pointer
- **THEN** no drag gesture begins

#### Scenario: Finished tube does not start a drag

- **WHEN** the player presses on a finished tube and moves the pointer
- **THEN** no drag gesture begins

#### Scenario: Movement below threshold is a tap

- **WHEN** the player presses on a tube and releases without moving beyond the threshold
- **THEN** the interaction is treated as a tap, not a drag
