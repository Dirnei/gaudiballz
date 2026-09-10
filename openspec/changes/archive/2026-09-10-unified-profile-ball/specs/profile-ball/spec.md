## MODIFIED Requirements

### Requirement: An account is shown as a ball

Wherever the game shows which account the player is on, it SHALL show a ball in one of the game's own colours alongside the username.

Wherever the game shows another player's name — leaderboard entries, activity feed events, daily leaderboard rows — it SHALL show that player's ball colour using the same rendering as the account's own ball. If the player has chosen a colour, that colour SHALL be used. If not, the colour SHALL be derived from their username using the canonical derivation.

Until the player chooses one, the colour SHALL be derived from the username, and SHALL be the same every time that username is shown. The derived colour SHALL be one of the vivid colours; a neutral SHALL NOT be derived, because a grey or white ball reads as the absence of an account rather than as somebody's.

A player with no account SHALL NOT be shown a ball. The absence of an account is shown as an empty outline, so a ball always means "you are logged in".

#### Scenario: A logged-in player has a ball

- **WHEN** a player is logged in and has chosen nothing
- **THEN** a coloured ball is shown with their username
- **AND** it is the same colour every time that account is shown

#### Scenario: An anonymous player has no ball

- **WHEN** a player has no account
- **THEN** no coloured ball is shown for them

#### Scenario: Another player's chosen ball appears on the leaderboard

- **WHEN** a player who chose red appears on the leaderboard
- **THEN** their entry shows a red ball, not a hash-derived colour

#### Scenario: Another player's chosen ball appears in the activity feed

- **WHEN** a player who chose blue completes a level and appears in the activity feed
- **THEN** their feed entry shows a blue ball

### Requirement: Choosing a ball

A player with an account SHALL be able to choose which of the game's colours represents them, from the same place the other account controls are reached.

The choice SHALL take effect immediately, everywhere the account is shown — including in leaderboard entries and activity feed events visible to other players.

A player SHALL be able to change the choice as often as they like, and SHALL be able to return to the colour derived from their username.

Choosing SHALL be optional: an account that has never chosen SHALL look exactly as it did before choosing was possible.

A player with no account SHALL NOT be offered the choice, in keeping with there being no account for a ball to belong to.

#### Scenario: A player picks a ball

- **WHEN** a logged-in player chooses an available colour
- **THEN** the ball shown for their account is that colour
- **AND** it is that colour everywhere the account appears

#### Scenario: The choice can be changed

- **WHEN** a player who has chosen a colour chooses a different one
- **THEN** the later choice is the one shown

#### Scenario: An account that never chose is untouched

- **WHEN** a player has never chosen a colour
- **THEN** the ball shown is the one derived from their username

#### Scenario: An anonymous player is not offered it

- **WHEN** a player with no account opens the account controls
- **THEN** no ball picker is shown

#### Scenario: Changing the ball updates the leaderboard

- **WHEN** a player changes their profile ball
- **THEN** their leaderboard entries reflect the new ball on the next view
