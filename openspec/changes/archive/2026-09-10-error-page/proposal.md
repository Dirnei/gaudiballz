## Why

When an unhandled runtime error occurs (e.g. a Framer Motion `removeChild` crash during level transitions), the player sees a raw React stack trace instead of anything useful. There is no error boundary anywhere in the app. A friendly, branded error screen lets the player recover by navigating back to the main menu instead of staring at a white page of gibberish.

## What Changes

- Add an error fallback component styled to match the game's dark theme (gradient background, Fredoka font, slate/violet palette).
- Wire it into React Router as `errorElement` on both top-level layout routes (`AppShell` and `ImmersiveLayout`) so any crash inside a route renders the fallback instead of the raw stack trace.
- The fallback shows a short friendly message and a button to navigate back to the main menu.
- In development builds only, the actual error message is shown in a collapsed detail section for debugging.

## Capabilities

### New Capabilities
- `error-page`: User-facing error fallback screen shown when an unhandled error crashes a route, with recovery navigation back to the main menu.

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- **Code**: New component `ErrorFallback.tsx` in `client/src/game/`. Route definitions in `App.tsx` gain `errorElement` on both layout routes.
- **Dependencies**: None — uses React Router's built-in `useRouteError` and existing Tailwind classes.
- **APIs / Systems**: No backend changes.
