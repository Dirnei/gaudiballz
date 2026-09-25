import { describe, expect, it } from 'vitest';
import { CHANGELOG } from './entries';
import { compareVersions } from './parse';

// The build already rejects a malformed CHANGELOG.md; this checks what reaches the game.
describe('changelog entries', () => {
  it('has at least one release to show', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('lists releases newest first', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(compareVersions(CHANGELOG[i - 1]!.version, CHANGELOG[i]!.version)).toBeGreaterThan(0);
    }
  });

  it('shows only releases with something for players', () => {
    for (const release of CHANGELOG) {
      expect(release.features.length + release.fixes.length, release.version).toBeGreaterThan(0);
    }
  });
});
