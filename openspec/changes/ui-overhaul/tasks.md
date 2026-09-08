## 1. Dependencies and branding assets

- [ ] 1.1 Install `react-router-dom` in the client package
- [ ] 1.2 Add Fredoka Google Font link to `client/index.html`
- [ ] 1.3 Update `<title>` in `index.html` to "Guadi Ballz"
- [ ] 1.4 Create the Erlenmeyer flask logo as an inline SVG React component (`FlaskLogo.tsx`)
- [ ] 1.5 Replace `favicon.svg` with the flask logo mark
- [ ] 1.6 Update the PWA manifest (name, short_name, icons) for Guadi Ballz

## 2. Game context provider

- [ ] 2.1 Extract `useGame()` state into a `GameProvider` context and a `useGameContext()` consumer hook so game state survives route transitions
- [ ] 2.2 Verify existing tests still pass after the context extraction — wrap test renders in the provider with `MemoryRouter`

## 3. Router and layout structure

- [ ] 3.1 Create `AppShell.tsx` — layout component with header (flask logo + nav links), `<Outlet />`, and footer (legal links). Renders inside the site shell.
- [ ] 3.2 Create `ImmersiveLayout.tsx` — full-viewport layout with no header/footer, renders `<Outlet />` with the existing gradient background
- [ ] 3.3 Set up the route tree in `App.tsx` using `createBrowserRouter` — shell routes (index, levels, achievements, impressum, datenschutz) and immersive route (play). Add catch-all redirect to `/`
- [ ] 3.4 Update `main.tsx` to render the router with `RouterProvider` wrapped in `GameProvider`

## 4. Migrate existing screens to routes

- [ ] 4.1 Refactor `MainMenu.tsx` — replace callback-prop navigation (`onPlay`, `onLevelSelect`) with React Router `useNavigate()`. Restyle with flask logo, Fredoka wordmark, and tagline
- [ ] 4.2 Extract the gameplay view from `App.tsx` into a standalone `GameScreen.tsx` route component that consumes game context
- [ ] 4.3 Migrate `LevelSelect.tsx` — replace `onBack` callback with router navigation, consume game context instead of props
- [ ] 4.4 Migrate `AchievementsScreen.tsx` — replace `onBack` callback with router navigation
- [ ] 4.5 Move the `AccountPanel` and `AccountBall` into the shell header so they are accessible from all shell pages (not just inside `App.tsx`)

## 5. Legal pages

- [ ] 5.1 Create `Impressum.tsx` with placeholder content — operator name, address, contact, § 5 TMG structure
- [ ] 5.2 Create `Datenschutz.tsx` with placeholder privacy policy — anonymous IDs, passkey auth, cookie usage, GDPR rights, data retention
- [ ] 5.3 Verify both pages are accessible at `/impressum` and `/datenschutz` and render inside the shell layout

## 6. Cleanup and tests

- [ ] 6.1 Remove the `useState<Screen>` navigation from `App.tsx` — all screen switching now goes through the router
- [ ] 6.2 Update `App.test.tsx` — wrap renders in `MemoryRouter` and `GameProvider`, test route-based navigation
- [ ] 6.3 Add `try_files $uri $uri/ /index.html;` to the Docker nginx config for SPA fallback routing
- [ ] 6.4 Build and deploy the Docker image, verify the landing page, gameplay, legal pages, and direct URL navigation all work
