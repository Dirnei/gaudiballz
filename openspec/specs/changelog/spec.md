# changelog Specification

## Purpose
Tells players what changed in the game since they last played, through a player-facing
"What's new" list of releases, a page that shows it, and a one-time notice after an update.

## Requirements

### Requirement: Changelog entries

The game SHALL ship a changelog made of releases. Each release MUST have a version number
and a publication date, and lists the new features and the bug fixes it contains. Only
features and bug fixes SHALL be shown to players; other kinds of change (maintenance,
refactoring, documentation, tests, build) MUST NOT appear. A release with neither
features nor fixes SHALL NOT be shown. Release text SHALL be shown in English whatever the
active locale; the surrounding labels (page title, "New" and "Fixed" headings, buttons)
SHALL follow the active locale. The changelog MUST be part of the delivered game, so it is
available without a network connection.

#### Scenario: Only features and fixes are shown

- **WHEN** release 0.7.0 contains one feature, one bug fix and one maintenance change
- **THEN** the release lists the feature under "New" and the fix under "Fixed"
- **AND** the maintenance change is not shown

#### Scenario: Release text stays English in German

- **WHEN** the active locale is `de` and a release is displayed
- **THEN** its feature and fix descriptions are shown in English
- **AND** the page title and the "New" / "Fixed" headings are shown in German

#### Scenario: Changelog available offline

- **WHEN** the game is loaded and the network becomes unavailable
- **THEN** the changelog can still be opened and shows every release

### Requirement: What's new page

The game SHALL serve a "What's new" page at the path `/changelog`. The page SHALL list
every shown release, newest first, each with its version number, its date formatted for
the active locale, and its features and fixes. The page SHALL be reachable without an
account and SHALL offer the same way back to the main menu as other content pages.

#### Scenario: Visiting the changelog page

- **WHEN** a player navigates to `/changelog`
- **THEN** every shown release is listed with the newest version at the top

#### Scenario: Anonymous visitor reads the changelog

- **WHEN** a visitor without an account navigates to `/changelog`
- **THEN** the page is displayed without prompting for login or registration

### Requirement: Footer link to the changelog

Every screen that shows the footer SHALL include a "What's new" link in it that navigates
to the changelog page. The link MUST be styled like the other footer links.

#### Scenario: Opening the changelog from the footer

- **WHEN** a player activates the "What's new" link in the footer
- **THEN** the changelog page is displayed

### Requirement: Viewing the changelog marks releases as seen

The game SHALL remember, in the player's browser and without requiring an account, the
newest release the player has seen. Opening the changelog page or dismissing the
"What's new" notice SHALL mark every current release as seen.

#### Scenario: Visiting the page marks releases seen

- **WHEN** a player with unseen releases opens the changelog page
- **AND** later returns to the main menu
- **THEN** the "What's new" notice is not shown for those releases

### Requirement: What's new notice after an update

When a returning player opens a screen that shows the footer and at least one shown
release has a higher version than the newest release they have seen, the game SHALL show
a dismissable "What's new" notice listing only those unseen releases, newest first, with a
link to the full changelog page. The notice SHALL be shown at most once per set of unseen
releases: once dismissed or followed, it SHALL NOT reappear until a newer release is
published.

The notice MUST NOT appear on gameplay, tutorial, or daily-challenge screens; if the
player lands on one of those first, the notice SHALL wait until they reach a screen that
shows the footer. The notice MUST NOT appear on a player's first visit; instead, all
releases existing at that time SHALL be treated as already seen. A player who has played
in this browser before but has never seen the changelog SHALL be treated as having seen
every release except the newest one.

#### Scenario: Returning player sees new releases

- **WHEN** a player last saw release 0.6.0
- **AND** releases 0.7.0 and 0.8.0 have since been published
- **AND** the player opens the main menu
- **THEN** a "What's new" notice lists 0.8.0 and 0.7.0, newest first
- **AND** 0.6.0 is not listed

#### Scenario: Versions compare numerically

- **WHEN** a player last saw release 0.9.0
- **AND** release 0.10.0 has since been published
- **THEN** the notice lists 0.10.0

#### Scenario: Dismissed notice does not return

- **WHEN** a player dismisses the "What's new" notice
- **AND** reloads the game
- **THEN** the notice is not shown again

#### Scenario: A newer release brings the notice back

- **WHEN** a player dismissed the notice after seeing release 0.7.0
- **AND** release 0.8.0 is published
- **AND** the player opens the main menu
- **THEN** the notice is shown listing only 0.8.0

#### Scenario: First visit shows no notice

- **WHEN** a player opens the game for the first time in this browser
- **THEN** no "What's new" notice is shown
- **AND** on a later visit with no newer releases, no notice is shown either

#### Scenario: Existing player meets the changelog for the first time

- **WHEN** a player who played in this browser before the changelog existed opens the main menu
- **AND** the changelog holds releases 0.6.0 and 0.7.0
- **THEN** the notice lists only 0.7.0

#### Scenario: Notice waits until gameplay is left

- **WHEN** a returning player with unseen releases opens the game directly on the gameplay screen
- **THEN** no notice is shown during gameplay
- **AND** the notice is shown once they navigate to the main menu

#### Scenario: Following the link to the full page

- **WHEN** a player activates the link to the full changelog in the notice
- **THEN** the notice closes and the changelog page is displayed

### Requirement: Changelog storage failure is harmless

If the browser does not allow the game to remember which releases were seen, the game
SHALL NOT show the "What's new" notice and SHALL otherwise work normally, including the
changelog page.

#### Scenario: Blocked storage

- **WHEN** a player's browser blocks local storage
- **THEN** no "What's new" notice is shown
- **AND** the changelog page still lists every shown release
