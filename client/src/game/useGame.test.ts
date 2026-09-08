import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGame } from './useGame';
import { HINT_COOLDOWN_MS } from './attempt';

/**
 * The hint cooldown, against the clock.
 *
 * Everything else about the budget is covered without waiting — `attempt.ts` is pure, and the
 * button tests are handed the state directly. What had no coverage at all was the one part
 * that genuinely depends on time passing: that the wait ends by itself and re-enables the
 * hint. Faking the clock tests exactly that, in milliseconds rather than in thirty seconds,
 * and against the real hook rather than a stand-in for it.
 *
 * No injected clock in the production code: `Date.now` and `setTimeout` are both fakeable
 * here, so a seam would only add a path that ships to players but is never exercised.
 */
describe('the hint cooldown ends on its own', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Offline: the board never loads, which is fine. The cooldown is armed when the level
    // starts loading, not when it arrives.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts a wait as soon as a level is opened', async () => {
    const { result } = renderHook(() => useGame());

    expect(result.current.hintCooldownEnd).not.toBeNull();
  });

  it('is still running just before its time is up', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.hintCooldownEnd).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(HINT_COOLDOWN_MS - 1);
    });

    expect(result.current.hintCooldownEnd).not.toBeNull();
  });

  it('clears itself once the full wait has passed', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.hintCooldownEnd).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(HINT_COOLDOWN_MS);
    });

    expect(result.current.hintCooldownEnd).toBeNull();
  });

  it('does not wait a second time once it has expired', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.hintCooldownEnd).not.toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(HINT_COOLDOWN_MS * 3);
    });

    expect(result.current.hintCooldownEnd).toBeNull();
  });

  /**
   * The wait is a wall-clock target rather than a countdown, so a tab that was throttled or
   * asleep for longer than the wait comes back to an expired cooldown rather than to one that
   * still has the untouched remainder to run.
   */
  it('is over when the clock has moved past it, however it got there', async () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.hintCooldownEnd).not.toBeNull();

    // A long sleep: the timer fires late, and finds its moment already behind it.
    await act(async () => {
      vi.setSystemTime(Date.now() + HINT_COOLDOWN_MS * 10);
      vi.advanceTimersByTime(HINT_COOLDOWN_MS);
    });

    expect(result.current.hintCooldownEnd).toBeNull();
  });
});
