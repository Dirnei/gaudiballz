import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The cross-language conformance gate.
 *
 * This is the highest-risk interface in the system, because its failure mode is "the
 * player solves the puzzle and the server says no". The fixtures in `conformance/v1/`
 * are the shared arbiter: the C# suite and this one run against the same committed
 * files, and both block merges.
 *
 * Change 2 fills the fixtures in. Until then this asserts only that the manifest exists
 * and is the version the engine claims to implement, so the wiring cannot rot unnoticed.
 */
describe('conformance fixtures', () => {
  const manifestPath = resolve(__dirname, '../../../conformance/v1/MANIFEST.json');

  it('has a manifest at the expected path', () => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    expect(manifest.rulesVersion).toBe(1);
    expect(manifest.files).toBeDefined();
  });
});
