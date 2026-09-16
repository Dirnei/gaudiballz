## MODIFIED Requirements

### Requirement: Wallet balance is the authoritative XP total

The player's total XP as reported by the progress API, rank computation, and leaderboard ranking SHALL equal the sum of all credit entries minus all adjustment debits in the player's ledger.

The system SHALL NOT derive total XP from stored per-level point fields. The ledger balance SHALL be the single source of truth.

When the wallet is temporarily unavailable, the system SHALL fall back to the progress-derived total rather than failing the request. The fallback SHALL be transparent to the client.

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

#### Scenario: Wallet unavailable falls back gracefully

- **WHEN** the wallet actor is unreachable for a player
- **THEN** the progress API returns the progress-derived total as a fallback
- **AND** the leaderboard upsert uses the progress-derived total
- **AND** no error is returned to the client
