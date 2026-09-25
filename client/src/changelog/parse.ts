/**
 * Reads the root `CHANGELOG.md` — written by release-please — into player-facing releases.
 *
 * Runs in the build (through a Vite plugin) as well as in tests, so it imports nothing and
 * touches no browser API. Only features and fixes reach players; chores, refactors and the
 * rest are for developers. Commit links and scopes are stripped because players cannot
 * follow them.
 */

export interface ChangelogEntry {
  /** `X.Y.Z`, without the tag's `v`. Also what "seen" is measured against. */
  readonly version: string;
  /** Release day, `YYYY-MM-DD`. */
  readonly date: string;
  readonly features: readonly string[];
  readonly fixes: readonly string[];
}

export interface ParsedChangelog {
  /** Newest first; releases with no features or fixes are left out. */
  readonly entries: readonly ChangelogEntry[];
  /** `line N: …` messages; empty when the file is valid. */
  readonly errors: readonly string[];
}

/** Numeric `major.minor.patch` comparison, so 0.10.0 sorts after 0.9.0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.-]/).slice(0, 3).map(Number);
  const pb = b.split(/[.-]/).slice(0, 3).map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// `## [0.7.0](https://…/compare/v0.6.0...v0.7.0) (2026-09-25)` or `## 0.7.0 (2026-09-25)`.
// Older release-please versions used `###` for patch releases.
const RELEASE = /^#{2,3}\s+\[?v?(\d+\.\d+\.\d+)\]?(?:\([^)]*\))?\s+\(([^)]*)\)\s*$/;
const SECTION = /^###\s+(.+?)\s*$/;
const BULLET = /^[*-]\s+(.+)$/;

const SECTIONS: Record<string, 'features' | 'fixes'> = {
  Features: 'features',
  'Bug Fixes': 'fixes',
};

function isRealDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
}

function clean(text: string): string {
  const plain = text
    .replace(/^\*\*[^*]+:\*\*\s*/, '') // **scope:**
    .replace(/,\s+closes\s+.*$/i, '') // , closes [#12](…)
    .replace(/\s*\(\[[0-9a-f]{7,40}\]\([^)]*\)\)\s*$/i, '') // ([abc1234](…))
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // any other link → its text
    .trim();
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

interface Draft {
  version: string;
  date: string;
  features: string[];
  fixes: string[];
}

export function parseChangelog(text: string): ParsedChangelog {
  const errors: string[] = [];
  const drafts: Draft[] = [];
  let current: Draft | null = null;
  let section: 'features' | 'fixes' | null = null;

  text.split(/\r?\n/).forEach((raw, index) => {
    const n = index + 1;
    const line = raw.trim();

    const release = RELEASE.exec(line);
    if (release) {
      const version = release[1]!;
      const date = release[2]!;
      section = null;
      if (!isRealDate(date)) {
        errors.push(`line ${n}: "${date}" is not a real date (YYYY-MM-DD)`);
      }
      const previous = drafts.at(-1);
      if (previous && compareVersions(previous.version, version) === 0) {
        errors.push(`line ${n}: ${version} appears twice`);
      } else if (previous && compareVersions(previous.version, version) < 0) {
        errors.push(`line ${n}: ${version} must come before ${previous.version} (newest first)`);
      }
      current = { version, date, features: [], fixes: [] };
      drafts.push(current);
      return;
    }

    const heading = SECTION.exec(line);
    if (heading) {
      section = SECTIONS[heading[1]!] ?? null;
      return;
    }

    const bullet = BULLET.exec(line);
    if (bullet && current !== null && section !== null) {
      const item = clean(bullet[1]!);
      if (item !== '') current[section].push(item);
    }
  });

  return {
    entries: drafts.filter((d) => d.features.length + d.fixes.length > 0),
    errors,
  };
}
