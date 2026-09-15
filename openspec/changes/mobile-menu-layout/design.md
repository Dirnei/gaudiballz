## Context

The main menu currently uses a fixed `max-w-3xl` wrapper with `px-6` side padding. On a 375px iPhone that leaves ~327px for content; on a 320px screen, ~272px. The progress tiles grid (`grid-cols-2`) and stats chips (`flex-wrap`) mostly survive, but the action buttons (`max-w-xs flex-wrap`) produce awkward wrapping, and the hero title at `text-4xl` takes up too much vertical space on small screens. See proposal.md for motivation.

No Akka.NET actors are involved—this is purely a frontend layout change. No determinism requirements apply.

## Goals / Non-Goals

**Goals:**
- Make the menu comfortable to use on phones as narrow as 320px.
- Keep the desktop experience identical (no visible changes above ~600px).

**Non-Goals:**
- Redesigning the menu's information architecture or adding/removing sections.
- Tablet-specific breakpoints (the current layout works fine there).

## Decisions

### Reduce side padding on small viewports

Change `px-6` to `px-4 sm:px-6`. This gains 16px on narrow screens (8px per side) without touching the desktop layout. Tailwind's `sm` breakpoint (640px) is well above phone widths.

**Why not `px-3`?** Too tight—content touching the screen edge looks accidental on a polished game UI.

### Stack action buttons vertically below 480px

Replace the `flex-wrap` button container with a vertical stack on narrow screens: `flex flex-col sm:flex-row sm:flex-wrap`. Each button becomes full-width on mobile, giving a large tap target and eliminating the awkward two-on-one-off wrapping. Above `sm`, the current horizontal layout is preserved.

**Why not keep horizontal and just shrink?** The Daily Challenge button label is long in some locales. Shrinking produces cramped text; stacking gives it room.

### Scale hero text down on narrow viewports

Drop the title from `text-4xl` (2.25rem) to `text-3xl` (1.875rem) below `sm`. This is a single responsive class change: `text-3xl sm:text-4xl`.

### Let progress tiles go single-column on the narrowest screens

Change the grid from `grid-cols-2 sm:grid-cols-4` to a responsive stack: at very narrow widths (<380px) a single column reads better than two cramped tiles. Use a container query or a custom breakpoint via Tailwind's arbitrary value: `grid-cols-1 min-[380px]:grid-cols-2 sm:grid-cols-4`.

**Why 380px?** Two tiles at ~160px each plus gap and padding just barely fit at 380px. Below that they get squeezed.

### Stats ribbon: smaller text on mobile

Change chip text from `text-sm` to `text-xs sm:text-sm`. The chips already `flex-wrap`, so they stack naturally—just need slightly smaller text so three can fit on one line at 375px.

## Risks / Trade-offs

- **Visual regression on desktop**: mitigated by using `sm:` variants that only apply below 640px, leaving desktop unchanged. Task plan includes a desktop-viewport check.
- **Custom breakpoint (380px)**: non-standard, but Tailwind arbitrary values (`min-[380px]:`) are well supported and self-documenting. The alternative—a CSS media query—works too but scatters the logic outside Tailwind's utility model.
