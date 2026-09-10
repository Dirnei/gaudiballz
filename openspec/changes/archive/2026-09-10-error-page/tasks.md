## 1. Error Fallback Component

- [x] 1.1 Create `client/src/game/ErrorFallback.tsx` with a friendly message, themed background gradient, Fredoka heading, and an `<a href="/">` recovery link styled as a button
- [x] 1.2 Gate dev-only error details behind `import.meta.env.DEV` in a collapsed `<details>` element showing the error message from `useRouteError()`

## 2. Route Wiring

- [x] 2.1 Add `errorElement: <ErrorFallback />` to the `AppShell` layout route in `App.tsx`
- [x] 2.2 Add `errorElement: <ErrorFallback />` to the `ImmersiveLayout` layout route in `App.tsx`

## 3. Verification

- [x] 3.1 Temporarily throw an error inside a menu route, confirm the fallback renders instead of a stack trace, and confirm the recovery link returns to the main menu
- [x] 3.2 Temporarily throw an error inside `GameScreen`, confirm the same fallback renders
- [x] 3.3 Build for production (`npm run build`), verify the dev details section is absent from the bundle output
- [x] 3.4 Rebuild and restart Docker container, verify the error page works in the deployed build
