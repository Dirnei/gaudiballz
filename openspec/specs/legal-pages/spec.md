# legal-pages Specification

## Purpose
Provides the legally required Impressum and Datenschutzerklärung (privacy policy) pages for deploying a publicly accessible website from Germany, served at stable URL paths.

## Requirements

### Requirement: Impressum page at a stable URL

The application SHALL serve an Impressum page at the path `/impressum`. The page SHALL contain the site operator's name, postal address, and contact information as required by § 5 TMG / § 18 MStV.

#### Scenario: Visiting the Impressum

- **WHEN** a user navigates to `/impressum`
- **THEN** a page is displayed containing the operator's name, address, and contact details

### Requirement: Datenschutzerklärung page at a stable URL

The application SHALL serve a privacy policy page at the path `/datenschutz`. The page SHALL describe what personal data is processed, the legal basis for processing, data retention, and the user's rights under GDPR.

#### Scenario: Visiting the Datenschutzerklärung

- **WHEN** a user navigates to `/datenschutz`
- **THEN** a page is displayed describing data processing practices and user rights

### Requirement: Legal pages are accessible without an account

The Impressum and Datenschutzerklärung pages SHALL be accessible to any visitor without logging in or creating an account.

#### Scenario: Anonymous visitor reads the Impressum

- **WHEN** a visitor who has never used the game navigates to `/impressum`
- **THEN** the Impressum page is displayed without requiring authentication

### Requirement: Legal page content uses placeholder fields

Until the operator provides final legal text, the pages SHALL use clearly marked placeholder fields (e.g., `[Your Name]`, `[Your Address]`) for operator-specific information so the pages are structurally complete and ready to fill in.

#### Scenario: Placeholder content is visually distinct

- **WHEN** a user views the Impressum page before final content is filled in
- **THEN** placeholder fields are visually distinguishable from surrounding text
