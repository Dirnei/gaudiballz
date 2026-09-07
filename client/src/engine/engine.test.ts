import { describe, expect, it } from 'vitest';
import { RULES_VERSION } from './index';

describe('engine harness', () => {
  it('is wired and exports a rules version', () => {
    expect(RULES_VERSION).toBe(1);
  });
});
