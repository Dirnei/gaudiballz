# app-shell Specification

## Purpose
Provides a reusable page shell (header, footer, navigation) and a URL-based routing structure so every page in the application has a bookmarkable address and new pages can be added by registering a route.

## Requirements

### Requirement: Every page has a URL

The application SHALL use client-side routing so that each screen has a distinct URL path. Navigating directly to a URL SHALL render the corresponding page without requiring the user to click through from the home screen.

#### Scenario: Direct navigation to a page

- **WHEN** a user navigates to `/impressum` in their browser
- **THEN** the Impressum page is displayed without passing through the home screen

#### Scenario: Browser back/forward navigation

- **WHEN** a user navigates from the home page to the level select page and presses the browser back button
- **THEN** the home page is displayed

### Requirement: Non-game pages render inside a shared shell

All pages except the gameplay screen SHALL render inside a shared layout that includes a header and a footer. The header SHALL display the game logo and provide navigation. The footer SHALL contain links to legal pages.

#### Scenario: Shell is visible on the home page

- **WHEN** a user visits the home page
- **THEN** the page includes a header with the game logo and a footer with legal links

#### Scenario: Shell is visible on legal pages

- **WHEN** a user visits the Impressum page
- **THEN** the page includes the same header and footer as the home page

### Requirement: Gameplay screen is immersive

The gameplay screen SHALL render without the shared header and footer, filling the full viewport. The game's own in-game controls (back button, level badge, undo, hint, restart) SHALL remain the only chrome.

#### Scenario: No shell chrome during gameplay

- **WHEN** a user is playing a level
- **THEN** no site header or footer is visible
- **AND** the game fills the full viewport as it does today

### Requirement: Unknown routes show the home page

The application SHALL redirect unknown URL paths to the home page rather than displaying a blank screen or an error.

#### Scenario: Visiting a non-existent route

- **WHEN** a user navigates to `/nonexistent`
- **THEN** the home page is displayed

### Requirement: The header displays the game identity

The header SHALL display the game's logo mark and name. The logo SHALL link to the home page.

#### Scenario: Clicking the header logo navigates home

- **WHEN** a user is on the Impressum page and clicks the logo in the header
- **THEN** the home page is displayed

### Requirement: The footer provides legal navigation

The footer SHALL contain links to the Impressum and Datenschutzerklärung pages.

#### Scenario: Navigating to Impressum from the footer

- **WHEN** a user clicks the Impressum link in the footer
- **THEN** the Impressum page is displayed
