namespace GaudiBallz.Server.Progression;

public enum Tier { Bronze, Silver, Gold, Platinum, Diamond }

public enum RankUpKind { None, SubLevel, TierPromotion }

public readonly record struct RankUpEvent(
    RankUpKind Kind,
    Tier OldTier, int OldSubLevel,
    Tier NewTier, int NewSubLevel)
{
    public static RankUpEvent NoChange { get; } = new(RankUpKind.None, default, 0, default, 0);
}

public static class RankTier
{
    private static readonly (Tier Tier, long Entry, int SubLevels, long PerSub)[] Tiers =
    [
        (Tier.Bronze,   0,         10, 8_000),
        (Tier.Silver,   80_000,    10, 40_000),
        (Tier.Gold,     480_000,   10, 52_000),
        (Tier.Platinum, 1_000_000, 10, 60_000),
        (Tier.Diamond,  1_600_000,  5, 80_000),
    ];

    public static (Tier Tier, int SubLevel) FromXp(long xp)
    {
        for (var i = Tiers.Length - 1; i >= 0; i--)
        {
            var t = Tiers[i];
            if (xp >= t.Entry)
            {
                var offset = xp - t.Entry;
                var sub = (int)(offset / t.PerSub) + 1;
                return (t.Tier, Math.Min(sub, t.SubLevels));
            }
        }

        return (Tier.Bronze, 1);
    }

    public static long? NextThreshold(long xp)
    {
        var (tier, sub) = FromXp(xp);
        for (var i = 0; i < Tiers.Length; i++)
        {
            if (Tiers[i].Tier != tier)
            {
                continue;
            }

            if (sub < Tiers[i].SubLevels)
            {
                return Tiers[i].Entry + (long)sub * Tiers[i].PerSub;
            }

            if (i + 1 < Tiers.Length)
            {
                return Tiers[i + 1].Entry;
            }

            return null;
        }

        return null;
    }

    public static RankUpEvent DetectRankUp(long oldXp, long newXp)
    {
        var (oldTier, oldSub) = FromXp(oldXp);
        var (newTier, newSub) = FromXp(newXp);

        if (oldTier == newTier && oldSub == newSub)
        {
            return RankUpEvent.NoChange;
        }

        var kind = oldTier != newTier ? RankUpKind.TierPromotion : RankUpKind.SubLevel;
        return new RankUpEvent(kind, oldTier, oldSub, newTier, newSub);
    }
}
