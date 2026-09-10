## MODIFIED Requirements

### Requirement: Achievement catalogue

The system SHALL maintain a fixed catalogue of achievements. Each achievement SHALL have a unique string identifier, a display name, a description, and a category.

The achievement response SHALL include the stable string identifier for each achievement so that clients can map it to locale-specific translations. The server-provided display name and description SHALL serve as the English-language default.

The initial catalogue SHALL include achievements in these categories:

**Milestones** — cumulative level completions:
- Complete 1 level
- Complete 5 levels
- Complete 10 levels
- Complete 25 levels
- Complete 50 levels
- Complete 100 levels
- Complete 150 levels

**Perfection** — quality of individual completions:
- Complete a level at or below par moves
- Complete 10 distinct levels without using any hints
- Complete 25 distinct levels without using any hints
- Complete 40 distinct levels without using any hints or undos
- Complete 5 distinct levels at or below par moves

**Streaks** — consecutive calendar days with at least one completion:
- Play on 2 consecutive days
- Play on 7 consecutive days
- Play on 14 consecutive days
- Play on 30 consecutive days

**Calendar** — breadth within a calendar week:
- Complete at least one level on every day of a single calendar week (Monday through Sunday)

**Exploration** — breadth and resilience:
- Restart a level and then complete it in the same session
- Use all available hints in a single level and still complete it
- Complete a level with 6 or more distinct colours
- Complete 10 levels in a single browser session without the page being closed or refreshed

Each achievement SHALL be awarded at most once per player. Earning the same achievement a second time SHALL be a no-op.

#### Scenario: The catalogue is available with identifiers

- **WHEN** a registered player requests their achievements
- **THEN** every achievement in the catalogue is present in the response, each with its stable string identifier, display name, description, category, and earned state

#### Scenario: An achievement is not awarded twice

- **WHEN** a player who already has "Flawless Ten" completes another level without hints
- **THEN** the achievement remains earned with its original timestamp and is not duplicated

### Requirement: Achievements are retrievable

The system SHALL provide an API endpoint that returns the full achievement state for the authenticated player: every achievement in the catalogue, whether it is earned, the timestamp when it was earned (if earned), and current progress toward the threshold (for achievements with a numeric target).

The response SHALL include the stable string identifier, display name, description, and category for each achievement. The client MAY use the identifier to resolve a locale-specific translation, falling back to the server-provided display name and description when no translation is available.

#### Scenario: A registered player fetches achievements

- **WHEN** a registered player requests their achievements
- **THEN** the response lists every achievement with its identifier, display name, description, earned state, and for earned achievements the UTC timestamp of when it was awarded

#### Scenario: Progress is included for threshold achievements

- **WHEN** a player who has completed 7 distinct levels fetches achievements
- **THEN** the 10-level milestone shows current progress of 7

### Requirement: Newly earned achievements are reported on completion

When a completion awards one or more achievements, the completion response SHALL include the identifiers, display names, and descriptions of the newly earned achievements, so the client can show them in the active locale without a separate request.

#### Scenario: A completion that earns achievements

- **WHEN** a player completes their 10th level and it is their 10th with 0 hints
- **THEN** the completion response includes both the 10-level milestone and the "Flawless Ten" achievement as newly earned, each with its identifier

#### Scenario: A completion that earns nothing new

- **WHEN** a player completes a level and no new achievements are triggered
- **THEN** the completion response includes an empty list of new achievements
