# keyboard-controls Specification

## Purpose

Maps physical keyboard keys to every game action so desktop players can play without a
pointer, reducing hand strain in long sessions and improving accessibility.

## Requirements

### Requirement: Tube focus

The play screen SHALL maintain a focused tube position. The focused tube is the one the
keyboard will act on next. A visible focus indicator SHALL distinguish the focused tube
from all others, and it SHALL be visually distinct from the "selected" (picked-up) state.

When the play screen is entered or a new level is loaded, no tube SHALL be focused until
the player presses a navigation key. Once a tube has been focused, focus SHALL remain on
a tube until the player leaves the play screen.

#### Scenario: Focus appears on first navigation key

- **WHEN** a level is loaded and no tube is focused
- **AND** the player presses an arrow key
- **THEN** a tube receives focus and the focus indicator is visible

#### Scenario: Focus indicator is distinct from selection

- **WHEN** tube 3 is focused but tube 1 is selected (picked up)
- **THEN** the focus indicator is visible on tube 3
- **AND** the selection indicator is visible on tube 1
- **AND** the two indicators are visually distinguishable

#### Scenario: Focus persists across moves

- **WHEN** the player pours from a selected tube to the focused tube
- **THEN** focus remains on that tube

### Requirement: Tube navigation

The Left and Right arrow keys SHALL move focus to the previous or next tube in board
order. Navigation SHALL wrap: pressing Right on the last tube SHALL move focus to the
first tube, and pressing Left on the first tube SHALL move focus to the last tube.

The Up and Down arrow keys SHALL move focus to the nearest tube in the row above or
below, based on the tubes' on-screen positions. When the board has only one row, or
there is no tube in the target direction, focus SHALL remain unchanged.

#### Scenario: Right arrow advances focus

- **WHEN** tube 2 is focused on a board with 7 tubes
- **AND** the player presses the Right arrow key
- **THEN** tube 3 is focused

#### Scenario: Left arrow retreats focus

- **WHEN** tube 2 is focused on a board with 7 tubes
- **AND** the player presses the Left arrow key
- **THEN** tube 1 is focused

#### Scenario: Right arrow wraps from last to first

- **WHEN** tube 6 is focused on a board with 7 tubes (indices 0–6)
- **AND** the player presses the Right arrow key
- **THEN** tube 0 is focused

#### Scenario: Left arrow wraps from first to last

- **WHEN** tube 0 is focused on a board with 7 tubes
- **AND** the player presses the Left arrow key
- **THEN** tube 6 is focused

#### Scenario: Down arrow moves to the row below

- **WHEN** tubes wrap to two rows and tube 0 is focused in the top row
- **AND** the player presses the Down arrow key
- **THEN** the nearest tube in the bottom row is focused

#### Scenario: Up arrow moves to the row above

- **WHEN** tubes wrap to two rows and a tube in the bottom row is focused
- **AND** the player presses the Up arrow key
- **THEN** the nearest tube in the top row is focused

#### Scenario: Down arrow on a single row does nothing

- **WHEN** all tubes fit in one row and a tube is focused
- **AND** the player presses the Down arrow key
- **THEN** focus does not change

### Requirement: Tube selection by keyboard

Pressing Enter or Space on the focused tube SHALL behave exactly as tapping that tube:
selecting it when nothing is selected, deselecting it when it is already selected, or
pouring into it from the currently selected tube.

#### Scenario: Enter selects a non-empty focused tube

- **WHEN** no tube is selected and the focused tube is not empty
- **AND** the player presses Enter
- **THEN** the focused tube becomes the selected tube

#### Scenario: Space pours into the focused tube

- **WHEN** tube 0 is selected and tube 3 is focused
- **AND** the pour from tube 0 to tube 3 is legal
- **AND** the player presses Space
- **THEN** the pour is executed and the selection is cleared

#### Scenario: Enter on the selected tube deselects it

- **WHEN** tube 2 is both focused and selected
- **AND** the player presses Enter
- **THEN** tube 2 is deselected and no tube is selected

#### Scenario: Illegal pour redirects selection

- **WHEN** tube 0 is selected and tube 3 is focused
- **AND** the pour from tube 0 to tube 3 is illegal
- **AND** the player presses Enter
- **THEN** if tube 3 is non-empty it becomes the new selection; otherwise the selection is cleared

### Requirement: Direct tube access

The digit keys 1 through 9 SHALL act on the tube at that position (key 1 for the first
tube, key 2 for the second, and so on). A digit beyond the number of tubes on the board
SHALL be ignored. The action performed SHALL be the same as tapping that tube.

When no tube is focused, pressing a digit key SHALL also set focus to that tube.

#### Scenario: Pressing 1 selects the first tube

- **WHEN** no tube is selected
- **AND** the player presses the 1 key
- **THEN** the first tube is selected (if non-empty)

#### Scenario: Pressing 3 pours into the third tube

- **WHEN** tube 0 is selected
- **AND** the player presses the 3 key
- **THEN** the pour from tube 0 to tube 2 (index) is attempted

