/**
 * Short vibrations on the actions that benefit from physical confirmation.
 *
 * Unsupported on iOS Safari and absent on desktop, so every call is best-effort and the
 * game never depends on it. Durations are deliberately tiny: anything longer reads as a
 * notification rather than as the feel of a piece landing.
 */

function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Some browsers throw when the page is not visible. Never worth failing a move over.
  }
}

export const haptics = {
  move: () => buzz(8),
  complete: () => buzz([12, 40, 18]),
  win: () => buzz([16, 60, 24, 60, 40]),
  blocked: () => buzz(4),
};
