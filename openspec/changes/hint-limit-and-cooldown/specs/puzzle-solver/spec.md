## ADDED Requirements

### Requirement: Hints are budgeted

Hints SHALL be limited to a per-attempt budget. Each attempt SHALL allow at most 3 hints.

The hint control SHALL be disabled once the budget is exhausted.

A cooldown timer of 30 seconds SHALL gate each hint request. The hint control SHALL
remain disabled while the cooldown is active, even when budget remains. A visual
indicator on or near the hint control SHALL show the cooldown progress so the player
knows when it will be ready.

The cooldown SHALL begin:
- when a level is first loaded,
- when a level is reset,
- after a hint is used.

When the cooldown expires and budget remains, the hint control SHALL become available.

When the position is not winnable, the hint control SHALL remain disabled regardless of
budget or cooldown state.

The number of hints used SHALL continue to be recorded per attempt, so a level cleared
with help can be told apart from one cleared without it.

What the budget is NOT is as much part of this as what it is. A hint SHALL NOT cost money,
SHALL NOT require watching advertising, and SHALL NOT be purchasable by any means. The
limit exists to make a hint worth asking for, and the game has nothing to sell.

#### Scenario: Hint is gated by cooldown at level start

- **WHEN** a level is loaded for the first time
- **THEN** the hint control is disabled for 30 seconds
- **AND** a cooldown indicator shows the remaining wait

#### Scenario: Hint becomes available after cooldown

- **WHEN** the 30-second cooldown expires and the player has hints remaining
- **THEN** the hint control becomes available

#### Scenario: Each hint starts a new cooldown

- **WHEN** the player uses a hint and has hints remaining
- **THEN** the hint control is disabled for another 30 seconds

#### Scenario: Remaining hint count is visible

- **WHEN** a level is in progress
- **THEN** the remaining hint count is displayed near the hint control

#### Scenario: Hints run out

- **WHEN** the player has used 3 hints in the current attempt
- **THEN** the hint control is disabled and cannot be activated

#### Scenario: Cooldown does not grant extra hints

- **WHEN** the player has 0 hints remaining and a cooldown expires
- **THEN** the hint control remains disabled

#### Scenario: Hint use is counted

- **WHEN** a player uses hints and then clears the level
- **THEN** the number of hints used in that attempt is available

#### Scenario: A hint is never sold

- **WHEN** a player has no hints remaining
- **THEN** no way to obtain more is offered
- **AND** nothing is asked of them in exchange

## REMOVED Requirements

### Requirement: Hints are free

**Reason**: Unlimited, instant hints removed the reason to think before asking. The
requirement forbade limiting hints by count or by waiting, and this change introduces both,
so it is a reversal of the requirement rather than an adjustment to it.

The half of it that still holds — that a hint is never sold, never gated behind advertising,
and never a currency — is carried into "Hints are budgeted" rather than dropped. What changes
is that generosity stops being unlimited; it does not become a business model.

**Migration**: Recording of hints used per attempt is unchanged, so existing progress and
completion records keep their meaning. Players lose nothing already earned: the budget
applies from the next attempt started after the change ships.
