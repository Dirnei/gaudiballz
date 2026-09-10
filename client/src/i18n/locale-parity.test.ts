import { describe, it, expect } from 'vitest';
import en from './en.json';
import de from './de.json';

function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...flatKeys(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

describe('locale parity', () => {
  const enKeys = flatKeys(en);
  const deKeys = flatKeys(de);

  it('de.json has every key present in en.json', () => {
    const missing = enKeys.filter((k) => !deKeys.includes(k));
    expect(missing, `Missing in de.json:\n${missing.join('\n')}`).toEqual([]);
  });

  it('en.json has every key present in de.json', () => {
    const extra = deKeys.filter((k) => !enKeys.includes(k));
    expect(extra, `Extra in de.json (missing in en.json):\n${extra.join('\n')}`).toEqual([]);
  });
});
