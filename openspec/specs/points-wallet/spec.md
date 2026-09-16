## Purpose

Tracks every XP earning as a discrete ledger entry per player, maintaining an authoritative balance that replaces the derived sum, so that scoring corrections can be applied without losing point history.

## Requirements

### Requirement: Each XP earning is recorded as a discrete ledger entry

Every XP credit the system awards SHALL be recorded as a separate ledger entry containing the amount, the category of the earning, the level it came from (when applicable), and the time it was recorded.

Categories SHALL include at minimum: base score, first-clear bonus, no-hint bonus, streak-day bonus, replay bonus, and time-beat bonus.

The ledger SHALL be append-only — entries are never deleted or mutated after recording.

#### Scenario: Base score and bonuses recorded separately

- **WHEN** a player completes a level for the first time with 3 stars and no hints
- **THEN** the ledger contains at least three separate entries: one for the base score (500 XP), one for the first-clear bonus (75 XP), and one for the no-hint bonus (50 XP)
- **AND** each entry identifies its category and the level

#### Scenario: Replay with no bonuses records only the applicable entries

- **WHEN** a player replays a level and earns no new bonuses and does not improve their star rating
- **THEN** no new ledger entries are created for that completion

#### Scenario: Streak bonus recorded on first completion of the day

- **WHEN** a player completes their first level of the UTC day
- **THEN** a streak-day bonus entry of 25 XP is recorded in the ledger

### Requirement: Wallet balance is the authoritative XP total

The player's total XP as reported by the progress API, rank computation, and leaderboard ranking SHALL equal the sum of all credit entries minus all adjustment debits in the player's ledger.

The system SHALL NOT derive total XP from stored per-level point fields. The ledger balance SHALL be the single source of truth.

When the ledger is temporarily unavailable, the system SHALL fall back to the total derived from stored progress rather than failing the request. The fallback SHALL be transparent to the client.

#### Scenario: Balance matches sum of credits

- **WHEN** a player has ledger entries totalling 1,250 XP in credits and 0 in adjustments
- **THEN** the progress API reports 1,250 XP as their total

#### Scenario: Balance reflects an adjustment

- **WHEN** a player has 1,250 XP in credits and a −150 XP adjustment
- **THEN** the progress API reports 1,100 XP as their total

#### Scenario: Rank uses the wallet balance

- **WHEN** a player's wallet balance is 85,000 XP
- **THEN** their rank is computed as Silver 1 (same thresholds as today)

#### Scenario: Leaderboard uses the wallet balance

- **WHEN** two registered players have wallet balances of 10,000 and 8,000 XP
- **THEN** the global leaderboard ranks the first player above the second

#### Scenario: Ledger unavailable falls back gracefully

- **WHEN** a player's ledger cannot be read
- **THEN** the progress API reports the total derived from stored progress instead
- **AND** the global leaderboard records that same total
- **AND** no error is returned to the client

### Requirement: Star-rating improvements issue an adjustment

When a player improves their best star rating on a level, the system SHALL record an adjustment entry that revokes the previous base-score credit and a new credit entry for the higher amount.

The net change in balance SHALL equal the difference between the new and old star-rating point values.

#### Scenario: Improving from 2 stars to 3 stars

- **WHEN** a player improves from 2 stars (250 XP) to 3 stars (500 XP) on a level
- **THEN** the ledger contains an adjustment of −250 XP for the old base score and a credit of 500 XP for the new base score
- **AND** the net balance change is +250 XP

#### Scenario: No improvement produces no adjustment

- **WHEN** a player replays a level and earns 1 star where they had 3 stars
- **THEN** no adjustment or new base-score credit is recorded

### Requirement: Wallet works for all players

The wallet SHALL maintain a ledger and balance for both anonymous and registered players. No account is required to accumulate XP through the wallet.

#### Scenario: Anonymous player earns credits

- **WHEN** an anonymous player completes a level
- **THEN** their ledger records the base-score credit and any applicable bonus credits

#### Scenario: Balance survives account linking

- **WHEN** an anonymous player with 2,000 XP links an account
- **THEN** their wallet balance remains 2,000 XP

### Requirement: Migration preserves existing XP totals

When the wallet is introduced, existing players SHALL have their wallets seeded from their current progress data so that the wallet balance equals their pre-existing total XP.

The migration SHALL be idempotent — running it more than once SHALL NOT duplicate credits.

#### Scenario: Existing player sees the same total after migration

- **WHEN** a player had 5,400 XP before the wallet was introduced
- **THEN** after migration, their wallet balance is 5,400 XP

#### Scenario: Re-running migration does not duplicate

- **WHEN** the migration runs a second time for the same player
- **THEN** their wallet balance is unchanged
