## Purpose

Rewards registered players with achievements for how they play — milestones reached,
quality of individual completions, daily streaks, and exploratory challenges — giving
returning players goals beyond the next level number.

## Requirements

### Requirement: Achievements are awarded only to registered players

The system SHALL evaluate and award achievements only for players who have a registered
account (not anonymous). Anonymous players SHALL NOT earn or see achievements.

When an anonymous player registers, the system SHALL retroactively evaluate their existing
progress against the achievement catalogue and award any achievements already met.

#### Scenario: An anonymous player does not earn achievements

- **WHEN** an anonymous player completes a level
- **THEN** no achievements are evaluated or awarded

#### Scenario: Registering awards retroactive achievements

- **WHEN** a player who has completed 12 levels registers an account
- **THEN** they are awarded "First Steps", "Getting Started", and "Double Digits" immediately

### Requirement: Achievement catalogue

The system SHALL maintain a fixed catalogue of achievements. Each achievement SHALL have a
unique string identifier, a display name, a description, and a category.

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

Each achievement SHALL be awarded at most once per player. Earning the same achievement
a second time SHALL be a no-op.

#### Scenario: The catalogue is available

- **WHEN** a registered player requests their achievements
- **THEN** every achievement in the catalogue is present in the response, each marked as
  earned or not earned

#### Scenario: An achievement is not awarded twice

- **WHEN** a player who already has "Flawless Ten" completes another level without hints
- **THEN** the achievement remains earned with its original timestamp and is not duplicated

### Requirement: Milestone achievements are evaluated on completion count

Milestone achievements SHALL be awarded when the player's total count of distinct
completed levels reaches the required threshold.

Replaying an already-completed level SHALL NOT increase the count for milestone purposes.

#### Scenario: Reaching a milestone

- **WHEN** a player completes their 10th distinct level
- **THEN** they are awarded the 10-level milestone achievement

#### Scenario: Replaying does not inflate milestones

- **WHEN** a player who has completed 9 distinct levels replays level 3 and completes it
- **THEN** their distinct count remains 9 and the 10-level milestone is not awarded

### Requirement: Perfection achievements are evaluated per completion and cumulatively

The "under par" achievement SHALL be evaluated per completion: the completion's move count
is compared against the level's par value. A completion exactly at par SHALL qualify.

Cumulative perfection achievements SHALL be evaluated against the player's collection of
best results:
- "Flawless Ten" — 10 distinct levels with 0 hints in the best result.
- "No Help Needed" — 25 distinct levels with 0 hints in the best result.
- "Purist" — 40 distinct levels with 0 hints and 0 undos in the best result.
- "Speed Demon" — 5 distinct levels at or below par in the best result.

Replaying an already-completed level SHALL NOT increase cumulative counts unless the
replay produces a new best result that newly qualifies (e.g., a replay that lowers hints
to 0 for the first time).

#### Scenario: Completing at par

- **WHEN** a level has par 12 and a player completes it in exactly 12 moves
- **THEN** they are awarded the under-par achievement (if not already earned)

#### Scenario: Cumulative no-hint thresholds

- **WHEN** a player's best results show 10 distinct levels completed with 0 hints
- **THEN** they are awarded the "Flawless Ten" achievement
- **AND** when 25 distinct levels show 0 hints they are awarded "No Help Needed"

#### Scenario: Cumulative purist threshold

- **WHEN** a player's best results show 40 distinct levels completed with 0 hints and
  0 undos
- **THEN** they are awarded the "Purist" achievement

#### Scenario: Replay improving a best result counts

- **WHEN** a player replays a level and achieves 0 hints for the first time on that level
- **THEN** their cumulative no-hint count increases by 1

### Requirement: Streak achievements track consecutive calendar days

The system SHALL track distinct calendar days (UTC) on which a player completes at least
one level. A "streak" is a run of consecutive calendar days with at least one completion.

Streak achievements SHALL be awarded when the player's current streak reaches the required
length.

A day with no completion SHALL break the streak. The streak resets to 0 at that point;
it does not resume from where it left off.

#### Scenario: A two-day streak

- **WHEN** a player completes a level on Monday and another on Tuesday (UTC)
- **THEN** they are awarded the 2-day streak achievement

#### Scenario: A broken streak

- **WHEN** a player completes levels on Monday and Tuesday, skips Wednesday, then completes
  on Thursday
- **THEN** their streak resets to 1 on Thursday and the 7-day streak is not awarded

#### Scenario: Multiple completions on one day count as one day

- **WHEN** a player completes 5 levels on the same calendar day (UTC)
- **THEN** that counts as 1 day toward the streak, not 5

### Requirement: Calendar week achievement

The full-week achievement SHALL be awarded when a player has at least one completion on
every day of a single ISO calendar week (Monday through Sunday).

The completions need not be in the same calendar week at the time of evaluation — the
system SHALL check whether any single Monday-through-Sunday span in the player's history
is fully covered.

#### Scenario: Every day of a week

- **WHEN** a player has completions on Mon, Tue, Wed, Thu, Fri, Sat, and Sun of the same
  ISO week
- **THEN** they are awarded the full-week achievement

#### Scenario: Six of seven days

