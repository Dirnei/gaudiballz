## ADDED Requirements

### Requirement: Legal contact details served from server configuration

The application SHALL expose legal contact details (name, street address, city, country, and email) through a public API endpoint. The values SHALL be read from server-side configuration so they can be supplied via environment variables at deploy time without rebuilding the application.

#### Scenario: Contact details are configured

- **WHEN** the server is started with legal contact configuration values set
- **THEN** the API endpoint returns the configured name, street, city, country, and email

#### Scenario: Contact details are not configured

- **WHEN** the server is started without any legal contact configuration values
- **THEN** the API endpoint returns empty strings for all contact fields

### Requirement: Legal pages render contact details from the server

The Impressum and Datenschutz pages SHALL fetch contact details from the server and render them dynamically. The pages SHALL NOT contain hardcoded operator-specific text.

#### Scenario: Impressum displays configured contact details

- **WHEN** a user navigates to `/impressum` and the server has contact details configured
- **THEN** the page displays the operator's name, full postal address, and email address

#### Scenario: Datenschutz displays configured contact details

- **WHEN** a user navigates to `/datenschutz` and the server has contact details configured
- **THEN** the Verantwortlicher section displays the operator's name, address, and email

#### Scenario: Legal pages with no contact details configured

- **WHEN** a user navigates to `/impressum` or `/datenschutz` and no contact details are configured on the server
- **THEN** the page displays a notice that the operator information has not been configured yet

### Requirement: Legal contact endpoint requires no authentication

The legal contact API endpoint SHALL be accessible without authentication, the same as the legal pages themselves.

#### Scenario: Anonymous request to contact endpoint

- **WHEN** a request is made to the contact endpoint without any authentication token
- **THEN** the server returns the contact details successfully

## REMOVED Requirements

### Requirement: Legal page content uses placeholder fields

**Reason**: Replaced by server-configured contact details. Hardcoded placeholders required rebuilding the container image to change operator information; runtime configuration makes the same image deployable by any operator.

**Migration**: Set `Legal__Name`, `Legal__Street`, `Legal__City`, `Legal__Country`, and `Legal__Email` environment variables in the deployment configuration instead of editing source code.
