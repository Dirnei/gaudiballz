# shared-game-board Specification

## Purpose

Guarantees that every play mode (campaign, daily challenge, tutorial) offers exactly the same
board interaction, so a rule about tapping, dragging, keyboard play or finished columns holds
everywhere rather than only in the mode it was first built for.

## Requirements

### Requirement: Identical board interaction in every mode

The campaign, the daily challenge and the tutorial SHALL handle board interaction identically.
Given the same board and the same input sequence (taps, drags, keyboard activation and
navigation), each mode SHALL produce the same selection, the same moves and the same resulting
board. The board interaction requirements in `finished-column-lock`, `drag-and-drop` and
`keyboard-controls` SHALL apply in every mode.

#### Scenario: Same taps give the same result in every mode

- **WHEN** the same board is loaded in the campaign, the daily challenge and the tutorial
- **AND** the player performs the same sequence of taps in each
- **THEN** each mode ends with the same board, the same move list and the same selection

#### Scenario: Finished column cannot be picked up in the daily challenge

- **WHEN** no column is selected on the daily challenge board
- **AND** the player taps, drags from, or keyboard-activates a finished column
- **THEN** the finished column is not selected and no drag begins

#### Scenario: Drop highlight in the daily challenge

- **WHEN** a drag is active on the daily challenge board
- **AND** the pointer is over a tube that is a legal destination
- **THEN** that tube shows the same drop-hover highlight as in the campaign

### Requirement: Shared board presentation

Every mode SHALL lay out the tube grid by the same rule and render tubes, the selected state and
drop targets the same way. Where a mode shows the move counter, par, timer, undo, hint and
restart controls, the restart confirmation or the stuck notice, those elements SHALL look and
behave the same as in every other mode that shows them.

#### Scenario: Grid layout matches across modes

- **WHEN** boards with the same number of tubes are shown in two different modes
- **THEN** the tubes are arranged in the same rows and columns

#### Scenario: Controls behave the same where shown

- **WHEN** the undo, hint and restart controls are shown in both the campaign and the daily challenge
- **THEN** their budgets, cooldown display and confirmation behave identically

### Requirement: Modes differ only in their surroundings

A mode MAY differ from the others only in what surrounds the board: how the board is obtained,
what happens on completion (overlay, submission, navigation), mode-specific headers and prompts,
and which of the board controls are shown. A mode SHALL NOT change how a tap, drag, keyboard
action, pour, undo or hint behaves on the board.

#### Scenario: Tutorial hides controls without changing play

- **WHEN** the tutorial is shown
- **THEN** the undo, hint, restart, timer and move counter are not shown
- **AND** taps, drags and keyboard actions on the board behave as in the campaign
