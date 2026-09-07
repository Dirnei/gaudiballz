## Purpose

Defines the sort puzzle itself: what a board is, which moves are legal, what a move does,
and when the puzzle is solved. Two independent implementations exist — one in the browser
that plays, one on the server that verifies — and this specification is the arbiter
between them.

## ADDED Requirements

### Requirement: Board structure

A board SHALL consist of an ordered set of tubes. Every tube is a stack of coloured items
with a shared maximum capacity, and items are added to and removed from the top only.

A board SHALL have a fixed capacity and a fixed number of colours, and SHALL contain
exactly `capacity` items of each colour. Tubes are addressed by position, counting from
zero.

Fixtures cite this requirement as `board`.

#### Scenario: A tube holds items in stack order

- **WHEN** a board has a tube containing red, blue, blue reading bottom to top
- **THEN** the top item of that tube is blue
- **AND** the topmost run of matching items in that tube is two blue items

#### Scenario: Every colour appears exactly capacity times

- **WHEN** a board has capacity 4 and 3 colours
- **THEN** the board holds exactly 4 items of each of the 3 colours
- **AND** the board holds 12 items in total across all tubes

### Requirement: Move legality

A move names a source tube and a destination tube. A move SHALL be legal only when all of
the following hold:

- the source and destination are different tubes, and both exist on the board
- the source is not empty
- the destination is not full
- the destination is empty, **or** the destination's top item is the same colour as the
  source's top item

A move that fails any of these conditions SHALL be rejected, and rejecting a move SHALL
leave the board unchanged.

Fixtures cite this requirement as `legality`.

#### Scenario: Pouring onto a matching colour is legal

- **WHEN** the source's top item is red and the destination's top item is red
- **AND** the destination has room for at least one more item
- **THEN** the move is legal

#### Scenario: Pouring onto a different colour is rejected

- **WHEN** the source's top item is red and the destination's top item is blue
- **THEN** the move is rejected
- **AND** the board is unchanged

#### Scenario: Pouring into a full tube is rejected

- **WHEN** the destination already holds `capacity` items
- **THEN** the move is rejected, even if its top item matches the source

#### Scenario: Pouring from an empty tube is rejected

- **WHEN** the source tube holds no items
- **THEN** the move is rejected

#### Scenario: A tube cannot pour into itself

- **WHEN** the source and destination are the same tube
- **THEN** the move is rejected

#### Scenario: A move onto an empty tube is legal even when it achieves nothing

- **WHEN** the source holds only one colour and the destination is empty
- **THEN** the move is legal
- **AND** it is the player's to make or avoid, not the rules' to forbid

### Requirement: Pour amount

Applying a legal move SHALL transfer the topmost run of same-coloured items from the
source to the destination, limited by the space remaining in the destination.

The number of items moved SHALL be the smaller of the length of that run and the
destination's remaining space. When the destination cannot take the whole run, the move
SHALL still be applied and the remainder SHALL stay on the source. A pour SHALL NOT be
rejected merely because the whole run does not fit.

Applying a move SHALL NOT change the number of items of any colour on the board.

Fixtures cite this requirement as `pour-amount`.

#### Scenario: The whole run moves when it fits

- **WHEN** the source's top run is 2 red items and the destination has room for 3
- **THEN** 2 items move
- **AND** the source's top run of red is gone

#### Scenario: A partial pour moves as many as fit

- **WHEN** the source's top run is 3 red items and the destination has room for 2
- **THEN** 2 items move
- **AND** 1 red item remains on top of the source
- **AND** the move is not rejected

#### Scenario: Only the topmost run moves

- **WHEN** the source contains red, blue, blue reading bottom to top
- **AND** the destination is empty
- **THEN** 2 blue items move
- **AND** the red item remains on the source

#### Scenario: Items are conserved

- **WHEN** any legal move is applied
- **THEN** the board holds the same number of items of every colour as before

### Requirement: Win condition

A board SHALL be solved when every tube is either empty, or holds items of exactly one
colour **and** is full.

A tube holding a single colour but fewer than `capacity` items SHALL NOT count as
finished, so a board where one colour is split across two such tubes MUST NOT be reported
as solved.

Fixtures cite this requirement as `win`.

#### Scenario: Every colour gathered in a full tube is solved

- **WHEN** every non-empty tube holds `capacity` items of a single colour
- **THEN** the board is solved

#### Scenario: A colour split across two partial tubes is not solved

- **WHEN** capacity is 4
- **AND** one tube holds 2 red items and another tube holds 2 red items
- **AND** every other tube is empty or full and single-coloured
- **THEN** the board is not solved

#### Scenario: A mixed tube is not solved

- **WHEN** any tube holds more than one colour
- **THEN** the board is not solved

### Requirement: Move enumeration order

Enumerating the legal moves available on a board SHALL produce them in a single
deterministic order: ascending by source tube position, and within the same source,
ascending by destination tube position. Illegal pairs are omitted.

The same board MUST always produce the same sequence, so that a hint chosen from the
enumeration is reproducible and both implementations can be compared directly.

Fixtures cite this requirement as `enumeration`.

#### Scenario: Moves are ordered by source then destination

- **WHEN** the legal moves on a board are enumerated
- **THEN** a move from tube 0 appears before any move from tube 1
- **AND** among moves from tube 0, the one to tube 2 appears before the one to tube 5

#### Scenario: Enumeration is repeatable

- **WHEN** the same board is enumerated twice
- **THEN** both enumerations produce the same moves in the same order

### Requirement: Rule set versioning

The rule set SHALL carry a version number, and a completed puzzle submitted for
verification SHALL carry the version under which it was played.

Verification SHALL apply the rule set matching the submitted version. A rule set version
that has been used in a release MUST remain available indefinitely, so that a player
running a stale cached build is judged by the rules they actually played rather than by
rules published afterwards.

Fixtures cite this requirement as `versioning`.

#### Scenario: A submission is judged by the version it declares

- **WHEN** a completed puzzle is submitted declaring rule set version 1
- **THEN** the moves are replayed under version 1
- **AND** the outcome does not depend on which version is current

#### Scenario: An unknown rule set version is refused

- **WHEN** a submission declares a rule set version the server does not recognise
- **THEN** the submission is refused as unverifiable rather than judged under a different version

### Requirement: Implementations agree

The browser implementation and the server implementation SHALL be behaviourally identical
with respect to every requirement in this capability.

A shared, language-neutral set of fixtures SHALL exist, each citing the requirement it
exercises, and both implementations MUST satisfy all of them. The fixture set MUST cover
move legality including every rejection reason, pour amounts including partial pours, the
win condition including the split-colour case, and enumeration order.

Where an implementation disagrees with this specification, the implementation is wrong.

Fixtures cite this requirement as `agreement`.

#### Scenario: Both implementations satisfy the shared fixtures

- **WHEN** the fixture set is run against the browser implementation
- **AND** the same fixture set is run against the server implementation
- **THEN** both produce the outcome the fixture declares, for every fixture

#### Scenario: A divergence fails the build

- **WHEN** either implementation produces an outcome differing from a fixture
- **THEN** the change is rejected before it can be released
