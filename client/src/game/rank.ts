export type TierName = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

interface TierDef {
  readonly tier: TierName;
  readonly entry: number;
  readonly subLevels: number;
  readonly perSub: number;
}

const TIERS: readonly TierDef[] = [
  { tier: 'bronze', entry: 0, subLevels: 10, perSub: 8_000 },
  { tier: 'silver', entry: 80_000, subLevels: 10, perSub: 40_000 },
  { tier: 'gold', entry: 480_000, subLevels: 10, perSub: 52_000 },
  { tier: 'platinum', entry: 1_000_000, subLevels: 10, perSub: 60_000 },
  { tier: 'diamond', entry: 1_600_000, subLevels: 5, perSub: 80_000 },
];

export interface Rank {
  readonly tier: TierName;
  readonly subLevel: number;
}

export function rankFromXp(xp: number): Rank {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    const t = TIERS[i];
    if (xp >= t.entry) {
      const offset = xp - t.entry;
      const sub = Math.min(Math.floor(offset / t.perSub) + 1, t.subLevels);
      return { tier: t.tier, subLevel: sub };
    }
  }
  return { tier: 'bronze', subLevel: 1 };
}

export function nextThreshold(xp: number): number | null {
  const { tier, subLevel } = rankFromXp(xp);
  for (let i = 0; i < TIERS.length; i++) {
    if (TIERS[i].tier !== tier) continue;
    if (subLevel < TIERS[i].subLevels) {
      return TIERS[i].entry + subLevel * TIERS[i].perSub;
    }
    if (i + 1 < TIERS.length) {
      return TIERS[i + 1].entry;
    }
    return null;
  }
  return null;
}

export function currentThreshold(xp: number): number {
  const { tier, subLevel } = rankFromXp(xp);
  for (const t of TIERS) {
    if (t.tier === tier) {
      return t.entry + (subLevel - 1) * t.perSub;
    }
  }
  return 0;
}

export const TIER_COLOURS: Record<TierName, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#00bcd4',
  diamond: '#9c27b0',
};
