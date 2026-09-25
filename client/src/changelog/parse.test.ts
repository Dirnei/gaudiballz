import { describe, expect, it } from 'vitest';
import { compareVersions, parseChangelog } from './parse';

const md = (...lines: string[]) => lines.join('\n');
const REPO = 'https://github.com/Dirnei/gaudiballz';

describe('parseChangelog', () => {
  it('reads release-please output, keeping only features and fixes', () => {
    const { entries, errors } = parseChangelog(
      md(
        '# Changelog',
        '',
        `## [0.8.0](${REPO}/compare/v0.7.0...v0.8.0) (2026-10-02)`,
        '',
        '',
        '### ⚠ BREAKING CHANGES',
        '',
        '* drop old save format',
        '',
        '### Features',
        '',
        `* **daily:** show your rank outside the top ten ([3304fbf](${REPO}/commit/3304fbf))`,
        `* Pick up several full flasks at once ([2ac1c12](${REPO}/commit/2ac1c12)), closes [#12](${REPO}/issues/12)`,
        '',
        '',
        '### Bug Fixes',
        '',
        `* keep move count stable across [undo](${REPO}/pull/3) ([abc1234](${REPO}/commit/abc1234))`,
        '',
        '### Performance Improvements',
        '',
        '* faster solver',
        '',
        `### [0.7.1](${REPO}/compare/v0.7.0...v0.7.1) (2026-09-30)`,
        '',
        '### Bug Fixes',
        '',
        '* Something small',
        '',
        '## 0.7.0 (2026-09-25)',
        '',
        '### Features',
        '',
        '* First release',
      ),
    );

    expect(errors).toEqual([]);
    expect(entries).toEqual([
      {
        version: '0.8.0',
        date: '2026-10-02',
        features: ['Show your rank outside the top ten', 'Pick up several full flasks at once'],
        fixes: ['Keep move count stable across undo'],
      },
      { version: '0.7.1', date: '2026-09-30', features: [], fixes: ['Something small'] },
      { version: '0.7.0', date: '2026-09-25', features: ['First release'], fixes: [] },
    ]);
  });

  it('drops releases with nothing a player would notice', () => {
    const { entries } = parseChangelog(
      md('## [0.7.2](x) (2026-10-01)', '', '### Miscellaneous Chores', '', '* bump deps', '', '## 0.7.0 (2026-09-25)', '### Features', '* A'),
    );

    expect(entries.map((e) => e.version)).toEqual(['0.7.0']);
  });

  it('accepts Windows line endings', () => {
    const { entries, errors } = parseChangelog('## 0.7.0 (2026-09-25)\r\n\r\n### Features\r\n\r\n* A\r\n');

    expect(errors).toEqual([]);
    expect(entries[0]!.features).toEqual(['A']);
  });

  it('accepts an empty changelog', () => {
    expect(parseChangelog('# Changelog\n')).toEqual({ entries: [], errors: [] });
  });

  it.each([
    ['an unreal date', md('## 0.7.0 (2026-02-30)', '### Features', '* A'), 'line 1: "2026-02-30" is not a real date (YYYY-MM-DD)'],
    [
      'versions out of order',
      md('## 0.9.0 (2026-09-24)', '### Features', '* A', '## 0.10.0 (2026-09-25)', '### Features', '* B'),
      'line 4: 0.10.0 must come before 0.9.0 (newest first)',
    ],
    [
      'the same version twice',
      md('## 0.7.0 (2026-09-24)', '### Features', '* A', '## 0.7.0 (2026-09-25)', '### Features', '* B'),
      'line 4: 0.7.0 appears twice',
    ],
  ])('rejects %s', (_, text, error) => {
    expect(parseChangelog(text).errors).toContain(error);
  });
});

describe('compareVersions', () => {
  it.each([
    ['0.10.0', '0.9.0', 1],
    ['0.9.0', '0.10.0', -1],
    ['1.0.0', '0.99.99', 1],
    ['0.7.1', '0.7.1', 0],
  ])('%s vs %s', (a, b, sign) => {
    expect(Math.sign(compareVersions(a, b))).toBe(sign);
  });
});