#### Scenario: A digit past the tube count is ignored

- **WHEN** the board has 7 tubes
- **AND** the player presses the 8 key
- **THEN** nothing happens

### Requirement: Toolbar shortcuts

The following single-key shortcuts SHALL be available on the play screen:

- **U** — undo the last move (same as the undo button)
- **H** — use a hint (same as the hint button)
- **R** — begin restart (same as the restart button — opens the confirmation prompt)
- **N** — go to the next level (same as the next-level button, subject to the level ceiling)
- **P** — go to the previous level (same as the previous-level button)

Each shortcut SHALL be subject to the same enabled/disabled conditions as the
corresponding button. A shortcut for a disabled action SHALL be ignored.

#### Scenario: U undoes the last move

- **WHEN** the player has made a move and has undos remaining
- **AND** the player presses U
- **THEN** the last move is undone

#### Scenario: U is ignored when undo is exhausted

- **WHEN** the player has 0 undos remaining
- **AND** the player presses U
- **THEN** nothing happens

#### Scenario: H uses a hint

- **WHEN** the board is not solved and not stuck
- **AND** the player presses H
- **THEN** a hint move is played

#### Scenario: R opens restart confirmation

- **WHEN** the player presses R on the play screen
- **THEN** the restart confirmation prompt appears

#### Scenario: N advances to the next level

- **WHEN** the current level is below the level ceiling
- **AND** the player presses N
- **THEN** the game navigates to the next level

#### Scenario: P returns to the previous level

- **WHEN** the current level is above 1
- **AND** the player presses P
- **THEN** the game navigates to the previous level

### Requirement: Escape key behaviour

Escape SHALL act as a contextual dismiss or back action:

1. When a tube is selected (picked up), Escape SHALL deselect it.
2. When no tube is selected and an overlay is open (reset confirmation, solved overlay),
   Escape SHALL dismiss the overlay.
3. When no tube is selected and no overlay is open, Escape SHALL navigate back
   (play → menu).

On the level-select screen, Escape SHALL navigate back to the main menu.

#### Scenario: Escape deselects a picked-up tube

- **WHEN** a tube is selected
- **AND** the player presses Escape
- **THEN** the tube is deselected and no tube is selected

#### Scenario: Escape dismisses the reset confirmation

- **WHEN** the reset confirmation prompt is open
- **AND** the player presses Escape
- **THEN** the prompt is dismissed without resetting

#### Scenario: Escape dismisses the solved overlay

- **WHEN** the solved overlay is showing
- **AND** the player presses Escape
- **THEN** the overlay is dismissed

#### Scenario: Escape navigates back from the play screen

- **WHEN** no tube is selected and no overlay is open
- **AND** the player presses Escape
- **THEN** the game navigates to the main menu

#### Scenario: Escape navigates back from level select

- **WHEN** the player is on the level-select screen
- **AND** the player presses Escape
- **THEN** the game navigates to the main menu

### Requirement: Overlay keyboard interaction

When the reset confirmation prompt is open, Enter SHALL confirm the reset and Escape
SHALL dismiss the prompt.

When the solved overlay is showing, Enter SHALL advance to the next level and Escape
SHALL dismiss the overlay.

These bindings SHALL take priority over the tube and toolbar shortcuts for the duration
of the overlay.

#### Scenario: Enter confirms a restart

- **WHEN** the reset confirmation prompt is open
- **AND** the player presses Enter
- **THEN** the level is restarted

#### Scenario: Enter on the solved overlay advances

- **WHEN** the solved overlay is showing
- **AND** the player presses Enter
- **THEN** the game advances to the next level

### Requirement: Keyboard does not interfere with pointer input

Keyboard controls SHALL coexist with mouse and touch input. Using the mouse or touch at
any time SHALL continue to work exactly as before. A mouse click on a tube SHALL update
the focused position to that tube, so switching between input methods does not leave
focus stranded on a tube the player is no longer looking at.

#### Scenario: Mouse click updates the focused tube

- **WHEN** tube 2 is focused
- **AND** the player clicks tube 5 with the mouse
- **THEN** tube 5 is acted on as before
- **AND** the focused position moves to tube 5

#### Scenario: Touch still works

- **WHEN** the player has been using the keyboard
- **AND** they tap a tube on a touch screen
- **THEN** the tap is handled exactly as it was before keyboard support

### Requirement: Keyboard shortcuts are play-screen only

Toolbar shortcuts (U, H, R, N, P) and digit-key tube access SHALL only be active on the
play screen. They SHALL NOT fire on the main menu, level-select screen, or while a text
input has focus (such as the level-code entry field).

#### Scenario: Typing in the level-code field does not trigger shortcuts

- **WHEN** the level-code input is focused on the main menu
- **AND** the player types "H"
- **THEN** the character is entered into the field
- **AND** no hint is triggered

#### Scenario: Shortcuts do not fire on the level-select screen

- **WHEN** the player is on the level-select screen
- **AND** the player presses U
- **THEN** nothing happens
