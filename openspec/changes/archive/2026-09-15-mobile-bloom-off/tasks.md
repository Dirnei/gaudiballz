## 1. CSS changes

- [x] 1.1 Add a `.bloom-animate` rule inside `@media (pointer: fine)` in `index.css` that applies `animation: bloom-drift 20s ease-in-out infinite`, `will-change: transform`, `contain: strict`, and `filter: blur(72px)`
- [x] 1.2 Verify that the existing `@media (prefers-reduced-motion: reduce)` rule still suppresses the animation on desktop

## 2. Component changes

- [x] 2.1 Update `BackgroundBloom.tsx` — remove inline `animation`, `willChange`, and `contain` styles; remove the `blur-3xl` Tailwind class; add the `bloom-animate` CSS class
- [x] 2.2 Keep the radial gradient as an inline style (unchanged)

## 3. Verification

- [x] 3.1 Open the game in desktop Chrome and confirm the animated bloom with blur is visible
- [x] 3.2 Open the game in Chrome DevTools mobile emulation (touch device) and confirm only the static gradient is visible with no blur or animation
