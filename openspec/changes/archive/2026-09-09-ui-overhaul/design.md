## Context

The frontend is a single `App.tsx` that manages screen state with `useState<Screen>` where `Screen = 'menu' | 'levels' | 'play' | 'achievements'`. There is no router, no shared layout, and no URL structure. The game state lives in `useGame()` which is called once in `App` and threaded through props. The app is dark-only with a hard-coded radial gradient background. See proposal.md for full motivation.

## Goals / Non-Goals

**Goals:**
- Introduce React Router with nested layouts so every page has a URL
- Create two layout routes: `AppShell` (header + footer) and `ImmersiveLayout` (full viewport)
- Rebrand all user-facing surfaces to "Guadi Ballz" with the flask logo and Fredoka font
- Add Impressum and Datenschutzerklärung pages within the shell layout
- Preserve the exact game state lifecycle — `useGame()` must survive route transitions between menu and gameplay

**Non-Goals:**
- Server-side rendering or SSR — the app remains a client-side SPA
- Redesigning the gameplay screen itself — only the surrounding shell and landing page change
- Implementing real legal content — pages use placeholders
- Dark/light theme toggle — the app stays dark-only for now
- Backend changes — this is purely a frontend change

## Decisions

### 1. React Router v7 with `createBrowserRouter`

**Choice:** `react-router-dom` v7, using `createBrowserRouter` for data routing.

**Why over alternatives:**
- v7 is the current stable and supports nested layout routes natively via `<Outlet />`
- `createBrowserRouter` allows loader/action patterns if needed later (rankings, friends)
- Hash routing (`createHashRouter`) considered but rejected — we want clean URLs for shareability and SEO on the landing page

**Trade-off:** Requires the Vite dev server and production server to serve `index.html` for all routes (SPA fallback). The Docker nginx config needs a `try_files` rule.

### 2. `useGame()` hoisted above the router

**Choice:** Keep `useGame()` called once at the top level, above the router outlet, and pass game state down via React context rather than props.

**Why:** The game hook manages IndexedDB persistence, server connections, and in-flight board state. Unmounting it on route change would lose the board and restart connections. A context provider at the router root keeps it alive across all routes.

**Alternative considered:** Call `useGame()` inside the gameplay route only. Rejected because navigating back to menu and then to play would remount the hook and lose board state, breaking the existing contract that returning to the menu preserves progress.

### 3. Two layout routes

**Choice:**
- `/` — `AppShell` layout (header, `<Outlet />`, footer). Contains: home/menu, level select, achievements, impressum, datenschutz.
- `/play` — `ImmersiveLayout` (no chrome, full viewport with existing gradient background). Contains: gameplay screen only.

**Why:** The gameplay screen needs the full viewport for the tube grid and its own header/footer controls. Wrapping it in a site header would waste vertical space on mobile and create a double-header. All other pages benefit from consistent navigation and legal links.

### 4. Branding assets inline, not loaded externally

**Choice:** The flask logo SVG is an inline React component, not an `<img>` tag loading a file. Fredoka is loaded from Google Fonts via a `<link>` in `index.html`.

**Why:** An inline SVG can be styled with CSS custom properties (stroke colour, fill opacity) and avoids a network request for a critical above-the-fold element. Google Fonts is the standard CDN approach for web fonts and is already how Tailwind documentation recommends loading custom fonts.

### 5. Legal pages as static components

**Choice:** Impressum and Datenschutzerklärung are plain React components with hardcoded German text and placeholder brackets for operator-specific fields. No CMS, no markdown rendering, no server fetch.

**Why:** The content changes rarely (only when legal details change), there are exactly two pages, and adding a content layer would be over-engineering. The placeholder pattern (`[Ihr Name]`, `[Ihre Adresse]`) makes it clear what needs replacing before go-live.

## Route tree

```
<BrowserRouter>
  <GameProvider>            ← useGame() lives here, survives all navigations
    <Routes>
      <Route element={<AppShell />}>        ← header + outlet + footer
        <Route index element={<MainMenu />} />
        <Route path="levels" element={<LevelSelect />} />
        <Route path="achievements" element={<AchievementsScreen />} />
        <Route path="impressum" element={<Impressum />} />
        <Route path="datenschutz" element={<Datenschutz />} />
      </Route>
      <Route element={<ImmersiveLayout />}>  ← no chrome, full viewport
        <Route path="play" element={<GameScreen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </GameProvider>
</BrowserRouter>
```

## Risks / Trade-offs

- **SPA fallback required** → The production web server must return `index.html` for all unmatched routes. Mitigation: add `try_files $uri $uri/ /index.html;` to the nginx config in the Docker image.
- **Bundle size increase** → `react-router-dom` adds ~14kB gzipped. Acceptable for the routing capability it provides. No lazy loading needed yet — the page components are small.
- **Google Fonts dependency** → Fredoka loads from Google's CDN. If it fails, the fallback stack (`system-ui, sans-serif`) renders immediately. The font is display-optional (`font-display: swap`).
- **PWA cache invalidation** → The service worker caches `index.html`. After rebranding, the old cached title/favicon may persist until the next SW update. Mitigation: bump the SW version in the PWA plugin config.
