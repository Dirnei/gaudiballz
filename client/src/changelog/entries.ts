/**
 * What changed in the game, written for players.
 *
 * The text lives in `CHANGELOG.md` at the repo root. The build parses it (see the
 * changelog plugin in `vite.config.ts`) and fails on a malformed file, so what arrives
 * here is already a checked list, newest first.
 */

import parsed from '../../../CHANGELOG.md';
import type { ChangelogEntry } from './parse';

export type { ChangelogEntry } from './parse';

export const CHANGELOG: readonly ChangelogEntry[] = parsed;
