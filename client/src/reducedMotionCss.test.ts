import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Relative to the client folder, where the test runner starts.
const css = readFileSync('src/index.css', 'utf-8');

/**
 * jsdom applies no stylesheets, so the reduced-motion rules are checked as written.
 *
 * Cutting an animation's duration to almost nothing is only safe if it also stops repeating:
 * an infinite animation at 0.01ms runs thousands of cycles a second, and each frame catches it
 * somewhere random. On the background that turned the slow drift into a full-screen strobe for
 * exactly the players who had asked for less motion.
 */
function reducedMotionBlock(): string {
  const start = css.indexOf('@media (prefers-reduced-motion: reduce)');
  expect(start).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let i = css.indexOf('{', start); i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}' && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error('unterminated reduced-motion block');
}

describe('reduced-motion stylesheet', () => {
  it('stops every animation from repeating, not only from taking time', () => {
    const block = reducedMotionBlock();

    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
  });
});
