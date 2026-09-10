## Context

See proposal.md — Why. The app currently has no error boundary. React Router supports `errorElement` on route objects, which acts as a built-in error boundary scoped to the route tree it wraps. The game has two top-level layout routes (`AppShell` for menu pages, `ImmersiveLayout` for gameplay) and a catch-all redirect.

## Goals / Non-Goals

**Goals:**
- Catch unhandled errors on every route with a single reusable component.
- Let the player recover without a full page reload.
- Show dev-only error details behind a toggle, hidden in production.

**Non-Goals:**
- Error reporting / telemetry — no analytics or logging service exists and none is being added.
- Retry-in-place — the error may have corrupted React state; navigating away is the safe recovery.
- Catching errors outside React's render tree (e.g. unhandled promise rejections in event listeners) — those are a separate concern.

## Decisions

### 1. React Router `errorElement` over a class-based ErrorBoundary
React Router's `errorElement` is the idiomatic mechanism for route-level error handling. It integrates with the router's own error state, provides `useRouteError()`, and avoids wrapping the component tree in additional class components. A standalone `ErrorBoundary` class would duplicate what the router already does.

**Alternative considered:** A custom `class ErrorBoundary extends React.Component` wrapping `<Outlet />` inside each layout. Rejected because it adds a layer the router already provides, and `useRouteError` wouldn't work inside it.

### 2. Single component, two mount points
One `ErrorFallback` component is used as `errorElement` on both layout routes. Each layout route already carries its own background and chrome, but `errorElement` replaces the entire route element (layout included), so the fallback must paint its own background. A single component avoids duplication.

### 3. Dev details via `import.meta.env.DEV`
Vite exposes `import.meta.env.DEV` as a compile-time boolean. The detail section is dead-code-eliminated in production builds, so no error internals leak to players. The details are shown in a `<details>` element (collapsed by default) to avoid visual noise during development.

### 4. Navigation via `<a href="/">` instead of router `navigate()`
Because the error may have corrupted the router's internal state, the recovery link uses a plain anchor tag to perform a full navigation to `/`. This guarantees a clean React tree. Using `useNavigate()` from inside an `errorElement` is unreliable — the router is in an error state.

## Risks / Trade-offs

- **[Full navigation on recovery]** → The player loses any ephemeral client state (selected tube, scroll position). Acceptable because the alternative — attempting an in-place recovery with potentially corrupted state — risks a second crash.
- **[No Akka.NET / backend involvement]** → This is purely a frontend concern. No actors, no determinism requirements, no server-side changes.
