# Spec Delta

## Purpose

Lets the player pick up several full flasks that share a top colour and pour them all into one
destination with a single tap, removing repetitive tap-tap pairs (especially on the opening
move) without changing the rules of the puzzle.

## ADDED Requirements

### Requirement: Full matching flasks join the selection

When one or more flasks are selected, tapping a flask that is full, is not finished, is not
already selected, and has the same top colour as the first selected flask SHALL add that flask
to the selection. The existing selection SHALL be kept, and no pour SHALL take place.

The selection colour SHALL be the top colour of the first selected flask. Only full flasks
SHALL join by tapping. A flask with free space is a candidate destination instead.

#### Scenario: Second full flask with the same top colour joins

- **WHEN** flask A (full, red on top) is selected
- **AND** the player taps flask B (full, not finished, red on top)
- **THEN** both A and B are selected
- **AND** the board is unchanged

#### Scenario: Several full flasks join one after another

- **WHEN** flasks A and B (both full, red on top) are selected
- **AND** the player taps flask C (full, not finished, red on top)
- **THEN** A, B and C are all selected

#### Scenario: Full flask with a different top colour replaces the selection

- **WHEN** flask A (full, red on top) is selected
- **AND** the player taps flask B (full, not finished, blue on top)
- **THEN** only B is selected

#### Scenario: A finished flask never joins

- **WHEN** flask A (red on top) is selected
- **AND** the player taps flask B, which is finished (entirely blue)
- **THEN** B does not join the selection
- **AND** no flask is selected, since a finished flask cannot be picked up

#### Scenario: A partly filled first pick still gathers full flasks

- **WHEN** flask A (not full, red on top) is selected
- **AND** the player taps flask B (full, not finished, red on top)
- **THEN** both A and B are selected

### Requirement: Multi-pour destination

With two or more flasks selected, tapping a flask that is not selected SHALL pour from every
selected flask into the tapped flask only when the tapped flask is empty, or has the same top
colour as the selection and enough free space for the top runs of all selected flasks
combined. After a multi-pour, the selection SHALL be cleared.

With two or more selected, tapping any other flask SHALL NOT pour anything. The selection
SHALL be replaced by the tapped flask when it can be picked up (it is non-empty and not
finished). Otherwise the selection SHALL be cleared.

#### Scenario: Multi-pour into an empty flask

- **WHEN** flasks A and B (full, red top run of 1 each) are selected
- **AND** the player taps empty flask E
- **THEN** both red balls are poured into E
- **AND** no flask is selected

#### Scenario: Multi-pour into a matching flask with enough room

- **WHEN** flasks A and B (red top runs of 1 and 2) are selected
- **AND** the player taps flask D with red on top and 3 free slots
- **THEN** all 3 red balls are poured into D

#### Scenario: Not enough room for every selected ball

- **WHEN** flasks A and B (red top runs of 1 and 2) are selected
- **AND** the player taps flask D with red on top and only 2 free slots
- **THEN** nothing is poured
- **AND** only D is selected

#### Scenario: Mismatched non-full destination replaces the selection

- **WHEN** flasks A and B (red on top) are selected
- **AND** the player taps flask D (not full, blue on top)
- **THEN** nothing is poured
- **AND** only D is selected

### Requirement: Single selection pours as before

With exactly one flask selected, tapping a flask that does not join the selection SHALL
behave as the existing tap-tap pour, including partial pours of as many items as fit.

#### Scenario: Single-flask partial pour is unchanged

- **WHEN** only flask A (red top run of 3) is selected
- **AND** the player taps flask D with red on top and 1 free slot
- **THEN** one red ball is poured into D and two remain in A

### Requirement: Clearing a multi-selection

Tapping any selected flask SHALL clear the whole selection. Escape SHALL clear the whole
selection. Starting a drag SHALL clear the whole selection before the drag takes over.

#### Scenario: Tapping a selected flask clears everything

- **WHEN** flasks A, B and C are selected
- **AND** the player taps B
- **THEN** no flask is selected

#### Scenario: Escape clears a multi-selection

- **WHEN** flasks A and B are selected
- **AND** the player presses Escape
- **THEN** no flask is selected

#### Scenario: Drag clears a multi-selection

- **WHEN** flasks A and B are selected
- **AND** the player starts a drag from flask C
- **THEN** A and B are no longer selected and the drag proceeds from C

### Requirement: Multi-pour move accounting

A multi-pour SHALL be recorded as one ordinary move per selected flask, applied in the order
the flasks were selected. The move count, par and star rating, and the move list submitted
for server verification SHALL count each of these moves individually.

#### Scenario: Three-flask pour counts as three moves

- **WHEN** the move count is 0
- **AND** the player multi-pours from flasks A, B and C (selected in that order) into E
- **THEN** the move count is 3
- **AND** the recorded moves are A→E, B→E, C→E in that order

### Requirement: Multi-pour is undone as one step

A single undo SHALL revert a whole multi-pour, restoring the board to how it was before the
multi-pour. That undo SHALL spend exactly one undo from the attempt's undo budget. As with
every undo, it SHALL NOT lower the move count: the multi-pour's moves stay counted.

#### Scenario: One undo reverts the whole multi-pour

- **WHEN** the player has 5 undos remaining and a move count of 3 from one three-flask multi-pour
- **AND** the player undoes
- **THEN** the board is as it was before the multi-pour
- **AND** the move count is still 3
- **AND** the player has 4 undos remaining

### Requirement: Every selected flask is shown as picked up

Each selected flask SHALL display the same raised "picked up" state that a single selected
flask shows today. The state SHALL be reported to assistive technology for every selected
flask.

#### Scenario: Two selected flasks both appear raised

- **WHEN** flasks A and B are selected
- **THEN** both A and B render in the picked-up state and report themselves as pressed

### Requirement: Multi-selection works across modes and inputs

Multi-selection SHALL behave the same in the campaign, the daily challenge and the tutorial.
Keyboard activation of a flask (Enter, Space or its digit key) SHALL behave exactly as
tapping it, including joining and multi-pouring. A drag SHALL always move from a single flask.

#### Scenario: Keyboard joins and pours

- **WHEN** flask A (full, red on top) is selected
- **AND** the player focuses full flask B (red on top) and presses Enter
- **AND** then focuses empty flask E and presses Space
- **THEN** the red balls from A and B are poured into E

#### Scenario: Available in the daily challenge

- **WHEN** a player on the daily challenge selects two full flasks with the same top colour and taps an empty flask
- **THEN** both are poured into the empty flask

#### Scenario: The tutorial plays by the same selection rules

- **WHEN** a player in the tutorial taps flasks
- **THEN** the selection and pours follow the same rules as in the campaign
- **AND** because the fixed tutorial board never has two full flasks with the same top colour, a multi-selection does not arise there
