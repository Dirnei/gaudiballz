import { describe, expect, it } from 'vitest';
import i18n from '../i18n/i18n';
import { buildShareText } from './shareResult';

const en = i18n.getFixedT('en');
const de = i18n.getFixedT('de');

const daily = {
  title: en('daily.shareTitle', { date: 'Sep 25' }),
  stars: 3,
  moves: 18,
  par: 20,
  elapsedMs: 42_300,
  timeTargetMs: 90_000,
  hintsUsed: 0,
  url: 'https://example.test/r/d4Ily9Zz',
};

describe('buildShareText', () => {
  it('produces the spec text for a daily result', () => {
    expect(buildShareText(daily, en)).toBe(
      'I played Gaudi Ballz / Daily Sep 25\n\n'
        + '⭐️⭐️⭐️ 18/20 moves | ⏱️ 42.3s/90.0s\n\n'
        + 'Check out on https://example.test/r/d4Ily9Zz',
    );
  });

  it('produces the spec text for a level result', () => {
    const level = {
      title: en('game.shareTitle', { id: 3 }),
      stars: 3,
      moves: 10,
      par: 15,
      elapsedMs: 10_000,
      timeTargetMs: 45_000,
      hintsUsed: 0,
      url: 'http://localhost:8123/r/cs8h0uBP',
    };

    expect(buildShareText(level, en)).toBe(
      'I played Gaudi Ballz / Level 3\n\n'
        + '⭐️⭐️⭐️ 10/15 moves | ⏱️ 10.0s/45.0s\n\n'
        + 'Check out on http://localhost:8123/r/cs8h0uBP',
    );
  });

  it('shows unearned stars empty and states the hints used', () => {
    const text = buildShareText({ ...daily, stars: 1, moves: 22, hintsUsed: 2 }, en);

    expect(text.split('\n\n')[1]).toBe('⭐️☆☆ 22/20 moves | ⏱️ 42.3s/90.0s | 💡 2 hints');
  });

  it('does not mention hints when none were used', () => {
    expect(buildShareText(daily, en)).not.toMatch(/hint|💡/i);
  });

  it('speaks the player language', () => {
    const text = buildShareText(
      { ...daily, title: de('daily.shareTitle', { date: '25. Sept.' }), hintsUsed: 1 },
      de,
    );

    expect(text).toBe(
      'Ich habe Gaudi Ballz gespielt / Daily 25. Sept.\n\n'
        + '⭐️⭐️⭐️ 18/20 Züge | ⏱️ 42.3s/90.0s | 💡 1 Tipp\n\n'
        + 'Schau es dir an: https://example.test/r/d4Ily9Zz',
    );
  });
});