- **WHEN** a player has completions on every day of a week except Wednesday
- **THEN** the full-week achievement is not awarded

### Requirement: Exploration achievements

The "restart and complete" achievement SHALL be awarded when a player restarts a level
(resets to the initial board state) and then completes that same level in the same
browser session, as reported by the client in the completion payload.

The "all hints used" achievement SHALL be awarded when a completion reports that all
available hints for the attempt were used and the level was still completed.

The "deep diver" achievement SHALL be awarded when a player completes a level whose
colour count is 6 or more.

The "marathon" achievement SHALL be awarded when a player completes 10 distinct levels
in a single browser session. The session is defined client-side as the period from page
load to page unload; the server relies on a session identifier provided by the client.

#### Scenario: Restart then complete

- **WHEN** a player restarts level 15 and then completes it without leaving the page
- **THEN** they are awarded the restart-and-complete achievement

#### Scenario: All hints spent and still solved

- **WHEN** a player uses all 3 hints in a level and completes it
- **THEN** they are awarded the all-hints-used achievement

#### Scenario: Completing a 6-colour level

- **WHEN** a player completes a level that has 6 distinct colours
- **THEN** they are awarded the deep-diver achievement

#### Scenario: Ten levels in one sitting

- **WHEN** a player completes 10 distinct levels without closing or refreshing the page
- **THEN** they are awarded the marathon achievement

### Requirement: Achievements are retrievable

The system SHALL provide an API endpoint that returns the full achievement state for the
authenticated player: every achievement in the catalogue, whether it is earned, the
timestamp when it was earned (if earned), and current progress toward the threshold
(for achievements with a numeric target).

The response SHALL NOT require the client to know the catalogue — the server SHALL
include the display name, description, and category for each achievement.

#### Scenario: A registered player fetches achievements

- **WHEN** a registered player requests their achievements
- **THEN** the response lists every achievement with its earned state, and for earned
  achievements the UTC timestamp of when it was awarded

#### Scenario: Progress is included for threshold achievements

- **WHEN** a player who has completed 7 distinct levels fetches achievements
- **THEN** the 10-level milestone shows current progress of 7

### Requirement: Newly earned achievements are reported on completion

When a completion awards one or more achievements, the completion response SHALL include
the identifiers and display names of the newly earned achievements, so the client can
show them without a separate request.

#### Scenario: A completion that earns achievements

- **WHEN** a player completes their 10th level and it is their 10th with 0 hints
- **THEN** the completion response includes both the 10-level milestone and the "Flawless
  Ten" achievement as newly earned

#### Scenario: A completion that earns nothing new

- **WHEN** a player completes a level and no new achievements are triggered
- **THEN** the completion response includes an empty list of new achievements

### Requirement: Achievement toast on earn

When the client receives newly earned achievements in a completion response, it SHALL
display a brief, non-blocking notification (toast) for each one.

The toast SHALL show the achievement's display name and SHALL dismiss itself
automatically. It SHALL NOT interrupt gameplay or require interaction to dismiss.

The toast SHALL NOT appear for retroactive achievements awarded at registration — only
for achievements earned by a completion during play.

#### Scenario: Toast appears after solving

- **WHEN** a player solves a level and the response includes a new achievement
- **THEN** a toast with the achievement name appears briefly on the solved screen

#### Scenario: Toast does not block play

- **WHEN** a toast is showing and the player taps "Next level"
- **THEN** the toast dismisses and the next level loads without delay

#### Scenario: No toast for retroactive awards

- **WHEN** a player registers and 3 achievements are awarded retroactively
- **THEN** no toasts are shown for those achievements

### Requirement: Achievements are visible in the account panel

A registered player SHALL be able to view their achievements from the account panel.

The achievements view SHALL group achievements by category and SHALL visually distinguish
earned achievements from locked ones.

Locked achievements SHALL show their name and description so the player knows what to
aim for. Progress toward threshold-based achievements SHALL be shown (e.g., "7 / 10
levels").

The achievements view SHALL NOT be accessible to anonymous players.

#### Scenario: A registered player opens achievements

- **WHEN** a registered player opens the account panel and navigates to achievements
- **THEN** they see achievements grouped by category, with earned ones visually distinct

#### Scenario: Locked achievements show what to do

- **WHEN** a player has not earned the 50-level milestone
- **THEN** it appears as locked with its description and their current progress (e.g.,
  "23 / 50 levels")

#### Scenario: An anonymous player does not see achievements

- **WHEN** an anonymous player opens the account panel
- **THEN** no achievements section is shown

### Requirement: Achievements survive across devices

A registered player's achievements SHALL be stored server-side and SHALL be available on
any device the player signs in to.

#### Scenario: Achievements appear on a new device

- **WHEN** a player with achievements signs in on a new device
- **THEN** their earned achievements are present

### Requirement: Achievements are not solicited

The system SHALL NOT prompt, nag, or interrupt a player about achievements they have not
earned. Locked achievements are visible only when the player chooses to look at them in
the achievements view.

No banner, badge, or notification SHALL appear to tell a player they are "close to" an
achievement unless they are already viewing the achievements panel.

#### Scenario: No unsolicited nudge

- **WHEN** a player is 1 level away from the 50-level milestone
- **THEN** no notification or prompt appears during gameplay about it
