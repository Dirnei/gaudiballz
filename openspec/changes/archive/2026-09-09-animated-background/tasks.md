## 1. CSS animation

- [x] 1.1 Add `@keyframes bloom-drift` to `index.css` — a ~20s infinite loop using `translate` and `scale` for a slow figure-eight drift
- [x] 1.2 Verify the existing `prefers-reduced-motion` rule in `index.css` suppresses the new animation (no additional code needed)

## 2. Shared bloom component

- [x] 2.1 Create `BackgroundBloom.tsx` — extract the bloom `<div>` from `AppShell.tsx` into a shared component that applies the `bloom-drift` animation class
- [x] 2.2 Replace the bloom markup in `AppShell.tsx` with `<BackgroundBloom />`
- [x] 2.3 Replace the bloom markup in `ImmersiveLayout.tsx` with `<BackgroundBloom />`

## 3. Verify

- [x] 3.1 Build and deploy the Docker image, confirm the bloom drifts on the landing page and during gameplay
