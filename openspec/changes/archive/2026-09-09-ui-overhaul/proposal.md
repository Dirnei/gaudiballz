## Why

The game ships under the placeholder name "Sort Puzzle" with no logo, no URL routing, and no legal pages. It needs a public identity ("Guadi Ballz"), a reusable app shell that future features (rankings, friends, profiles) can plug into, and the legally required Impressum and Datenschutzerklärung for deployment on a German VPS. The current single-component navigation (`useState<Screen>`) cannot support bookmarkable URLs, deep-linked pages, or nested layouts.

## What Changes

- Rebrand from "Sort Puzzle" to "Guadi Ballz" — title, favicon, PWA manifest, Fredoka font, Erlenmeyer flask logo SVG.
- Add React Router with nested route layouts.
- Introduce an app shell (header with logo/nav, footer with legal links) used by all non-game pages.
- Restyle the main menu / landing page with the new branding — flask logo, stacked GUADI BALLZ wordmark, tagline, big Play button.
- The game screen remains immersive (full viewport, no shell chrome) — it gets its own layout route without the header/footer.
- Add an Impressum page with placeholder legal content (name, address, contact).
- Add a Datenschutzerklärung (privacy policy) page with placeholder content covering passkey auth, anonymous IDs, and cookie usage.
- Build the layout so new pages slot in by adding a route and a component.

## Capabilities

### New Capabilities
- `app-shell`: Reusable page chrome (header, footer, navigation) and React Router nested layout structure. Defines which routes render inside the shell and which are immersive.
- `legal-pages`: Impressum and Datenschutzerklärung pages served at `/impressum` and `/datenschutz` with placeholder legal content.

### Modified Capabilities
- `main-menu`: The main menu becomes the landing page at `/`, restyled with the Guadi Ballz branding (flask logo, Fredoka wordmark, tagline). All existing functional requirements remain unchanged — play, level select, code entry, achievements, account access.

## Impact

- **New dependency**: `react-router` (+ `react-router-dom`) added to `client/package.json`.
- **New dependency**: Google Fonts `Fredoka` loaded in `index.html`.
- **client/src/main.tsx**: Wraps `<App>` in a `<BrowserRouter>`.
- **client/src/game/App.tsx**: Refactored from a single-component screen switcher into a route tree. Screen state (`useState<Screen>`) replaced by route navigation.
- **client/src/game/MainMenu.tsx**: Restyled with new branding, navigates via router instead of callback props.
- **client/index.html**: Title updated to "Guadi Ballz", favicon replaced with flask SVG, Fredoka font link added.
- **New files**: `AppShell.tsx` (layout with header/footer), `ImmersiveLayout.tsx` (no chrome), `Impressum.tsx`, `Datenschutz.tsx`, flask logo SVG.
- **PWA manifest**: App name and icons updated.
- **Existing tests**: `App.test.tsx` and `MainMenu` tests will need router wrappers (`MemoryRouter`).
