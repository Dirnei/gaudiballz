# Spec Delta

## ADDED Requirements

### Requirement: Tutorial board plays like every other board

The tutorial board SHALL support every board input the campaign supports: tap-tap, drag-and-drop
and keyboard focus and activation. The finished-column lock SHALL apply. The tutorial SHALL NOT
show undo, hint, restart, timer or move-counter controls. A pour made by any input method SHALL
advance the guided prompts in the same way as a tap-tap pour.

#### Scenario: Drag pour in the tutorial

- **WHEN** a player in the tutorial drags from a non-empty tube and releases over a legal destination
- **THEN** the pour is executed
- **AND** if it is the first pour, the prompt advances to free play

#### Scenario: Keyboard pour in the tutorial

- **WHEN** a player in the tutorial selects a tube with Enter and activates another tube with Enter
- **AND** the pour is legal
- **THEN** the pour is executed

#### Scenario: Tutorial shows no budget controls

- **WHEN** a player is in the tutorial
- **THEN** no undo, hint, restart, timer or move counter is visible
